import type { ChainOperation } from '../../../packages/chain-adapter/src/lifecycle.ts';
import { sameAddress, type Address, type BlockHash } from '../../../packages/chain-adapter/src/types.ts';
import type { BrowserWalletPort, PreparedAction, SubmittedOperation } from './chain-wallet.ts';

export interface ChainProjectionReference {
  readonly chainId: number;
  readonly owner: Address;
  readonly contract: Address;
  readonly blockNumber: bigint;
  readonly blockHash: BlockHash;
  readonly stale: boolean;
}

export interface ProductOperationEvidence {
  readonly lifecycle: ChainOperation['state'];
  readonly receipt: 'PENDING' | 'SUCCESS' | 'REVERTED';
  readonly confirmations: number;
  readonly reconciliation: 'PENDING' | 'MATCHED' | 'FAILED';
  readonly projection: 'PENDING' | 'READY' | 'STALE';
  readonly productReady: boolean;
}

function projectionState(
  operation: ChainOperation,
  projection: ChainProjectionReference | null,
): ProductOperationEvidence['projection'] {
  if (operation.state === 'REORGED') return 'STALE';
  if (!projection) return 'PENDING';
  if (
    projection.stale ||
    projection.chainId !== operation.chainId ||
    !sameAddress(projection.owner, operation.owner) ||
    !sameAddress(projection.contract, operation.target) ||
    operation.blockNumber === null ||
    projection.blockNumber < operation.blockNumber
  )
    return 'STALE';
  return 'READY';
}

export function operationEvidence(
  operation: ChainOperation,
  projection: ChainProjectionReference | null,
): ProductOperationEvidence {
  const projectionMilestone = projectionState(operation, projection);
  const reconciliation =
    operation.state === 'RECONCILIATION_FAILED' ? 'FAILED' : operation.reconciled ? 'MATCHED' : 'PENDING';
  return Object.freeze({
    lifecycle: operation.state,
    receipt: operation.receiptStatus ?? 'PENDING',
    confirmations: operation.confirmations,
    reconciliation,
    projection: projectionMilestone,
    productReady:
      operation.state === 'CONFIRMED' &&
      operation.canonical &&
      reconciliation === 'MATCHED' &&
      projectionMilestone === 'READY',
  });
}

export interface StrategyReadContext {
  readonly wallet?: Address;
}

interface StrategyReadAdapter<Snapshot, Observation> {
  readSnapshot(context: StrategyReadContext): Promise<Snapshot>;
  observeOperation(operationId: string): Promise<Observation>;
}

export interface LocalStrategyAdapter<Snapshot, Action, Result, Observation> extends StrategyReadAdapter<
  Snapshot,
  Observation
> {
  readonly mode: 'local';
  executeLocalAction(action: Action): Promise<Result>;
}

export interface RobinhoodTestnetStrategyAdapter<Snapshot, Action, Observation> extends StrategyReadAdapter<
  Snapshot,
  Observation
> {
  readonly mode: 'robinhood-testnet';
  prepareAction(action: Action, context: { readonly owner: Address }): Promise<PreparedAction>;
  submitAction(prepared: PreparedAction, wallet: BrowserWalletPort): Promise<SubmittedOperation>;
}

export type StrategyAdapter<Snapshot, Action, LocalResult, Observation> =
  | LocalStrategyAdapter<Snapshot, Action, LocalResult, Observation>
  | RobinhoodTestnetStrategyAdapter<Snapshot, Action, Observation>;
