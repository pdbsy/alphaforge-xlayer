import type { ChainStore, IndexedChainEvent } from './chain-store.ts';
import { transitionOperation, type ChainOperation } from '../../../packages/chain-adapter/src/lifecycle.ts';
import type { DeploymentManifest } from '../../../packages/chain-adapter/src/manifest.ts';
import type {
  ContractIntegration,
  ProjectionCandidate,
} from '../../../packages/chain-adapter/src/reconciliation.ts';
import type { ChainBlock, ChainLog, ReadonlyRpc } from '../../../packages/chain-adapter/src/rpc.ts';
import { sameAddress, sameHash, type TransactionHash } from '../../../packages/chain-adapter/src/types.ts';

export type ChainSyncFailureCode =
  | 'CHAIN_ID_MISMATCH'
  | 'CHAIN_HEAD_UNAVAILABLE'
  | 'CHAIN_HEAD_BEFORE_DEPLOYMENT'
  | 'CHAIN_SYNC_RANGE_EXCEEDED'
  | 'CHAIN_REORG_DEPTH_EXCEEDED'
  | 'CHAIN_BLOCK_UNAVAILABLE'
  | 'CHAIN_BLOCK_MISMATCH'
  | 'CHAIN_LOG_MISMATCH'
  | 'PROJECTION_REBUILD_FAILED'
  | 'OPERATION_NOT_FOUND'
  | 'OPERATION_NOT_TRACKABLE'
  | 'RECEIPT_EVIDENCE_MISMATCH';

export class ChainSyncFailure extends Error {
  readonly code: ChainSyncFailureCode;

  constructor(code: ChainSyncFailureCode) {
    super(code);
    this.name = 'ChainSyncFailure';
    this.code = code;
  }
}

export interface ChainSynchronizerOptions {
  readonly rpc: ReadonlyRpc;
  readonly store: ChainStore;
  readonly manifest: DeploymentManifest;
  readonly integration: ContractIntegration;
  readonly confirmationDepth: number;
  readonly maxBlocksPerSync?: number;
  readonly maxReorgDepth?: number;
  readonly now?: () => string;
}

export interface ChainSyncResult {
  readonly scannedBlocks: number;
  readonly insertedEvents: number;
  readonly reorgedBlocks: number;
}

function safePolicy(value: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw new Error('INVALID_CHAIN_SYNC_POLICY');
  return value;
}

function toCount(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ChainSyncFailure('CHAIN_SYNC_RANGE_EXCEEDED');
  return Number(value);
}

function validLog(log: ChainLog, block: ChainBlock, manifest: DeploymentManifest): boolean {
  return (
    sameAddress(log.address, manifest.contractAddress) &&
    log.blockNumber === block.number &&
    sameHash(log.blockHash, block.hash) &&
    !log.removed
  );
}

export class ChainSynchronizer {
  readonly #rpc: ReadonlyRpc;
  readonly #store: ChainStore;
  readonly #manifest: DeploymentManifest;
  readonly #integration: ContractIntegration;
  readonly #confirmationDepth: number;
  readonly #maxBlocksPerSync: number;
  readonly #maxReorgDepth: number;
  readonly #now: () => string;

  constructor(options: ChainSynchronizerOptions) {
    this.#rpc = options.rpc;
    this.#store = options.store;
    this.#manifest = options.manifest;
    this.#integration = options.integration;
    this.#confirmationDepth = safePolicy(options.confirmationDepth, 10_000);
    this.#maxBlocksPerSync = safePolicy(options.maxBlocksPerSync ?? 2_000, 100_000);
    this.#maxReorgDepth = safePolicy(options.maxReorgDepth ?? 128, 10_000);
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async #assertChain(): Promise<void> {
    if ((await this.#rpc.chainId()) !== this.#manifest.chainId)
      throw new ChainSyncFailure('CHAIN_ID_MISMATCH');
  }

  async #rewindIfNeeded(): Promise<number> {
    const checkpoint = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
    if (!checkpoint) return 0;
    const remoteCheckpoint = await this.#rpc.block(checkpoint.blockNumber);
    if (remoteCheckpoint && sameHash(remoteCheckpoint.hash, checkpoint.blockHash)) return 0;

    let candidate = checkpoint.blockNumber - 1n;
    let searched = 1;
    while (candidate >= this.#manifest.deploymentBlock && searched <= this.#maxReorgDepth) {
      const local = this.#store.canonicalBlock(
        this.#manifest.chainId,
        this.#manifest.contractAddress,
        candidate,
      );
      const remote = await this.#rpc.block(candidate);
      if (local && remote && sameHash(local.hash, remote.hash)) {
        return this.#store.rollbackFromBlock(
          this.#manifest.chainId,
          this.#manifest.contractAddress,
          candidate + 1n,
        ).blocks;
      }
      candidate--;
      searched++;
    }
    if (candidate >= this.#manifest.deploymentBlock) throw new ChainSyncFailure('CHAIN_REORG_DEPTH_EXCEEDED');
    return this.#store.rollbackFromBlock(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
      this.#manifest.deploymentBlock,
    ).blocks;
  }

  #decodeLogs(logs: readonly ChainLog[], block: ChainBlock): readonly IndexedChainEvent[] {
    const events: IndexedChainEvent[] = [];
    for (const log of logs) {
      if (!validLog(log, block, this.#manifest)) throw new ChainSyncFailure('CHAIN_LOG_MISMATCH');
      const decoded = this.#integration.decode(log);
      if (!decoded) continue;
      events.push(Object.freeze({ ...log, chainId: this.#manifest.chainId, ...decoded }));
    }
    return Object.freeze(events);
  }

  #putProjections(projections: readonly ProjectionCandidate[]): void {
    for (const projection of projections) {
      this.#store.putProjection({
        ...projection,
        chainId: this.#manifest.chainId,
        contract: this.#manifest.contractAddress,
      });
    }
  }

  async syncTo(head: bigint): Promise<ChainSyncResult> {
    await this.#assertChain();
    if (head < this.#manifest.deploymentBlock) throw new ChainSyncFailure('CHAIN_HEAD_BEFORE_DEPLOYMENT');
    const remoteHead = await this.#rpc.block(head);
    if (!remoteHead) throw new ChainSyncFailure('CHAIN_HEAD_UNAVAILABLE');
    if (remoteHead.number !== head) throw new ChainSyncFailure('CHAIN_BLOCK_MISMATCH');

    const reorgedBlocks = await this.#rewindIfNeeded();
    const checkpoint = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
    const start = checkpoint ? checkpoint.blockNumber + 1n : this.#manifest.deploymentBlock;
    if (start > head) return { scannedBlocks: 0, insertedEvents: 0, reorgedBlocks };
    const count = toCount(head - start + 1n);
    if (count > this.#maxBlocksPerSync) throw new ChainSyncFailure('CHAIN_SYNC_RANGE_EXCEEDED');

    let insertedEvents = 0;
    for (let number = start; number <= head; number++) {
      const current = await this.#rpc.block(number);
      if (!current) throw new ChainSyncFailure('CHAIN_BLOCK_UNAVAILABLE');
      if (current.number !== number) throw new ChainSyncFailure('CHAIN_BLOCK_MISMATCH');
      const previous = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
      if (previous && !sameHash(current.parentHash, previous.blockHash))
        throw new ChainSyncFailure('CHAIN_BLOCK_MISMATCH');
      const logs = await this.#rpc.logs({
        address: this.#manifest.contractAddress,
        fromBlock: number,
        toBlock: number,
      });
      const events = this.#decodeLogs(logs, current);
      insertedEvents += this.#store.recordCanonicalBlock(
        this.#manifest.chainId,
        this.#manifest.contractAddress,
        current,
        events,
      ).insertedEvents;
      try {
        this.#putProjections(
          await this.#integration.rebuildProjections({
            rpc: this.#rpc,
            manifest: this.#manifest,
            events: this.#store.canonicalEvents(this.#manifest.chainId, this.#manifest.contractAddress),
            block: current,
          }),
        );
      } catch {
        this.#store.rollbackFromBlock(this.#manifest.chainId, this.#manifest.contractAddress, number);
        throw new ChainSyncFailure('PROJECTION_REBUILD_FAILED');
      }
    }
    return { scannedBlocks: count, insertedEvents, reorgedBlocks };
  }

  async trackOperation(operationId: string): Promise<ChainOperation> {
    let operation = this.#store.operation(operationId);
    if (!operation) throw new ChainSyncFailure('OPERATION_NOT_FOUND');
    if (
      !operation.txHash ||
      operation.chainId !== this.#manifest.chainId ||
      !sameAddress(operation.target, this.#manifest.contractAddress)
    )
      throw new ChainSyncFailure('OPERATION_NOT_TRACKABLE');
    const transactionHash = operation.txHash;

    const latest = await this.#rpc.block('latest');
    if (!latest) throw new ChainSyncFailure('CHAIN_HEAD_UNAVAILABLE');
    await this.syncTo(latest.number);
    operation = this.#store.operation(operationId)!;
    const receipt = await this.#rpc.receipt(transactionHash);
    if (!receipt) return operation;
    if (
      !sameHash(receipt.transactionHash, transactionHash) ||
      !sameAddress(receipt.from, operation.owner) ||
      !receipt.to ||
      !sameAddress(receipt.to, operation.target)
    )
      throw new ChainSyncFailure('RECEIPT_EVIDENCE_MISMATCH');
    const canonicalBlock = this.#store.canonicalBlock(
      operation.chainId,
      operation.target,
      receipt.blockNumber,
    );
    if (!canonicalBlock || !sameHash(canonicalBlock.hash, receipt.blockHash)) return operation;

    if (operation.state === 'SUBMITTED' || operation.state === 'REORGED') {
      operation = transitionOperation(
        operation,
        receipt.status === 'REVERTED'
          ? {
              state: 'REVERTED',
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash,
              receiptStatus: 'REVERTED',
              errorCode: 'TRANSACTION_REVERTED',
            }
          : {
              state: 'MINED',
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash,
              receiptStatus: 'SUCCESS',
            },
      );
      this.#store.saveOperation(operation);
    }
    if (receipt.status === 'REVERTED' || operation.state === 'REVERTED') return operation;
    if (operation.state === 'CONFIRMED') return operation;
    if (!['MINED', 'CONFIRMING', 'RECONCILIATION_FAILED'].includes(operation.state)) return operation;

    const events = this.#store
      .canonicalEvents(operation.chainId, operation.target)
      .filter((event) => sameHash(event.transactionHash, transactionHash));
    const result = await this.#integration.reconcileOperation({
      rpc: this.#rpc,
      manifest: this.#manifest,
      operation,
      receipt,
      events,
      block: canonicalBlock,
    });
    if (result.status === 'MISMATCH') {
      if (operation.state !== 'RECONCILIATION_FAILED') {
        operation = transitionOperation(operation, {
          state: 'RECONCILIATION_FAILED',
          errorCode: result.errorCode,
        });
        this.#store.saveOperation(operation);
      }
      return operation;
    }

    this.#putProjections(result.projections);
    const confirmationBigInt = latest.number - receipt.blockNumber + 1n;
    const confirmations = toCount(confirmationBigInt);
    operation = transitionOperation(operation, { state: 'CONFIRMING', confirmations });
    this.#store.saveOperation(operation);
    if (confirmations >= this.#confirmationDepth) {
      operation = transitionOperation(operation, {
        state: 'CONFIRMED',
        confirmations,
        reconciled: true,
        confirmedAt: this.#now(),
      });
      this.#store.saveOperation(operation);
    }
    return operation;
  }

  recordReplacement(operationId: string, replacementTxHash: TransactionHash): ChainOperation {
    const operation = this.#store.operation(operationId);
    if (!operation) throw new ChainSyncFailure('OPERATION_NOT_FOUND');
    const replaced = transitionOperation(operation, {
      state: 'REPLACED',
      replacementTxHash,
      errorCode: 'TRANSACTION_REPLACED',
    });
    this.#store.saveOperation(replaced);
    return replaced;
  }

  recordDropped(operationId: string): ChainOperation {
    const operation = this.#store.operation(operationId);
    if (!operation) throw new ChainSyncFailure('OPERATION_NOT_FOUND');
    const dropped = transitionOperation(operation, {
      state: 'DROPPED',
      errorCode: 'TRANSACTION_DROPPED',
    });
    this.#store.saveOperation(dropped);
    return dropped;
  }
}
