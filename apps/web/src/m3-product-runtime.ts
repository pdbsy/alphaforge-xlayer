import { parseUnits } from '../../../packages/domain/src/money.ts';
import type { Address } from '../../../packages/chain-adapter/src/types.ts';
import type { WalletSubmission } from './chain-wallet.ts';
import type { M3ProductChainPresentation, OnchainProductAction } from './m3-product-shell.ts';
import type { DepositAuthorizationPresentation } from './m3-product-shell.ts';

const PASS_BASE_UNITS_PER_AF_USDC_BASE_UNIT = 1_000_000_000_000n;

export type M3ProductActionRequest =
  | { readonly kind: 'deposit'; readonly usdcBaseUnits: string }
  | { readonly kind: 'withdraw'; readonly usdcBaseUnits: string }
  | { readonly kind: 'close' };

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

export interface RequiredDepositAllowances {
  readonly afUsdcBaseUnits: string;
  readonly passBaseUnits: string;
}

export interface DepositAllowanceContext extends DepositAuthorizationPresentation {
  readonly vaultAddress: string;
}

export function requiredDepositAllowances(
  request: Extract<M3ProductActionRequest, { readonly kind: 'deposit' }>,
): RequiredDepositAllowances {
  return Object.freeze({
    afUsdcBaseUnits: request.usdcBaseUnits,
    passBaseUnits: (BigInt(request.usdcBaseUnits) * PASS_BASE_UNITS_PER_AF_USDC_BASE_UNIT).toString(),
  });
}

export function depositAllowanceCheck(
  request: Extract<M3ProductActionRequest, { readonly kind: 'deposit' }>,
  authorization: DepositAllowanceContext,
): {
  readonly status: 'READY' | 'APPROVAL_REQUIRED' | 'UNAVAILABLE';
  readonly required: RequiredDepositAllowances;
} {
  const required = requiredDepositAllowances(request);
  const validAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
  const validUnits = (value: string) => /^(0|[1-9][0-9]*)$/.test(value);
  if (
    !validAddress(authorization.vaultAddress) ||
    !validAddress(authorization.spender) ||
    authorization.vaultAddress.toLowerCase() !== authorization.spender.toLowerCase() ||
    !validUnits(authorization.afUsdcAllowanceBaseUnits) ||
    !validUnits(authorization.passAllowanceBaseUnits)
  )
    return Object.freeze({ status: 'UNAVAILABLE', required });
  const ready =
    BigInt(authorization.afUsdcAllowanceBaseUnits) >= BigInt(required.afUsdcBaseUnits) &&
    BigInt(authorization.passAllowanceBaseUnits) >= BigInt(required.passBaseUnits);
  return Object.freeze({ status: ready ? 'READY' : 'APPROVAL_REQUIRED', required });
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
