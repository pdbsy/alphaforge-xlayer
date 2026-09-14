import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ChainStore } from '../apps/server/src/chain-store.ts';
import { ChainSynchronizer } from '../apps/server/src/chain-sync.ts';
import type {
  ContractIntegration,
  DecodedContractEvent,
  ReconciliationResult,
} from '../packages/chain-adapter/src/reconciliation.ts';
import type {
  ChainBlock,
  ChainLog,
  ChainLogFilter,
  ChainReceipt,
  ReadonlyRpc,
} from '../packages/chain-adapter/src/rpc.ts';
import {
  asAddress,
  asBlockHash,
  asHexData,
  asTransactionHash,
  type HexData,
  type TransactionHash,
} from '../packages/chain-adapter/src/types.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import type { DeploymentManifest } from '../packages/chain-adapter/src/manifest.ts';

const CHAIN_ID = 46_630;
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const TX_A = asTransactionHash(`0x${'aa'.repeat(32)}`);
const TX_B = asTransactionHash(`0x${'bb'.repeat(32)}`);
const SIG = asHexData(`0x${'cc'.repeat(32)}`);
const UNKNOWN_SIG = asHexData(`0x${'dd'.repeat(32)}`);
const HASH_99 = asBlockHash(`0x${'09'.repeat(32)}`);
const HASH_100 = asBlockHash(`0x${'10'.repeat(32)}`);
const HASH_101 = asBlockHash(`0x${'11'.repeat(32)}`);
const HASH_101_ALT = asBlockHash(`0x${'12'.repeat(32)}`);
const HASH_102 = asBlockHash(`0x${'13'.repeat(32)}`);

const manifest: DeploymentManifest = Object.freeze({
  schemaVersion: 1,
  environment: 'robinhood-chain-testnet',
  chainId: CHAIN_ID,
  contractName: 'AlphaForgeVault',
  contractType: 'vault',
  contractAddress: CONTRACT,
  deploymentBlock: 100n,
  abiVersion: 'm3-owner-v1',
  manifestDigest: asBlockHash(`0x${'66'.repeat(32)}`),
  runtimeBytecodeHash: asBlockHash(`0x${'77'.repeat(32)}`),
});

function block(
  number: bigint,
  hash: ReturnType<typeof asBlockHash>,
  parentHash: ReturnType<typeof asBlockHash>,
): ChainBlock {
  return { number, hash, parentHash, timestamp: 1_000n + number };
}

function log(
  txHash: TransactionHash,
  blockNumber: bigint,
  blockHash: ReturnType<typeof asBlockHash>,
  topic: HexData = SIG,
): ChainLog {
  return {
    address: CONTRACT,
    blockNumber,
    blockHash,
    transactionHash: txHash,
    transactionIndex: 0,
    logIndex: 0,
    data: asHexData('0x1234'),
    topics: [topic],
    removed: false,
  };
}

function receipt(
  txHash: TransactionHash,
  blockNumber: bigint,
  blockHash: ReturnType<typeof asBlockHash>,
  status: 'SUCCESS' | 'REVERTED' = 'SUCCESS',
  logs: readonly ChainLog[] = [log(txHash, blockNumber, blockHash)],
): ChainReceipt {
  return {
    transactionHash: txHash,
    blockNumber,
    blockHash,
    transactionIndex: 0,
    from: OWNER,
    to: CONTRACT,
    status,
    logs,
  };
}

class FixtureRpc implements ReadonlyRpc {
  readonly blocks = new Map<bigint, ChainBlock>();
  readonly receipts = new Map<TransactionHash, ChainReceipt | null>();
  networkChainId = CHAIN_ID;
  head = 100n;

  async chainId() {
    return this.networkChainId;
  }
  async block(number: bigint | 'latest') {
    return this.blocks.get(number === 'latest' ? this.head : number) ?? null;
  }
  async receipt(hash: TransactionHash) {
    return this.receipts.get(hash) ?? null;
  }
  async logs(filter: ChainLogFilter) {
    const values: ChainLog[] = [];
    for (const item of this.receipts.values()) {
      if (!item) continue;
      for (const value of item.logs) {
        if (value.blockNumber >= filter.fromBlock && value.blockNumber <= filter.toBlock) values.push(value);
      }
    }
    return values;
  }
  async call() {
    return asHexData('0x');
  }
}

const integration: ContractIntegration = {
  decode(value): DecodedContractEvent | null {
    const signature = value.topics[0];
    if (!signature) return null;
    return {
      eventSignature: signature,
      eventName: signature === SIG ? 'OwnerActionObserved' : 'UnexpectedEvent',
      normalizedData: { owner: OWNER, amount: '1000000' },
    };
  },
  async rebuildProjections({
    events,
    block,
  }): Promise<readonly ReconciliationResult['projections'][number][]> {
    return events.some((value) => value.eventName === 'OwnerActionObserved')
      ? [
          {
            owner: OWNER,
            projectionKey: 'trend-vault',
            blockNumber: block.number,
            blockHash: block.hash,
            state: { strategyId: 'trend', principal: '1000000' },
          },
        ]
      : [];
  },
  async reconcileOperation({ events }): Promise<ReconciliationResult> {
    return events.some((value) => value.eventName === 'OwnerActionObserved')
      ? {
          status: 'MATCH',
          projections: [
            {
              owner: OWNER,
              projectionKey: 'trend-vault',
              blockNumber: events[0]!.blockNumber,
              blockHash: events[0]!.blockHash,
              state: { strategyId: 'trend', principal: '1000000' },
            },
          ],
        }
      : { status: 'MISMATCH', errorCode: 'EVENT_EVIDENCE_MISMATCH', projections: [] };
  },
};

async function databasePath() {
  await mkdir('.checks', { recursive: true });
  const directory = await mkdtemp(resolve('.checks/chain-sync-'));
  return resolve(directory, 'chain.sqlite');
}

function submitted(operationId: string, hash: TransactionHash) {
  return transitionOperation(
    createOperation({
      operationId,
      chainId: CHAIN_ID,
      owner: OWNER,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: hash, submittedAt: '2026-09-14T12:00:00.000Z' },
  );
}

test('indexer replay and restart keep one event and rebuildable wallet projection', async () => {
  const path = await databasePath();
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100));
  let store = new ChainStore(path);
  let sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 3 });
  assert.deepEqual(await sync.syncTo(100n), { scannedBlocks: 1, insertedEvents: 1, reorgedBlocks: 0 });
  assert.deepEqual(await sync.syncTo(100n), { scannedBlocks: 0, insertedEvents: 0, reorgedBlocks: 0 });
  store.close();

  store = new ChainStore(path);
  sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 3 });
  assert.deepEqual(await sync.syncTo(100n), { scannedBlocks: 0, insertedEvents: 0, reorgedBlocks: 0 });
  assert.equal(store.canonicalEvents(CHAIN_ID, CONTRACT).length, 1);
  assert.deepEqual(store.projection(CHAIN_ID, OWNER, CONTRACT, 'trend-vault')?.state, {
    principal: '1000000',
    strategyId: 'trend',
  });

  store.rollbackFromBlock(CHAIN_ID, CONTRACT, 100n);
  assert.deepEqual(await sync.syncTo(100n), { scannedBlocks: 1, insertedEvents: 1, reorgedBlocks: 0 });
  assert.equal(store.canonicalEvents(CHAIN_ID, CONTRACT).length, 1);
  store.close();
});

test('receipt and tx hash remain confirming until canonical event reconciliation reaches injected depth', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.blocks.set(101n, block(101n, HASH_101, HASH_100));
  rpc.blocks.set(102n, block(102n, HASH_102, HASH_101));
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100));
  rpc.head = 101n;
  const store = new ChainStore(await databasePath());
  store.saveOperation(submitted('operation-confirm', TX_A));
  const sync = new ChainSynchronizer({
    rpc,
    store,
    manifest,
    integration,
    confirmationDepth: 3,
    now: () => '2026-09-14T12:01:00.000Z',
  });

  const confirming = await sync.trackOperation('operation-confirm');
  assert.equal(confirming.state, 'CONFIRMING');
  assert.equal(confirming.confirmations, 2);
  assert.equal(confirming.confirmedAt, null);

  rpc.head = 102n;
  const confirmed = await sync.trackOperation('operation-confirm');
  assert.equal(confirmed.state, 'CONFIRMED');
  assert.equal(confirmed.confirmations, 3);
  assert.equal(confirmed.reconciled, true);
  assert.equal(confirmed.confirmedAt, '2026-09-14T12:01:00.000Z');
  store.close();
});

test('unexpected event evidence fails closed after a successful receipt', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100, 'SUCCESS', [log(TX_A, 100n, HASH_100, UNKNOWN_SIG)]));
  const store = new ChainStore(await databasePath());
  store.saveOperation(submitted('operation-mismatch', TX_A));
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  const result = await sync.trackOperation('operation-mismatch');
  assert.equal(result.state, 'RECONCILIATION_FAILED');
  assert.equal(result.errorCode, 'EVENT_EVIDENCE_MISMATCH');
  assert.equal(result.confirmedAt, null);
  store.close();
});

test('reverted receipt never creates a confirmed projection', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100, 'REVERTED', []));
  const store = new ChainStore(await databasePath());
  store.saveOperation(submitted('operation-reverted', TX_A));
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  const result = await sync.trackOperation('operation-reverted');
  assert.equal(result.state, 'REVERTED');
  assert.equal(result.receiptStatus, 'REVERTED');
  assert.equal(store.projection(CHAIN_ID, OWNER, CONTRACT, 'trend-vault'), null);
  store.close();
});

test('block-hash mismatch rewinds to a common ancestor and replays the canonical fork', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.blocks.set(101n, block(101n, HASH_101, HASH_100));
  rpc.receipts.set(TX_A, receipt(TX_A, 101n, HASH_101));
  rpc.head = 101n;
  const store = new ChainStore(await databasePath());
  store.saveOperation(submitted('operation-reorg', TX_A));
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  assert.equal((await sync.trackOperation('operation-reorg')).state, 'CONFIRMED');

  rpc.blocks.set(101n, block(101n, HASH_101_ALT, HASH_100));
  rpc.receipts.delete(TX_A);
  rpc.receipts.set(TX_B, receipt(TX_B, 101n, HASH_101_ALT));
  assert.deepEqual(await sync.syncTo(101n), { scannedBlocks: 1, insertedEvents: 1, reorgedBlocks: 1 });
  assert.equal(store.operation('operation-reorg')?.state, 'REORGED');
  assert.deepEqual(
    store.canonicalEvents(CHAIN_ID, CONTRACT).map((value) => value.transactionHash),
    [TX_B],
  );
  store.close();
});

test('replacement and dropped outcomes require explicit backend evidence', async () => {
  const rpc = new FixtureRpc();
  const store = new ChainStore(await databasePath());
  store.saveOperation(submitted('operation-replaced', TX_A));
  store.saveOperation(submitted('operation-dropped', TX_B));
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  assert.equal(sync.recordReplacement('operation-replaced', TX_B).state, 'REPLACED');
  assert.equal(sync.recordDropped('operation-dropped').state, 'DROPPED');
  store.close();
});

test('wrong-chain RPC fails before any checkpoint or projection is persisted', async () => {
  const rpc = new FixtureRpc();
  rpc.networkChainId = 1;
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  const store = new ChainStore(await databasePath());
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  await assert.rejects(() => sync.syncTo(100n), { code: 'CHAIN_ID_MISMATCH' });
  assert.equal(store.checkpoint(CHAIN_ID, CONTRACT), null);
  store.close();
});

test('provider logs outside the trusted contract and block fail closed', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  const foreignLog = {
    ...log(TX_A, 100n, HASH_100),
    address: asAddress('0x3333333333333333333333333333333333333333'),
  };
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100, 'SUCCESS', [foreignLog]));
  const store = new ChainStore(await databasePath());
  const sync = new ChainSynchronizer({ rpc, store, manifest, integration, confirmationDepth: 1 });
  await assert.rejects(() => sync.syncTo(100n), { code: 'CHAIN_LOG_MISMATCH' });
  assert.equal(store.checkpoint(CHAIN_ID, CONTRACT), null);
  store.close();
});

test('projection rebuild failure removes the partially indexed canonical block', async () => {
  const rpc = new FixtureRpc();
  rpc.blocks.set(100n, block(100n, HASH_100, HASH_99));
  rpc.receipts.set(TX_A, receipt(TX_A, 100n, HASH_100));
  const store = new ChainStore(await databasePath());
  const failingIntegration: ContractIntegration = {
    ...integration,
    async rebuildProjections() {
      throw new Error('fixture failure');
    },
  };
  const sync = new ChainSynchronizer({
    rpc,
    store,
    manifest,
    integration: failingIntegration,
    confirmationDepth: 1,
  });
  await assert.rejects(() => sync.syncTo(100n), { code: 'PROJECTION_REBUILD_FAILED' });
  assert.equal(store.checkpoint(CHAIN_ID, CONTRACT), null);
  assert.equal(store.canonicalEvents(CHAIN_ID, CONTRACT).length, 0);
  store.close();
});
