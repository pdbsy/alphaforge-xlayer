import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildApp } from '../apps/server/src/app.ts';
import { ChainStore } from '../apps/server/src/chain-store.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { asAddress, asBlockHash, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

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
  const chainStore = new ChainStore(resolve(directory, 'chain.sqlite'));
  chainStore.saveOperation(submitted('operation-api'));
  const { app } = await buildApp({
    dbPath: resolve(directory, 'ledger.sqlite'),
    env,
    origin,
    chainEvidence: { store: chainStore, projectionKey: 'vault-a' },
  });
  t.after(async () => {
    await app.close();
    chainStore.close();
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
  const chainStore = new ChainStore(resolve(directory, 'chain.sqlite'));
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
    chainEvidence: { store: chainStore, projectionKey: 'vault-a' },
  });
  t.after(async () => {
    await app.close();
    chainStore.close();
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
