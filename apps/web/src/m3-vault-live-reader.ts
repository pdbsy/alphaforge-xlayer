import type { M3ChainId } from './m3-network.ts';
import type { Eip1193Provider } from './chain-wallet.ts';
import type { M3VaultSnapshot } from './m3-vault-client.ts';
import {
  asAddress,
  asBlockHash,
  asHexData,
  type Address,
  type HexData,
} from '../../../packages/chain-adapter/src/types.ts';
import {
  decodeM3VaultAddressResult,
  decodeM3VaultBoolResult,
  decodeM3VaultBytes32Result,
  decodeM3VaultUintResult,
  encodeM3VaultCall,
} from '../../../packages/chain-adapter/src/vault-abi.ts';

export class M3VaultLiveReadFailure extends Error {
  readonly code: 'M3_LIVE_READ_FAILED' | 'M3_LIVE_WRONG_CHAIN' | 'M3_LIVE_CANONICAL_CHANGED';

  constructor(code: M3VaultLiveReadFailure['code']) {
    super(code);
    this.code = code;
    this.name = 'M3VaultLiveReadFailure';
  }
}

function quantity(value: unknown): bigint {
  if (typeof value !== 'string' || !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value))
    throw new M3VaultLiveReadFailure('M3_LIVE_READ_FAILED');
  return BigInt(value);
}

function block(value: unknown) {
  if (!value || typeof value !== 'object' || !('number' in value) || !('hash' in value))
    throw new M3VaultLiveReadFailure('M3_LIVE_READ_FAILED');
  return { number: quantity(value.number), hash: asBlockHash(String(value.hash)) };
}

/** Read contract state directly; Account identity and indexer health never authorize this read. */
export async function readM3VaultLiveSnapshot(
  provider: Eip1193Provider,
  options: { readonly chainId: M3ChainId; readonly vaultAddress: Address },
): Promise<M3VaultSnapshot> {
  try {
    if (![1952, 46_630].includes(options.chainId) || /^0x0{40}$/i.test(options.vaultAddress))
      throw new M3VaultLiveReadFailure('M3_LIVE_READ_FAILED');
    const vault = asAddress(options.vaultAddress);
    const assertChain = async () => {
      if (quantity(await provider.request({ method: 'eth_chainId' })) !== BigInt(options.chainId))
        throw new M3VaultLiveReadFailure('M3_LIVE_WRONG_CHAIN');
    };
    await assertChain();
    const head = block(await provider.request({ method: 'eth_getBlockByNumber', params: ['latest', false] }));
    const blockReference = Object.freeze({ blockHash: head.hash, requireCanonical: true });
    const call = async (data: HexData, to = vault): Promise<HexData> =>
      asHexData(
        String(await provider.request({ method: 'eth_call', params: [{ to, data }, blockReference] })),
      );
    const [
      owner,
      strategyCreator,
      strategyId,
      strategyRef,
      pass,
      afUsdc,
      afEth,
      afBtc,
      passLocker,
      principalBasis,
      trackedUsdcBalance,
      realizedProfit,
      withdrawableUsdc,
      openTrackedPositionCount,
      closed,
    ] = await Promise.all([
      call(encodeM3VaultCall('owner()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('strategyCreator()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('strategyId()', [])).then(decodeM3VaultBytes32Result),
      call(encodeM3VaultCall('strategyRef()', [])).then(decodeM3VaultBytes32Result),
      call(encodeM3VaultCall('pass()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('afUsdc()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('afEth()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('afBtc()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('passLocker()', [])).then(decodeM3VaultAddressResult),
      call(encodeM3VaultCall('principalBasis()', [])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('trackedUsdcBalance()', [])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('realizedProfit()', [])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('withdrawableUsdc()', [])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('openTrackedPositionCount()', [])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('closed()', [])).then(decodeM3VaultBoolResult),
    ]);

    // The tracked-asset calls must use the addresses read from this same block.
    const [exactTrackedAfEth, exactTrackedAfBtc, passStrategyId] = await Promise.all([
      call(encodeM3VaultCall('trackedPosition(address)', [afEth])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('trackedPosition(address)', [afBtc])).then(decodeM3VaultUintResult),
      call(encodeM3VaultCall('strategyId()', []), pass).then(decodeM3VaultBytes32Result),
    ]);
    if (passStrategyId.toLowerCase() !== strategyId.toLowerCase())
      throw new Error('M3_VAULT_STRATEGY_PASS_MISMATCH');
    const state = Object.freeze({
      owner,
      strategyCreator,
      strategyId,
      strategyRef,
      pass,
      passStrategyId,
      afUsdc,
      afEth,
      afBtc,
      passLocker,
      principalBasis: principalBasis.toString(),
      trackedUsdcBalance: trackedUsdcBalance.toString(),
      realizedProfit: realizedProfit.toString(),
      withdrawableUsdc: withdrawableUsdc.toString(),
      trackedAfEth: exactTrackedAfEth.toString(),
      trackedAfBtc: exactTrackedAfBtc.toString(),
      openTrackedPositionCount: openTrackedPositionCount.toString(),
      closed,
    });
    await assertChain();
    const canonical = block(
      await provider.request({
        method: 'eth_getBlockByNumber',
        params: [`0x${head.number.toString(16)}`, false],
      }),
    );
    if (canonical.number !== head.number || canonical.hash.toLowerCase() !== head.hash.toLowerCase())
      throw new M3VaultLiveReadFailure('M3_LIVE_CANONICAL_CHANGED');
    return Object.freeze({
      chainId: options.chainId,
      owner,
      contract: vault,
      projectionKey: 'm3-vault',
      blockNumber: head.number.toString(),
      blockHash: head.hash,
      state,
    });
  } catch (error) {
    if (error instanceof M3VaultLiveReadFailure) throw error;
    throw new M3VaultLiveReadFailure('M3_LIVE_READ_FAILED');
  }
}
