import type { Address } from '../../../packages/chain-adapter/src/types.ts';
import type { BrowserWalletPort, PreparedAction, WalletSubmission } from './chain-wallet.ts';

export type { ProductOperationEvidence } from '../../../packages/chain-adapter/src/reconciliation.ts';

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

export interface TestnetStrategyAdapter<Snapshot, Action, Observation> extends StrategyReadAdapter<
  Snapshot,
  Observation
> {
  readonly mode: 'robinhood-testnet' | 'xlayer-testnet';
  prepareAction(action: Action, context: { readonly owner: Address }): Promise<PreparedAction>;
  submitAction(prepared: PreparedAction, wallet: BrowserWalletPort): Promise<WalletSubmission>;
}

export type LiveActionSimulation =
  { readonly ok: true } | { readonly ok: false; readonly errorCode: string; readonly errorMessage?: string };

export interface SimulatingTestnetStrategyAdapter<
  Snapshot,
  Action,
  Observation,
> extends TestnetStrategyAdapter<Snapshot, Action, Observation> {
  simulateAction(
    prepared: PreparedAction,
    context: { readonly owner: Address; readonly snapshot: Snapshot },
  ): Promise<LiveActionSimulation>;
}

export type StrategyAdapter<Snapshot, Action, LocalResult, Observation> =
  | LocalStrategyAdapter<Snapshot, Action, LocalResult, Observation>
  | TestnetStrategyAdapter<Snapshot, Action, Observation>;

// Compatibility types retain the original Robinhood-only discriminant.
export interface RobinhoodTestnetStrategyAdapter<S, A, O> extends TestnetStrategyAdapter<S, A, O> {
  readonly mode: 'robinhood-testnet';
}
export interface SimulatingRobinhoodTestnetStrategyAdapter<S, A, O> extends SimulatingTestnetStrategyAdapter<
  S,
  A,
  O
> {
  readonly mode: 'robinhood-testnet';
}
