export interface WalletPassHolding {
  readonly id?: string;
  readonly name: string;
  readonly quantity: string;
  readonly href?: string;
  readonly frozen?: string;
  readonly available?: string;
  readonly allocated?: string;
}

export interface WalletAccountInput {
  readonly address: string | null;
  readonly connecting?: boolean;
  readonly balance: string | null;
  readonly passes: readonly WalletPassHolding[];
  readonly message?: string;
  readonly previewUsdt?: string;
  readonly actionAttribute: 'data-chain-connect' | 'data-preview-connect';
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

export function previewUsdtFromOkbCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Invalid preview OKB balance.');
  return ((cents * 120) / 100).toFixed(2);
}

export function renderWalletAccount(input: WalletAccountInput): string {
  const connected = Boolean(input.address);
  const label = input.connecting
    ? 'Connecting…'
    : input.address
      ? `${escapeHtml(input.address.slice(0, 6))}…${escapeHtml(input.address.slice(-4))}`
      : 'Connect Wallet';
  const balance = input.balance === null ? '—' : escapeHtml(input.balance);
  const passes = input.passes.length
    ? input.passes
        .map((holding) => {
          const name = escapeHtml(holding.name);
          const href = holding.href?.startsWith('#/') ? escapeHtml(holding.href) : '';
          const row = `<span class="wallet-pass-icon" aria-hidden="true">α</span><span class="wallet-pass-main"><strong>${name}</strong><small>${holding.id ? 'Mock Pass · Use Pass' : 'Strategy access'}</small></span><span class="wallet-pass-quantity"><strong>${escapeHtml(holding.quantity)}</strong> Pass${holding.id ? `<small>Frozen (in use) ${escapeHtml(holding.frozen ?? '0')} · Available ${escapeHtml(holding.available ?? holding.quantity)}</small><small>Allocated ${escapeHtml(holding.allocated ?? '0')} USDT</small>` : ''}</span>`;
          return holding.id
            ? `<details class="wallet-holding" name="wallet-holdings" data-wallet-position="${escapeHtml(holding.id)}"><summary class="wallet-pass-row sketch-box">${row}</summary><div class="wallet-holding-panel"><div data-wallet-funding-slot></div>${href ? `<a class="text-link" href="${href}">Trade Pass ↗</a>` : ''}</div></details>`
            : `<article class="wallet-pass-row sketch-box">${row}${href ? `<a class="text-link" href="${href}">View ↗</a>` : ''}</article>`;
        })
        .join('')
    : `<div class="wallet-empty sketch-box"><span class="wallet-pass-icon" aria-hidden="true">α</span><h3>${connected ? (input.balance === null ? 'Pass balance unavailable' : 'No Passes yet') : 'Your Passes, in one place'}</h3><p>${connected ? (input.balance === null ? 'No verified Pass balance to display yet.' : 'Explore strategies to add a Pass.') : 'Connect your wallet to see your holdings.'}</p></div>`;
  return `<section class="wrap wallet-account" data-wallet-account aria-label="My Account">
    <header class="wallet-account-header"><div><span class="section-label">MY WORKSHOP</span><h1>My Account</h1></div><button class="primary-btn wallet-account-button" ${input.actionAttribute}${input.connecting ? ' disabled' : ''}${input.address ? ` title="${escapeHtml(input.address)}"` : ''}><span class="wallet-status-dot${connected ? ' connected' : ''}" aria-hidden="true"></span>${label}</button></header>
    ${input.message ? `<p class="wallet-account-message" role="status">${escapeHtml(input.message)}</p>` : ''}
    <article class="sketch-box wallet-okb"><span class="section-label">OKB balance</span><div class="wallet-amount"><strong>${balance}</strong><span>OKB</span></div>${input.previewUsdt ? `<p class="small muted">≈ ${escapeHtml(input.previewUsdt)} USDT · 1 OKB = 120 USDT · Fixed preview rate</p>` : `<p class="small muted">${connected ? (input.balance === null ? 'Balance unavailable' : 'Available in your wallet') : 'Connect your wallet to view your balance'}</p>`}</article>
    <section class="wallet-passes" aria-label="Pass holdings"><header><h2>Pass holdings</h2><span class="small muted">Strategy access</span></header>${passes}</section>
  </section>`;
}
