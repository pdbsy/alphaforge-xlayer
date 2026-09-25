import test from 'node:test';
import assert from 'node:assert/strict';
import { previewUsdtFromOkbCents, renderWalletAccount } from '../apps/web/src/wallet-account-view.ts';
import { readXLayerWalletBalances } from '../apps/web/src/xlayer-wallet-balances.ts';
import type { Eip1193Provider } from '../apps/web/src/chain-wallet.ts';

const owner = '0x1111111111111111111111111111111111111111';
const pass = '0x2222222222222222222222222222222222222222';
test('fixed preview rate converts the displayed OKB cash amount only', () => {
  assert.equal(previewUsdtFromOkbCents(100000), '120000.00');
  assert.equal(previewUsdtFromOkbCents(12345), '14814.00');
  assert.throws(() => previewUsdtFromOkbCents(-1));
});
function provider(request: Eip1193Provider['request']): Eip1193Provider {
  return { request, on() {}, removeListener() {} };
}
test('wallet account shows one compact action and no chain diagnostics', () => {
  const disconnected = renderWalletAccount({
    address: null,
    balance: null,
    passes: [],
    actionAttribute: 'data-chain-connect',
  });
  assert.match(disconnected, /data-chain-connect/);
  assert.match(disconnected, /Connect Wallet/);
  assert.doesNotMatch(disconnected, /Vault|Transaction|Network|0 OKB/);
  const unknown = renderWalletAccount({
    address: owner,
    balance: null,
    passes: [],
    actionAttribute: 'data-chain-connect',
  });
  assert.match(unknown, /Pass balance unavailable/);
  assert.doesNotMatch(unknown, /0 OKB|No Passes yet/);
  const connected = renderWalletAccount({
    address: owner,
    balance: '2.5',
    passes: [{ id: 'trend', name: '<Pass>', quantity: '3', href: '#/trade/trend' }],
    previewUsdt: '300.00',
    actionAttribute: 'data-preview-connect',
  });
  assert.match(connected, new RegExp(owner));
  assert.match(connected, /title="0x111/);
  assert.match(connected, /<strong>2\.5<\/strong><span>OKB/);
  assert.match(connected, /300\.00 USDT/);
  assert.match(connected, /1 OKB = 120 USDT/);
  assert.match(connected, /<strong>3<\/strong> Pass/);
  assert.doesNotMatch(connected, /<Pass>/);
  assert.match(connected, /&lt;Pass&gt;/);
  assert.match(connected, /data-wallet-position="trend"/);
});
test('native OKB reads without any deployment and configured Pass addresses are deduplicated', async () => {
  const calls: string[] = [];
  const wallet = provider(async ({ method, params }) => {
    calls.push(method);
    if (method === 'eth_accounts') return [owner];
    if (method === 'eth_chainId') return '0x7a0';
    if (method === 'eth_getBalance') {
      assert.deepEqual(params, [owner, 'latest']);
      return '0x22b1c8c1227a0000';
    }
    if (method === 'eth_call') return '0x' + (3n * 10n ** 18n).toString(16).padStart(64, '0');
    throw Error('unexpected');
  });
  const native = await readXLayerWalletBalances({ provider: wallet, address: owner, deployments: [] });
  assert.equal(native.balance, '2.5');
  assert.deepEqual(native.passes, []);
  const holding = await readXLayerWalletBalances({
    provider: wallet,
    address: owner,
    deployments: [
      { strategyPassAddress: pass },
      { strategyPassAddress: pass.toUpperCase().replace('0X', '0x') },
    ],
  });
  assert.equal(holding.passes.length, 1);
  assert.equal(holding.passes[0]?.quantity, '3');
  assert.equal(calls.filter((method) => method === 'eth_call').length, 1);
});
test('balance reader rejects stale accounts, chain changes and malformed responses', async () => {
  for (const bad of ['0x', '-1', '0xzz', '0x' + 'f'.repeat(65)]) {
    const wallet = provider(async ({ method }) =>
      method === 'eth_accounts' ? [owner] : method === 'eth_chainId' ? '0x7a0' : bad,
    );
    await assert.rejects(readXLayerWalletBalances({ provider: wallet, address: owner, deployments: [] }));
  }
  let accounts = 0;
  const changed = provider(async ({ method }) =>
    method === 'eth_accounts'
      ? ++accounts === 1
        ? [owner]
        : [pass]
      : method === 'eth_chainId'
        ? '0x7a0'
        : '0x1',
  );
  await assert.rejects(
    readXLayerWalletBalances({ provider: changed, address: owner, deployments: [] }),
    /WALLET_ACCOUNT_CHANGED/,
  );
  let chains = 0;
  const switched = provider(async ({ method }) =>
    method === 'eth_accounts'
      ? [owner]
      : method === 'eth_chainId'
        ? ++chains === 1
          ? '0x7a0'
          : '0x1'
        : '0x1',
  );
  await assert.rejects(
    readXLayerWalletBalances({ provider: switched, address: owner, deployments: [] }),
    /WALLET_WRONG_CHAIN/,
  );
});
