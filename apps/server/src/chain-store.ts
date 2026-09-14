import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  asAddress,
  asBlockHash,
  asHexData,
  asTransactionHash,
  sameAddress,
  type Address,
  type BlockHash,
  type HexData,
} from '../../../packages/chain-adapter/src/types.ts';
import type {
  ChainBlock,
  ChainLog,
} from '../../../packages/chain-adapter/src/rpc.ts';
import type {
  ChainOperation,
  OperationErrorCode,
  TransactionState,
} from '../../../packages/chain-adapter/src/lifecycle.ts';

export interface IndexedChainEvent extends ChainLog {
  readonly chainId: number;
  readonly eventSignature: HexData;
  readonly eventName: string;
  readonly normalizedData: Readonly<Record<string, unknown>>;
}

export interface ChainCheckpoint {
  readonly blockNumber: bigint;
  readonly blockHash: BlockHash;
}

export interface ProductProjection {
  readonly chainId: number;
  readonly owner: Address;
  readonly contract: Address;
  readonly projectionKey: string;
  readonly blockNumber: bigint;
  readonly blockHash: BlockHash;
  readonly state: Readonly<Record<string, unknown>>;
}

const expectedTables = [
  'chain_blocks',
  'chain_checkpoints',
  'chain_events',
  'chain_transactions',
  'product_projections',
];
const states = new Set<TransactionState>([
  'AWAITING_SIGNATURE',
  'SUBMITTED',
  'MINED',
  'CONFIRMING',
  'CONFIRMED',
  'REJECTED',
  'REVERTED',
  'REPLACED',
  'DROPPED',
  'REORGED',
  'RECONCILIATION_FAILED',
]);
const errorCodes = new Set<OperationErrorCode>([
  'WALLET_REJECTED',
  'TRANSACTION_REVERTED',
  'TRANSACTION_REPLACED',
  'TRANSACTION_DROPPED',
  'CHAIN_REORG',
  'EVENT_EVIDENCE_MISMATCH',
  'CONTRACT_STATE_MISMATCH',
  'RPC_UNAVAILABLE',
]);
const receiptStatuses = new Set(['SUCCESS', 'REVERTED']);
const namePattern = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;

function safeNumber(value: bigint, code = 'CHAIN_BLOCK_NUMBER_UNSUPPORTED'): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(code);
  return Number(value);
}

function chainId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_CHAIN_ID');
  return value;
}

function normalizedAddress(value: Address): string {
  return asAddress(value).toLowerCase();
}

function stable(value: unknown, seen = new Set<object>()): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('INVALID_CHAIN_JSON');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('INVALID_CHAIN_JSON');
    seen.add(value);
    const result = `[${value.map((entry) => stable(entry, seen)).join(',')}]`;
    seen.delete(value);
    return result;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) throw new Error('INVALID_CHAIN_JSON');
  seen.add(value);
  const record = value as Record<string, unknown>;
  const result = `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key], seen)}`)
    .join(',')}}`;
  seen.delete(value);
  return result;
}

function boundedJson(value: unknown): string {
  const json = stable(value);
  if (Buffer.byteLength(json, 'utf8') > 65_536) throw new Error('CHAIN_JSON_TOO_LARGE');
  return json;
}

function eventFingerprint(event: IndexedChainEvent): string {
  return boundedJson({
    address: normalizedAddress(event.address),
    blockNumber: event.blockNumber.toString(),
    blockHash: event.blockHash.toLowerCase(),
    transactionHash: event.transactionHash.toLowerCase(),
    transactionIndex: event.transactionIndex,
    logIndex: event.logIndex,
    data: event.data.toLowerCase(),
    topics: event.topics.map((topic) => topic.toLowerCase()),
    removed: event.removed,
    eventSignature: event.eventSignature.toLowerCase(),
    eventName: event.eventName,
    normalizedData: event.normalizedData,
  });
}

function eventPayloadFingerprint(event: IndexedChainEvent): string {
  return boundedJson({
    address: normalizedAddress(event.address),
    transactionHash: event.transactionHash.toLowerCase(),
    logIndex: event.logIndex,
    data: event.data.toLowerCase(),
    topics: event.topics.map((topic) => topic.toLowerCase()),
    removed: event.removed,
    eventSignature: event.eventSignature.toLowerCase(),
    eventName: event.eventName,
    normalizedData: event.normalizedData,
  });
}

function validateEvent(event: IndexedChainEvent, expectedChainId: number, contract: Address, block: ChainBlock): void {
  if (
    event.chainId !== expectedChainId ||
    !sameAddress(event.address, contract) ||
    event.blockNumber !== block.number ||
    event.blockHash.toLowerCase() !== block.hash.toLowerCase() ||
    event.removed ||
    !Number.isSafeInteger(event.transactionIndex) ||
    event.transactionIndex < 0 ||
    !Number.isSafeInteger(event.logIndex) ||
    event.logIndex < 0 ||
    !namePattern.test(event.eventName) ||
    event.topics.length < 1 ||
    event.topics[0]?.toLowerCase() !== event.eventSignature.toLowerCase()
  )
    throw new Error('INVALID_CHAIN_EVENT');
  eventFingerprint(event);
}

interface EventRow {
  chain_id: number;
  tx_hash: string;
  log_index: number;
  transaction_index: number;
  contract_address: string;
  block_number: number;
  block_hash: string;
  data: string;
  topics_json: string;
  event_signature: string;
  event_name: string;
  normalized_json: string;
  canonical: number;
}

interface OperationRow {
  operation_id: string;
  chain_id: number;
  tx_hash: string | null;
  owner_address: string;
  target_address: string;
  state: string;
  submitted_at: string | null;
  block_number: number | null;
  block_hash: string | null;
  receipt_status: string | null;
  confirmations: number;
  replacement_tx_hash: string | null;
  canonical: number;
  reconciled: number;
  confirmed_at: string | null;
  error_code: string | null;
}

export class ChainStore {
  readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;',
    );
    try {
      const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
      const tables = (
        this.db
          .prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
          .all() as { name: string }[]
      ).map((row) => row.name);
      if (version === 0) {
        if (tables.length) throw new Error('REFUSING_UNKNOWN_CHAIN_DATABASE');
        this.db.exec('BEGIN IMMEDIATE');
        try {
          this.db.exec(readFileSync(new URL('../chain-migrations/001-chain-projection.sql', import.meta.url), 'utf8'));
          this.db.exec('COMMIT');
        } catch (error) {
          this.db.exec('ROLLBACK');
          throw error;
        }
      } else if (version !== 1 || JSON.stringify(tables) !== JSON.stringify(expectedTables)) {
        throw new Error('UNSUPPORTED_CHAIN_DATABASE');
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  checkpoint(valueChainId: number, contract: Address): ChainCheckpoint | null {
    const row = this.db
      .prepare(
        'SELECT block_number, block_hash FROM chain_checkpoints WHERE chain_id = ? AND contract_address = ?',
      )
      .get(chainId(valueChainId), normalizedAddress(contract)) as
      | { block_number: number; block_hash: string }
      | undefined;
    return row
      ? Object.freeze({ blockNumber: BigInt(row.block_number), blockHash: asBlockHash(row.block_hash) })
      : null;
  }

  canonicalBlock(valueChainId: number, contract: Address, blockNumber: bigint): ChainBlock | null {
    const row = this.db
      .prepare(
        'SELECT block_number, block_hash, parent_hash, block_timestamp FROM chain_blocks WHERE chain_id = ? AND contract_address = ? AND block_number = ? AND canonical = 1',
      )
      .get(chainId(valueChainId), normalizedAddress(contract), safeNumber(blockNumber)) as
      | { block_number: number; block_hash: string; parent_hash: string; block_timestamp: string }
      | undefined;
    return row
      ? Object.freeze({
          number: BigInt(row.block_number),
          hash: asBlockHash(row.block_hash),
          parentHash: asBlockHash(row.parent_hash),
          timestamp: BigInt(row.block_timestamp),
        })
      : null;
  }

  recordCanonicalBlock(
    valueChainId: number,
    contract: Address,
    block: ChainBlock,
    events: readonly IndexedChainEvent[],
  ): { insertedEvents: number; checkpoint: ChainCheckpoint } {
    const id = chainId(valueChainId);
    const address = normalizedAddress(contract);
    const blockNumber = safeNumber(block.number);
    if (block.timestamp < 0n || !Number.isSafeInteger(events.length) || events.length > 10_000)
      throw new Error('INVALID_CHAIN_BLOCK');
    for (const item of events) validateEvent(item, id, contract, block);
    const sorted = [...events].sort(
      (left, right) => left.transactionIndex - right.transactionIndex || left.logIndex - right.logIndex,
    );
    const identities = new Set(sorted.map((item) => `${item.transactionHash.toLowerCase()}:${item.logIndex}`));
    if (identities.size !== sorted.length) throw new Error('CHAIN_EVENT_CONFLICT');

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.checkpoint(id, contract);
      const existingBlock = this.db
        .prepare(
          'SELECT block_hash, log_count FROM chain_blocks WHERE chain_id = ? AND contract_address = ? AND block_number = ? AND canonical = 1',
        )
        .get(id, address, blockNumber) as { block_hash: string; log_count: number } | undefined;
      if (existingBlock) {
        if (existingBlock.block_hash.toLowerCase() !== block.hash.toLowerCase() || existingBlock.log_count !== sorted.length)
          throw new Error('CHAIN_BLOCK_CONFLICT');
      } else if (
        current &&
        (block.number !== current.blockNumber + 1n || block.parentHash.toLowerCase() !== current.blockHash.toLowerCase())
      ) {
        throw new Error('CHAIN_PARENT_MISMATCH');
      } else if (!current || block.number > current.blockNumber) {
        this.db
          .prepare(
            'INSERT INTO chain_blocks (chain_id, contract_address, block_number, block_hash, parent_hash, block_timestamp, log_count, canonical) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          )
          .run(
            id,
            address,
            blockNumber,
            block.hash.toLowerCase(),
            block.parentHash.toLowerCase(),
            block.timestamp.toString(),
            sorted.length,
          );
      } else {
        throw new Error('CHAIN_BLOCK_OUT_OF_ORDER');
      }

      let insertedEvents = 0;
      for (const item of sorted) {
        const txHash = item.transactionHash.toLowerCase();
        const existing = this.db
          .prepare('SELECT * FROM chain_events WHERE chain_id = ? AND tx_hash = ? AND log_index = ?')
          .get(id, txHash, item.logIndex) as EventRow | undefined;
        if (existing) {
          const decoded = this.decodeEvent(existing);
          if (
            existing.canonical
              ? eventFingerprint(decoded) !== eventFingerprint(item)
              : eventPayloadFingerprint(decoded) !== eventPayloadFingerprint(item)
          )
            throw new Error('CHAIN_EVENT_CONFLICT');
          if (!existing.canonical) {
            this.db
              .prepare(
                'UPDATE chain_events SET transaction_index = ?, contract_address = ?, block_number = ?, block_hash = ?, data = ?, topics_json = ?, event_signature = ?, event_name = ?, normalized_json = ?, canonical = 1 WHERE chain_id = ? AND tx_hash = ? AND log_index = ?',
              )
              .run(
                item.transactionIndex,
                address,
                blockNumber,
                item.blockHash.toLowerCase(),
                item.data.toLowerCase(),
                boundedJson(item.topics.map((topic) => topic.toLowerCase())),
                item.eventSignature.toLowerCase(),
                item.eventName,
                boundedJson(item.normalizedData),
                id,
                txHash,
                item.logIndex,
              );
            insertedEvents++;
          }
          continue;
        }
        this.db
          .prepare(
            'INSERT INTO chain_events (chain_id, tx_hash, log_index, transaction_index, contract_address, block_number, block_hash, data, topics_json, event_signature, event_name, normalized_json, canonical) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
          )
          .run(
            id,
            txHash,
            item.logIndex,
            item.transactionIndex,
            address,
            blockNumber,
            item.blockHash.toLowerCase(),
            item.data.toLowerCase(),
            boundedJson(item.topics.map((topic) => topic.toLowerCase())),
            item.eventSignature.toLowerCase(),
            item.eventName,
            boundedJson(item.normalizedData),
          );
        insertedEvents++;
      }
      if (!current || block.number > current.blockNumber) {
        this.db
          .prepare(
            'INSERT INTO chain_checkpoints (chain_id, contract_address, block_number, block_hash) VALUES (?, ?, ?, ?) ON CONFLICT(chain_id, contract_address) DO UPDATE SET block_number = excluded.block_number, block_hash = excluded.block_hash',
          )
          .run(id, address, blockNumber, block.hash.toLowerCase());
      }
      this.db.exec('COMMIT');
      return {
        insertedEvents,
        checkpoint: Object.freeze({ blockNumber: block.number, blockHash: block.hash }),
      };
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private decodeEvent(row: EventRow): IndexedChainEvent {
    let topics: unknown;
    let normalizedData: unknown;
    try {
      topics = JSON.parse(row.topics_json);
      normalizedData = JSON.parse(row.normalized_json);
    } catch {
      throw new Error('CORRUPT_CHAIN_DATABASE');
    }
    if (!Array.isArray(topics) || !normalizedData || typeof normalizedData !== 'object' || Array.isArray(normalizedData))
      throw new Error('CORRUPT_CHAIN_DATABASE');
    try {
      return Object.freeze({
        chainId: row.chain_id,
        address: asAddress(row.contract_address),
        blockNumber: BigInt(row.block_number),
        blockHash: asBlockHash(row.block_hash),
        transactionHash: asTransactionHash(row.tx_hash),
        transactionIndex: row.transaction_index,
        logIndex: row.log_index,
        data: asHexData(row.data),
        topics: Object.freeze(topics.map((topic) => asHexData(String(topic)))),
        removed: false,
        eventSignature: asHexData(row.event_signature),
        eventName: row.event_name,
        normalizedData: Object.freeze(normalizedData as Record<string, unknown>),
      });
    } catch {
      throw new Error('CORRUPT_CHAIN_DATABASE');
    }
  }

  canonicalEvents(valueChainId: number, contract: Address): readonly IndexedChainEvent[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM chain_events WHERE chain_id = ? AND contract_address = ? AND canonical = 1 ORDER BY block_number, transaction_index, log_index',
      )
      .all(chainId(valueChainId), normalizedAddress(contract)) as unknown as EventRow[];
    return Object.freeze(rows.map((row) => this.decodeEvent(row)));
  }

  saveOperation(operation: ChainOperation): void {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(operation.operationId))
      throw new Error('INVALID_OPERATION_ID');
    const previous = this.operation(operation.operationId);
    if (
      previous &&
      (previous.chainId !== operation.chainId ||
        !sameAddress(previous.owner, operation.owner) ||
        !sameAddress(previous.target, operation.target) ||
        (previous.txHash && operation.txHash && previous.txHash.toLowerCase() !== operation.txHash.toLowerCase()))
    )
      throw new Error('OPERATION_IDENTITY_CONFLICT');
    this.db
      .prepare(
        `INSERT INTO chain_transactions
          (operation_id, chain_id, tx_hash, owner_address, target_address, state, submitted_at, block_number, block_hash, receipt_status, confirmations, replacement_tx_hash, canonical, reconciled, confirmed_at, error_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(operation_id) DO UPDATE SET
          tx_hash = excluded.tx_hash, state = excluded.state, submitted_at = excluded.submitted_at,
          block_number = excluded.block_number, block_hash = excluded.block_hash,
          receipt_status = excluded.receipt_status, confirmations = excluded.confirmations,
          replacement_tx_hash = excluded.replacement_tx_hash, canonical = excluded.canonical,
          reconciled = excluded.reconciled, confirmed_at = excluded.confirmed_at, error_code = excluded.error_code`,
      )
      .run(
        operation.operationId,
        chainId(operation.chainId),
        operation.txHash?.toLowerCase() ?? null,
        normalizedAddress(operation.owner),
        normalizedAddress(operation.target),
        operation.state,
        operation.submittedAt,
        operation.blockNumber === null ? null : safeNumber(operation.blockNumber),
        operation.blockHash?.toLowerCase() ?? null,
        operation.receiptStatus,
        operation.confirmations,
        operation.replacementTxHash?.toLowerCase() ?? null,
        operation.canonical ? 1 : 0,
        operation.reconciled ? 1 : 0,
        operation.confirmedAt,
        operation.errorCode,
      );
  }

  operation(operationId: string): ChainOperation | null {
    const row = this.db
      .prepare('SELECT * FROM chain_transactions WHERE operation_id = ?')
      .get(operationId) as OperationRow | undefined;
    if (!row) return null;
    if (
      !states.has(row.state as TransactionState) ||
      (row.receipt_status !== null && !receiptStatuses.has(row.receipt_status)) ||
      (row.error_code !== null && !errorCodes.has(row.error_code as OperationErrorCode))
    )
      throw new Error('CORRUPT_CHAIN_DATABASE');
    try {
      return Object.freeze({
        operationId: row.operation_id,
        chainId: row.chain_id,
        owner: asAddress(row.owner_address),
        target: asAddress(row.target_address),
        state: row.state as TransactionState,
        txHash: row.tx_hash === null ? null : asTransactionHash(row.tx_hash),
        submittedAt: row.submitted_at,
        blockNumber: row.block_number === null ? null : BigInt(row.block_number),
        blockHash: row.block_hash === null ? null : asBlockHash(row.block_hash),
        receiptStatus: row.receipt_status as 'SUCCESS' | 'REVERTED' | null,
        confirmations: row.confirmations,
        replacementTxHash:
          row.replacement_tx_hash === null ? null : asTransactionHash(row.replacement_tx_hash),
        canonical: row.canonical === 1,
        reconciled: row.reconciled === 1,
        confirmedAt: row.confirmed_at,
        errorCode: row.error_code as OperationErrorCode | null,
      });
    } catch {
      throw new Error('CORRUPT_CHAIN_DATABASE');
    }
  }

  putProjection(projection: ProductProjection): void {
    if (!namePattern.test(projection.projectionKey)) throw new Error('INVALID_PROJECTION_KEY');
    const block = this.canonicalBlock(
      projection.chainId,
      projection.contract,
      projection.blockNumber,
    );
    if (!block || block.hash.toLowerCase() !== projection.blockHash.toLowerCase())
      throw new Error('PROJECTION_BLOCK_NOT_CANONICAL');
    this.db
      .prepare(
        'INSERT INTO product_projections (chain_id, owner_address, contract_address, projection_key, block_number, block_hash, state_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, owner_address, contract_address, projection_key) DO UPDATE SET block_number = excluded.block_number, block_hash = excluded.block_hash, state_json = excluded.state_json',
      )
      .run(
        chainId(projection.chainId),
        normalizedAddress(projection.owner),
        normalizedAddress(projection.contract),
        projection.projectionKey,
        safeNumber(projection.blockNumber),
        projection.blockHash.toLowerCase(),
        boundedJson(projection.state),
      );
  }

  projection(
    valueChainId: number,
    owner: Address,
    contract: Address,
    projectionKey: string,
  ): ProductProjection | null {
    const row = this.db
      .prepare(
        'SELECT block_number, block_hash, state_json FROM product_projections WHERE chain_id = ? AND owner_address = ? AND contract_address = ? AND projection_key = ?',
      )
      .get(chainId(valueChainId), normalizedAddress(owner), normalizedAddress(contract), projectionKey) as
      | { block_number: number; block_hash: string; state_json: string }
      | undefined;
    if (!row) return null;
    try {
      const state = JSON.parse(row.state_json) as unknown;
      if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error();
      return Object.freeze({
        chainId: valueChainId,
        owner,
        contract,
        projectionKey,
        blockNumber: BigInt(row.block_number),
        blockHash: asBlockHash(row.block_hash),
        state: Object.freeze(state as Record<string, unknown>),
      });
    } catch {
      throw new Error('CORRUPT_CHAIN_DATABASE');
    }
  }

  rollbackFromBlock(
    valueChainId: number,
    contract: Address,
    fromBlock: bigint,
  ): { blocks: number; events: number; operations: number; projections: number } {
    const id = chainId(valueChainId);
    const address = normalizedAddress(contract);
    const number = safeNumber(fromBlock);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const blocks = this.db
        .prepare(
          'UPDATE chain_blocks SET canonical = 0 WHERE chain_id = ? AND contract_address = ? AND block_number >= ? AND canonical = 1',
        )
        .run(id, address, number).changes;
      const events = this.db
        .prepare(
          'UPDATE chain_events SET canonical = 0 WHERE chain_id = ? AND contract_address = ? AND block_number >= ? AND canonical = 1',
        )
        .run(id, address, number).changes;
      const operations = this.db
        .prepare(
          `UPDATE chain_transactions SET state = 'REORGED', canonical = 0, reconciled = 0,
            confirmed_at = NULL, error_code = 'CHAIN_REORG'
           WHERE chain_id = ? AND target_address = ? AND block_number >= ?
             AND state IN ('MINED', 'CONFIRMING', 'CONFIRMED', 'REVERTED', 'RECONCILIATION_FAILED')`,
        )
        .run(id, address, number).changes;
      const projections = this.db
        .prepare(
          'DELETE FROM product_projections WHERE chain_id = ? AND contract_address = ? AND block_number >= ?',
        )
        .run(id, address, number).changes;
      const previous = this.db
        .prepare(
          'SELECT block_number, block_hash FROM chain_blocks WHERE chain_id = ? AND contract_address = ? AND canonical = 1 ORDER BY block_number DESC LIMIT 1',
        )
        .get(id, address) as { block_number: number; block_hash: string } | undefined;
      if (previous) {
        this.db
          .prepare(
            'UPDATE chain_checkpoints SET block_number = ?, block_hash = ? WHERE chain_id = ? AND contract_address = ?',
          )
          .run(previous.block_number, previous.block_hash, id, address);
      } else {
        this.db
          .prepare('DELETE FROM chain_checkpoints WHERE chain_id = ? AND contract_address = ?')
          .run(id, address);
      }
      this.db.exec('COMMIT');
      return {
        blocks: Number(blocks),
        events: Number(events),
        operations: Number(operations),
        projections: Number(projections),
      };
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
