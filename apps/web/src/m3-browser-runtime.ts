import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import {
  Eip1193WalletConnection,
  WalletFailure,
  type Eip1193Provider,
  type WalletSubmission,
} from './chain-wallet.ts';
import type { M3ProductChainPresentation } from './m3-product-shell.ts';
import type { M3ProductActionReview, M3ProductRuntime } from './m3-product-runtime.ts';

export interface M3BrowserRuntimeOptions {
  readonly provider?: Eip1193Provider;
}

function initialSnapshot(): M3ProductChainPresentation {
  const snapshot: M3ProductChainPresentation = {
    wallet: { status: 'DISCONNECTED' },
    network: { status: 'UNAVAILABLE' },
    transaction: { status: 'IDLE' },
    onchain: {
      deployment: 'UNAVAILABLE',
      health: 'UNAVAILABLE',
      readiness: 'UNKNOWN',
      owner: 'UNKNOWN',
      writeMode: 'DISABLED',
      exitPath: 'UNAVAILABLE',
      supportedActions: [],
    },
  };
  return Object.freeze(snapshot);
}

class M3BrowserRuntime implements M3ProductRuntime {
  readonly #connection: Eip1193WalletConnection | null;
  readonly #listeners = new Set<() => void>();
  #snapshot = initialSnapshot();

  constructor(provider?: Eip1193Provider) {
    this.#connection = provider
      ? new Eip1193WalletConnection(provider, ROBINHOOD_CHAIN_TESTNET.chainId)
      : null;
  }

  get snapshot(): M3ProductChainPresentation {
    return this.#snapshot;
  }

  #publish(snapshot: M3ProductChainPresentation): void {
    this.#snapshot = Object.freeze(snapshot);
    for (const listener of this.#listeners) listener();
  }

  async connect(): Promise<void> {
    if (!this.#connection) {
      const error = new Error('WALLET_PROVIDER_UNAVAILABLE');
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'DISCONNECTED', errorCode: error.message },
        network: { status: 'UNAVAILABLE' },
      });
      throw error;
    }
    this.#publish({ ...this.#snapshot, wallet: { status: 'CONNECTING' } });
    try {
      const session = await this.#connection.connect();
      this.#publish({
        ...this.#snapshot,
        wallet: { status: 'CONNECTED', address: session.account },
        network: { status: 'CORRECT', chainId: session.chainId },
      });
    } catch (error) {
      const code = error instanceof WalletFailure ? error.code : 'WALLET_REQUEST_FAILED';
      let observed = null;
      try {
        observed = await this.#connection.observe();
      } catch {
        // The original sanitized wallet error remains authoritative.
      }
      this.#publish({
        ...this.#snapshot,
        wallet: {
          status: code === 'WALLET_REJECTED' ? 'CONNECTION_REJECTED' : 'DISCONNECTED',
          ...(observed ? { address: observed.account } : {}),
          errorCode: code,
        },
        network: observed
          ? {
              status: observed.chainId === ROBINHOOD_CHAIN_TESTNET.chainId ? 'CORRECT' : 'WRONG',
              chainId: observed.chainId,
            }
          : { status: code === 'WALLET_WRONG_CHAIN' ? 'WRONG' : 'UNAVAILABLE' },
      });
      throw error;
    }
  }

  async refresh(): Promise<void> {
    if (!this.#connection) return;
    const session = await this.#connection.observe();
    this.#publish({
      ...this.#snapshot,
      wallet: session
        ? { status: 'CONNECTED', address: session.account }
        : { status: 'DISCONNECTED', errorCode: 'WALLET_DISCONNECTED' },
      network: session
        ? {
            status: session.chainId === ROBINHOOD_CHAIN_TESTNET.chainId ? 'CORRECT' : 'WRONG',
            chainId: session.chainId,
          }
        : { status: 'UNAVAILABLE' },
    });
  }

  reviewAction(): Promise<M3ProductActionReview> {
    return Promise.reject(new Error('M3_DEPLOYMENT_NOT_CONFIGURED'));
  }

  confirmAction(): Promise<WalletSubmission> {
    return Promise.reject(new Error('M3_DEPLOYMENT_NOT_CONFIGURED'));
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

export function createM3BrowserRuntime(options: M3BrowserRuntimeOptions): M3ProductRuntime {
  return new M3BrowserRuntime(options.provider);
}
