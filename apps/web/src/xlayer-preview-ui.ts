import { installCandleInspection } from './kline-hover.ts';
import './kline-hover.css';
import './wallet-account.css';
import { previewUsdtFromOkbCents, renderWalletAccount } from './wallet-account-view.ts';
import { hydrateProductStyles } from './product-styles.ts';

const AF = window.AF as typeof window.AF & {
  publicMode?: boolean;
  pages: Record<string, (...args: string[]) => string>;
  charts: typeof window.AF.charts & {
    priceBlock: (strategy: unknown) => string;
    returnBlock: (strategy: unknown) => string;
  };
  trade: {
    actionPanel: (strategy: unknown) => string;
    quoteSummary: (strategy: unknown) => string;
    content: (strategy: unknown) => string;
  };
  exchange: {
    read: () => {
      cash: number;
      positions: Record<string, { qty: number }>;
      funding: { cash: number; allocations: Record<string, number> };
    };
    fundingSnapshot: (strategy: string) => {
      cash: number;
      allocated: number;
      frozen: number;
      available: number;
      maxDeposit: number;
      passQty: number;
    };
    reviewFunding: (input: {
      strategy: string;
      kind: 'deposit' | 'withdraw';
      amount: number;
    }) => FundingReview;
    executeFunding: (review: FundingReview) => unknown;
  };
  strategies: { id: string; name: string }[];
  market: { results: () => string; refresh: () => void };
  rankings: { teaser: () => string; refresh: () => void };
  homeHtml: string;
  view: typeof window.AF.view & { passQty: string };
};
type FundingReview = { strategy: string; kind: 'deposit' | 'withdraw'; amount: number };
const FUNDING_SCALE = 1_000_000;
const fundingAmount = (value: number): string =>
  new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 6 }).format(
    value / FUNDING_SCALE,
  );
const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
if (AF.publicMode || (window as Window & { AF_PREVIEW_MODE?: boolean }).AF_PREVIEW_MODE !== true)
  throw new Error('PREVIEW_BUILD_MODE_MISMATCH');

const connectedKey = 'alphaforge.xlayer-preview.wallet.v1';
const address = '0xA1faF0e000000000000000000000000000000195';
let connected = false;
try {
  connected = localStorage.getItem(connectedKey) === 'connected';
} catch {
  /* Session-only if storage is unavailable. */
}
(window as Window & { AF_PREVIEW_CONNECTED?: boolean }).AF_PREVIEW_CONNECTED = connected;

// The prototype owns the trading state. This adapter changes its presentation only.
const previewCopy: Readonly<Record<string, string>> = {
  'Demo liquidity': 'Liquidity',
  'SIMULATED MARKET ORDER': 'MARKET ORDER',
  'Simulated fee': 'Fee',
  'Simulated price impact': 'Price impact',
  'Confirm demo buy ↗': 'Confirm buy ↗',
  'Confirm demo sell ↗': 'Confirm sell ↗',
  'RECORDED LOCALLY / DEMO TRADE RECEIPT': 'LOCAL ORDER RECEIPT',
  'Demo purchase recorded.': 'Purchase recorded.',
  'Demo sale recorded.': 'Sale recorded.',
  'Balance deducted (demo)': 'Amount paid',
  'Balance added (demo)': 'Proceeds received',
  'Execution uses a fixed demo quote. Confirmation only updates the separate Pass trading ledger. Trial funds stay unchanged and no strategy is executed.':
    'Confirm to update your browser balance and Pass holdings.',
  'Not a transaction hash. Nothing was submitted on-chain. Strategy returns are not credited to this ledger.':
    'Saved in this browser. No on-chain transaction.',
  'Trial Passes are not tradable holdings. Allocation uses a separate demo flow.':
    'Trial access and allocation are separate from tradable Pass holdings.',
  'Slippage illustrates a quote limit, not a real exchange price. Whole Pass quantities and simulated market orders only.':
    'Slippage sets the price limit for the quote. Use whole Pass quantities.',
  'Only simulated orders you confirmed on this device appear here. No fictional public buyers or trades are generated.':
    'Orders you confirmed in this browser appear here.',
  'Enter a quantity in the order panel, review it and confirm a simulated trade to see a record here.':
    'Review and confirm an order to see its record here.',
};

function previewMarkup(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelector('.order-kicker .fixture-tag')?.remove();
  const orderNotice = template.content.querySelector('.order-disclaimer');
  if (orderNotice) orderNotice.textContent = 'Review first. Only confirmation updates your account.';
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent ?? '';
    const replacement = previewCopy[text.trim()];
    node.textContent = (replacement === undefined ? text : text.replace(text.trim(), replacement)).replace(
      /\b(?:DEMO|USDT)\b/g,
      'OKB',
    );
  }
  return template.innerHTML;
}

const account = () => {
  const state = AF.exchange.read();
  const strategies = AF.strategies as { id: string; name: string }[];
  const passes = strategies
    .filter((s) => (state.positions[s.id]?.qty ?? 0) > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      quantity: String(state.positions[s.id]!.qty),
      href: `#/trade/${encodeURIComponent(s.id)}`,
      frozen: fundingAmount(state.funding.allocations[s.id] ?? 0),
      available: fundingAmount(
        state.positions[s.id]!.qty * FUNDING_SCALE - (state.funding.allocations[s.id] ?? 0),
      ),
      allocated: fundingAmount(state.funding.allocations[s.id] ?? 0),
    }));
  return `${renderWalletAccount({
    address: connected ? address : null,
    balance: connected ? (state.cash / 100).toFixed(2) : null,
    ...(connected ? { previewUsdt: previewUsdtFromOkbCents(state.cash) } : {}),
    passes: connected ? passes : [],
    message: 'Simulated account. Orders stay in this browser.',
    actionAttribute: 'data-preview-connect',
  })}<div class="wrap"><p class="dialog-notice">Explore a strategy to buy or sell Passes with this account.</p><a class="text-link" href="#/market">Explore strategies ↗</a></div>`;
};

let fundingReview: FundingReview | null = null;
function fundingSlot(holding: Element, kind: 'deposit' | 'withdraw' = 'deposit'): void {
  const slot = holding.querySelector('[data-wallet-funding-slot]');
  const strategy = holding.getAttribute('data-wallet-position');
  if (!slot || !strategy || !(holding instanceof HTMLDetailsElement) || !holding.open) return;
  if (slot.querySelector(`[data-wallet-funding-form][data-kind="${kind}"]`)) return;
  const snapshot = AF.exchange.fundingSnapshot(strategy);
  const maximum = kind === 'deposit' ? snapshot.maxDeposit : snapshot.allocated;
  slot.innerHTML = `<section class="wallet-funding sketch-box"><span class="section-label">USE PASS · MOCK STRATEGY</span><h2>Strategy funds</h2><div class="order-side"><button type="button" data-wallet-funding-side="deposit" aria-pressed="${kind === 'deposit'}">Deposit</button><button type="button" data-wallet-funding-side="withdraw" aria-pressed="${kind === 'withdraw'}">Withdraw</button></div><dl class="order-quote"><div><dt>Wallet available</dt><dd>${fundingAmount(snapshot.cash)} USDT</dd></div><div><dt>Allocated to strategy</dt><dd>${fundingAmount(snapshot.allocated)} USDT</dd></div><div><dt>Available Pass</dt><dd>${fundingAmount(snapshot.available)} Pass</dd></div></dl><form data-wallet-funding-form data-strategy="${escapeHtml(strategy)}" data-kind="${kind}"><label for="wallet-funding-amount">${kind === 'deposit' ? 'Deposit amount' : 'Withdraw amount'} · USDT</label><div class="pass-amount-wrap"><input id="wallet-funding-amount" name="amount" type="text" inputmode="decimal" autocomplete="off" value="${fundingAmount(maximum)}" required><span>USDT</span></div><p class="form-error" data-funding-error role="alert"></p><button class="primary-btn full" type="submit" ${maximum === 0 ? 'disabled' : ''}>Review ${kind === 'deposit' ? 'deposit' : 'withdrawal'} ↗</button></form><p class="small muted">1 Pass = 1 USDT capacity. Deposits freeze Pass; withdrawals release them. Mock balances.</p></section>`;
}
document.addEventListener(
  'toggle',
  (event) => {
    const holding = event.target;
    if (!(holding instanceof HTMLDetailsElement) || !holding.matches('.wallet-holding')) return;
    fundingReview = null;
    if (holding.open) fundingSlot(holding);
    else {
      const slot = holding.querySelector('[data-wallet-funding-slot]');
      if (slot) slot.replaceChildren();
    }
  },
  true,
);
document.querySelector('dialog')?.addEventListener('close', () => {
  fundingReview = null;
});
document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const side = target.closest('[data-wallet-funding-side]');
  if (side) {
    const holding = side.closest('[data-wallet-position]');
    const kind = side.getAttribute('data-wallet-funding-side');
    if (holding && (kind === 'deposit' || kind === 'withdraw')) fundingSlot(holding, kind);
    return;
  }
  const confirm = target.closest('[data-wallet-funding-confirm]');
  if (!confirm || !fundingReview) return;
  event.preventDefault();
  const review = fundingReview;
  fundingReview = null;
  try {
    AF.exchange.executeFunding(review);
    AF.app.closeDialog();
    const strategy = review.strategy;
    AF.app.render({ preserve: true });
    const holding = document.querySelector(`[data-wallet-position="${strategy}"]`);
    if (holding instanceof HTMLDetailsElement) {
      holding.open = true;
      fundingSlot(holding);
      const output = holding.querySelector('[data-funding-error]');
      if (output)
        output.textContent = `${review.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} recorded locally.`;
    }
  } catch (cause) {
    const output = document.querySelector('[data-preview-funding-error]');
    if (output) output.textContent = cause instanceof Error ? cause.message : 'Unable to update allocation.';
  }
});
document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('[data-wallet-funding-form]')) return;
  event.preventDefault();
  fundingReview = null;
  const strategy = form.getAttribute('data-strategy');
  const value = String(new FormData(form).get('amount') ?? '').trim();
  const kind = form.getAttribute('data-kind');
  if (
    !strategy ||
    !/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value) ||
    !['deposit', 'withdraw'].includes(kind ?? '')
  ) {
    const output = form.querySelector('[data-funding-error]');
    if (output) output.textContent = 'Enter a positive USDT amount with at most six decimal places.';
    return;
  }
  try {
    const [whole, fraction = ''] = value.split('.');
    const amount = Number(whole) * FUNDING_SCALE + Number(fraction.padEnd(6, '0'));
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a valid positive USDT amount.');
    fundingReview = AF.exchange.reviewFunding({ strategy, kind: kind as 'deposit' | 'withdraw', amount });
    const name =
      (AF.strategies as { id: string; name: string }[]).find((item) => item.id === strategy)?.name ??
      strategy;
    originalDialog(
      `<span class="section-label">USE PASS · REVIEW FUNDING</span><h2>Review ${kind === 'deposit' ? 'deposit' : 'withdrawal'}.</h2><p>${escapeHtml(name)}</p><div class="receipt"><div class="receipt-amount">${fundingAmount(amount)} <small>USDT</small></div><p>${kind === 'deposit' ? 'Wallet → Strategy allocation' : 'Strategy allocation → Wallet'}</p><p class="small muted">${fundingAmount(amount)} Pass will be ${kind === 'deposit' ? 'frozen (in use)' : 'released'}. Total Pass ownership stays unchanged. Mock transaction.</p></div><p data-preview-funding-error class="form-error" role="alert"></p><div class="dialog-actions"><button class="primary-btn" data-wallet-funding-confirm>Confirm ${kind === 'deposit' ? 'deposit' : 'withdrawal'}</button><button class="text-link" data-close>Cancel</button></div>`,
    );
  } catch (cause) {
    const output = form.querySelector('[data-funding-error]');
    if (output) output.textContent = cause instanceof Error ? cause.message : 'Unable to review allocation.';
  }
});

for (const key of Object.keys(AF.pages)) {
  if (key === 'account') continue;
  const original = AF.pages[key]!;
  AF.pages[key] = (...args) => previewMarkup(original(...args));
}
AF.pages.account = account;
AF.view.passQty = '1';
AF.homeHtml = previewMarkup(AF.homeHtml);
const originalTeaser = AF.rankings.teaser.bind(AF.rankings);
AF.rankings.teaser = () => previewMarkup(originalTeaser());
const originalMarketResults = AF.market.results.bind(AF.market);
AF.market.results = () => previewMarkup(originalMarketResults());
const originalMarketRefresh = AF.market.refresh.bind(AF.market);
AF.market.refresh = () => {
  originalMarketRefresh();
  const target = document.querySelector('#market-results');
  if (target) target.innerHTML = previewMarkup(target.innerHTML);
};
const originalRankingRefresh = AF.rankings.refresh.bind(AF.rankings);
AF.rankings.refresh = () => {
  originalRankingRefresh();
  const target = document.querySelector('#ranking-results');
  if (target) target.innerHTML = previewMarkup(target.innerHTML);
};
for (const key of ['priceBlock', 'returnBlock'] as const) {
  const original = AF.charts[key].bind(AF.charts);
  AF.charts[key] = (strategy) => previewMarkup(original(strategy));
}
for (const key of ['actionPanel', 'quoteSummary', 'content'] as const) {
  const original = AF.trade[key].bind(AF.trade);
  AF.trade[key] = (strategy) => previewMarkup(original(strategy));
}
const originalDialog = AF.app.openDialog.bind(AF.app);
AF.app.openDialog = (html) => originalDialog(previewMarkup(html));

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('[data-preview-connect]')) return;
  event.preventDefault();
  connected = true;
  (window as Window & { AF_PREVIEW_CONNECTED?: boolean }).AF_PREVIEW_CONNECTED = true;
  try {
    localStorage.setItem(connectedKey, 'connected');
  } catch {
    /* Session-only. */
  }
  AF.app.render({ preserve: true });
});
const topline = document.querySelector('.topline-status');
if (topline) topline.textContent = 'X Layer preview · OKB';
const footer = document.querySelector('.footer-bottom span');
if (footer) footer.textContent = 'AlphaForge · X Layer preview';
installCandleInspection(AF, document, 'OKB');
hydrateProductStyles();
AF.app.render({ preserve: true });
