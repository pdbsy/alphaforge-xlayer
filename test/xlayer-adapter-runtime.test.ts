import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { composeM3ChainRuntime, type M3ChainRuntimeDeployment } from '../apps/server/src/m3-chain-runtime.ts';
import {
  validateDeploymentManifest,
  type DeploymentManifestExpectation,
} from '../packages/chain-adapter/src/manifest.ts';
import { M3_VAULT_ABI_HASH, M3_VAULT_ABI_VERSION } from '../packages/chain-adapter/src/vault-abi.ts';
import { M3_STRATEGY_PASS_ABI_HASH } from '../packages/chain-adapter/src/pass-abi.ts';
import { asAddress, asBlockHash, asHexData } from '../packages/chain-adapter/src/types.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';

const vault = asAddress(`0x${'22'.repeat(20)}`);
const pass = asAddress(`0x${'44'.repeat(20)}`);
const xlayer = { environment: 'xlayer-testnet', chainId: 1952 } as const;
const robinhood = { environment: 'robinhood-chain-testnet', chainId: 46_630 } as const;
function document(network: { environment: string; chainId: number }) {
  const body = {
    schemaVersion: 1,
    ...network,
    contractName: 'AlphaForgeVault',
    contractType: 'vault',
    contractAddress: vault,
    deploymentBlock: '100',
    abiVersion: M3_VAULT_ABI_VERSION,
    abiHash: M3_VAULT_ABI_HASH,
    runtimeBytecodeHash: asBlockHash(`0x${'99'.repeat(32)}`),
    strategyPassAddress: pass,
    strategyPassDeploymentBlock: '90',
    strategyPassAbiHash: M3_STRATEGY_PASS_ABI_HASH,
    strategyPassRuntimeBytecodeHash: asBlockHash(`0x${'88'.repeat(32)}`),
  };
  return {
    ...body,
    manifestDigest: asBlockHash(`0x${createHash('sha256').update(JSON.stringify(body)).digest('hex')}`),
  };
}
class OfflineRpc implements ReadonlyRpc {
  codeReads = 0;
  async chainId() {
    return 46_630;
  }
  async block() {
    return null;
  }
  async receipt() {
    return null;
  }
  async logs() {
    return [];
  }
  async code() {
    this.codeReads++;
    return asHexData('0x6000');
  }
  async call() {
    return asHexData('0x');
  }
}
function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-r2-runtime-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, 'chain.sqlite');
}
function deployment(dbPath: string, network = xlayer) {
  const manifestDocument = document(network);
  return {
    deploymentStatus: 'DEPLOYED',
    dbPath,
    rpcEndpoints: ['https://rpc.invalid'],
    manifestDocument,
    expectedManifestDigest: manifestDocument.manifestDigest,
    expectedContractAddress: vault,
  } as const;
}

test('XLayer runtime requires trusted caller network and keeps its evidence chain identity', (t) => {
  let runtime: ReturnType<typeof composeM3ChainRuntime> | undefined = undefined;
  t.after(() => runtime?.close());
  const rpc = new OfflineRpc();
  const input = { ...deployment(setup(t)), expectedNetwork: xlayer };
  runtime = composeM3ChainRuntime(input, { createRpc: () => rpc });
  assert.ok(runtime);
  assert.equal(runtime.manifest.chainId, 1952);
  assert.equal(runtime.manifest.environment, 'xlayer-testnet');
  assert.equal(runtime.chainEvidence.syncStatus().deployment.chainId, 1952);
  assert.equal(rpc.codeReads, 0);
});

test('document cannot choose XLayer by itself or override a Robinhood caller', (t) => {
  for (const expectedNetwork of [undefined, robinhood]) {
    const dbPath = setup(t);
    let rpcCreated = false;
    const input = { ...deployment(dbPath), ...(expectedNetwork ? { expectedNetwork } : {}) };
    assert.throws(
      () =>
        composeM3ChainRuntime(input, {
          createRpc: () => {
            rpcCreated = true;
            return new OfflineRpc();
          },
        }),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
    assert.equal(rpcCreated, false);
    assert.equal(existsSync(dbPath), false);
  }
});

test('manifest rejects unsupported and mismatched network pairs even with matching document digest', () => {
  for (const network of [
    { environment: 'xlayer-testnet', chainId: 46_630 },
    { environment: 'robinhood-chain-testnet', chainId: 1952 },
    { environment: 'xlayer-mainnet', chainId: 196 },
    { environment: 'xlayer-testnet', chainId: 196 },
  ]) {
    const input = document(network);
    assert.throws(
      () =>
        validateDeploymentManifest(input, {
          ...network,
          manifestDigest: input.manifestDigest,
        } as DeploymentManifestExpectation),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
  }
});

test('XLayer caller cannot adopt a Robinhood document or mismatched trusted digest', (t) => {
  for (const manifestDocument of [
    document(robinhood),
    { ...document(xlayer), manifestDigest: asBlockHash(`0x${'aa'.repeat(32)}`) },
  ]) {
    const dbPath = setup(t);
    const input = { ...deployment(dbPath), manifestDocument, expectedNetwork: xlayer };
    assert.throws(
      () =>
        composeM3ChainRuntime(input, {
          createRpc: () => {
            throw new Error('RPC_MUST_NOT_BE_CREATED');
          },
        }),
      /INVALID_DEPLOYMENT_MANIFEST/,
    );
    assert.equal(existsSync(dbPath), false);
  }
});

test('XLayer runtime rejects RPC chain mismatch before bytecode reads and storage projections', async (t) => {
  let runtime: ReturnType<typeof composeM3ChainRuntime> | undefined = undefined;
  t.after(() => runtime?.close());
  const rpc = new OfflineRpc();
  runtime = composeM3ChainRuntime(
    { ...deployment(setup(t)), expectedNetwork: xlayer } as M3ChainRuntimeDeployment,
    { createRpc: () => rpc },
  );
  assert.ok(runtime);
  await assert.rejects(runtime.syncToHead(), /M3_DEPLOYMENT_CHAIN_MISMATCH/);
  assert.equal(rpc.codeReads, 0);
  assert.equal(runtime.store.checkpoint(1952, vault), null);
  assert.equal(runtime.store.checkpoint(1952, pass), null);
});
