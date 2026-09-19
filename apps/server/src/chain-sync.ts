import { randomUUID } from 'node:crypto';
import type { ChainStore, IndexedChainEvent } from './chain-store.ts';
import { transitionOperation, type ChainOperation } from '../../../packages/chain-adapter/src/lifecycle.ts';
import type { DeploymentManifest } from '../../../packages/chain-adapter/src/manifest.ts';
import type { ContractIntegration } from '../../../packages/chain-adapter/src/reconciliation.ts';
import type { ChainBlock, ChainLog, ReadonlyRpc } from '../../../packages/chain-adapter/src/rpc.ts';
import { sameAddress, sameHash, type TransactionHash } from '../../../packages/chain-adapter/src/types.ts';

export type ChainSyncFailureCode =
  | 'CHAIN_ID_MISMATCH'
  | 'CHAIN_HEAD_UNAVAILABLE'
  | 'CHAIN_HEAD_BEFORE_DEPLOYMENT'
  | 'CHAIN_SYNC_RANGE_EXCEEDED'
  | 'CHAIN_SYNC_TARGET_BEHIND'
  | 'CHAIN_SYNC_SUPERSEDED'
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
  readonly maxReorgDepth: number;
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
  #syncTail: Promise<void> = Promise.resolve();

  constructor(options: ChainSynchronizerOptions) {
    this.#rpc = options.rpc;
    this.#store = options.store;
    this.#manifest = options.manifest;
    this.#integration = options.integration;
    this.#confirmationDepth = safePolicy(options.confirmationDepth, 10_000);
    this.#maxBlocksPerSync = safePolicy(options.maxBlocksPerSync ?? 2_000, 100_000);
    this.#maxReorgDepth = safePolicy(options.maxReorgDepth, 10_000);
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async #assertChain(): Promise<void> {
    if ((await this.#rpc.chainId()) !== this.#manifest.chainId)
      throw new ChainSyncFailure('CHAIN_ID_MISMATCH');
  }

  async #rewindIfNeeded(ownerToken: string): Promise<number> {
    const checkpoint = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
    if (!checkpoint) return 0;
    const remoteCheckpoint = await this.#rpc.block(checkpoint.blockNumber);
    if (!remoteCheckpoint) throw new ChainSyncFailure('CHAIN_BLOCK_UNAVAILABLE');
    if (sameHash(remoteCheckpoint.hash, checkpoint.blockHash)) return 0;

    let candidate = checkpoint.blockNumber - 1n;
    let searched = 1;
    while (candidate >= this.#manifest.deploymentBlock && searched <= this.#maxReorgDepth) {
      const local = this.#store.canonicalBlock(
        this.#manifest.chainId,
        this.#manifest.contractAddress,
        candidate,
      );
      const remote = await this.#rpc.block(candidate);
      if (!remote) throw new ChainSyncFailure('CHAIN_BLOCK_UNAVAILABLE');
      if (local && remote && sameHash(local.hash, remote.hash)) {
        return this.#store.rollbackFromBlock(
          this.#manifest.chainId,
          this.#manifest.contractAddress,
          candidate + 1n,
          ownerToken,
        ).blocks;
      }
      candidate--;
      searched++;
    }
    if (candidate >= this.#manifest.deploymentBlock) {
      this.#store.markSyncUnhealthy(
        this.#manifest.chainId,
        this.#manifest.contractAddress,
        'CHAIN_REORG_DEPTH_EXCEEDED',
        null,
        ownerToken,
      );
      throw new ChainSyncFailure('CHAIN_REORG_DEPTH_EXCEEDED');
    }
    return this.#store.rollbackFromBlock(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
      this.#manifest.deploymentBlock,
      ownerToken,
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

  #saveOperationAtCheckpoint(
    next: ChainOperation,
    previous: ChainOperation,
    checkpoint: Readonly<{ blockNumber: bigint; blockHash: ChainBlock['hash'] }>,
  ): void {
    try {
      this.#store.saveOperationAtCheckpoint(next, previous, checkpoint);
    } catch (error) {
      if (error instanceof Error && error.message === 'CHAIN_SYNC_SUPERSEDED')
        throw new ChainSyncFailure('CHAIN_SYNC_SUPERSEDED');
      throw error;
    }
  }

  async #rebuildProjection(block: ChainBlock, ownerToken: string): Promise<void> {
    const projections = await this.#integration.rebuildProjections({
      rpc: this.#rpc,
      manifest: this.#manifest,
      events: this.#store.canonicalEvents(this.#manifest.chainId, this.#manifest.contractAddress),
      block,
    });
    this.#store.commitProjections(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
      block,
      projections.map((projection) => ({
        ...projection,
        chainId: this.#manifest.chainId,
        contract: this.#manifest.contractAddress,
      })),
      ownerToken,
    );
  }

  async #recoverProjection(ownerToken: string): Promise<void> {
    const checkpoint = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
    if (!checkpoint) return;
    const projected = this.#store.projectionCheckpoint(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
    );
    if (
      projected &&
      projected.blockNumber === checkpoint.blockNumber &&
      sameHash(projected.blockHash, checkpoint.blockHash)
    )
      return;
    const block = this.#store.canonicalBlock(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
      checkpoint.blockNumber,
    );
    if (!block || !sameHash(block.hash, checkpoint.blockHash))
      throw new ChainSyncFailure('PROJECTION_REBUILD_FAILED');
    try {
      await this.#rebuildProjection(block, ownerToken);
    } catch (error) {
      if (error instanceof Error && error.message === 'CHAIN_SYNC_SUPERSEDED') throw error;
      throw new ChainSyncFailure('PROJECTION_REBUILD_FAILED');
    }
  }

  async syncTo(head: bigint): Promise<ChainSyncResult> {
    const previous = this.#syncTail;
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#syncTail = previous.then(() => turn);
    await previous;
    try {
      return await this.#syncTo(head);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'CHAIN_SYNC_SUPERSEDED' || error.message === 'CHAIN_SYNC_TARGET_BEHIND')
      )
        throw new ChainSyncFailure(error.message as 'CHAIN_SYNC_SUPERSEDED' | 'CHAIN_SYNC_TARGET_BEHIND');
      throw error;
    } finally {
      release();
    }
  }

  async #syncTo(head: bigint): Promise<ChainSyncResult> {
    await this.#assertChain();
    if (head < this.#manifest.deploymentBlock) throw new ChainSyncFailure('CHAIN_HEAD_BEFORE_DEPLOYMENT');
    const remoteHead = await this.#rpc.block(head);
    if (!remoteHead) throw new ChainSyncFailure('CHAIN_HEAD_UNAVAILABLE');
    if (remoteHead.number !== head) throw new ChainSyncFailure('CHAIN_BLOCK_MISMATCH');

    const ownerToken = randomUUID();
    this.#store.claimSync(this.#manifest.chainId, this.#manifest.contractAddress, head, ownerToken);
    const reorgedBlocks = await this.#rewindIfNeeded(ownerToken);
    await this.#recoverProjection(ownerToken);
    const checkpoint = this.#store.checkpoint(this.#manifest.chainId, this.#manifest.contractAddress);
    const start = checkpoint ? checkpoint.blockNumber + 1n : this.#manifest.deploymentBlock;
    if (start > head) {
      if (
        !this.#store.markSyncHealthy(this.#manifest.chainId, this.#manifest.contractAddress, head, ownerToken)
      )
        throw new Error('CHAIN_SYNC_SUPERSEDED');
      return { scannedBlocks: 0, insertedEvents: 0, reorgedBlocks };
    }
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
        head,
        ownerToken,
      ).insertedEvents;
      try {
        await this.#rebuildProjection(current, ownerToken);
      } catch (error) {
        try {
          this.#store.rollbackFromBlock(
            this.#manifest.chainId,
            this.#manifest.contractAddress,
            number,
            ownerToken,
          );
        } catch (rollbackError) {
          if (rollbackError instanceof Error && rollbackError.message === 'CHAIN_SYNC_SUPERSEDED')
            throw rollbackError;
          throw rollbackError;
        }
        if (error instanceof Error && error.message === 'CHAIN_SYNC_SUPERSEDED') throw error;
        throw new ChainSyncFailure('PROJECTION_REBUILD_FAILED');
      }
    }
    if (
      !this.#store.markSyncHealthy(this.#manifest.chainId, this.#manifest.contractAddress, head, ownerToken)
    )
      throw new Error('CHAIN_SYNC_SUPERSEDED');
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
    const synchronizedCheckpoint = this.#store.checkpoint(
      this.#manifest.chainId,
      this.#manifest.contractAddress,
    );
    if (!synchronizedCheckpoint) throw new ChainSyncFailure('CHAIN_SYNC_SUPERSEDED');
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
      const operationBeforeReceipt = operation;
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
      this.#saveOperationAtCheckpoint(operation, operationBeforeReceipt, synchronizedCheckpoint);
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
    const operationBeforeReconciliation = operation;
    if (result.status === 'MISMATCH') {
      if (operation.state !== 'RECONCILIATION_FAILED') {
        operation = transitionOperation(operation, {
          state: 'RECONCILIATION_FAILED',
          errorCode: result.errorCode,
        });
        this.#saveOperationAtCheckpoint(operation, operationBeforeReconciliation, synchronizedCheckpoint);
      }
      return operation;
    }

    const confirmationBigInt = latest.number - receipt.blockNumber + 1n;
    const confirmations = toCount(confirmationBigInt);
    operation = transitionOperation(operation, { state: 'CONFIRMING', confirmations, reconciled: true });
    if (confirmations >= this.#confirmationDepth) {
      operation = transitionOperation(operation, {
        state: 'CONFIRMED',
        confirmations,
        reconciled: true,
        confirmedAt: this.#now(),
      });
    }
    this.#saveOperationAtCheckpoint(operation, operationBeforeReconciliation, synchronizedCheckpoint);
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
