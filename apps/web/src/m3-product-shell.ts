import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import type { WalletSubmission } from './chain-wallet.ts';
import type { ProductOperationEvidence } from './strategy-adapter.ts';

export const M3_CANONICAL_STRATEGY_ID = 'trend' as const;

export const WALLET_STATUSES = [
  'DISCONNECTED',
  'CONNECTING',
  'CONNECTED',
  'CONNECTION_REJECTED',
  'ACCOUNT_CHANGED',
  'WALLET_DISCONNECTED',
] as const;

export const NETWORK_STATUSES = [
  'UNAVAILABLE',
  'CORRECT',
  'WRONG',
  'SWITCHING',
  'SWITCH_REJECTED',
  'UNSUPPORTED',
  'RPC_UNAVAILABLE',
] as const;

export const TRANSACTION_STATUSES = [
  'IDLE',
  'WALLET_APPROVAL_REQUIRED',
  'WALLET_PENDING',
  'SUBMITTED',
  'SUBMISSION_AMBIGUOUS',
  'CONFIRMING',
  'CHAIN_CONFIRMED',
  'INDEXING',
  'READY',
  'FAILED',
] as const;

export type WalletStatus = (typeof WALLET_STATUSES)[number];
export type NetworkStatus = (typeof NETWORK_STATUSES)[number];
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type ProductProvenance = 'FIXTURE' | 'LOCAL SIMULATION';

export interface WalletPresentation {
  readonly status: WalletStatus;
  readonly address?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface NetworkPresentation {
  readonly status: NetworkStatus;
  readonly chainId?: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface TransactionPresentation {
  readonly status: TransactionStatus;
  readonly txHash?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export type OnchainProductAction = 'deposit' | 'withdraw' | 'close';
export type OnchainReadiness = 'UNKNOWN' | 'SOFT_READY' | 'FINALITY_UNKNOWN' | 'REORGED';

export interface DepositAuthorizationPresentation {
  readonly spender: string;
  readonly afUsdcAllowanceBaseUnits: string;
  readonly passAllowanceBaseUnits: string;
  readonly approvalCapability: 'UNAVAILABLE';
}

export interface OnchainProductPresentation {
  readonly deployment: 'UNAVAILABLE' | 'CONFIGURED';
  readonly health: 'UNAVAILABLE' | 'LIVE' | 'DEGRADED';
  readonly readiness: OnchainReadiness;
  readonly owner: 'UNKNOWN' | 'OWNER' | 'NON_OWNER';
  readonly writeMode: 'DISABLED' | 'INJECTED_MOCK' | 'LIVE_AUTHORIZED';
  readonly exitPath: 'UNAVAILABLE' | 'LIVE_RPC' | 'SIMULATION';
  readonly supportedActions: readonly OnchainProductAction[];
  readonly vaultAddress?: string;
  readonly depositAuthorization?: DepositAuthorizationPresentation;
}

export interface M3ProductChainPresentation {
  readonly wallet: WalletPresentation;
  readonly network: NetworkPresentation;
  readonly transaction: TransactionPresentation;
  readonly onchain: OnchainProductPresentation;
}

export interface StrategyShellInput {
  readonly strategyId: string;
  readonly contentProvenance: ProductProvenance;
  readonly wallet?: WalletPresentation;
  readonly network?: NetworkPresentation;
  readonly transaction?: TransactionPresentation;
  readonly onchain?: OnchainProductPresentation;
}

export interface AccountShellInput {
  readonly accountId?: string | null;
  readonly wallet?: WalletPresentation;
  readonly network?: NetworkPresentation;
  readonly transaction?: TransactionPresentation;
  readonly onchain?: OnchainProductPresentation;
}

export interface M3ProductPages {
  readonly account: (tab: string) => string;
  readonly trade: (strategyId: string) => string;
}

export interface M3PageExtensionOptions {
  readonly accountId: () => string | null;
  readonly contentProvenance: (strategyId: string) => ProductProvenance;
  readonly onchain?: () => OnchainProductPresentation | undefined;
  readonly chain?: () => M3ProductChainPresentation | undefined;
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

const walletMessages: Record<WalletStatus, string> = {
  DISCONNECTED: 'Disconnected. Connect a supported wallet to use Testnet capabilities.',
  CONNECTING: 'Connecting. Complete the request in your wallet.',
  CONNECTED: 'Connected.',
  CONNECTION_REJECTED: 'Connection rejected in the wallet.',
  ACCOUNT_CHANGED: 'Wallet account changed. AlphaForge must refresh wallet-owned state.',
  WALLET_DISCONNECTED: 'Wallet disconnected after connection. Pending product state may be stale.',
};

const networkMessages: Record<NetworkStatus, string> = {
  UNAVAILABLE: 'Network state is unavailable until the chain adapter is connected.',
  CORRECT: 'Connected to the required Robinhood Chain Testnet.',
  WRONG: 'Wrong network. Switch to Robinhood Chain Testnet before continuing.',
  SWITCHING: 'Waiting for the wallet to switch networks.',
  SWITCH_REJECTED: 'Network switch rejected in the wallet.',
  UNSUPPORTED: 'This wallet or network cannot use the required Testnet.',
  RPC_UNAVAILABLE: 'Robinhood Chain Testnet RPC is unavailable.',
};

const transactionMessages: Record<TransactionStatus, string> = {
  IDLE: 'No Testnet transaction is in progress.',
  WALLET_APPROVAL_REQUIRED: 'Review the action before requesting wallet approval.',
  WALLET_PENDING: 'Waiting for wallet confirmation.',
  SUBMITTED: 'Transaction submitted. Waiting for an RPC receipt.',
  SUBMISSION_AMBIGUOUS:
    'Wallet submission outcome is unknown. Do not retry automatically; wait for chain reconciliation.',
  CONFIRMING: 'Transaction is confirming on-chain.',
  CHAIN_CONFIRMED:
    'Transaction receipt succeeded on-chain. AlphaForge is waiting for canonical reconciliation and product readback.',
  INDEXING: 'Canonical chain evidence is reconciled. Waiting for the current product projection.',
  READY: 'Transaction and readback complete. The AlphaForge product state is updated.',
  FAILED: 'Transaction did not reach a ready product state.',
};

export function renderWalletStatus(status: WalletStatus): string {
  return walletMessages[status];
}

export function renderNetworkStatus(status: NetworkStatus): string {
  return networkMessages[status];
}

export function renderTransactionStatus(status: TransactionStatus): string {
  return transactionMessages[status];
}

export function transactionPresentationFromWalletSubmission(
  submission: WalletSubmission,
): TransactionPresentation {
  switch (submission.state) {
    case 'SUBMITTED':
      return { status: 'SUBMITTED', txHash: submission.txHash };
    case 'SUBMISSION_AMBIGUOUS':
      return {
        status: 'SUBMISSION_AMBIGUOUS',
        ...(submission.txHash ? { txHash: submission.txHash } : {}),
        errorCode: submission.reason,
        errorMessage: 'Submission outcome is unknown. Do not retry automatically; wait for reconciliation.',
      };
  }
}

const failedTransaction = (errorCode: string, txHash?: string): TransactionPresentation => ({
  status: 'FAILED',
  ...(txHash ? { txHash } : {}),
  errorCode,
});

export function transactionPresentationFromEvidence(
  evidence: ProductOperationEvidence,
  txHash?: string,
): TransactionPresentation {
  if (
    evidence.lifecycle === 'REJECTED' ||
    evidence.lifecycle === 'REVERTED' ||
    evidence.lifecycle === 'REPLACED' ||
    evidence.lifecycle === 'DROPPED' ||
    evidence.lifecycle === 'REORGED' ||
    evidence.lifecycle === 'RECONCILIATION_FAILED'
  )
    return failedTransaction(evidence.lifecycle, txHash);
  if (evidence.receipt === 'REVERTED') return failedTransaction('TRANSACTION_REVERTED', txHash);
  if (evidence.reconciliation === 'FAILED') return failedTransaction('RECONCILIATION_FAILED', txHash);
  if (evidence.projection === 'STALE') return failedTransaction('PROJECTION_STALE', txHash);

  if (evidence.productReady) return { status: 'READY', ...(txHash ? { txHash } : {}) };

  const status: TransactionStatus =
    evidence.lifecycle === 'AWAITING_SIGNATURE'
      ? 'WALLET_APPROVAL_REQUIRED'
      : evidence.lifecycle === 'SUBMITTED'
        ? 'SUBMITTED'
        : evidence.lifecycle === 'MINED' && evidence.receipt === 'SUCCESS'
          ? 'CHAIN_CONFIRMED'
          : evidence.lifecycle === 'CONFIRMED'
            ? 'INDEXING'
            : 'CONFIRMING';
  return { status, ...(txHash ? { txHash } : {}) };
}

function errorDetails(value: { readonly errorCode?: string; readonly errorMessage?: string }): string {
  if (!value.errorCode && !value.errorMessage) return '';
  return `<p role="alert"><strong>${escapeHtml(value.errorCode ?? 'UNSPECIFIED_ERROR')}</strong>${
    value.errorMessage ? ` · ${escapeHtml(value.errorMessage)}` : ''
  }</p>`;
}

function walletCard(wallet: WalletPresentation): string {
  const shortAddress =
    wallet.address && wallet.address.length > 12
      ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
      : wallet.address;
  return `<article class="sketch-box"><span class="section-label">WALLET / TESTNET</span><h3>${escapeHtml(
    wallet.status,
  )}</h3><p>${escapeHtml(renderWalletStatus(wallet.status))}</p>${
    wallet.address
      ? `<p><strong>Wallet address</strong> · ${escapeHtml(wallet.address)} · ${escapeHtml(shortAddress)}</p>`
      : '<p>Wallet address · Unavailable</p>'
  }${errorDetails(wallet)}</article>`;
}

function networkCard(network: NetworkPresentation): string {
  const observedChain = network.chainId === undefined ? 'Unavailable' : escapeHtml(network.chainId);
  return `<article class="sketch-box"><span class="section-label">NETWORK / TESTNET</span><h3>${escapeHtml(
    network.status,
  )}</h3><p>${escapeHtml(renderNetworkStatus(network.status))}</p><p><strong>Required</strong> · ${escapeHtml(
    ROBINHOOD_CHAIN_TESTNET.name,
  )} · Chain ID ${escapeHtml(ROBINHOOD_CHAIN_TESTNET.chainId)}</p><p>Wallet chain ID · ${observedChain}</p>${errorDetails(
    network,
  )}</article>`;
}

function transactionCard(transaction: TransactionPresentation): string {
  const validHash = /^0x[0-9a-fA-F]{64}$/.test(transaction.txHash ?? '');
  const transactionEvidence = !transaction.txHash
    ? '<p>Transaction hash · Unavailable</p>'
    : validHash
      ? `<p><strong>Transaction hash</strong> · <a class="text-link" href="${escapeHtml(
          `${ROBINHOOD_CHAIN_TESTNET.explorerUrl}/tx/${transaction.txHash}`,
        )}" target="_blank" rel="noopener noreferrer">${escapeHtml(transaction.txHash)} ↗</a> · Chain ID ${escapeHtml(
          ROBINHOOD_CHAIN_TESTNET.chainId,
        )}</p>`
      : `<p><strong>Transaction hash</strong> · ${escapeHtml(transaction.txHash)}</p>`;
  return `<article class="sketch-box"><span class="section-label">TRANSACTION / TESTNET</span><h3>${escapeHtml(
    transaction.status,
  )}</h3><p>${escapeHtml(
    renderTransactionStatus(transaction.status),
  )}</p>${transactionEvidence}${errorDetails(transaction)}</article>`;
}

function disabledActions(): string {
  return `<div class="inline-actions" aria-label="Testnet asset actions">${[
    'Buy Pass',
    'Sell Pass',
    'Deposit',
    'Withdraw',
    'Approve',
  ]
    .map(
      (action) =>
        `<button class="outline-btn" disabled title="Requires reviewed Macbeth02 contract capability and Macbeth03 chain adapter">${action} · NOT IMPLEMENTED</button>`,
    )
    .join('')}</div>`;
}

const readinessMessages: Record<OnchainReadiness, string> = {
  UNKNOWN: 'Chain readiness is unknown.',
  SOFT_READY: 'SOFT READY after three confirmations. L1 finality remains unknown.',
  FINALITY_UNKNOWN: 'L1 finality evidence is unavailable.',
  REORGED: 'Previously observed evidence was reorganized and is not ready.',
};

export function onchainActionEnabled(
  onchain: OnchainProductPresentation,
  action: OnchainProductAction,
): boolean {
  if (
    onchain.deployment !== 'CONFIGURED' ||
    onchain.health === 'UNAVAILABLE' ||
    onchain.owner !== 'OWNER' ||
    onchain.writeMode === 'DISABLED' ||
    !onchain.supportedActions.includes(action)
  )
    return false;
  if (action === 'deposit') {
    const authorization = onchain.depositAuthorization;
    const validUnits = (value: string) => /^(0|[1-9][0-9]*)$/.test(value);
    if (
      !authorization ||
      !onchain.vaultAddress ||
      !/^0x[0-9a-fA-F]{40}$/.test(onchain.vaultAddress) ||
      authorization.spender.toLowerCase() !== onchain.vaultAddress.toLowerCase() ||
      !validUnits(authorization.afUsdcAllowanceBaseUnits) ||
      !validUnits(authorization.passAllowanceBaseUnits) ||
      BigInt(authorization.afUsdcAllowanceBaseUnits) === 0n ||
      BigInt(authorization.passAllowanceBaseUnits) < 1_000_000_000_000n
    )
      return false;
  }
  const exitEnabled =
    (action === 'withdraw' || action === 'close') &&
    (onchain.exitPath === 'LIVE_RPC' || onchain.exitPath === 'SIMULATION');
  if (onchain.readiness === 'UNKNOWN' || onchain.readiness === 'REORGED') return exitEnabled;
  if (onchain.health !== 'DEGRADED') return onchain.health === 'LIVE';
  return exitEnabled;
}

function onchainActions(onchain: OnchainProductPresentation): string {
  const labels: ReadonlyArray<readonly [OnchainProductAction, string]> = [
    ['deposit', 'Deposit'],
    ['withdraw', 'Withdraw'],
    ['close', 'Close'],
  ];
  return `<div class="inline-actions" aria-label="Testnet contract actions">${labels
    .map(([action, label]) => {
      const enabled = onchainActionEnabled(onchain, action);
      return `<button class="outline-btn" data-chain-action="${action}" ${enabled ? '' : 'disabled'}>${label}</button>`;
    })
    .join('')}</div>`;
}

function unsupportedOnchainActions(): string {
  return `<div class="inline-actions" aria-label="Unavailable Testnet actions">${[
    'Buy Pass',
    'Sell Pass',
    'Approve',
  ]
    .map((label) => `<button class="outline-btn" disabled>${label} · NOT IMPLEMENTED</button>`)
    .join('')}</div>`;
}

function onchainCard(onchain: OnchainProductPresentation): string {
  const deploymentMessage =
    onchain.deployment === 'CONFIGURED'
      ? 'Verified deployment metadata is configured.'
      : 'NOT DEPLOYED — no verified Vault address or deployment manifest is configured.';
  const healthMessage =
    onchain.health === 'DEGRADED'
      ? `INDEXER DEGRADED. Owner exit remains available through ${
          onchain.exitPath === 'SIMULATION'
            ? 'live RPC simulation'
            : onchain.exitPath === 'LIVE_RPC'
              ? 'live RPC'
              : 'no verified exit path'
        }.`
      : onchain.health === 'LIVE'
        ? 'Mock provider reads are active.'
        : 'Chain health is unavailable.';
  const writeMessage =
    onchain.writeMode === 'INJECTED_MOCK'
      ? 'INJECTED MOCK — no real rights or funds.'
      : onchain.writeMode === 'LIVE_AUTHORIZED'
        ? 'Live wallet actions require an explicit review and confirmation.'
        : 'Chain writes are disabled.';
  const authorization = onchain.depositAuthorization;
  const depositAuthorization = authorization
    ? `<div class="receipt"><div class="receipt-lines"><div><span>AF-USDC allowance</span><span>${escapeHtml(
        authorization.afUsdcAllowanceBaseUnits,
      )} base units</span></div><div><span>Pass allowance</span><span>${escapeHtml(
        authorization.passAllowanceBaseUnits,
      )} base units</span></div><div><span>spender</span><span>${escapeHtml(
        authorization.spender,
      )}</span></div></div></div><p>Deposit requires two exact finite approvals to the configured Vault. Approval flow is not implemented; infinite approval and arbitrary spenders are never used.</p>`
    : '<p>Deposit allowances are unavailable. Deposit remains disabled until both AF-USDC and Pass allowances are read for the configured Vault.</p>';
  return `<article class="sketch-box"><span class="section-label">PASS + VAULT / TESTNET</span><h3>${escapeHtml(
    onchain.readiness.replaceAll('_', ' '),
  )}</h3><p><strong>Deployment</strong> · ${escapeHtml(deploymentMessage)}</p><p>${escapeHtml(
    readinessMessages[onchain.readiness],
  )}</p><p>${escapeHtml(
    healthMessage,
  )}</p><p>${escapeHtml(writeMessage)}</p>${depositAuthorization}${onchainActions(
    onchain,
  )}${unsupportedOnchainActions()}</article>`;
}

const unavailableWallet: WalletPresentation = { status: 'DISCONNECTED' };
const unavailableNetwork: NetworkPresentation = { status: 'UNAVAILABLE' };
const idleTransaction: TransactionPresentation = { status: 'IDLE' };

function chainCards(
  wallet: WalletPresentation,
  network: NetworkPresentation,
  transaction: TransactionPresentation,
  assetBoundary: string,
  onchain?: OnchainProductPresentation,
): string {
  return `<div class="strategy-grid">${walletCard(wallet)}${networkCard(network)}${transactionCard(
    transaction,
  )}</div>${
    onchain
      ? `${onchainCard(onchain)}<div class="inline-actions" aria-label="Testnet wallet controls"><button class="outline-btn" data-chain-connect>Connect wallet</button><button class="text-link" data-chain-refresh>Refresh chain state</button></div>`
      : `<article class="sketch-box"><span class="section-label">PASS + VAULT / TESTNET / NOT IMPLEMENTED</span><p>${escapeHtml(
          assetBoundary,
        )}</p>${disabledActions()}</article>`
  }<p class="dialog-notice">Strategy Runtime, venue execution, positions, fills and strategy-generated P&amp;L are NOT IMPLEMENTED / FUTURE PHASE.</p>`;
}

export function renderM3StrategyShell(input: StrategyShellInput): string {
  const wallet = input.wallet ?? unavailableWallet;
  const network = input.network ?? unavailableNetwork;
  const transaction = input.transaction ?? idleTransaction;
  const canonical = input.strategyId === M3_CANONICAL_STRATEGY_ID;
  const historicalLocal = input.contentProvenance === 'LOCAL SIMULATION';
  const identityLabel = canonical
    ? 'CANONICAL STRATEGY ID'
    : historicalLocal
      ? 'HISTORICAL LOCAL IDENTITY'
      : 'FIXTURE STRATEGY ID';
  const identityMessage = canonical
    ? `${M3_CANONICAL_STRATEGY_ID} is the first M3 logical product strategy. Contract addresses and deployments attach through future reviewed metadata.`
    : historicalLocal
      ? `${input.strategyId} remains isolated from ${M3_CANONICAL_STRATEGY_ID}. No local balance or ownership is used as a Testnet holding.`
      : `${input.strategyId} remains a product fixture until an explicit canonical M3 assignment exists.`;
  const assetBoundary = canonical
    ? 'Chain ownership, balances, deployment evidence and supported writes are unavailable on this baseline.'
    : historicalLocal
      ? 'No local balance or ownership is used as a Testnet holding. No chain deployment mapping is assigned.'
      : 'No Testnet Pass or Vault deployment is assigned to this fixture strategy.';
  return `<section class="wrap section" aria-label="M3 product chain status"><span class="section-label">STRATEGY CONTENT / ${escapeHtml(
    input.contentProvenance,
  )}</span><h2>Strategy · ${escapeHtml(
    input.strategyId,
  )}</h2><p><strong>${identityLabel}</strong> · ${escapeHtml(identityMessage)}</p>${chainCards(
    wallet,
    network,
    transaction,
    assetBoundary,
    input.onchain,
  )}</section>`;
}

export function renderM3AccountShell(input: AccountShellInput): string {
  const wallet = input.wallet ?? unavailableWallet;
  const network = input.network ?? unavailableNetwork;
  const transaction = input.transaction ?? idleTransaction;
  return `<section class="wrap section" aria-label="M3 account chain status"><span class="section-label">ACCOUNT / LOCAL SIMULATION</span><h2>AlphaForge account · ${escapeHtml(
    input.accountId ?? 'No local session',
  )}</h2><p>Account and wallet are separate identities. Local Alice/Bob sessions do not authorize Testnet assets.</p>${chainCards(
    wallet,
    network,
    transaction,
    'Chain ownership, balances, deployment evidence and supported writes are unavailable on this baseline.',
    input.onchain,
  )}</section>`;
}

export function extendM3ProductPages(pages: M3ProductPages, options: M3PageExtensionOptions): M3ProductPages {
  return {
    account: (tab) => {
      const chain = options.chain?.();
      const onchain = chain?.onchain ?? options.onchain?.();
      return (
        renderM3AccountShell({
          accountId: options.accountId(),
          ...(chain
            ? {
                wallet: chain.wallet,
                network: chain.network,
                transaction: chain.transaction,
              }
            : {}),
          ...(onchain ? { onchain } : {}),
        }) + pages.account(tab)
      );
    },
    trade: (strategyId) => {
      const chain = options.chain?.();
      const onchain = chain?.onchain ?? options.onchain?.();
      return (
        renderM3StrategyShell({
          strategyId,
          contentProvenance: options.contentProvenance(strategyId),
          ...(chain
            ? {
                wallet: chain.wallet,
                network: chain.network,
                transaction: chain.transaction,
              }
            : {}),
          ...(onchain ? { onchain } : {}),
        }) + pages.trade(strategyId)
      );
    },
  };
}
