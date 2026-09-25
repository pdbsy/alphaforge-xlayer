import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createXLayerPublicDeployment } from '../tools/create-xlayer-public-deployment.ts';
import {
  publicDeploymentToRuntimeInput,
  startXLayerPublicServer,
} from '../apps/server/src/xlayer-public-startup.ts';
import {
  validateXLayerPublicDeployment,
  type XLayerPublicDeployment,
} from '../apps/server/src/xlayer-public-config.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import { M3_VAULT_ABI_HASH, M3_VAULT_ABI_VERSION } from '../packages/chain-adapter/src/vault-abi.ts';
import { M3_STRATEGY_PASS_ABI_HASH } from '../packages/chain-adapter/src/pass-abi.ts';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';

const body = {
  schemaVersion: 1,
  environment: 'xlayer-testnet',
  chainId: 1952,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: asAddress(`0x${'11'.repeat(20)}`),
  deploymentBlock: '123',
  abiVersion: M3_VAULT_ABI_VERSION,
  abiHash: M3_VAULT_ABI_HASH,
  runtimeBytecodeHash: asBlockHash(`0x${'aa'.repeat(32)}`),
  strategyPassAddress: asAddress(`0x${'33'.repeat(20)}`),
  strategyPassDeploymentBlock: '122',
  strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
  strategyPassRuntimeBytecodeHash: asBlockHash(`0x${'bb'.repeat(32)}`),
} as const;
const manifest = { ...body, manifestDigest: deploymentManifestDigest(body) };

function fixture(t: test.TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-public-conversion-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const manifestPath = join(directory, 'reviewed-manifest.json');
  const outputPath = join(directory, 'public-deployment.json');
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return { directory, manifestPath, outputPath };
}

test('offline conversion roundtrips the reviewed manifest into the actual public startup', async (t) => {
  let server: Awaited<ReturnType<typeof startXLayerPublicServer>> | undefined = undefined;
  t.after(() => server?.close());
  const { directory, manifestPath, outputPath } = fixture(t);
  createXLayerPublicDeployment({ manifestPath, outputPath });
  const record = JSON.parse(readFileSync(outputPath, 'utf8')) as XLayerPublicDeployment;
  assert.deepEqual(validateXLayerPublicDeployment(record), record);
  assert.equal(record.vaultAddress, body.contractAddress);
  assert.equal(record.manifestDigest, manifest.manifestDigest);
  assert.equal(record.source, 'reviewed-deployment-manifest');
  assert.equal('passInitialSupplyBaseUnits' in record, false);
  assert.equal('passInitialRecipient' in record, false);
  for (const key of ['schemaVersion', 'environment', 'contractName', 'contractType', 'contractAddress'])
    assert.equal(key in record, false);
  let chainReads = 0;
  let observedChain = 196;
  let codeReads = 0;
  const rpc: ReadonlyRpc = {
    chainId: async () => {
      chainReads++;
      return observedChain;
    },
    block: async () => {
      throw new Error('UNEXPECTED_RPC');
    },
    code: async () => {
      codeReads++;
      return asHexData('0x6000');
    },
    receipt: async () => {
      throw new Error('UNEXPECTED_RPC');
    },
    logs: async () => {
      throw new Error('UNEXPECTED_RPC');
    },
    call: async () => {
      throw new Error('UNEXPECTED_RPC');
    },
  };
  server = await startXLayerPublicServer(
    {
      origin: 'https://alphaforge.example',
      deployments: [record],
      rpcAccess: 'read-only',
      syncIntervalMs: null,
      runtimeDeployments: [
        publicDeploymentToRuntimeInput(record, {
          dbPath: join(directory, 'index.sqlite'),
          rpcEndpoints: ['https://rpc.example'],
        }),
      ],
    },
    { createRpc: () => rpc },
  );
  assert.equal(server.runtimes[0]!.manifest.chainId, 1952);
  assert.equal(server.runtimes[0]!.manifest.manifestDigest, manifest.manifestDigest);
  assert.equal(chainReads, 1, 'startup still checks the actual chain after offline conversion');
  const headers = { host: 'alphaforge.example' };
  assert.deepEqual((await server.app.inject({ url: '/api/xlayer/config', headers })).json().deployments, [
    record,
  ]);
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
  observedChain = 1952;
  await assert.rejects(server.syncNow(), /M3_RUNTIME_SYNC_FAILED/);
  assert.equal(codeReads, 1, 'runtime independently rejects deployed code that does not match the record');
  assert.equal((await server.app.inject({ url: '/api/health', headers })).statusCode, 503);
});

test('conversion rejects wrong networks, simulation/template records, unknown fields and invalid pins', (t) => {
  const { manifestPath, outputPath } = fixture(t);
  for (const input of [
    null,
    [],
    { deploymentStatus: 'NOT_DEPLOYED' },
    { ...manifest, chainId: 196 },
    { ...manifest, chainId: 195 },
    { ...manifest, environment: 'robinhood-chain-testnet', chainId: 46630 },
    { ...manifest, simulation: true },
    { ...manifest, template: true },
    { ...manifest, deploymentStatus: 'SIMULATED' },
    { ...manifest, privateKey: 'DO_NOT_ECHO' },
    { ...manifest, manifestDigest: asBlockHash(`0x${'ff'.repeat(32)}`) },
    { ...manifest, passInitialSupplyBaseUnits: '100', passInitialRecipient: body.contractAddress },
    ...['runtimeBytecodeHash', 'strategyPassRuntimeBytecodeHash'].map((key) => {
      const document = { ...body, [key]: asBlockHash(`0x${'00'.repeat(32)}`) };
      return { ...document, manifestDigest: deploymentManifestDigest(document) };
    }),
  ]) {
    writeFileSync(manifestPath, JSON.stringify(input));
    assert.throws(() => createXLayerPublicDeployment({ manifestPath, outputPath }), {
      message: 'XLAYER_PUBLIC_DEPLOYMENT_FAILED',
    });
    assert.equal(existsSync(outputPath), false);
  }
});

test('conversion reads only bounded regular JSON and does not overwrite existing output', (t) => {
  const { directory, manifestPath, outputPath } = fixture(t);
  writeFileSync(outputPath, 'existing content');
  assert.throws(
    () => createXLayerPublicDeployment({ manifestPath, outputPath }),
    /XLAYER_PUBLIC_DEPLOYMENT_FAILED/,
  );
  assert.equal(readFileSync(outputPath, 'utf8'), 'existing content');
  const alias = join(directory, 'manifest-alias.json');
  symlinkSync(manifestPath, alias);
  for (const path of [directory, alias])
    assert.throws(
      () => createXLayerPublicDeployment({ manifestPath: path, outputPath: join(directory, 'new.json') }),
      /XLAYER_PUBLIC_DEPLOYMENT_FAILED/,
    );
  for (const content of ['{DO_NOT_ECHO', 'x'.repeat(262145)]) {
    writeFileSync(manifestPath, content);
    assert.throws(
      () => createXLayerPublicDeployment({ manifestPath, outputPath: join(directory, 'new.json') }),
      /XLAYER_PUBLIC_DEPLOYMENT_FAILED/,
    );
    assert.equal(existsSync(join(directory, 'new.json')), false);
  }
});

test('actual offline CLI creates one record and rejects overwrite, bad arguments and private input without leakage', (t) => {
  const { directory, manifestPath, outputPath } = fixture(t);
  const run = (args: string[]) =>
    spawnSync(process.execPath, ['tools/create-xlayer-public-deployment.ts', ...args], {
      encoding: 'utf8',
      timeout: 10000,
    });
  const success = run(['--manifest', manifestPath, '--output', outputPath]);
  assert.equal(success.status, 0, success.stderr);
  assert.equal(success.stdout, 'XLAYER_PUBLIC_DEPLOYMENT_CREATED\n');
  assert.equal(success.stderr, '');
  const original = readFileSync(outputPath, 'utf8');
  for (const args of [
    ['--manifest', manifestPath, '--output', outputPath],
    [],
    ['--manifest', join(directory, 'DO_NOT_ECHO'), '--output', outputPath],
    ['--manifest', manifestPath, '--output', outputPath, '--privateKey', 'DO_NOT_ECHO'],
    ['--manifest', manifestPath, '--manifest', manifestPath, '--output', outputPath],
  ]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'XLAYER_PUBLIC_DEPLOYMENT_FAILED\n');
    assert.equal(readFileSync(outputPath, 'utf8'), original);
  }
  writeFileSync(manifestPath, '{DO_NOT_ECHO');
  const malformed = run(['--manifest', manifestPath, '--output', join(directory, 'new.json')]);
  assert.equal(malformed.status, 1);
  assert.equal(malformed.stderr, 'XLAYER_PUBLIC_DEPLOYMENT_FAILED\n');
  assert.equal(existsSync(join(directory, 'new.json')), false);
});
