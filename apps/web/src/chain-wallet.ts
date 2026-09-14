import {
  asAddress,
  asHexData,
  asTransactionHash,
  sameAddress,
  type Address,
  type HexData,
  type TransactionHash,
} from '../../../packages/chain-adapter/src/types.ts';

export interface Eip1193Request {
  readonly method: string;
  readonly params?: readonly unknown[];
}

export interface Eip1193Provider {
  request(input: Eip1193Request): Promise<unknown>;
}

export type WalletFailureCode =
  | 'WALLET_DISCONNECTED'
  | 'WALLET_WRONG_CHAIN'
  | 'WALLET_ACCOUNT_CHANGED'
  | 'WALLET_REJECTED'
  | 'WALLET_INVALID_RESPONSE'
  | 'WALLET_REQUEST_FAILED'
  | 'UNTRUSTED_PREPARED_ACTION';

export class WalletFailure extends Error {
  readonly code: WalletFailureCode;

  constructor(code: WalletFailureCode) {
    super(code);
    this.name = 'WalletFailure';
    this.code = code;
  }
}

export interface WalletSession {
  readonly account: Address;
  readonly chainId: number;
}

export interface PreparedAction {
  readonly operationId: string;
  readonly chainId: number;
  readonly owner: Address;
  readonly target: Address;
  readonly data: HexData;
  readonly value: bigint;
}

interface PreparedActionPolicy<Action> {
  readonly chainId: number;
  readonly target: Address;
  readonly operationId: (action: Action) => string;
  readonly encode: (
    action: Action,
    owner: Address,
  ) => {
    readonly data: HexData;
    readonly value: bigint;
  };
}

const trustedActions = new WeakSet<object>();

function validChainId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('INVALID_CHAIN_ID');
  return value;
}

function validOperationId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value)) throw new Error('INVALID_OPERATION_ID');
  return value;
}

export class PreparedActionFactory<Action> {
  readonly #policy: PreparedActionPolicy<Action>;

  constructor(policy: PreparedActionPolicy<Action>) {
    this.#policy = Object.freeze({
      ...policy,
      chainId: validChainId(policy.chainId),
      target: asAddress(policy.target),
    });
  }

  prepare(action: Action, owner: Address): PreparedAction {
    const encoded = this.#policy.encode(action, owner);
    if (encoded.value < 0n) throw new Error('INVALID_TRANSACTION_VALUE');
    const prepared: PreparedAction = Object.freeze({
      operationId: validOperationId(this.#policy.operationId(action)),
      chainId: this.#policy.chainId,
      owner: asAddress(owner),
      target: this.#policy.target,
      data: asHexData(encoded.data),
      value: encoded.value,
    });
    trustedActions.add(prepared);
    return prepared;
  }
}

export interface SubmittedOperation {
  readonly operationId: string;
  readonly chainId: number;
  readonly owner: Address;
  readonly target: Address;
  readonly state: 'SUBMITTED';
  readonly txHash: TransactionHash;
  readonly submittedAt: string;
}

export interface BrowserWalletPort {
  connect(): Promise<WalletSession>;
  submit(prepared: PreparedAction): Promise<SubmittedOperation>;
}

interface WalletOptions {
  readonly chainId: number;
  readonly target: Address;
  readonly now?: () => string;
}

function parseAccounts(value: unknown): readonly Address[] {
  if (!Array.isArray(value)) throw new WalletFailure('WALLET_INVALID_RESPONSE');
  try {
    return Object.freeze(value.map((entry) => asAddress(String(entry))));
  } catch {
    throw new WalletFailure('WALLET_INVALID_RESPONSE');
  }
}

function parseChainId(value: unknown): number {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value))
    throw new WalletFailure('WALLET_INVALID_RESPONSE');
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER))
    throw new WalletFailure('WALLET_INVALID_RESPONSE');
  return Number(parsed);
}

function rejected(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 4001);
}

export class Eip1193Wallet implements BrowserWalletPort {
  readonly #provider: Eip1193Provider;
  readonly #chainId: number;
  readonly #target: Address;
  readonly #now: () => string;

  constructor(provider: Eip1193Provider, options: WalletOptions) {
    this.#provider = provider;
    this.#chainId = validChainId(options.chainId);
    this.#target = asAddress(options.target);
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async #accounts(method: 'eth_accounts' | 'eth_requestAccounts'): Promise<readonly Address[]> {
    try {
      return parseAccounts(await this.#provider.request({ method }));
    } catch (error) {
      if (error instanceof WalletFailure) throw error;
      if (rejected(error)) throw new WalletFailure('WALLET_REJECTED');
      throw new WalletFailure('WALLET_REQUEST_FAILED');
    }
  }

  async #currentChainId(): Promise<number> {
    try {
      return parseChainId(await this.#provider.request({ method: 'eth_chainId' }));
    } catch (error) {
      if (error instanceof WalletFailure) throw error;
      throw new WalletFailure('WALLET_REQUEST_FAILED');
    }
  }

  async connect(): Promise<WalletSession> {
    const accounts = await this.#accounts('eth_requestAccounts');
    if (!accounts[0]) throw new WalletFailure('WALLET_DISCONNECTED');
    const chainId = await this.#currentChainId();
    if (chainId !== this.#chainId) throw new WalletFailure('WALLET_WRONG_CHAIN');
    return Object.freeze({ account: accounts[0], chainId });
  }

  async submit(prepared: PreparedAction): Promise<SubmittedOperation> {
    if (!prepared || typeof prepared !== 'object' || !trustedActions.has(prepared))
      throw new WalletFailure('UNTRUSTED_PREPARED_ACTION');
    if (prepared.chainId !== this.#chainId || !sameAddress(prepared.target, this.#target))
      throw new WalletFailure('UNTRUSTED_PREPARED_ACTION');

    const accounts = await this.#accounts('eth_accounts');
    if (!accounts[0]) throw new WalletFailure('WALLET_DISCONNECTED');
    if (!sameAddress(accounts[0], prepared.owner)) throw new WalletFailure('WALLET_ACCOUNT_CHANGED');
    if ((await this.#currentChainId()) !== this.#chainId) throw new WalletFailure('WALLET_WRONG_CHAIN');

    let result: unknown;
    try {
      result = await this.#provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: prepared.owner,
            to: prepared.target,
            data: prepared.data,
            value: `0x${prepared.value.toString(16)}`,
          },
        ],
      });
    } catch (error) {
      if (rejected(error)) throw new WalletFailure('WALLET_REJECTED');
      throw new WalletFailure('WALLET_REQUEST_FAILED');
    }
    let txHash: TransactionHash;
    try {
      txHash = asTransactionHash(String(result));
    } catch {
      throw new WalletFailure('WALLET_INVALID_RESPONSE');
    }
    const submittedAt = this.#now();
    if (!Number.isFinite(Date.parse(submittedAt))) throw new WalletFailure('WALLET_INVALID_RESPONSE');
    return Object.freeze({
      operationId: prepared.operationId,
      chainId: prepared.chainId,
      owner: prepared.owner,
      target: prepared.target,
      state: 'SUBMITTED',
      txHash,
      submittedAt,
    });
  }
}
