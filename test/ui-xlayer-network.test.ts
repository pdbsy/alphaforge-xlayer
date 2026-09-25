import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asAddress } from '../packages/chain-adapter/src/types.ts';
import { readM3BuildNetwork } from '../apps/web/src/m3-network.ts';
import {
  renderM3StrategyShell,
  renderNetworkStatus,
  extendM3ProductPages,
  renderM3AccountShell,
} from '../apps/web/src/m3-product-shell.ts';

const xlayer = () => readM3BuildNetwork({ VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: '1952' });

test('trusted build selection retains Robinhood only when missing or explicitly matched', () => {
  assert.equal(readM3BuildNetwork({}).chainId, 46_630);
  assert.equal(
    readM3BuildNetwork({ VITE_AF_CHAIN: 'robinhood-chain-testnet', VITE_AF_CHAIN_ID: '46630' }).chainId,
    46_630,
  );
  for (const env of [
    { VITE_AF_CHAIN_ID: '1952' },
    { VITE_AF_CHAIN: 'xlayer-testnet' },
    { VITE_AF_CHAIN: '', VITE_AF_CHAIN_ID: '' },
    { VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: '01952' },
    { VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: '1952 ' },
    { VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: 1952 },
    { VITE_AF_CHAIN: 'xlayer-mainnet', VITE_AF_CHAIN_ID: '196' },
    { VITE_AF_CHAIN: 'robinhood-chain-testnet', VITE_AF_CHAIN_ID: '1952' },
    ...['195', '196', '46630'].map((id) => ({ VITE_AF_CHAIN: 'xlayer-testnet', VITE_AF_CHAIN_ID: id })),
  ])
    assert.throws(() => readM3BuildNetwork(env), /INVALID_M3_BUILD_NETWORK/);
});

test('XLayer shell uses its selected testnet, native currency and transaction explorer', () => {
  const networkConfig = xlayer();
  assert.equal(networkConfig.chainId, 1952);
  assert.equal(networkConfig.nativeCurrency, 'OKB');
  assert.equal(Object.isFrozen(networkConfig), true);
  const hash = `0x${'ab'.repeat(32)}`;
  const html = renderM3StrategyShell({
    strategyId: 'trend',
    contentProvenance: 'FIXTURE',
    networkConfig,
    network: { status: 'WRONG', chainId: 46630 },
    transaction: { status: 'SUBMITTED', txHash: hash },
  });
  assert.match(html, /X Layer Testnet/);
  assert.match(html, /Chain ID 1952/);
  assert.match(html, /Wallet chain ID · 46630/);
  assert.match(html, /OKB/);
  assert.ok(html.includes(`${networkConfig.explorerUrl}/tx/${hash}`));
  assert.doesNotMatch(html, /explorer\.testnet\.chain\.robinhood\.com/);
  assert.match(renderNetworkStatus('WRONG', networkConfig), /X Layer Testnet/);
  assert.match(renderNetworkStatus('RPC_UNAVAILABLE', networkConfig), /X Layer Testnet/);
});

test('XLayer Vault selection is scoped to the configured network on account and strategy routes', () => {
  const networkConfig = xlayer();
  const vaultAddress = asAddress('0x2222222222222222222222222222222222222222');
  const selected = { chainId: 1952 as const, vaultAddress };
  const onchain = {
    deployment: 'CONFIGURED' as const,
    health: 'LIVE' as const,
    readiness: 'SOFT_READY' as const,
    owner: 'OWNER' as const,
    writeMode: 'INJECTED_MOCK' as const,
    exitPath: 'SIMULATION' as const,
    supportedActions: [] as const,
  };
  const pages = extendM3ProductPages(
    { account: () => '<p>Account preserved</p>', trade: () => '<p>Trade preserved</p>' },
    {
      networkConfig,
      accountId: () => 'alice',
      contentProvenance: () => 'FIXTURE',
      chain: () => ({
        wallet: { status: 'CONNECTED' },
        network: { status: 'CORRECT', chainId: 1952 },
        transaction: { status: 'IDLE' },
        onchain,
        vaultSelection: { selected, options: [selected] },
      }),
    },
  );
  for (const html of [pages.account('funds'), pages.trade('trend')]) {
    assert.match(html, /X Layer Testnet/);
    assert.ok(html.includes(`value="1952:${vaultAddress}" selected`));
  }
  assert.match(pages.account('funds'), /Account preserved/);
  assert.match(pages.trade('trend'), /Trade preserved/);
  for (const chainId of [195, 196, 46630]) {
    const foreign = { chainId, vaultAddress };
    const html = renderM3AccountShell({
      networkConfig,
      onchain,
      vaultSelection: { selected: foreign, options: [foreign] } as never,
    });
    assert.doesNotMatch(html, /data-chain-vault-select/);
  }
});
