import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import { XLAYER_TESTNET } from '../../../packages/xlayer-chain/src/network.ts';

export type M3ChainId = typeof ROBINHOOD_CHAIN_TESTNET.chainId | typeof XLAYER_TESTNET.chainId;

export interface M3Network {
  readonly key: 'robinhood-chain-testnet' | 'xlayer-testnet';
  readonly name: string;
  readonly chainId: M3ChainId;
  readonly nativeCurrency: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
}

export const M3_ROBINHOOD_NETWORK: M3Network = ROBINHOOD_CHAIN_TESTNET;
export const M3_XLAYER_NETWORK: M3Network = Object.freeze({
  key: XLAYER_TESTNET.environment,
  name: XLAYER_TESTNET.name,
  chainId: XLAYER_TESTNET.chainId,
  nativeCurrency: XLAYER_TESTNET.nativeCurrency.symbol,
  rpcUrl: XLAYER_TESTNET.rpcUrls[0],
  explorerUrl: XLAYER_TESTNET.explorerUrl,
});

// Call only with the trusted build environment, never URL, wallet or storage data.
export function readM3BuildNetwork(env: Readonly<Record<string, unknown>>): M3Network {
  const chain = env.VITE_AF_CHAIN;
  const id = env.VITE_AF_CHAIN_ID;
  if (chain === undefined && id === undefined) return M3_ROBINHOOD_NETWORK;
  if (chain === 'xlayer-testnet' && id === '1952') return M3_XLAYER_NETWORK;
  if (chain === 'robinhood-chain-testnet' && id === '46630') return M3_ROBINHOOD_NETWORK;
  throw new Error('INVALID_M3_BUILD_NETWORK');
}
