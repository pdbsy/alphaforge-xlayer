import { M3_XLAYER_NETWORK, readM3BuildNetwork } from './m3-network.ts';
import { createM3BrowserRuntime, type M3BrowserDeploymentConfig } from './m3-browser-runtime.ts';
import { createM3BrowserRuntimeSet } from './m3-browser-runtime-set.ts';
import type { Eip1193Provider } from './chain-wallet.ts';

export function readM3BuildMode(env: Readonly<Record<string, unknown>>): 'local' | 'testnet' | 'preview' {
  const network = readM3BuildNetwork(env);
  if (env.VITE_AF_APP_MODE === undefined || env.VITE_AF_APP_MODE === 'local') return 'local';
  if (env.VITE_AF_APP_MODE === 'testnet' && network.key === 'xlayer-testnet') return 'testnet';
  if (env.VITE_AF_APP_MODE === 'preview' && network.key === 'xlayer-testnet') return 'preview';
  throw new Error('INVALID_M3_BUILD_MODE');
}

export interface XLayerPublicConfig {
  readonly schemaVersion: 1;
  readonly environment: 'xlayer-testnet';
  readonly chainId: 1952;
  readonly deploymentStatus: 'NOT_DEPLOYED' | 'DEPLOYED';
  readonly deployments: readonly M3BrowserDeploymentConfig[];
}
const fields = [
  'source',
  'chainId',
  'vaultAddress',
  'deploymentBlock',
  'abiVersion',
  'abiHash',
  'manifestDigest',
  'runtimeBytecodeHash',
  'strategyPassAddress',
  'strategyPassDeploymentBlock',
  'strategyPassAbiHash',
  'strategyPassRuntimeBytecodeHash',
];
export function readXLayerPublicConfig(value: unknown): XLayerPublicConfig {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    const row = value as Record<string, unknown>;
    if (
      Object.keys(row).sort().join(',') !==
        'chainId,deploymentStatus,deployments,environment,schemaVersion' ||
      row.schemaVersion !== 1 ||
      row.environment !== 'xlayer-testnet' ||
      row.chainId !== 1952 ||
      !Array.isArray(row.deployments) ||
      row.deployments.length > 64 ||
      !['NOT_DEPLOYED', 'DEPLOYED'].includes(String(row.deploymentStatus)) ||
      (row.deploymentStatus === 'NOT_DEPLOYED') !== (row.deployments.length === 0)
    )
      throw Error();
    const deployments = row.deployments.map((input: unknown) => {
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error();
      const item = input as Record<string, unknown>;
      const optional = ['passInitialSupplyBaseUnits', 'passInitialRecipient'];
      if (
        fields.some((key) => !Object.hasOwn(item, key)) ||
        Object.keys(item).some((key) => ![...fields, ...optional].includes(key)) ||
        Object.entries(item).some(([key, val]) => key !== 'chainId' && typeof val !== 'string') ||
        item.chainId !== 1952
      )
        throw Error();
      const deployment = Object.freeze({ ...item }) as unknown as M3BrowserDeploymentConfig;
      // Use the production manifest/ABI/address validator; constructing without a provider is inert.
      createM3BrowserRuntime({ networkConfig: M3_XLAYER_NETWORK, deployment });
      return deployment;
    });
    if (new Set(deployments.map((item) => item.vaultAddress.toLowerCase())).size !== deployments.length)
      throw Error();
    return Object.freeze({
      schemaVersion: 1,
      environment: 'xlayer-testnet',
      chainId: 1952,
      deploymentStatus: row.deploymentStatus as XLayerPublicConfig['deploymentStatus'],
      deployments: Object.freeze(deployments),
    });
  } catch {
    throw new Error('INVALID_XLAYER_PUBLIC_CONFIG');
  }
}

export async function loadXLayerPublicRuntime(fetcher: typeof fetch = fetch, provider?: Eip1193Provider) {
  let value: unknown;
  try {
    const response = await fetcher('/api/xlayer/config', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw Error();
    value = await response.json();
  } catch {
    throw new Error('XLAYER_CONFIG_UNAVAILABLE');
  }
  const config = readXLayerPublicConfig(value);
  const options = { networkConfig: M3_XLAYER_NETWORK, ...(provider ? { provider } : {}) };
  const runtime =
    config.deployments.length > 0
      ? createM3BrowserRuntimeSet({ ...options, deployments: config.deployments })
      : createM3BrowserRuntime(options);
  return Object.freeze({ config, runtime });
}
