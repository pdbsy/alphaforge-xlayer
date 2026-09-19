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

export interface RobinhoodTestnetStrategyAdapter<Snapshot, Action, Observation> extends StrategyReadAdapter<
  Snapshot,
  Observation
> {
  readonly mode: 'robinhood-testnet';
  prepareAction(action: Action, context: { readonly owner: Address }): Promise<PreparedAction>;
  submitAction(prepared: PreparedAction, wallet: BrowserWalletPort): Promise<WalletSubmission>;
}

export type LiveActionSimulation =
  { readonly ok: true } | { readonly ok: false; readonly errorCode: string; readonly errorMessage?: string };

export interface SimulatingRobinhoodTestnetStrategyAdapter<
  Snapshot,
  Action,
  Observation,
> extends RobinhoodTestnetStrategyAdapter<Snapshot, Action, Observation> {
  simulateAction(
    prepared: PreparedAction,
    context: { readonly owner: Address; readonly snapshot: Snapshot },
  ): Promise<LiveActionSimulation>;
}

export type StrategyAdapter<Snapshot, Action, LocalResult, Observation> =
  | LocalStrategyAdapter<Snapshot, Action, LocalResult, Observation>
  | RobinhoodTestnetStrategyAdapter<Snapshot, Action, Observation>;
