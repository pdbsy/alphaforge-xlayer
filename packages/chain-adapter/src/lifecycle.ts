import type { Address, BlockHash, TransactionHash } from './types.ts';

export type TransactionState =
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTED'
  | 'MINED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REVERTED'
  | 'REPLACED'
  | 'DROPPED'
  | 'REORGED'
  | 'RECONCILIATION_FAILED';

export type OperationErrorCode =
  | 'WALLET_REJECTED'
  | 'TRANSACTION_REVERTED'
  | 'TRANSACTION_REPLACED'
  | 'TRANSACTION_DROPPED'
  | 'CHAIN_REORG'
  | 'EVENT_EVIDENCE_MISMATCH'
  | 'CONTRACT_STATE_MISMATCH'
  | 'RPC_UNAVAILABLE';

export interface ChainOperation {
  readonly operationId: string;
  readonly chainId: number;
  readonly owner: Address;
  readonly target: Address;
  readonly state: TransactionState;
  readonly txHash: TransactionHash | null;
  readonly submittedAt: string | null;
  readonly blockNumber: bigint | null;
  readonly blockHash: BlockHash | null;
  readonly transactionIndex: number | null;
  readonly receiptStatus: 'SUCCESS' | 'REVERTED' | null;
  readonly confirmations: number;
  readonly replacementTxHash: TransactionHash | null;
  readonly canonical: boolean;
  readonly reconciled: boolean;
  readonly confirmedAt: string | null;
  readonly errorCode: OperationErrorCode | null;
}

export type OperationTransition =
  | { readonly state: 'SUBMITTED'; readonly txHash: TransactionHash; readonly submittedAt: string }
  | { readonly state: 'REJECTED'; readonly errorCode: 'WALLET_REJECTED' }
  | {
      readonly state: 'MINED';
      readonly blockNumber: bigint;
      readonly blockHash: BlockHash;
      readonly transactionIndex?: number;
      readonly receiptStatus: 'SUCCESS';
    }
  | {
      readonly state: 'REVERTED';
      readonly blockNumber: bigint;
      readonly blockHash: BlockHash;
      readonly transactionIndex?: number;
      readonly receiptStatus: 'REVERTED';
      readonly errorCode: 'TRANSACTION_REVERTED';
    }
  | { readonly state: 'CONFIRMING'; readonly confirmations: number; readonly reconciled?: boolean }
  | {
      readonly state: 'CONFIRMED';
      readonly confirmations: number;
      readonly confirmedAt: string;
      readonly reconciled: boolean;
    }
  | {
      readonly state: 'REPLACED';
      readonly replacementTxHash?: TransactionHash;
      readonly errorCode: 'TRANSACTION_REPLACED';
    }
  | { readonly state: 'DROPPED'; readonly errorCode: 'TRANSACTION_DROPPED' }
  | { readonly state: 'REORGED'; readonly errorCode: 'CHAIN_REORG' }
  | {
      readonly state: 'RECONCILIATION_FAILED';
      readonly errorCode: 'EVENT_EVIDENCE_MISMATCH' | 'CONTRACT_STATE_MISMATCH';
    };

const states = (...values: TransactionState[]): ReadonlySet<TransactionState> => new Set(values);
const transitions: Readonly<Record<TransactionState, ReadonlySet<TransactionState>>> = Object.freeze({
  AWAITING_SIGNATURE: states('SUBMITTED', 'REJECTED'),
  SUBMITTED: states('MINED', 'REVERTED', 'REPLACED', 'DROPPED'),
  MINED: states('CONFIRMING', 'RECONCILIATION_FAILED', 'REORGED'),
  CONFIRMING: states('CONFIRMING', 'CONFIRMED', 'RECONCILIATION_FAILED', 'REORGED'),
  CONFIRMED: states('REORGED'),
  REJECTED: states(),
  REVERTED: states('REORGED'),
  REPLACED: states(),
  DROPPED: states(),
  REORGED: states('MINED', 'REVERTED', 'REPLACED', 'DROPPED'),
  RECONCILIATION_FAILED: states('CONFIRMING', 'REORGED'),
});

function validOperationId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}

function validTime(value: string): boolean {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function createOperation(input: {
  readonly operationId: string;
  readonly chainId: number;
  readonly owner: Address;
  readonly target: Address;
  readonly state: 'AWAITING_SIGNATURE';
}): ChainOperation {
  if (!validOperationId(input.operationId)) throw new Error('INVALID_OPERATION_ID');
  if (!Number.isSafeInteger(input.chainId) || input.chainId <= 0) throw new Error('INVALID_CHAIN_ID');
  return Object.freeze({
    ...input,
    txHash: null,
    submittedAt: null,
    blockNumber: null,
    blockHash: null,
    transactionIndex: null,
    receiptStatus: null,
    confirmations: 0,
    replacementTxHash: null,
    canonical: false,
    reconciled: false,
    confirmedAt: null,
    errorCode: null,
  });
}

export function transitionOperation(current: ChainOperation, update: OperationTransition): ChainOperation {
  if (!transitions[current.state].has(update.state)) throw new Error('INVALID_OPERATION_TRANSITION');
  switch (update.state) {
    case 'SUBMITTED':
      if (!validTime(update.submittedAt)) throw new Error('INVALID_SUBMITTED_AT');
      return Object.freeze({ ...current, ...update, errorCode: null });
    case 'REJECTED':
      return Object.freeze({ ...current, ...update, canonical: false, reconciled: false, confirmedAt: null });
    case 'DROPPED':
      return Object.freeze({
        ...current,
        ...update,
        canonical: false,
        reconciled: false,
        confirmedAt: null,
      });
    case 'MINED':
      if (update.blockNumber < 0n) throw new Error('INVALID_BLOCK_NUMBER');
      if (
        update.transactionIndex !== undefined &&
        (!Number.isSafeInteger(update.transactionIndex) || update.transactionIndex < 0)
      )
        throw new Error('INVALID_TRANSACTION_INDEX');
      return Object.freeze({
        ...current,
        ...update,
        transactionIndex: update.transactionIndex ?? null,
        confirmations: 0,
        canonical: true,
        reconciled: false,
        confirmedAt: null,
        errorCode: null,
      });
    case 'REVERTED':
      if (update.blockNumber < 0n) throw new Error('INVALID_BLOCK_NUMBER');
      if (
        update.transactionIndex !== undefined &&
        (!Number.isSafeInteger(update.transactionIndex) || update.transactionIndex < 0)
      )
        throw new Error('INVALID_TRANSACTION_INDEX');
      return Object.freeze({
        ...current,
        ...update,
        transactionIndex: update.transactionIndex ?? null,
        confirmations: 0,
        canonical: true,
        reconciled: false,
        confirmedAt: null,
      });
    case 'CONFIRMING':
      if (!Number.isSafeInteger(update.confirmations) || update.confirmations < current.confirmations)
        throw new Error('INVALID_CONFIRMATION_COUNT');
      return Object.freeze({
        ...current,
        ...update,
        reconciled: update.reconciled ?? current.reconciled,
        confirmedAt: null,
        errorCode: null,
      });
    case 'CONFIRMED':
      if (!update.reconciled) throw new Error('RECONCILIATION_REQUIRED');
      if (!Number.isSafeInteger(update.confirmations) || update.confirmations < current.confirmations)
        throw new Error('INVALID_CONFIRMATION_COUNT');
      if (!validTime(update.confirmedAt)) throw new Error('INVALID_CONFIRMED_AT');
      return Object.freeze({ ...current, ...update, canonical: true, errorCode: null });
    case 'REPLACED':
      if (!update.replacementTxHash) throw new Error('REPLACEMENT_HASH_REQUIRED');
      if (current.txHash?.toLowerCase() === update.replacementTxHash.toLowerCase())
        throw new Error('REPLACEMENT_HASH_MUST_DIFFER');
      return Object.freeze({
        ...current,
        ...update,
        canonical: false,
        reconciled: false,
        confirmedAt: null,
      });
    case 'REORGED':
      return Object.freeze({ ...current, ...update, canonical: false, reconciled: false, confirmedAt: null });
    case 'RECONCILIATION_FAILED':
      return Object.freeze({ ...current, ...update, reconciled: false, confirmedAt: null });
  }
}
