import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createM3BrowserRuntime } from '../apps/web/src/m3-browser-runtime.ts';
import type { Eip1193Provider, Eip1193Request } from '../apps/web/src/chain-wallet.ts';
import { renderM3StrategyShell } from '../apps/web/src/m3-product-shell.ts';

class ProviderFixture implements Eip1193Provider {
  readonly requests: Eip1193Request[] = [];
  chainId = 1;

  async request(input: Eip1193Request): Promise<unknown> {
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts')
      return ['0x1111111111111111111111111111111111111111'];
    if (input.method === 'eth_chainId') return `0x${this.chainId.toString(16)}`;
    throw new Error('UNEXPECTED_PROVIDER_METHOD');
  }

  on(): void {}
  removeListener(): void {}
}

test('production browser runtime is inert before connect and reports wrong chain without a deployment', async () => {
  const provider = new ProviderFixture();
  const runtime = createM3BrowserRuntime({ provider });

  assert.equal(provider.requests.length, 0);
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
  assert.equal(runtime.snapshot.onchain.writeMode, 'DISABLED');
  const html = renderM3StrategyShell({
    strategyId: 'trend',
    contentProvenance: 'FIXTURE',
    ...runtime.snapshot,
  });
  assert.match(html, /NOT DEPLOYED/);
  for (const action of ['Buy Pass', 'Sell Pass', 'Deposit', 'Withdraw', 'Approve', 'Close']) {
    assert.match(html, new RegExp(`<button[^>]*disabled[^>]*>${action}`));
  }
  await assert.rejects(runtime.connect(), /WALLET_WRONG_CHAIN/);
  assert.equal(runtime.snapshot.wallet.status, 'DISCONNECTED');
  assert.equal(runtime.snapshot.network.status, 'WRONG');
  assert.equal(runtime.snapshot.network.chainId, 1);
});

test('production browser runtime connects the existing EIP-1193 wallet boundary but keeps writes closed', async () => {
  const provider = new ProviderFixture();
  provider.chainId = 46630;
  const runtime = createM3BrowserRuntime({ provider });

  await runtime.connect();
  assert.deepEqual(runtime.snapshot.wallet, {
    status: 'CONNECTED',
    address: '0x1111111111111111111111111111111111111111',
  });
  assert.deepEqual(runtime.snapshot.network, { status: 'CORRECT', chainId: 46630 });
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
  await assert.rejects(
    runtime.reviewAction({ kind: 'withdraw', usdcBaseUnits: '1' }),
    /M3_DEPLOYMENT_NOT_CONFIGURED/,
  );
  assert.equal(
    provider.requests.some((request) => request.method === 'eth_sendTransaction'),
    false,
  );
});

test('production browser runtime fails closed when no injected wallet provider exists', async () => {
  const runtime = createM3BrowserRuntime({});

  await assert.rejects(runtime.connect(), /WALLET_PROVIDER_UNAVAILABLE/);
  assert.equal(runtime.snapshot.network.status, 'UNAVAILABLE');
  assert.equal(runtime.snapshot.onchain.deployment, 'UNAVAILABLE');
});
