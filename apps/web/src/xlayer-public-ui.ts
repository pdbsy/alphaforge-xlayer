import { installCandleInspection } from './kline-hover.ts';
import './kline-hover.css';
import './xlayer-public-ui.css';
import { loadXLayerPublicRuntime } from './xlayer-public-config.ts';
import { M3_XLAYER_NETWORK } from './m3-network.ts';
import { createM3BrowserRuntime } from './m3-browser-runtime.ts';
import { renderM3PublicShell } from './m3-product-shell.ts';
import { installM3WalletControls } from './m3-wallet-ui.ts';
import { hydrateProductStyles } from './product-styles.ts';

const AF = window.AF as typeof window.AF & {
  publicMode?: boolean;
  publicReady?: boolean;
  homeHtml: string;
  rankings: { teaser: () => string };
  pages: Record<string, (...args: string[]) => string>;
  charts: typeof window.AF.charts & {
    priceBlock: (strategy: unknown) => string;
    returnBlock: (strategy: unknown) => string;
  };
  trade: {
    content: (strategy: unknown) => string;
    chartBlock: (strategy: unknown) => string;
    actionPanel: (strategy: unknown) => string;
  };
};
if (!AF.publicMode) throw new Error('PUBLIC_BUILD_MODE_MISMATCH');
const scope =
  'Strategy descriptions, charts and rankings are illustrative. Wallet balances and transactions come from X Layer Testnet. USDT denotes the test token used by this application.';
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
// Format the existing catalogue; never turn browser ledger values into wallet balances.
function publicMarkup(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const element of template.content.querySelectorAll(
    '.fixture-tag,.market-static-stamp,.mobile-order-dock,.rights-bridge,.position-slip,[data-claim],[data-cash],[data-release],[data-withdraw-confirm],[data-withdraw-cancel],[data-trade-pane],#allocate-form,#pass-order-form,[data-action="profile"],[data-action="export"],[data-action="reset-confirm"]',
  ))
    element.remove();
  const panel = template.content.querySelector('#trade-panel');
  if (panel)
    panel.innerHTML =
      '<aside class="sketch-box"><span class="section-label">PASS MARKET</span><h2>Access your strategy.</h2><p>Pass trading is not available yet. Use the wallet panel to manage a configured Vault or transfer an existing Pass.</p><a class="text-link" href="#/account">Open wallet ↗</a></aside>';
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    node.textContent = (node.textContent ?? '')
      .replace(/\bDEMO\b/g, 'USDT')
      .replace(/\bdemo\b/gi, 'illustrative')
      .replace(/\bfixtures?\b/gi, 'examples')
      .replace(/\bmock\b/gi, 'illustrative');
  }
  return template.innerHTML;
}
AF.homeHtml = publicMarkup(AF.homeHtml);
const teaser = AF.rankings.teaser.bind(AF.rankings);
AF.rankings.teaser = () => publicMarkup(teaser());
const openDialog = AF.app.openDialog.bind(AF.app);
AF.app.openDialog = (html) => openDialog(publicMarkup(html));
const topline = document.querySelector('.topline-status');
if (topline) topline.textContent = 'X Layer Testnet';
installCandleInspection(AF);
hydrateProductStyles();
for (const key of Object.keys(AF.pages)) {
  const original = AF.pages[key]!;
  AF.pages[key] = (...args) => publicMarkup(original(...args));
}
for (const key of ['priceBlock', 'returnBlock'] as const) {
  const original = AF.charts[key].bind(AF.charts);
  AF.charts[key] = (strategy) => publicMarkup(original(strategy));
}
for (const key of ['content', 'chartBlock'] as const) {
  const original = AF.trade[key].bind(AF.trade);
  AF.trade[key] = (strategy) => publicMarkup(original(strategy));
}
AF.trade.actionPanel = () => '';
const originalTrade = AF.pages.trade;
let runtime = createM3BrowserRuntime({ networkConfig: M3_XLAYER_NETWORK });
let error = '';
let loading = true;
const status = document.createElement('section');
status.className = 'wrap';
status.setAttribute('aria-label', 'X Layer Testnet connection');
document.querySelector('main')!.before(status);
function render(): void {
  status.innerHTML = `<div class="dialog-notice"><strong>X Layer Testnet</strong> · ${loading ? 'Loading configuration…' : error ? 'Connection unavailable' : '1952 · OKB'}${error ? `<p role="alert">${escapeHtml(error)}</p>` : ''}</div>`;
  AF.app.render({ preserve: true });
}
const walletPanel = () => renderM3PublicShell(runtime.snapshot, M3_XLAYER_NETWORK);
AF.pages.account = () => walletPanel();
AF.pages.trade = (id) =>
  originalTrade(id) +
  (id === 'trend'
    ? walletPanel()
    : '<section class="wrap dialog-notice">No Vault is configured for this strategy.</section>');
const footer = document.querySelector('.footer-bottom span');
if (footer) footer.textContent = scope;
for (const link of document.querySelectorAll('a[href="#/account/settings"]')) {
  link.setAttribute('href', '#/account');
  link.textContent = 'Wallet';
}
document.addEventListener(
  'click',
  (event) => {
    const target = (event.target as Element).closest('[data-action="design"]');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    AF.app.openDialog(
      `<span class="section-label">ALPHAFORGE</span><h2>Design & scope</h2><p>${scope}</p><p>Strategy execution and paid Pass trading are not available.</p><button class="text-link" data-close>Close</button>`,
    );
  },
  true,
);
AF.publicReady = true;
render();
try {
  ({ runtime } = await loadXLayerPublicRuntime(fetch, window.ethereum));
  installM3WalletControls(
    AF,
    runtime,
    async (action) => {
      error = '';
      try {
        await action();
      } catch (cause) {
        error = cause instanceof Error ? cause.message : 'CHAIN_REQUEST_FAILED';
      }
      render();
    },
    (message) => {
      error = message;
      const output = document.querySelector('[data-product-dialog-error]');
      if (output) output.textContent = message;
      render();
    },
  );
  runtime.subscribe(render);
} catch (cause) {
  error = cause instanceof Error ? cause.message : 'XLAYER_CONFIG_UNAVAILABLE';
} finally {
  loading = false;
  render();
}
