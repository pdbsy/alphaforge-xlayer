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
import { asAddress, asHexData, asTransactionHash } from '../packages/chain-adapter/src/types.ts';

const CHAIN_ID = 46_630;
const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const OTHER_OWNER = asAddress('0x3333333333333333333333333333333333333333');
const CONTRACT = asAddress('0x2222222222222222222222222222222222222222');
const TX_HASH = asTransactionHash(`0x${'aa'.repeat(32)}`);

class ProviderFixture implements Eip1193Provider {
  readonly methods: string[] = [];
  readonly requests: Eip1193Request[] = [];
  readonly listeners = new Map<string, Set<(value: unknown) => void>>();
  readonly sendStarted = Promise.withResolvers<void>();
  readonly simulationStarted = Promise.withResolvers<void>();
  accounts: readonly string[] = [OWNER];
  chainId = '0xb626';
  simulationResult: unknown = '0x';
  simulationResponse: Promise<unknown> | null = null;
  simulationError: unknown = null;
  sendResult: unknown = TX_HASH;
  sendResponse: Promise<unknown> | null = null;
  sendError: unknown = null;
  listenerFailureEvent: 'accountsChanged' | 'chainChanged' | 'disconnect' | null = null;

  on(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (value: unknown) => void): void {
    if (event === this.listenerFailureEvent) throw new Error('provider listener failure');
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  removeListener(
    event: 'accountsChanged' | 'chainChanged' | 'disconnect',
    listener: (value: unknown) => void,
  ): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: 'accountsChanged' | 'chainChanged' | 'disconnect', value: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(value);
  }

  async request(input: { readonly method: string; readonly params?: readonly unknown[] }): Promise<unknown> {
    this.methods.push(input.method);
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts') return this.accounts;
    if (input.method === 'eth_chainId') return this.chainId;
    if (input.method === 'eth_call') {
      this.simulationStarted.resolve();
      if (this.simulationError) throw this.simulationError;
      if (this.simulationResponse) return this.simulationResponse;
      return this.simulationResult;
    }
    if (input.method === 'eth_sendTransaction') {
      this.sendStarted.resolve();
      if (this.sendError) throw this.sendError;
      if (this.sendResponse) return this.sendResponse;
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

test('wallet returns an explicit ambiguous result when account changes during provider confirmation', async () => {
  const provider = new ProviderFixture();
  const response = Promise.withResolvers<unknown>();
  provider.sendResponse = response.promise;
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
    now: () => '2026-09-14T12:00:00.000Z',
  });
  const pending = wallet.submit(factory.prepare({ amount: '01' }, OWNER));
  await provider.sendStarted.promise;
  provider.accounts = [OTHER_OWNER];
  provider.emit('accountsChanged', provider.accounts);
  provider.accounts = [OWNER];
  provider.emit('accountsChanged', provider.accounts);
  response.resolve(TX_HASH);

  assert.deepEqual(await pending, {
    operationId: 'deposit-01',
    target: CONTRACT,
    state: 'SUBMISSION_AMBIGUOUS',
    txHash: TX_HASH,
    observedAt: '2026-09-14T12:00:00.000Z',
    requestedChainId: CHAIN_ID,
    requestedOwner: OWNER,
    reason: 'SESSION_CHANGED',
    retryable: false,
  });
  assert.equal(
    [...provider.listeners.values()].every((listeners) => listeners.size === 0),
    true,
  );
});

test('wallet returns an explicit ambiguous result when chain changes during provider confirmation', async () => {
  const provider = new ProviderFixture();
  const response = Promise.withResolvers<unknown>();
  provider.sendResponse = response.promise;
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
    now: () => '2026-09-14T12:00:00.000Z',
  });
  const pending = wallet.submit(factory.prepare({ amount: '02' }, OWNER));
  await provider.sendStarted.promise;
  provider.chainId = '0x1';
  provider.emit('chainChanged', provider.chainId);
  response.resolve(TX_HASH);

  const result = await pending;
  assert.equal(result.state, 'SUBMISSION_AMBIGUOUS');
  if (result.state !== 'SUBMISSION_AMBIGUOUS') assert.fail('expected ambiguous submission');
  assert.equal(result.reason, 'SESSION_CHANGED');
  assert.equal(result.txHash, TX_HASH);
  assert.equal(
    [...provider.listeners.values()].every((listeners) => listeners.size === 0),
    true,
  );
});

test('provider failure after submission begins is non-retryable and does not claim chain ownership', async () => {
  const provider = new ProviderFixture();
  provider.sendError = { code: -32_000, message: 'unknown provider outcome' };
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
    now: () => '2026-09-14T12:00:00.000Z',
  });
  const result = await wallet.submit(factory.prepare({ amount: '03' }, OWNER));
  assert.deepEqual(result, {
    operationId: 'deposit-03',
    target: CONTRACT,
    state: 'SUBMISSION_AMBIGUOUS',
    txHash: null,
    observedAt: '2026-09-14T12:00:00.000Z',
    requestedChainId: CHAIN_ID,
    requestedOwner: OWNER,
    reason: 'PROVIDER_RESULT_UNKNOWN',
    retryable: false,
  });
});

test('invalid local time after a returned hash preserves the hash as an ambiguous outcome', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
    now: () => 'invalid-time',
  });
  const result = await wallet.submit(factory.prepare({ amount: '04' }, OWNER));
  assert.equal(result.state, 'SUBMISSION_AMBIGUOUS');
  if (result.state !== 'SUBMISSION_AMBIGUOUS') assert.fail('expected ambiguous submission');
  assert.equal(result.txHash, TX_HASH);
  assert.equal(result.observedAt, null);
  assert.equal(result.reason, 'LOCAL_EVIDENCE_INVALID');
  assert.equal(result.retryable, false);
});

test('wallet sanitizes listener registration failures and removes partial registrations', async () => {
  const provider = new ProviderFixture();
  provider.listenerFailureEvent = 'chainChanged';
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
  await assert.rejects(
    () => wallet.submit(factory.prepare({ amount: '05' }, OWNER)),
    (error: unknown) => error instanceof WalletFailure && error.code === 'WALLET_REQUEST_FAILED',
  );
  assert.deepEqual(provider.methods, []);
  assert.equal(
    [...provider.listeners.values()].every((listeners) => listeners.size === 0),
    true,
  );
});

test('wallet is inert until explicit connect and connect verifies chain identity', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
  assert.deepEqual(provider.methods, []);
  assert.deepEqual(await wallet.connect(), { account: OWNER, chainId: CHAIN_ID });
  assert.deepEqual(provider.methods, ['eth_requestAccounts', 'eth_chainId']);
});

test('wallet verifies account and chain again immediately before submission', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
    now: () => '2026-09-14T12:00:00.000Z',
  });
  const prepared = factory.prepare({ amount: '00' }, OWNER);
  const result = await wallet.submit(prepared);
  assert.deepEqual(provider.methods, [
    'eth_accounts',
    'eth_chainId',
    'eth_call',
    'eth_accounts',
    'eth_chainId',
    'eth_sendTransaction',
    'eth_accounts',
    'eth_chainId',
  ]);
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
    method: 'eth_call',
    params: [{ from: OWNER, to: CONTRACT, data: '0x123400', value: '0x0' }, 'latest'],
  });
  assert.deepEqual(provider.requests[5], {
    method: 'eth_sendTransaction',
    params: [{ from: OWNER, to: CONTRACT, data: '0x123400', value: '0x0' }],
  });
  assert.equal('ownerId' in result, false);
  assert.equal('demoIdentity' in result, false);
});

test('wallet fails closed when preflight simulation rejects or returns malformed data', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
  const prepared = factory.prepare({ amount: '06' }, OWNER);
  provider.simulationError = { code: -32_000, message: 'private provider detail' };
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) =>
      error instanceof WalletFailure &&
      error.code === 'WALLET_SIMULATION_FAILED' &&
      !error.message.includes('private'),
  );
  assert.equal(provider.methods.includes('eth_sendTransaction'), false);

  provider.simulationError = null;
  provider.simulationResult = 'not-hex';
  await assert.rejects(
    () => wallet.submit(prepared),
    (error: unknown) => error instanceof WalletFailure && error.code === 'WALLET_SIMULATION_FAILED',
  );
  assert.equal(provider.methods.includes('eth_sendTransaction'), false);
});

test('wallet rechecks account and chain after simulation before asking for submission', async () => {
  const provider = new ProviderFixture();
  const simulated = Promise.withResolvers<unknown>();
  provider.simulationResponse = simulated.promise;
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
  const pending = wallet.submit(factory.prepare({ amount: '07' }, OWNER));
  await provider.simulationStarted.promise;
  provider.accounts = [OTHER_OWNER];
  simulated.resolve('0x');
  await assert.rejects(
    () => pending,
    (error: unknown) => error instanceof WalletFailure && error.code === 'WALLET_ACCOUNT_CHANGED',
  );
  assert.equal(provider.methods.includes('eth_sendTransaction'), false);
});

test('changed account, changed chain and forged prepared data fail before submission', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
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
    target: CONTRACT,
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

test('wallet rejection is deterministic while an invalid provider result is explicitly ambiguous', async () => {
  const provider = new ProviderFixture();
  const wallet = new Eip1193Wallet(provider, {
    chainId: CHAIN_ID,
    target: CONTRACT,
    actionAuthority: factory.authority,
  });
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
  const ambiguous = await wallet.submit(prepared);
  assert.equal(ambiguous.state, 'SUBMISSION_AMBIGUOUS');
  if (ambiguous.state !== 'SUBMISSION_AMBIGUOUS') assert.fail('expected ambiguous submission');
  assert.equal(ambiguous.txHash, null);
  assert.equal(ambiguous.reason, 'PROVIDER_RESULT_UNKNOWN');
  assert.equal(ambiguous.retryable, false);
});

test('prepared action factory rejects values outside the EVM uint256 range', () => {
  const invalidFactory = new PreparedActionFactory<null>({
    chainId: CHAIN_ID,
    target: CONTRACT,
    operationId: () => 'invalid-value',
    encode: () => ({ data: asHexData('0x'), value: 1n << 256n }),
  });
  assert.throws(() => invalidFactory.prepare(null, OWNER), /INVALID_TRANSACTION_VALUE/);
});
