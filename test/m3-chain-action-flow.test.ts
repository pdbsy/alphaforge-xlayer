import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BrowserWalletPort, PreparedAction, WalletSubmission } from '../apps/web/src/chain-wallet.ts';
import { M3ChainActionFlow } from '../apps/web/src/m3-chain-action-flow.ts';
import { asAddress, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const owner = asAddress('0x1111111111111111111111111111111111111111');
const target = asAddress('0x2222222222222222222222222222222222222222');
const prepared: PreparedAction = {
  operationId: 'close-01',
  chainId: 46630,
  owner,
  target,
  data: asHexData('0x1234'),
  value: 0n,
};

function fixture(simulationOk = true) {
  const events: string[] = [];
  let read = 0;
  const submission: WalletSubmission = {
    operationId: prepared.operationId,
    chainId: prepared.chainId,
    owner,
    target,
    state: 'SUBMITTED',
    txHash: asTransactionHash(`0x${'ab'.repeat(32)}`),
    submittedAt: '2026-09-19T10:00:00.000Z',
  };
  const wallet: BrowserWalletPort = {
    async connect() {
      events.push('wallet.connect');
      return { account: owner, chainId: 46630 };
    },
    async submit(value) {
      events.push(`wallet.submit:${value.operationId}`);
      return submission;
    },
  };
  const adapter = {
    mode: 'robinhood-testnet' as const,
    async readSnapshot() {
      read += 1;
      events.push(`adapter.read:${read}`);
      return { read };
    },
    async observeOperation() {
      return { state: 'unused' };
    },
    async prepareAction(action: { readonly kind: 'close' }) {
      events.push(`adapter.prepare:${action.kind}`);
      return prepared;
    },
    async simulateAction(value: PreparedAction, context: { readonly snapshot: { readonly read: number } }) {
      events.push(`adapter.simulate:${value.operationId}:${context.snapshot.read}`);
      return simulationOk ? { ok: true as const } : { ok: false as const, errorCode: 'CLOSE_BLOCKED' };
    },
    async submitAction(value: PreparedAction, port: BrowserWalletPort) {
      events.push(`adapter.submit:${value.operationId}`);
      return port.submit(value);
    },
  };
  return { adapter, wallet, events, submission };
}

test('chain action flow rereads and simulates before review and wallet submission', async () => {
  const { adapter, wallet, events, submission } = fixture();
  const flow = new M3ChainActionFlow(adapter, wallet);

  await flow.connect();
  const review = await flow.review({ kind: 'close' });
  assert.equal(review.operationId, 'close-01');
  assert.equal(review.owner, owner);
  assert.deepEqual(await flow.confirm(review), submission);
  assert.deepEqual(events, [
    'wallet.connect',
    'adapter.read:1',
    'adapter.read:2',
    'adapter.prepare:close',
    'adapter.simulate:close-01:2',
    'adapter.read:3',
    'adapter.simulate:close-01:3',
    'adapter.submit:close-01',
    'wallet.submit:close-01',
  ]);
});

test('failed live simulation blocks review before any wallet submission', async () => {
  const { adapter, wallet, events } = fixture(false);
  const flow = new M3ChainActionFlow(adapter, wallet);

  await flow.connect();
  await assert.rejects(flow.review({ kind: 'close' }), /CLOSE_BLOCKED/);
  assert.doesNotMatch(events.join(','), /submit/);
});

test('reviews are opaque, flow-bound and single-use', async () => {
  const first = fixture();
  const second = fixture();
  const flow = new M3ChainActionFlow(first.adapter, first.wallet);
  const otherFlow = new M3ChainActionFlow(second.adapter, second.wallet);
  await flow.connect();
  await otherFlow.connect();
  const review = await flow.review({ kind: 'close' });

  await assert.rejects(otherFlow.confirm(review), /INVALID_ACTION_REVIEW/);
  await flow.confirm(review);
  await assert.rejects(flow.confirm(review), /INVALID_ACTION_REVIEW/);
  assert.equal(first.events.filter((event) => event.startsWith('wallet.submit')).length, 1);
});

test('a failed reconnect clears the previous wallet session', async () => {
  const { adapter, wallet } = fixture();
  let failConnect = false;
  const changingWallet: BrowserWalletPort = {
    async connect() {
      if (failConnect) throw new Error('WALLET_DISCONNECTED');
      return wallet.connect();
    },
    submit: (value) => wallet.submit(value),
  };
  const flow = new M3ChainActionFlow(adapter, changingWallet);
  await flow.connect();
  failConnect = true;
  await assert.rejects(flow.connect(), /WALLET_DISCONNECTED/);
  await assert.rejects(flow.review({ kind: 'close' }), /WALLET_CONNECTION_REQUIRED/);
});

test('flow stops after a delayed prepare if its caller invalidated the session', async () => {
  const { adapter, wallet, events } = fixture();
  const entered = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  const originalPrepare = adapter.prepareAction;
  adapter.prepareAction = async (action) => {
    const result = await originalPrepare(action);
    entered.resolve();
    await resume.promise;
    return result;
  };
  let current = true;
  const flow = new M3ChainActionFlow(adapter, wallet);
  await flow.connect();
  const pending = flow.review({ kind: 'close' }, () => {
    if (!current) throw new Error('WALLET_SESSION_CHANGED');
  });
  await entered.promise;
  current = false;
  resume.resolve();
  await assert.rejects(pending, /WALLET_SESSION_CHANGED/);
  assert.equal(
    events.some((event) => event.startsWith('adapter.simulate') || event.startsWith('wallet.submit')),
    false,
  );
});
