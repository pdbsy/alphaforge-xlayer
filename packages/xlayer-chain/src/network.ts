import { readConfig, type LocalConfig } from '../../config/src/index.ts';

export const XLAYER_TESTNET = Object.freeze({
  key: 'xlayer-testnet',
  name: 'X Layer Testnet',
  chainId: 1952,
  nativeCurrency: 'OKB',
  rpcUrl: 'https://testrpc.xlayer.tech/terigon',
  explorerUrl: 'https://www.okx.com/web3/explorer/xlayer-test',
} as const);

const APPROVED_RPC_URLS = Object.freeze([
  XLAYER_TESTNET.rpcUrl,
  'https://xlayertestrpc.okx.com/terigon',
] as const);

export interface XLayerChainConfig {
  readonly network: typeof XLAYER_TESTNET;
  readonly rpcUrl: (typeof APPROVED_RPC_URLS)[number];
  readonly explorerUrl: typeof XLAYER_TESTNET.explorerUrl;
}

export type XLayerLocalConfig = LocalConfig & XLayerChainConfig;

function requireApprovedUrl<T extends string>(
  value: string | undefined,
  field: 'QP_RPC_URL' | 'QP_EXPLORER_URL',
  approved: readonly T[],
  mismatchMessage: string,
): T {
  if (!value) throw new Error(`${field} is required`);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL`);
  }

  if (url.protocol !== 'https:') throw new Error(`${field} must use HTTPS`);
  if (url.username || url.password) throw new Error(`${field} must not contain credentials`);
  if (url.search || url.hash) throw new Error(`${field} must not contain query or fragment`);

  const canonical = value.endsWith('/') ? value.slice(0, -1) : value;
  if (!approved.includes(canonical as T)) throw new Error(mismatchMessage);
  return canonical as T;
}

export function readXLayerChainConfig(env: Readonly<Record<string, string | undefined>>): XLayerChainConfig {
  if (env.QP_CHAIN !== XLAYER_TESTNET.key) {
    throw new Error(`QP_CHAIN must be ${XLAYER_TESTNET.key}`);
  }
  if (env.QP_CHAIN_ID !== String(XLAYER_TESTNET.chainId)) {
    throw new Error(`QP_CHAIN_ID must be ${XLAYER_TESTNET.chainId}`);
  }

  return Object.freeze({
    network: XLAYER_TESTNET,
    rpcUrl: requireApprovedUrl(
      env.QP_RPC_URL,
      'QP_RPC_URL',
      APPROVED_RPC_URLS,
      'QP_RPC_URL must be an approved X Layer Testnet endpoint',
    ),
    explorerUrl: requireApprovedUrl(
      env.QP_EXPLORER_URL,
      'QP_EXPLORER_URL',
      [XLAYER_TESTNET.explorerUrl],
      'QP_EXPLORER_URL must be the approved X Layer Testnet explorer',
    ),
  });
}

export function readXLayerLocalConfig(env: Readonly<Record<string, string | undefined>>): XLayerLocalConfig {
  const localConfig = readConfig(env);
  const chainConfig = readXLayerChainConfig(env);
  return Object.freeze({ ...localConfig, ...chainConfig });
}
