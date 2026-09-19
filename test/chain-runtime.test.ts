import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { M3ChainRuntime, composeM3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import {
  deploymentManifestDigest,
  validateDeploymentManifest,
} from '../packages/chain-adapter/src/manifest.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const TX = asTransactionHash(`0x${'aa'.repeat(32)}`);
const manifestBody = {
  schemaVersion: 1,
  environment: 'robinhood-chain-testnet',
  chainId: 46_630,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: CONTRACT,
  deploymentBlock: '100',
  abiVersion: 'm3-vault-db620d6',
  runtimeBytecodeHash: asBlockHash(`0x${'99'.repeat(32)}`),
} as const;
const manifestDigest = deploymentManifestDigest(manifestBody);
const manifest = validateDeploymentManifest(
  { ...manifestBody, manifestDigest },
  { environment: 'robinhood-chain-testnet', chainId: 46_630, manifestDigest, contractAddress: CONTRACT },
);

class InertRpc implements ReadonlyRpc {
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
  async call() {
    return asHexData('0x');
  }
}

async function path() {
  await mkdir('.checks', { recursive: true });
  const directory = await mkdtemp(resolve('.checks/m3-runtime-'));
  return resolve(directory, 'chain.sqlite');
}

test('M3 runtime owns one persistent store/synchronizer lifecycle and records only exact Vault calldata', async () => {
  const dbPath = await path();
  let runtime = new M3ChainRuntime({ dbPath, rpc: new InertRpc(), manifest });
  const calldata = encodeM3VaultCall('deposit(uint256)', [1_000_000n]);
  const submitted = runtime.recordSubmission({
    operationId: 'runtime-deposit-1',
    chainId: 46_630,
    owner: OWNER,
    target: CONTRACT,
    calldata,
    txHash: TX,
    submittedAt: '2026-09-19T12:00:00.000Z',
  });
  assert.equal(submitted.state, 'SUBMITTED');
  assert.equal(submitted.calldata, calldata);
  assert.deepEqual(
    runtime.recordSubmission({
      operationId: 'runtime-deposit-1',
      chainId: 46_630,
      owner: OWNER,
      target: CONTRACT,
      calldata,
      txHash: TX,
      submittedAt: '2026-09-19T12:00:00.000Z',
    }),
    submitted,
  );
  assert.throws(
    () =>
      runtime.recordSubmission({
        operationId: 'runtime-view',
        chainId: 46_630,
        owner: OWNER,
        target: CONTRACT,
        calldata: encodeM3VaultCall('owner()', []),
        txHash: asTransactionHash(`0x${'bb'.repeat(32)}`),
        submittedAt: '2026-09-19T12:00:00.000Z',
      }),
    /INVALID_M3_WALLET_SUBMISSION/,
  );
  runtime.close();

  runtime = new M3ChainRuntime({ dbPath, rpc: new InertRpc(), manifest });
  assert.equal(runtime.store.operation('runtime-deposit-1')?.calldata, calldata);
  assert.equal(runtime.chainEvidence.store, runtime.store);
  runtime.store.saveOperation({
    ...runtime.store.operation('runtime-deposit-1')!,
    operationId: 'runtime-conflict',
    chainId: 1,
  });
  assert.throws(
    () =>
      runtime.recordSubmission({
        operationId: 'runtime-conflict',
        chainId: 46_630,
        owner: OWNER,
        target: CONTRACT,
        calldata,
        txHash: TX,
        submittedAt: '2026-09-19T12:00:00.000Z',
      }),
    /OPERATION_IDENTITY_CONFLICT/,
  );
  runtime.close();
});

test('deployment-aware composition stays disabled without evidence and validates the exact ABI before startup', async () => {
  assert.equal(composeM3ChainRuntime({ deploymentStatus: 'NOT_DEPLOYED' }), null);
  const dbPath = await path();
  const runtime = composeM3ChainRuntime({
    deploymentStatus: 'DEPLOYED',
    dbPath,
    rpcEndpoints: ['https://rpc.testnet.chain.robinhood.com'],
    manifestDocument: { ...manifestBody, manifestDigest },
    expectedManifestDigest: manifestDigest,
    expectedContractAddress: CONTRACT,
  });
  assert.ok(runtime instanceof M3ChainRuntime);
  assert.equal(runtime.manifest.abiVersion, 'm3-vault-db620d6');
  runtime.close();

  const wrongBody = { ...manifestBody, abiVersion: 'other-reviewed-abi' };
  const wrongDigest = deploymentManifestDigest(wrongBody);
  const wrongDbPath = await path();
  assert.throws(
    () =>
      composeM3ChainRuntime({
        deploymentStatus: 'DEPLOYED',
        dbPath: wrongDbPath,
        rpcEndpoints: ['https://rpc.testnet.chain.robinhood.com'],
        manifestDocument: { ...wrongBody, manifestDigest: wrongDigest },
        expectedManifestDigest: wrongDigest,
        expectedContractAddress: CONTRACT,
      }),
    /M3_VAULT_ABI_MISMATCH/,
  );
});
