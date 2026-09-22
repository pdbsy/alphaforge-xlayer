import { readXLayerLocalConfig } from '../packages/xlayer-chain/src/network.ts';

const SAFE_DIAGNOSTICS = new Set([
  'X Layer configuration check accepts no arguments',
  'Only explicit QP_MODE=local is supported; testnet/production remain closed',
  'Local mode requires explicit QP_ADAPTER=mock',
  'Mock configuration must not run under NODE_ENV=production',
  'QP_CHAIN must be xlayer-testnet',
  'QP_CHAIN_ID must be 1952',
  'QP_RPC_URL is required',
  'QP_RPC_URL must be a valid HTTPS URL',
  'QP_RPC_URL must use HTTPS',
  'QP_RPC_URL must not contain credentials',
  'QP_RPC_URL must not contain query or fragment',
  'QP_RPC_URL must be an approved X Layer Testnet endpoint',
  'QP_EXPLORER_URL is required',
  'QP_EXPLORER_URL must be a valid HTTPS URL',
  'QP_EXPLORER_URL must use HTTPS',
  'QP_EXPLORER_URL must not contain credentials',
  'QP_EXPLORER_URL must not contain query or fragment',
  'QP_EXPLORER_URL must be the approved X Layer Testnet explorer',
]);

try {
  if (process.argv.length !== 2) {
    throw new Error('X Layer configuration check accepts no arguments');
  }

  const config = readXLayerLocalConfig(process.env);
  console.log(
    JSON.stringify({
      network: config.network.name,
      chainId: config.network.chainId,
      nativeCurrency: config.network.nativeCurrency,
      rpcOrigin: new URL(config.rpcUrl).origin,
      explorerOrigin: new URL(config.explorerUrl).origin,
      mode: config.mode,
      adapter: config.adapter,
      realFundsEnabled: config.realFundsEnabled,
    }),
  );
} catch (error) {
  const message =
    error instanceof Error && SAFE_DIAGNOSTICS.has(error.message)
      ? error.message
      : 'X Layer configuration check failed';
  console.error(message);
  process.exitCode = 1;
}
