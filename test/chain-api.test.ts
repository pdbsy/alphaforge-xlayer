import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildApp } from '../apps/server/src/app.ts';
import { M3ChainRuntime } from '../apps/server/src/m3-chain-runtime.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import {
  deploymentManifestDigest,
  validateDeploymentManifest,
} from '../packages/chain-adapter/src/manifest.ts';
import type { ReadonlyRpc } from '../packages/chain-adapter/src/rpc.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';
import { encodeM3VaultCall } from '../packages/chain-adapter/src/vault-abi.ts';

const CHAIN_ID = 46_630;
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const OTHER_OWNER = asAddress('0x3333333333333333333333333333333333333333');
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const TX_HASH = asTransactionHash(`0x${'aa'.repeat(32)}`);
const BLOCK_HASH = asBlockHash(`0x${'bb'.repeat(32)}`);
const PARENT_HASH = asBlockHash(`0x${'cc'.repeat(32)}`);
const env = { QP_MODE: 'local', QP_ADAPTER: 'mock' };
const origin = 'http://127.0.0.1:4180';
const headers = { host: '127.0.0.1:4180' };
const manifestBody = {
  schemaVersion: 1,
  environment: 'robinhood-chain-testnet',
  chainId: CHAIN_ID,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: CONTRACT,
  deploymentBlock: '1',
  abiVersion: 'm3-vault-db620d6',
  runtimeBytecodeHash: asBlockHash(`0x${'99'.repeat(32)}`),
} as const;
const manifestDigest = deploymentManifestDigest(manifestBody);
const manifest = validateDeploymentManifest(
  { ...manifestBody, manifestDigest },
  { environment: 'robinhood-chain-testnet', chainId: CHAIN_ID, manifestDigest, contractAddress: CONTRACT },
);

class InertRpc implements ReadonlyRpc {
  async chainId() {
    return CHAIN_ID;
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

async function folder() {
  await mkdir('.checks', { recursive: true });
  return mkdtemp(resolve('.checks/chain-api-'));
}

function submitted(operationId: string) {
  return transitionOperation(
    createOperation({
      operationId,
      chainId: CHAIN_ID,
      owner: OWNER,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: TX_HASH, submittedAt: '2026-09-19T12:00:00.000Z' },
  );
}

test('server exposes its canonical operation evidence and hides owner mismatches as not found', async (t) => {
  const directory = await folder();
  const runtime = new M3ChainRuntime({
    dbPath: resolve(directory, 'chain.sqlite'),
    rpc: new InertRpc(),
    manifest,
  });
  const chainStore = runtime.store;
  chainStore.saveOperation(submitted('operation-api'));
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainRuntime: runtime,
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    url: `/api/v1/chain/operations/operation-api/evidence?owner=${OWNER}`,
    headers,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), {
    operationId: 'operation-api',
    lifecycle: 'SUBMITTED',
    receipt: 'PENDING',
    receiptCanonical: false,
    confirmations: 0,
    reconciliation: 'PENDING',
    projection: 'PENDING',
    chainStatus: 'PENDING',
    l1Status: 'UNKNOWN',
    finalityStatus: 'UNKNOWN',
    indexerStatus: 'SYNCING',
    degradedReason: null,
    productReady: false,
  });

  for (const url of [
    `/api/v1/chain/operations/operation-api/evidence?owner=${OTHER_OWNER}`,
    `/api/v1/chain/operations/missing/evidence?owner=${OWNER}`,
  ]) {
    const absent = await app.inject({ url, headers });
    assert.equal(absent.statusCode, 404);
    assert.equal(absent.json().error, 'CHAIN_OPERATION_NOT_FOUND');
  }
});

test('degraded indexer evidence remains readable and cannot claim product readiness', async (t) => {
  const directory = await folder();
  const runtime = new M3ChainRuntime({
    dbPath: resolve(directory, 'chain.sqlite'),
    rpc: new InertRpc(),
    manifest,
  });
  const chainStore = runtime.store;
  chainStore.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 1n, hash: BLOCK_HASH, parentHash: PARENT_HASH, timestamp: 1n },
    [],
  );
  chainStore.saveOperation(submitted('operation-degraded-api'));
  chainStore.markSyncUnhealthy(CHAIN_ID, CONTRACT, 'CHAIN_REORG_DEPTH_EXCEEDED');
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainRuntime: runtime,
  });
  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    url: `/api/v1/chain/operations/operation-degraded-api/evidence?owner=${OWNER}`,
    headers,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().indexerStatus, 'DEGRADED');
  assert.equal(response.json().degradedReason, 'CHAIN_REORG_DEPTH_EXCEEDED');
  assert.equal(response.json().projection, 'STALE');
  assert.equal(response.json().productReady, false);
});

test('same-process runtime exposes a recoverable owner projection without a demo identity', async (t) => {
  const directory = await folder();
  const runtime = new M3ChainRuntime({
    dbPath: resolve(directory, 'chain.sqlite'),
    rpc: new InertRpc(),
    manifest,
  });
  const chainStore = runtime.store;
  const block = { number: 1n, hash: BLOCK_HASH, parentHash: PARENT_HASH, timestamp: 1n };
  chainStore.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, []);
  chainStore.commitProjections(CHAIN_ID, CONTRACT, block, [
    {
      chainId: CHAIN_ID,
      owner: OWNER,
      contract: CONTRACT,
      projectionKey: 'm3-vault',
      blockNumber: 1n,
      blockHash: BLOCK_HASH,
      state: { principalBasis: '1000000', closed: false },
    },
  ]);
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainRuntime: runtime,
  });
  t.after(async () => app.close());

  const response = await app.inject({ url: `/api/v1/chain/vaults/${OWNER}`, headers });
  assert.equal(response.statusCode, 200, response.body);
  assert.deepEqual(response.json(), {
    chainId: CHAIN_ID,
    owner: OWNER,
    contract: CONTRACT,
    projectionKey: 'm3-vault',
    blockNumber: '1',
    blockHash: BLOCK_HASH,
    state: { closed: false, principalBasis: '1000000' },
  });
  const absent = await app.inject({ url: `/api/v1/chain/vaults/${OTHER_OWNER}`, headers });
  assert.equal(absent.statusCode, 404);
  assert.equal(absent.json().error, 'CHAIN_PROJECTION_NOT_FOUND');
});

test('Vault projection is unavailable before the first canonical synchronization', async (t) => {
  const directory = await folder();
  const runtime = new M3ChainRuntime({
    dbPath: resolve(directory, 'chain.sqlite'),
    rpc: new InertRpc(),
    manifest,
  });
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainRuntime: runtime,
  });
  t.after(async () => app.close());
  const response = await app.inject({ url: `/api/v1/chain/vaults/${OWNER}`, headers });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().error, 'CHAIN_PROJECTION_UNAVAILABLE');
});

test('submission API accepts only pending identity and rejects forged state or conflicts', async (t) => {
  const directory = await folder();
  const runtime = new M3ChainRuntime({
    dbPath: resolve(directory, 'chain.sqlite'),
    rpc: new InertRpc(),
    manifest,
    now: () => '2026-09-20T00:00:00.000Z',
  });
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainRuntime: runtime,
  });
  t.after(async () => app.close());
  const body = {
    operationId: 'submitted-via-api',
    chainId: CHAIN_ID,
    owner: OWNER,
    target: CONTRACT,
    calldata: encodeM3VaultCall('deposit(uint256)', [1_000_000n]),
    txHash: TX_HASH,
  };
  const request = (payload: Record<string, unknown>) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/chain/operations',
      headers: { ...headers, origin, 'x-quantpass-demo': '1' },
      payload,
    });
  const created = await request(body);
  assert.equal(created.statusCode, 202, created.body);
  assert.deepEqual(created.json(), {
    operationId: body.operationId,
    chainId: CHAIN_ID,
    owner: OWNER,
    target: CONTRACT,
    calldata: body.calldata,
    state: 'SUBMITTED',
    txHash: TX_HASH,
    submittedAt: '2026-09-20T00:00:00.000Z',
  });
  assert.deepEqual((await request(body)).json(), created.json());

  const conflict = await request({ ...body, txHash: asTransactionHash(`0x${'dd'.repeat(32)}`) });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error, 'CHAIN_OPERATION_CONFLICT');

  const duplicateTransaction = await request({ ...body, operationId: 'different-operation-id' });
  assert.equal(duplicateTransaction.statusCode, 409, duplicateTransaction.body);
  assert.equal(duplicateTransaction.json().error, 'CHAIN_OPERATION_CONFLICT');

  const wrongOrigin = await app.inject({
    method: 'POST',
    url: '/api/v1/chain/operations',
    headers: { ...headers, origin: 'http://localhost:9999', 'x-quantpass-demo': '1' },
    payload: { ...body, operationId: 'wrong-origin' },
  });
  assert.equal(wrongOrigin.statusCode, 403);

  const missingWriteHeader = await app.inject({
    method: 'POST',
    url: '/api/v1/chain/operations',
    headers: { ...headers, origin },
    payload: { ...body, operationId: 'missing-write-header' },
  });
  assert.equal(missingWriteHeader.statusCode, 403);

  for (const forged of [
    { ...body, state: 'CONFIRMED' },
    { ...body, productReady: true },
    { ...body, receipt: { status: 'SUCCESS' } },
    { ...body, submittedAt: '2026-09-20T00:00:00.000Z' },
  ]) {
    const rejected = await request(forged);
    assert.equal(rejected.statusCode, 400);
    assert.equal(rejected.json().error, 'INVALID_REQUEST');
  }
});
