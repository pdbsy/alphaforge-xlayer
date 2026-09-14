import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Eip1193Wallet,
  PreparedActionFactory,
  WalletFailure,
  type Eip1193Provider,
  type Eip1193Request,
  type PreparedAction,
} from '../apps/web/src/chain-wallet.ts';
import { operationEvidence, type ChainProjectionReference } from '../apps/web/src/strategy-adapter.ts';
import { createOperation, transitionOperation } from '../packages/chain-adapter/src/lifecycle.ts';
import { asAddress, asBlockHash, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const CHAIN_ID = 46_630;
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const OTHER_OWNER = asAddress('0x3333333333333333333333333333333333333333');
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const TX_HASH = asTransactionHash(`0x${'aa'.repeat(32)}`);
const BLOCK_HASH = asBlockHash(`0x${'bb'.repeat(32)}`);

class ProviderFixture implements Eip1193Provider {
  readonly methods: string[] = [];
  readonly requests: Eip1193Request[] = [];
  accounts: readonly string[] = [OWNER];
  chainId = '0xb626';
  sendResult: unknown = TX_HASH;
  sendError: unknown = null;

  async request(input: { readonly method: string; readonly params?: readonly unknown[] }): Promise<unknown> {
    this.methods.push(input.method);
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts') return this.accounts;
    if (input.method === 'eth_chainId') return this.chainId;
    if (input.method === 'eth_sendTransaction') {
      if (this.sendError) throw this.sendError;
      return this.sendResult;
    }
    throw new Error('unexpected method');
  }
}

const factory = new PreparedActionFactory<{ readonly amount: string }>({
  chainId: CHAIN_ID,
  target: CONTRACT,
  operationId: (action) => `deposit-${action.amount}`,
  encode: (action) => ({ data: asHexData(`0x1234${action.amount}`), value: 0n }),
});

test('wallet is inert until explicit connect and connect verifies chain identity', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, { chainId: CHAIN_ID, target: CONTRACT });
  assert.deepEqual(provider.methods, []);
  assert.deepEqual(await wallet.connect(), { account: OWNER, chainId: CHAIN_ID });
  assert.deepEqual(provider.methods, ['eth_requestAccounts', 'eth_chainId']);
});

test('wallet verifies account and chain again immediately before submission', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    now: () => '2026-09-14T12:00:00.000Z',
  });
  const prepared = factory.prepare({ amount: '00' }, OWNER);
  const result = await wallet.submit(prepared);
  assert.deepEqual(provider.methods, ['eth_accounts', 'eth_chainId', 'eth_sendTransaction']);
  assert.deepEqual(result, {
    operationId: 'deposit-00',
    chainId: CHAIN_ID,
    owner: OWNER,
    target: CONTRACT,
    state: 'SUBMITTED',
    txHash: TX_HASH,
    submittedAt: '2026-09-14T12:00:00.000Z',
  });
  assert.deepEqual(provider.requests[2], {
    method: 'eth_sendTransaction',
    params: [{ from: OWNER, to: CONTRACT, data: '0x123400', value: '0x0' }],
  });
  assert.equal('ownerId' in result, false);
  assert.equal('demoIdentity' in result, false);
});

test('changed account, changed chain and forged prepared data fail before submission', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, { chainId: CHAIN_ID, target: CONTRACT });
  const prepared = factory.prepare({ amount: '00' }, OWNER);

  provider.accounts = [OTHER_OWNER];
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) => {
      return error instanceof WalletFailure && error.code === 'WALLET_ACCOUNT_CHANGED';
    },
  );
  provider.accounts = [OWNER];
  provider.chainId = '0x1';
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) => {
      return error instanceof WalletFailure && error.code === 'WALLET_WRONG_CHAIN';
    },
  );
  provider.chainId = '0xb626';
  await assert.rejects(
    () => wallet.submit({ ...prepared } as PreparedAction),
    (error: unknown) => {
      return error instanceof WalletFailure && error.code === 'UNTRUSTED_PREPARED_ACTION';
    },
  );
  const foreignFactory = new PreparedActionFactory<{ readonly amount: string }>({
    chainId: CHAIN_ID,
    target: OTHER_OWNER,
    operationId: () => 'foreign-action',
    encode: () => ({ data: asHexData('0x1234'), value: 0n }),
  });
  await assert.rejects(
    () => wallet.submit(foreignFactory.prepare({ amount: '00' }, OWNER)),
    (error: unknown) => {
      return error instanceof WalletFailure && error.code === 'UNTRUSTED_PREPARED_ACTION';
    },
  );
  assert.equal(provider.methods.includes('eth_sendTransaction'), false);
});

test('wallet rejection and malformed submission response use stable sanitized errors', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, { chainId: CHAIN_ID, target: CONTRACT });
  const prepared = factory.prepare({ amount: '00' }, OWNER);
  provider.sendError = { code: 4001, message: 'secret provider detail' };
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) => {
      return (
        error instanceof WalletFailure &&
        error.code === 'WALLET_REJECTED' &&
        !error.message.includes('secret')
      );
    },
  );
  provider.sendError = null;
  provider.sendResult = 'not-a-hash';
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) => {
      return error instanceof WalletFailure && error.code === 'WALLET_INVALID_RESPONSE';
    },
  );
});

test('operation evidence keeps receipt, reconciliation and product projection milestones separate', () => {
  const submitted = transitionOperation(
    createOperation({
      operationId: 'operation-view',
      chainId: CHAIN_ID,
      owner: OWNER,
      target: CONTRACT,
      state: 'AWAITING_SIGNATURE',
    }),
    { state: 'SUBMITTED', txHash: TX_HASH, submittedAt: '2026-09-14T12:00:00.000Z' },
  );
  const mined = transitionOperation(submitted, {
    state: 'MINED',
    blockNumber: 100n,
    blockHash: BLOCK_HASH,
    receiptStatus: 'SUCCESS',
  });
  const confirming = transitionOperation(mined, {
    state: 'CONFIRMING',
    confirmations: 2,
    reconciled: true,
  });
  assert.deepEqual(operationEvidence(confirming, null), {
    lifecycle: 'CONFIRMING',
    receipt: 'SUCCESS',
    confirmations: 2,
    reconciliation: 'MATCHED',
    projection: 'PENDING',
    productReady: false,
  });
  const confirmed = transitionOperation(confirming, {
    state: 'CONFIRMED',
    confirmations: 3,
    reconciled: true,
    confirmedAt: '2026-09-14T12:01:00.000Z',
  });
  const projection: ChainProjectionReference = {
    chainId: CHAIN_ID,
    owner: OWNER,
    contract: CONTRACT,
    blockNumber: 100n,
    blockHash: BLOCK_HASH,
    stale: false,
  };
  assert.equal(operationEvidence(confirmed, projection).productReady, true);
  assert.deepEqual(
    operationEvidence(
      transitionOperation(confirmed, {
        state: 'REORGED',
        errorCode: 'CHAIN_REORG',
      }),
      projection,
    ),
    {
      lifecycle: 'REORGED',
      receipt: 'SUCCESS',
      confirmations: 3,
      reconciliation: 'PENDING',
      projection: 'STALE',
      productReady: false,
    },
  );
});
