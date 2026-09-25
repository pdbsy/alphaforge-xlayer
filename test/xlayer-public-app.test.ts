import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import { buildXLayerPublicApp } from '../apps/server/src/xlayer-public-app.ts';
import { composeM3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import { deploymentManifestDigest } from '../packages/chain-adapter/src/manifest.ts';
import { keccak256 } from '../packages/chain-adapter/src/keccak.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';
import {
  validateXLayerPublicDeployment,
  type XLayerPublicDeployment,
} from '../apps/server/src/xlayer-public-config.ts';

const origin = 'https://alphaforge.example';
const headers = { host: 'alphaforge.example' };

test('unconfigured public website serves minimal testnet configuration and honest readiness', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    const config = await app.inject({ url: '/api/xlayer/config', headers });
    assert.equal(config.statusCode, 200);
    assert.deepEqual(config.json(), {
      schemaVersion: 1,
      environment: 'xlayer-testnet',
      chainId: 1952,
      deploymentStatus: 'NOT_DEPLOYED',
      deployments: [],
    });
    const health = await app.inject({ url: '/api/health', headers });
    assert.equal(health.statusCode, 503);
    assert.deepEqual(health.json(), {
      ready: false,
      network: 'xlayer-testnet',
      deploymentStatus: 'NOT_DEPLOYED',
    });
    assert.match(config.headers['content-security-policy']!, /default-src 'self'/);
    assert.equal(config.headers['cache-control'], 'no-store');
  } finally {
    await app.close();
  }
});

test('public website has no local identity or simulated product endpoints', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    for (const url of ['/api/demo/session', '/api/v1/access/claims', '/api/v1/vaults', '/api/session']) {
      const response = await app.inject({
        method: 'POST',
        url,
        headers: { ...headers, origin },
        payload: { user: 'alice' },
      });
      assert.equal(response.statusCode, 404);
    }
  } finally {
    await app.close();
  }
});

test('public website rejects host spoofing, foreign origins and cross-site requests', async () => {
  const app = await buildXLayerPublicApp({ origin, deployments: [] });
  try {
    for (const extra of [
      { host: 'attacker.example' },
      { origin: 'https://attacker.example' },
      { 'sec-fetch-site': 'cross-site' },
    ]) {
      const response = await app.inject({ url: '/api/xlayer/config', headers: { ...headers, ...extra } });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().message, 'Request origin is not allowed.');
    }
    const missingOrigin = await app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers,
      payload: {},
    });
    assert.equal(missingOrigin.statusCode, 403);
  } finally {
    await app.close();
  }
});

test('public origin validation requires HTTPS except explicit loopback rehearsal', async () => {
  for (const value of [
    'http://alphaforge.example',
    'https://user:secret@alphaforge.example',
    'https://alphaforge.example/path',
    'https://alphaforge.example/?key=secret',
  ])
    await assert.rejects(buildXLayerPublicApp({ origin: value, deployments: [] }), /INVALID_PUBLIC_ORIGIN/);
  const app = await buildXLayerPublicApp({ origin: 'http://127.0.0.1:4180', deployments: [] });
  await app.close();
});

const manifest = {
  schemaVersion: 1,
  environment: 'xlayer-testnet',
  chainId: 1952,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: asAddress('0x1111111111111111111111111111111111111111'),
  deploymentBlock: '25',
  abiVersion: 'm3-vault-db620d6',
  abiHash: asBlockHash('0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977'),
  runtimeBytecodeHash: asBlockHash(`0x${'2'.repeat(64)}`),
  strategyPassAddress: asAddress('0x3333333333333333333333333333333333333333'),
  strategyPassDeploymentBlock: '24',
  strategyPassAbiHash: asBlockHash('0xdd989644feeb7798baca69f7391ba75b6f9d09f47fb05bd90184f6072912923f'),
  strategyPassRuntimeBytecodeHash: asBlockHash(`0x${'4'.repeat(64)}`),
} as const;
function publicDeployment(): XLayerPublicDeployment {
  return {
    source: 'reviewed-deployment-manifest',
    chainId: 1952,
    vaultAddress: manifest.contractAddress,
    deploymentBlock: manifest.deploymentBlock,
    abiVersion: manifest.abiVersion,
    abiHash: manifest.abiHash,
    runtimeBytecodeHash: manifest.runtimeBytecodeHash,
    strategyPassAddress: manifest.strategyPassAddress,
    strategyPassDeploymentBlock: manifest.strategyPassDeploymentBlock,
    strategyPassAbiHash: manifest.strategyPassAbiHash,
    strategyPassRuntimeBytecodeHash: manifest.strategyPassRuntimeBytecodeHash,
    manifestDigest: deploymentManifestDigest(manifest),
  };
}

test('configured website exposes only manifest-bound public fields without claiming an absent indexer is ready', async () => {
  const deployment = publicDeployment();
  const app = await buildXLayerPublicApp({ origin, deployments: [deployment] });
  try {
    const config = await app.inject({ url: '/api/xlayer/config', headers });
    assert.equal(config.statusCode, 200);
    assert.deepEqual(config.json().deployments, [deployment]);
    assert.equal(config.json().deploymentStatus, 'DEPLOYED');
    const health = await app.inject({ url: '/api/health', headers });
    assert.equal(health.statusCode, 503);
    assert.equal(health.json().ready, false);
  } finally {
    await app.close();
  }
});

test('public deployment rejects cross-chain configuration, mismatched evidence, zero code and unknown fields', () => {
  const deployment = publicDeployment();
  for (const change of [
    { chainId: 196 },
    { chainId: 46630 },
    { source: 'fixture' },
    { deploymentBlock: '26' },
    { vaultAddress: '0x5555555555555555555555555555555555555555' },
    { runtimeBytecodeHash: `0x${'0'.repeat(64)}` },
    { manifestDigest: `0x${'6'.repeat(64)}` },
    { dbPath: '/private/data.sqlite' },
    { passInitialSupplyBaseUnits: '1' },
    { passInitialSupplyBaseUnits: '1', passInitialRecipient: '0x0000000000000000000000000000000000000000' },
  ])
    assert.throws(() =>
      validateXLayerPublicDeployment({ ...deployment, ...change } as XLayerPublicDeployment),
    );
});

test('duplicate public Vault records fail before constructing a server', async () => {
  const deployment = publicDeployment();
  await assert.rejects(
    buildXLayerPublicApp({ origin, deployments: [deployment, deployment] }),
    /INVALID_PUBLIC_DEPLOYMENT_SET/,
  );
});

test('public readiness requires a caught-up runtime and clears after failed sync or closure', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-public-health-'));
  const code = asHexData('0x6000');
  const body = {
    ...manifest,
    deploymentBlock: '1',
    strategyPassDeploymentBlock: '1',
    runtimeBytecodeHash: keccak256(code),
    strategyPassRuntimeBytecodeHash: keccak256(code),
  };
  const manifestDigest = deploymentManifestDigest(body);
  const deployment: XLayerPublicDeployment = {
    ...publicDeployment(),
    deploymentBlock: body.deploymentBlock,
    strategyPassDeploymentBlock: body.strategyPassDeploymentBlock,
    runtimeBytecodeHash: body.runtimeBytecodeHash,
    strategyPassRuntimeBytecodeHash: body.strategyPassRuntimeBytecodeHash,
    manifestDigest,
  };
  const word = (value: bigint) => value.toString(16).padStart(64, '0');
  let failHead = false;
  const rpc: ReadonlyRpc = {
    chainId: async () => 1952,
    code: async () => code,
    receipt: async () => null,
    logs: async () => [],
    block: async (number) => {
      if (failHead && number === 'latest') throw new Error('OFFLINE_HEAD_UNAVAILABLE');
      const height = number === 'latest' ? 10n : number;
      return {
        number: height,
        hash: asBlockHash(`0x${word(height)}`),
        parentHash: asBlockHash(`0x${word(height - 1n)}`),
        timestamp: height,
      };
    },
    call: async ({ data }) => {
      if (data === encodeM3VaultCall('pass()', []))
        return asHexData(`0x${body.strategyPassAddress.slice(2).padStart(64, '0')}`);
      if (data === encodeM3VaultCall('strategyId()', [])) return asHexData(`0x${word(1n)}`);
      if (data === '0x313ce567') return asHexData(`0x${word(18n)}`);
      return asHexData(`0x${word(0n)}`);
    },
  };
  const runtime = composeM3ChainRuntime(
    {
      deploymentStatus: 'DEPLOYED',
      dbPath: join(directory, 'runtime.sqlite'),
      rpcEndpoints: ['https://rpc.invalid'],
      manifestDocument: { ...body, manifestDigest },
      expectedManifestDigest: manifestDigest,
      expectedContractAddress: body.contractAddress,
      expectedNetwork: { environment: 'xlayer-testnet', chainId: 1952 },
      maxBlocksPerSync: 1,
    },
    { createRpc: () => rpc },
  )!;
  const app = await buildXLayerPublicApp({ origin, deployments: [deployment], runtimes: [runtime] });
  const health = async () => {
    const response = await app.inject({ url: '/api/health', headers });
    return { status: response.statusCode, ready: response.json().ready as boolean };
  };
  try {
    const beforeSync = await health();
    await runtime.syncToHead();
    assert.equal(runtime.store.checkpoint(1952, body.contractAddress)?.blockNumber, 1n);
    const catchingUp = await health();
    for (let index = 1; index < 10; index++) await runtime.syncToHead();
    assert.equal(runtime.store.checkpoint(1952, body.contractAddress)?.blockNumber, 10n);
    const caughtUp = await health();
    failHead = true;
    await assert.rejects(runtime.syncToHead(), /OFFLINE_HEAD_UNAVAILABLE/);
    const failed = await health();
    runtime.close();
    const closed = await health();
    assert.deepEqual(
      { beforeSync, catchingUp, caughtUp, failed, closed },
      {
        beforeSync: { status: 503, ready: false },
        catchingUp: { status: 503, ready: false },
        caughtUp: { status: 200, ready: true },
        failed: { status: 503, ready: false },
        closed: { status: 503, ready: false },
      },
    );
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
