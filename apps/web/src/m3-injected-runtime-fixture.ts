import {
  asAddress,
  asHexData,
  asTransactionHash,
  type Address,
} from '../../../packages/chain-adapter/src/types.ts';
import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import {
  Eip1193Wallet,
  PreparedActionFactory,
  WalletFailure,
  type BrowserWalletPort,
  type Eip1193Provider,
  type Eip1193Request,
  type PreparedAction,
  type WalletSubmission,
} from './chain-wallet.ts';
import { M3ChainActionFlow, type M3ActionReview } from './m3-chain-action-flow.ts';
import type { M3ProductChainPresentation } from './m3-product-shell.ts';
import {
  type M3ProductActionRequest,
  type M3ProductActionReview,
  type M3ProductRuntime,
} from './m3-product-runtime.ts';
import type { SimulatingRobinhoodTestnetStrategyAdapter } from './strategy-adapter.ts';

const OWNER = asAddress('0x1111111111111111111111111111111111111111');
const VAULT = asAddress('0x2222222222222222222222222222222222222222');
const TX_HASH = asTransactionHash(`0x${'ab'.repeat(32)}`);
const WRONG_CHAIN_ID = 1;

interface FixtureSnapshot {
  readonly owner: Address;
}

class InjectedProviderFixture implements Eip1193Provider {
  readonly requests: Eip1193Request[] = [];
  readonly #listeners = new Map<string, Set<(value: unknown) => void>>();
  chainId = WRONG_CHAIN_ID;

  on(event: 'accountsChanged' | 'chainChanged' | 'disconnect', listener: (value: unknown) => void): void {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(event, listeners);
  }

  removeListener(
    event: 'accountsChanged' | 'chainChanged' | 'disconnect',
    listener: (value: unknown) => void,
  ): void {
    this.#listeners.get(event)?.delete(listener);
  }

  async request(input: Eip1193Request): Promise<unknown> {
    this.requests.push(input);
    if (input.method === 'eth_requestAccounts' || input.method === 'eth_accounts') return [OWNER];
    if (input.method === 'eth_chainId') return `0x${this.chainId.toString(16)}`;
    if (input.method === 'eth_call') {
      const call = input.params?.[0] as { readonly data?: unknown } | undefined;
      if (call?.data === '0x8da5cb5b') return `0x${OWNER.slice(2).padStart(64, '0')}`;
      return '0x';
    }
    if (input.method === 'eth_sendTransaction') return TX_HASH;
    throw new Error('INJECTED_PROVIDER_METHOD_UNSUPPORTED');
  }
}

function encodeAction(action: M3ProductActionRequest) {
  if (action.kind === 'close') return { data: asHexData('0x43d726d6'), value: 0n };
  const selector = action.kind === 'deposit' ? 'b6b55f25' : '2e1a7d4d';
  const amount = BigInt(action.usdcBaseUnits).toString(16).padStart(64, '0');
  return { data: asHexData(`0x${selector}${amount}`), value: 0n };
}

function initialPresentation(): M3ProductChainPresentation {
  const presentation: M3ProductChainPresentation = {
    wallet: { status: 'DISCONNECTED' },
    network: { status: 'WRONG', chainId: WRONG_CHAIN_ID },
    transaction: { status: 'IDLE' },
    onchain: {
      deployment: 'CONFIGURED',
      health: 'LIVE',
      readiness: 'UNKNOWN',
      owner: 'UNKNOWN',
      writeMode: 'INJECTED_MOCK',
      exitPath: 'SIMULATION',
      supportedActions: ['deposit', 'withdraw', 'close'],
    },
  };
  return Object.freeze(presentation);
}

class InjectedM3ProductRuntime implements M3ProductRuntime {
  readonly #provider: InjectedProviderFixture;
  readonly #adapter: SimulatingRobinhoodTestnetStrategyAdapter<
    FixtureSnapshot,
    M3ProductActionRequest,
    never
  >;
  readonly #flow: M3ChainActionFlow<FixtureSnapshot, M3ProductActionRequest, never>;
  readonly #listeners = new Set<() => void>();
  readonly #reviews = new WeakMap<M3ProductActionReview, M3ActionReview>();
  #snapshot = initialPresentation();

  constructor(
    provider: InjectedProviderFixture,
    adapter: SimulatingRobinhoodTestnetStrategyAdapter<FixtureSnapshot, M3ProductActionRequest, never>,
    wallet: BrowserWalletPort,
  ) {
    this.#provider = provider;
    this.#adapter = adapter;
    this.#flow = new M3ChainActionFlow(adapter, wallet);
  }

  get snapshot(): M3ProductChainPresentation {
    return this.#snapshot;
  }

  #publish(snapshot: M3ProductChainPresentation): void {
    this.#snapshot = Object.freeze(snapshot);
    for (const listener of this.#listeners) listener();
  }

  #connected(snapshot: FixtureSnapshot): M3ProductChainPresentation {
    return {
      wallet: { status: 'CONNECTED', address: OWNER },
      network: { status: 'CORRECT', chainId: ROBINHOOD_CHAIN_TESTNET.chainId },
      transaction: this.#snapshot.transaction,
      onchain: {
        ...this.#snapshot.onchain,
        health: 'LIVE',
        owner: snapshot.owner === OWNER ? 'OWNER' : 'NON_OWNER',
      },
    };
  }

  async connect(): Promise<void> {
    this.#publish({
      ...this.#snapshot,
      wallet: { status: 'CONNECTING' },
    });
    try {
      const connected = await this.#flow.connect();
      this.#publish(this.#connected(connected.snapshot));
    } catch (error) {
      const code = error instanceof WalletFailure ? error.code : 'WALLET_REQUEST_FAILED';
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'DISCONNECTED', errorCode: code },
        network: {
          status: code === 'WALLET_WRONG_CHAIN' ? 'WRONG' : 'RPC_UNAVAILABLE',
          chainId: this.#provider.chainId,
        },
      });
      throw error;
    }
  }

  async refresh(): Promise<void> {
    if (this.#snapshot.wallet.status !== 'CONNECTED') return;
    const snapshot = await this.#adapter.readSnapshot({ wallet: OWNER });
    this.#publish(this.#connected(snapshot));
  }

  async reviewAction(request: M3ProductActionRequest): Promise<M3ProductActionReview> {
    this.#publish({
      ...this.#snapshot,
      transaction: { status: 'WALLET_APPROVAL_REQUIRED' },
    });
    const internal = await this.#flow.review(request);
    const review = Object.freeze({
      operationId: internal.operationId,
      owner: internal.owner,
      request,
    });
    this.#reviews.set(review, internal);
    return review;
  }

  async confirmAction(review: M3ProductActionReview): Promise<WalletSubmission> {
    const internal = this.#reviews.get(review);
    if (!internal) throw new Error('INVALID_PRODUCT_REVIEW');
    this.#reviews.delete(review);
    this.#publish({ ...this.#snapshot, transaction: { status: 'WALLET_PENDING' } });
    const submission = await this.#flow.confirm(internal);
    this.#publish({
      ...this.#snapshot,
      transaction:
        submission.state === 'SUBMITTED'
          ? { status: 'SUBMITTED', txHash: submission.txHash }
          : {
              status: 'SUBMISSION_AMBIGUOUS',
              ...(submission.txHash ? { txHash: submission.txHash } : {}),
              errorCode: submission.reason,
            },
    });
    return submission;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setCorrectNetwork(): void {
    this.#provider.chainId = ROBINHOOD_CHAIN_TESTNET.chainId;
    this.#publish({
      ...this.#snapshot,
      network: { status: 'UNAVAILABLE', chainId: ROBINHOOD_CHAIN_TESTNET.chainId },
    });
  }

  setSoftReady(): void {
    this.#publish({
      ...this.#snapshot,
      transaction: { status: 'READY', txHash: TX_HASH },
      onchain: { ...this.#snapshot.onchain, health: 'LIVE', readiness: 'SOFT_READY' },
    });
  }

  setReorged(): void {
    this.#publish({
      ...this.#snapshot,
      transaction: { status: 'FAILED', txHash: TX_HASH, errorCode: 'REORGED' },
      onchain: { ...this.#snapshot.onchain, health: 'LIVE', readiness: 'REORGED' },
    });
  }

  setDegraded(): void {
    this.#publish({
      ...this.#snapshot,
      transaction: { status: 'INDEXING', txHash: TX_HASH },
      onchain: {
        ...this.#snapshot.onchain,
        health: 'DEGRADED',
        readiness: 'FINALITY_UNKNOWN',
        exitPath: 'SIMULATION',
      },
    });
  }
}

export interface M3InjectedRuntimeFixture {
  readonly runtime: M3ProductRuntime;
  readonly providerRequests: readonly Eip1193Request[];
  setCorrectNetwork(): void;
  setSoftReady(): void;
  setReorged(): void;
  setDegraded(): void;
}

export function createM3InjectedRuntimeFixture(): M3InjectedRuntimeFixture {
  const provider = new InjectedProviderFixture();
  let sequence = 0;
  const factory = new PreparedActionFactory<M3ProductActionRequest>({
    chainId: ROBINHOOD_CHAIN_TESTNET.chainId,
    target: VAULT,
    operationId: (action) => `${action.kind}-${++sequence}`,
    encode: encodeAction,
  });
  const wallet = new Eip1193Wallet(provider, {
    chainId: ROBINHOOD_CHAIN_TESTNET.chainId,
    target: VAULT,
    actionAuthority: factory.authority,
    now: () => '2026-09-20T00:00:00.000Z',
  });
  const adapter: SimulatingRobinhoodTestnetStrategyAdapter<FixtureSnapshot, M3ProductActionRequest, never> = {
    mode: 'robinhood-testnet',
    async readSnapshot() {
      const value = await provider.request({
        method: 'eth_call',
        params: [{ to: VAULT, data: '0x8da5cb5b' }, 'latest'],
      });
      const encoded = String(value);
      return { owner: asAddress(`0x${encoded.slice(-40)}`) };
    },
    async observeOperation(): Promise<never> {
      throw new Error('FIXTURE_OBSERVATION_NOT_REQUESTED');
    },
    async prepareAction(action, context) {
      return factory.prepare(action, context.owner);
    },
    async simulateAction(prepared: PreparedAction) {
      await provider.request({
        method: 'eth_call',
        params: [{ from: prepared.owner, to: prepared.target, data: prepared.data, value: '0x0' }, 'latest'],
      });
      return { ok: true };
    },
    async submitAction(prepared, port) {
      return port.submit(prepared);
    },
  };
  const runtime = new InjectedM3ProductRuntime(provider, adapter, wallet);
  return Object.freeze({
    runtime,
    providerRequests: provider.requests,
    setCorrectNetwork: () => runtime.setCorrectNetwork(),
    setSoftReady: () => runtime.setSoftReady(),
    setReorged: () => runtime.setReorged(),
    setDegraded: () => runtime.setDegraded(),
  });
}

export function installM3InjectedRuntimeControls(fixture: M3InjectedRuntimeFixture): void {
  const main = document.querySelector('main');
  if (!main || document.querySelector('[data-m3-fixture-controls]')) return;
  const controls = document.createElement('section');
  controls.className = 'wrap dialog-notice';
  controls.setAttribute('data-m3-fixture-controls', '');
  controls.innerHTML =
    '<strong>INJECTED MOCK / NO REAL RIGHTS OR FUNDS / NO BROADCAST</strong><div class="inline-actions"><button data-m3-fixture="network">Use correct network</button><button data-m3-fixture="soft-ready">Soft ready</button><button data-m3-fixture="reorg">Reorg</button><button data-m3-fixture="degraded">Indexer degraded</button></div>';
  controls.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-m3-fixture]');
    if (!button) return;
    if (button.dataset.m3Fixture === 'network') fixture.setCorrectNetwork();
    else if (button.dataset.m3Fixture === 'soft-ready') fixture.setSoftReady();
    else if (button.dataset.m3Fixture === 'reorg') fixture.setReorged();
    else if (button.dataset.m3Fixture === 'degraded') fixture.setDegraded();
  });
  main.before(controls);
}
