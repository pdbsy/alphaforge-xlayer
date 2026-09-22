import { ROBINHOOD_CHAIN_TESTNET } from '../../../packages/robinhood-chain/src/network.ts';
import { XLAYER_TESTNET } from '../../../packages/xlayer-chain/src/network.ts';

export type M3Testnet = typeof ROBINHOOD_CHAIN_TESTNET | typeof XLAYER_TESTNET;

// This selection belongs to reviewed application/build configuration, never wallet or manifest data.
export interface M3NetworkSelection {
  readonly environment: string;
  readonly chainId: number;
}

export function resolveM3Network(selection?: M3NetworkSelection): M3Testnet {
  if (selection === undefined) return ROBINHOOD_CHAIN_TESTNET;
  for (const network of [ROBINHOOD_CHAIN_TESTNET, XLAYER_TESTNET]) {
    if (selection?.environment === network.key && selection.chainId === network.chainId) return network;
  }
  throw new Error('M3_UNSUPPORTED_NETWORK_PAIR');
}

export function readM3BuildNetwork(
  env: Readonly<Record<string, string | boolean | undefined>>,
): M3NetworkSelection {
  const environment = env.VITE_AF_CHAIN;
  const chainId = env.VITE_AF_CHAIN_ID;
  const network =
    environment === undefined && chainId === undefined
      ? resolveM3Network()
      : resolveM3Network({
          environment: typeof environment === 'string' ? environment : '',
          chainId: typeof chainId === 'string' && /^(?:0|[1-9][0-9]*)$/.test(chainId) ? Number(chainId) : 0,
        });
  return Object.freeze({ environment: network.key, chainId: network.chainId });
}
