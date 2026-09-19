import { parseUnits } from '../../../packages/domain/src/money.ts';
import type { Address } from '../../../packages/chain-adapter/src/types.ts';
import type { WalletSubmission } from './chain-wallet.ts';
import type { M3ProductChainPresentation, OnchainProductAction } from './m3-product-shell.ts';

export type M3ProductActionRequest =
  { readonly kind: 'deposit' | 'withdraw'; readonly usdcBaseUnits: string } | { readonly kind: 'close' };

export interface M3ProductActionReview {
  readonly operationId: string;
  readonly owner: Address;
  readonly request: M3ProductActionRequest;
}

export interface M3ProductRuntime {
  readonly snapshot: M3ProductChainPresentation;
  connect(): Promise<void>;
  refresh(): Promise<void>;
  reviewAction(request: M3ProductActionRequest): Promise<M3ProductActionReview>;
  confirmAction(review: M3ProductActionReview): Promise<WalletSubmission>;
  subscribe(listener: () => void): () => void;
}

export function sameM3ProductAction(left: M3ProductActionRequest, right: M3ProductActionRequest): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'close' || right.kind === 'close') return left.kind === right.kind;
  return left.usdcBaseUnits === right.usdcBaseUnits;
}

export function parseM3ProductAction(action: OnchainProductAction, amount?: string): M3ProductActionRequest {
  if (action === 'close') {
    if (amount !== undefined) throw new Error('CLOSE_AMOUNT_FORBIDDEN');
    return Object.freeze({ kind: 'close' });
  }
  if (amount === undefined) throw new Error('AMOUNT_REQUIRED');
  const usdcBaseUnits = parseUnits(amount, 6);
  if (BigInt(usdcBaseUnits) <= 0n) throw new Error('AMOUNT_MUST_BE_POSITIVE');
  return Object.freeze({ kind: action, usdcBaseUnits });
}
