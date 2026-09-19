import {
  asAddress,
  asBlockHash,
  asHexData,
  sameAddress,
  type Address,
  type BlockHash,
  type HexData,
} from '../../../packages/chain-adapter/src/types.ts';

export class M3VaultReadFailure extends Error {
  readonly code = 'M3_VAULT_READ_FAILED' as const;

  constructor() {
    super('M3_VAULT_READ_FAILED');
    this.name = 'M3VaultReadFailure';
  }
}

export interface M3VaultSnapshot {
  readonly chainId: 46_630;
  readonly owner: Address;
  readonly contract: Address;
  readonly projectionKey: 'm3-vault';
  readonly blockNumber: string;
  readonly blockHash: BlockHash;
  readonly state: Readonly<{
    owner: Address;
    strategyCreator: Address;
    strategyId: HexData;
    strategyRef: HexData;
    pass: Address;
    passStrategyId: HexData;
    afUsdc: Address;
    afEth: Address;
    afBtc: Address;
    passLocker: Address;
    principalBasis: string;
    trackedUsdcBalance: string;
    realizedProfit: string;
    withdrawableUsdc: string;
    trackedAfEth: string;
    trackedAfBtc: string;
    openTrackedPositionCount: string;
    closed: boolean;
  }>;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new M3VaultReadFailure();
  return value as Record<string, unknown>;
}

function exactObject(value: unknown, fields: readonly string[]): Record<string, unknown> {
  const row = object(value);
  const keys = Object.keys(row);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key)))
    throw new M3VaultReadFailure();
  return row;
}

function decimal(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new M3VaultReadFailure();
  return value;
}

function address(value: unknown): Address {
  try {
    return asAddress(String(value));
  } catch {
    throw new M3VaultReadFailure();
  }
}

function bytes32(value: unknown): HexData {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) throw new M3VaultReadFailure();
  return asHexData(value);
}

function snapshot(value: unknown, expectedOwner: Address): M3VaultSnapshot {
  const row = exactObject(value, [
    'chainId',
    'owner',
    'contract',
    'projectionKey',
    'blockNumber',
    'blockHash',
    'state',
  ]);
  const state = exactObject(row.state, [
    'owner',
    'strategyCreator',
    'strategyId',
    'strategyRef',
    'pass',
    'passStrategyId',
    'afUsdc',
    'afEth',
    'afBtc',
    'passLocker',
    'principalBasis',
    'trackedUsdcBalance',
    'realizedProfit',
    'withdrawableUsdc',
    'trackedAfEth',
    'trackedAfBtc',
    'openTrackedPositionCount',
    'closed',
  ]);
  const owner = address(row.owner);
  const stateOwner = address(state.owner);
  const strategyId = bytes32(state.strategyId);
  const passStrategyId = bytes32(state.passStrategyId);
  if (
    row.chainId !== 46_630 ||
    row.projectionKey !== 'm3-vault' ||
    typeof state.closed !== 'boolean' ||
    !sameAddress(owner, expectedOwner) ||
    !sameAddress(stateOwner, expectedOwner) ||
    strategyId.toLowerCase() !== passStrategyId.toLowerCase()
  )
    throw new M3VaultReadFailure();
  let blockHash: BlockHash;
  try {
    blockHash = asBlockHash(String(row.blockHash));
  } catch {
    throw new M3VaultReadFailure();
  }
  const normalizedState = Object.freeze({
    owner: stateOwner,
    strategyCreator: address(state.strategyCreator),
    strategyId,
    strategyRef: bytes32(state.strategyRef),
    pass: address(state.pass),
    passStrategyId,
    afUsdc: address(state.afUsdc),
    afEth: address(state.afEth),
    afBtc: address(state.afBtc),
    passLocker: address(state.passLocker),
    principalBasis: decimal(state.principalBasis),
    trackedUsdcBalance: decimal(state.trackedUsdcBalance),
    realizedProfit: decimal(state.realizedProfit),
    withdrawableUsdc: decimal(state.withdrawableUsdc),
    trackedAfEth: decimal(state.trackedAfEth),
    trackedAfBtc: decimal(state.trackedAfBtc),
    openTrackedPositionCount: decimal(state.openTrackedPositionCount),
    closed: state.closed,
  });
  return Object.freeze({
    chainId: 46_630,
    owner,
    contract: address(row.contract),
    projectionKey: 'm3-vault',
    blockNumber: decimal(row.blockNumber),
    blockHash,
    state: normalizedState,
  });
}

export class M3VaultApiClient {
  readonly #fetcher: typeof fetch;

  constructor(fetcher: typeof fetch = fetch) {
    this.#fetcher = fetcher;
  }

  async readSnapshot(owner: Address): Promise<M3VaultSnapshot> {
    try {
      const response = await this.#fetcher(`/api/v1/chain/vaults/${owner}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new M3VaultReadFailure();
      return snapshot(await response.json(), owner);
    } catch (error) {
      if (error instanceof M3VaultReadFailure) throw error;
      throw new M3VaultReadFailure();
    }
  }
}
