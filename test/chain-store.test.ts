import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ChainStore, type IndexedChainEvent } from '../apps/server/src/chain-store.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import type { ChainOperation } from '../packages/chain-adapter/src/lifecycle.ts';

const CHAIN_ID = 46_630;
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const OWNER_A = asAddress('0x1111111111111111111111111111111111111111');
const OWNER_B = asAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
const BLOCK_99 = asBlockHash(`0x${'09'.repeat(32)}`);
const BLOCK_100 = asBlockHash(`0x${'10'.repeat(32)}`);
const BLOCK_101 = asBlockHash(`0x${'11'.repeat(32)}`);
const BLOCK_101_ALT = asBlockHash(`0x${'12'.repeat(32)}`);
const TX_A = asTransactionHash(`0x${'aa'.repeat(32)}`);
const TX_B = asTransactionHash(`0x${'bb'.repeat(32)}`);
const SIGNATURE = asHexData(`0x${'cc'.repeat(32)}`);

async function databasePath() {
  await mkdir('.checks', { recursive: true });
  const directory = await mkdtemp(resolve('.checks/chain-store-'));
  return resolve(directory, 'chain.sqlite');
}

function event(overrides: Partial<IndexedChainEvent> = {}): IndexedChainEvent {
  return {
    chainId: CHAIN_ID,
    address: CONTRACT,
    blockNumber: 100n,
    blockHash: BLOCK_100,
    transactionHash: TX_A,
    transactionIndex: 1,
    logIndex: 0,
    data: asHexData('0x1234'),
    topics: [SIGNATURE],
    removed: false,
    eventSignature: SIGNATURE,
    eventName: 'OwnerActionObserved',
    normalizedData: { owner: OWNER_A, amount: '1000000' },
    ...overrides,
  };
}

test('duplicate chain event observation is idempotent across restart', async () => {
  const path = await databasePath();
  let store = new ChainStore(path);
  const block = { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n };
  assert.deepEqual(store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event()]), {
    insertedEvents: 1,
    checkpoint: { blockNumber: 100n, blockHash: BLOCK_100 },
  });
  assert.deepEqual(store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event()]), {
    insertedEvents: 0,
    checkpoint: { blockNumber: 100n, blockHash: BLOCK_100 },
  });
  store.close();
  store = new ChainStore(path);
  assert.deepEqual(store.canonicalEvents(CHAIN_ID, CONTRACT), [event()]);
  assert.deepEqual(store.checkpoint(CHAIN_ID, CONTRACT), {
    blockNumber: 100n,
    blockHash: BLOCK_100,
  });
  store.close();
});

test('canonical events are read in block, transaction and log order', async () => {
  const store = new ChainStore(await databasePath());
  const laterTransaction = event({ transactionHash: TX_B, transactionIndex: 2, logIndex: 0 });
  const laterLog = event({ transactionHash: TX_A, transactionIndex: 1, logIndex: 2 });
  const firstLog = event({ transactionHash: TX_A, transactionIndex: 1, logIndex: 0 });
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
    [laterTransaction, laterLog, firstLog],
  );
  assert.deepEqual(
    store.canonicalEvents(CHAIN_ID, CONTRACT).map((value) => [value.transactionHash, value.logIndex]),
    [
      [TX_A, 0],
      [TX_A, 2],
      [TX_B, 0],
    ],
  );
  store.close();
});

test('conflicting duplicate identity fails without changing canonical evidence', async () => {
  const store = new ChainStore(await databasePath());
  const block = { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n };
  store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event()]);
  assert.throws(
    () => store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event({ data: asHexData('0xffff') })]),
    /CHAIN_EVENT_CONFLICT/,
  );
  assert.deepEqual(store.canonicalEvents(CHAIN_ID, CONTRACT), [event()]);
  store.close();
});

test('same block and event count cannot replay a different canonical event set', async () => {
  const store = new ChainStore(await databasePath());
  const block = { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n };
  store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event()]);
  assert.throws(
    () => store.recordCanonicalBlock(CHAIN_ID, CONTRACT, block, [event({ transactionHash: TX_B })]),
    /CHAIN_BLOCK_CONFLICT/,
  );
  assert.deepEqual(store.canonicalEvents(CHAIN_ID, CONTRACT), [event()]);
  store.close();
});

test('rollback marks displaced evidence and operations reorged and removes newer projections', async () => {
  const store = new ChainStore(await databasePath());
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
    [],
  );
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 101n, hash: BLOCK_101, parentHash: BLOCK_100, timestamp: 1_010n },
    [event({ blockNumber: 101n, blockHash: BLOCK_101 })],
  );
  const submitted = transitionOperation(
    createOperation({
      operationId: 'operation-reorg',
      chainId: CHAIN_ID,
      owner: OWNER_A,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: TX_A, submittedAt: '2026-09-14T12:00:00.000Z' },
  );
  const mined = transitionOperation(submitted, {
    state: 'MINED',
    blockNumber: 101n,
    blockHash: BLOCK_101,
    receiptStatus: 'SUCCESS',
  });
  store.saveOperation(transitionOperation(mined, { state: 'CONFIRMING', confirmations: 1 }));
  store.putProjection({
    chainId: CHAIN_ID,
    owner: OWNER_A,
    contract: CONTRACT,
    projectionKey: 'vault-a',
    blockNumber: 101n,
    blockHash: BLOCK_101,
    state: { principal: '1000000' },
  });

  assert.deepEqual(store.rollbackFromBlock(CHAIN_ID, CONTRACT, 101n), {
    blocks: 1,
    events: 1,
    operations: 1,
    projections: 1,
  });
  assert.deepEqual(store.checkpoint(CHAIN_ID, CONTRACT), {
    blockNumber: 100n,
    blockHash: BLOCK_100,
  });
  assert.equal(store.canonicalEvents(CHAIN_ID, CONTRACT).length, 0);
  assert.equal(store.operation('operation-reorg')?.state, 'REORGED');
  assert.equal(store.operation('operation-reorg')?.canonical, false);
  assert.equal(store.projection(CHAIN_ID, OWNER_A, CONTRACT, 'vault-a'), null);
  store.close();
});

test('a reorged event may reappear under a new canonical block without duplicating its identity', async () => {
  const store = new ChainStore(await databasePath());
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
    [],
  );
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 101n, hash: BLOCK_101, parentHash: BLOCK_100, timestamp: 1_010n },
    [event({ blockNumber: 101n, blockHash: BLOCK_101 })],
  );
  store.rollbackFromBlock(CHAIN_ID, CONTRACT, 101n);
  const replacement = event({ blockNumber: 101n, blockHash: BLOCK_101_ALT });
  assert.deepEqual(
    store.recordCanonicalBlock(
      CHAIN_ID,
      CONTRACT,
      { number: 101n, hash: BLOCK_101_ALT, parentHash: BLOCK_100, timestamp: 1_011n },
      [replacement],
    ),
    { insertedEvents: 1, checkpoint: { blockNumber: 101n, blockHash: BLOCK_101_ALT } },
  );
  assert.deepEqual(store.canonicalEvents(CHAIN_ID, CONTRACT), [replacement]);
  store.close();
});

test('cyclic normalized event data fails with a bounded store error', async () => {
  const store = new ChainStore(await databasePath());
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(
    () =>
      store.recordCanonicalBlock(
        CHAIN_ID,
        CONTRACT,
        { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
        [event({ normalizedData: cyclic })],
      ),
    /INVALID_CHAIN_JSON/,
  );
  assert.equal(store.checkpoint(CHAIN_ID, CONTRACT), null);
  store.close();
});

test('cyclic arrays in normalized event data fail without recursion exhaustion', async () => {
  const store = new ChainStore(await databasePath());
  const list: unknown[] = [];
  list.push(list);
  assert.throws(
    () =>
      store.recordCanonicalBlock(
        CHAIN_ID,
        CONTRACT,
        { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
        [event({ normalizedData: { list } })],
      ),
    /INVALID_CHAIN_JSON/,
  );
  store.close();
});

test('wallet projections remain independent and do not imply product-account ownership', async () => {
  const store = new ChainStore(await databasePath());
  store.recordCanonicalBlock(
    CHAIN_ID,
    CONTRACT,
    { number: 100n, hash: BLOCK_100, parentHash: BLOCK_99, timestamp: 1_000n },
    [],
  );
  for (const [owner, principal] of [
    [OWNER_A, '1000000'],
    [OWNER_B, '2500000'],
  ] as const) {
    store.putProjection({
      chainId: CHAIN_ID,
      owner,
      contract: CONTRACT,
      projectionKey: 'vault-shared-key',
      blockNumber: 100n,
      blockHash: BLOCK_100,
      state: { principal },
    });
  }
  assert.deepEqual(store.projection(CHAIN_ID, OWNER_A, CONTRACT, 'vault-shared-key')?.state, {
    principal: '1000000',
  });
  assert.deepEqual(store.projection(CHAIN_ID, OWNER_B, CONTRACT, 'vault-shared-key')?.state, {
    principal: '2500000',
  });
  store.close();
});

test('chain store refuses an unrelated database instead of mutating it', async () => {
  const path = await databasePath();
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE unrelated (value TEXT);');
  db.close();
  assert.throws(() => new ChainStore(path), /REFUSING_UNKNOWN_CHAIN_DATABASE/);
  const reopened = new DatabaseSync(path);
  assert.deepEqual(
    (reopened.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as { name: string }[]).map(
      (row) => row.name,
    ),
    ['unrelated'],
  );
  reopened.close();
});

test('chain store migrates to projection-aware checkpoints and rejects forged confirmed operations', async () => {
  const store = new ChainStore(await databasePath());
  assert.equal(store.db.prepare('PRAGMA user_version').get()?.user_version, 2);
  const submitted = transitionOperation(
    createOperation({
      operationId: 'forged-confirmed',
      chainId: CHAIN_ID,
      owner: OWNER_A,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: TX_A, submittedAt: '2026-09-14T12:00:00.000Z' },
  );
  const forged = {
    ...submitted,
    state: 'CONFIRMED',
    blockNumber: 100n,
    blockHash: BLOCK_100,
    receiptStatus: null,
    confirmations: 3,
    canonical: true,
    reconciled: true,
    confirmedAt: '2026-09-14T12:01:00.000Z',
  } as ChainOperation;
  assert.throws(() => store.saveOperation(forged), /INVALID_OPERATION_EVIDENCE/);
  assert.equal(store.operation('forged-confirmed'), null);
  store.close();
});

test('existing version-one chain database migrates without losing indexed evidence', async () => {
  const path = await databasePath();
  const legacy = new DatabaseSync(path);
  legacy.exec(
    readFileSync(
      new URL('../apps/server/chain-migrations/001-chain-projection.sql', import.meta.url),
      'utf8',
    ),
  );
  legacy
    .prepare(
      'INSERT INTO chain_blocks (chain_id, contract_address, block_number, block_hash, parent_hash, block_timestamp, log_count, canonical) VALUES (?, ?, ?, ?, ?, ?, 0, 1)',
    )
    .run(CHAIN_ID, CONTRACT.toLowerCase(), 100, BLOCK_100.toLowerCase(), BLOCK_99.toLowerCase(), '1000');
  legacy
    .prepare(
      'INSERT INTO chain_checkpoints (chain_id, contract_address, block_number, block_hash) VALUES (?, ?, ?, ?)',
    )
    .run(CHAIN_ID, CONTRACT.toLowerCase(), 100, BLOCK_100.toLowerCase());
  legacy.close();

  const store = new ChainStore(path);
  assert.equal(store.db.prepare('PRAGMA user_version').get()?.user_version, 2);
  assert.deepEqual(store.checkpoint(CHAIN_ID, CONTRACT), {
    blockNumber: 100n,
    blockHash: BLOCK_100,
  });
  assert.equal(store.projectionCheckpoint(CHAIN_ID, CONTRACT), null);
  assert.deepEqual(store.syncHealth(CHAIN_ID, CONTRACT), { healthy: true, error: null });
  store.close();
});
