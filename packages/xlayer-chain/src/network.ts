import { readConfig, type LocalConfig } from '../../config/src/index.ts';

// Official X Layer network documentation, verified 2026-09-25.
// Metadata only: constructing this configuration performs no RPC requests.
export const XLAYER_TESTNET = Object.freeze({
  key: 'xlayer-testnet',
  environment: 'xlayer-testnet',
  name: 'X Layer Testnet',
  chainId: 1952,
  chainIdHex: '0x7a0',
  nativeCurrency: Object.freeze({ name: 'OKB', symbol: 'OKB', decimals: 18 }),
  rpcUrl: 'https://testrpc.xlayer.tech/terigon',
  rpcUrls: Object.freeze([
    'https://testrpc.xlayer.tech/terigon',
    'https://xlayertestrpc.okx.com/terigon',
  ] as const),
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
} as const);

export interface XLayerChainConfig {
  readonly network: typeof XLAYER_TESTNET;
  readonly environment: 'xlayer-testnet';
  readonly chainId: 1952;
  readonly rpcUrl: string;
  readonly rpcFallbackUrl: string;
  readonly explorerUrl: string;
}

function publicHttpsUrl(value: string | undefined, field: string): string {
  if (!value) throw new Error(`${field} is required`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL`);
  }
  if (url.protocol !== 'https:') throw new Error(`${field} must use HTTPS`);
  if (url.username || url.password || url.search || url.hash)
    throw new Error(`${field} must be a public URL without authentication, query or fragment`);
  return url.toString().replace(/\/$/, '');
}

export function readXLayerChainConfig(env: Readonly<Record<string, string | undefined>>): XLayerChainConfig {
  if (env.XLAYER_CHAIN !== XLAYER_TESTNET.key) throw new Error('XLAYER_CHAIN must be xlayer-testnet');
  if (env.XLAYER_CHAIN_ID !== String(XLAYER_TESTNET.chainId)) throw new Error('XLAYER_CHAIN_ID must be 1952');
  return Object.freeze({
    network: XLAYER_TESTNET,
    environment: XLAYER_TESTNET.environment,
    chainId: XLAYER_TESTNET.chainId,
    rpcUrl: publicHttpsUrl(env.XLAYER_RPC_URL, 'XLAYER_RPC_URL'),
    rpcFallbackUrl: publicHttpsUrl(
      env.XLAYER_RPC_FALLBACK_URL ?? XLAYER_TESTNET.rpcUrls[1],
      'XLAYER_RPC_FALLBACK_URL',
    ),
    explorerUrl: publicHttpsUrl(env.XLAYER_EXPLORER_URL, 'XLAYER_EXPLORER_URL'),
  });
}

export function readXLayerLocalConfig(
  env: Readonly<Record<string, string | undefined>>,
): XLayerChainConfig & LocalConfig & { readonly rpcAccess: 'disabled' } {
  return Object.freeze({ ...readConfig(env), ...readXLayerChainConfig(env), rpcAccess: 'disabled' });
}
