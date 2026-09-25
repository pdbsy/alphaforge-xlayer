import type { FastifyInstance } from 'fastify';
import { lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { validateDeploymentManifest } from '../../../packages/chain-adapter/src/manifest.ts';
import { buildXLayerPublicApp, validatePublicOrigin } from './xlayer-public-app.ts';
import { validateXLayerPublicDeployment, type XLayerPublicDeployment } from './xlayer-public-config.ts';
import {
  composeM3ChainRuntime,
  type M3ChainRuntime,
  type M3ChainRuntimeDependencies,
  type M3ChainRuntimeDeployment,
  type M3RuntimeSyncResult,
} from './m3-chain-runtime.ts';
import { createM3RuntimeLifecycle } from './m3-runtime-lifecycle.ts';

type DeployedRuntimeInput = Extract<M3ChainRuntimeDeployment, { deploymentStatus: 'DEPLOYED' }>;
type LocalRuntimeInput = Pick<
  DeployedRuntimeInput,
  'dbPath' | 'rpcEndpoints' | 'policy' | 'maxBlocksPerSync' | 'now'
>;
const expectedNetwork = Object.freeze({ environment: 'xlayer-testnet', chainId: 1952 } as const);

export interface XLayerPublicStartupOptions {
  readonly origin: string;
  readonly webRoot?: string;
  readonly deployments: readonly XLayerPublicDeployment[];
  readonly runtimeDeployments: readonly M3ChainRuntimeDeployment[];
  readonly rpcAccess: 'disabled' | 'read-only';
  readonly listen?: { readonly host: '127.0.0.1' | 'localhost' | '0.0.0.0'; readonly port: number };
  readonly syncIntervalMs?: number | null;
}

export interface XLayerPublicServerHandle {
  readonly app: FastifyInstance;
  readonly runtimes: readonly M3ChainRuntime[];
  syncNow(): Promise<M3RuntimeSyncResult | null>;
  close(): Promise<void>;
}

export function publicDeploymentToRuntimeInput(
  record: XLayerPublicDeployment,
  local: LocalRuntimeInput,
): DeployedRuntimeInput {
  const publicConfig = validateXLayerPublicDeployment(record);
  const { source, vaultAddress, passInitialRecipient, passInitialSupplyBaseUnits, ...fields } = publicConfig;
  void [source, passInitialRecipient, passInitialSupplyBaseUnits];
  return Object.freeze({
    ...local,
    rpcEndpoints: Object.freeze([...local.rpcEndpoints]),
    deploymentStatus: 'DEPLOYED',
    manifestDocument: Object.freeze({
      ...fields,
      schemaVersion: 1,
      ...expectedNetwork,
      contractName: 'AlphaForgeVault',
      contractType: 'vault',
      contractAddress: vaultAddress,
    }),
    expectedNetwork,
    expectedContractAddress: vaultAddress,
    expectedManifestDigest: publicConfig.manifestDigest,
  });
}

export function validateXLayerPublicRpcEndpoints(input: readonly string[]): readonly string[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8)
    throw new Error('INVALID_PUBLIC_RPC_ENDPOINTS');
  return Object.freeze(
    input.map((value) => {
      try {
        if (typeof value !== 'string') throw new Error();
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
          throw new Error();
        return url.href;
      } catch {
        throw new Error('INVALID_PUBLIC_RPC_ENDPOINTS');
      }
    }),
  );
}

/** Compare canonical parents as well as file identity; aliases must not share SQLite. */
function validateStorage(inputs: readonly DeployedRuntimeInput[], webRoot?: string): void {
  try {
    const paths = new Set<string>();
    const identities = new Set<string>();
    const publicRoot = webRoot ? realpathSync(webRoot) : undefined;
    for (const input of inputs) {
      if (typeof input.dbPath !== 'string' || !isAbsolute(input.dbPath)) throw new Error();
      const path = join(realpathSync(dirname(input.dbPath)), basename(input.dbPath));
      if (publicRoot) {
        const rel = relative(publicRoot, path);
        if (rel === '' || (!rel.startsWith('..' + '/') && !rel.startsWith('..' + '\\') && !isAbsolute(rel)))
          throw new Error();
      }
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        // Reserve sidecar names too, including aliases on case-insensitive hosts.
        const canonicalName = (path + suffix).toLowerCase();
        if (paths.has(canonicalName)) throw new Error();
        paths.add(canonicalName);
        const stat = lstatSync(path + suffix, { throwIfNoEntry: false });
        if (!stat) continue;
        const id = `${stat.dev}:${stat.ino}`;
        if (!stat.isFile() || stat.nlink !== 1 || identities.has(id)) throw new Error();
        identities.add(id);
      }
    }
  } catch {
    throw new Error('INVALID_PUBLIC_STORAGE');
  }
}

export async function startXLayerPublicServer(
  options: XLayerPublicStartupOptions,
  dependencies: M3ChainRuntimeDependencies = {},
): Promise<XLayerPublicServerHandle> {
  validatePublicOrigin(options.origin);
  const interval = options.syncIntervalMs === undefined ? 5_000 : options.syncIntervalMs;
  if (interval !== null && (!Number.isSafeInteger(interval) || interval < 1_000 || interval > 300_000))
    throw new Error('INVALID_M3_SYNC_INTERVAL');
  if (
    options.listen &&
    (!['127.0.0.1', 'localhost', '0.0.0.0'].includes(options.listen.host) ||
      !Number.isSafeInteger(options.listen.port) ||
      options.listen.port < 0 ||
      options.listen.port > 65_535)
  )
    throw new Error('INVALID_PUBLIC_LISTEN_ADDRESS');
  if (
    !Array.isArray(options.deployments) ||
    options.deployments.length > 32 ||
    !Array.isArray(options.runtimeDeployments)
  )
    throw new Error('INVALID_PUBLIC_DEPLOYMENT_SET');
  const deployments = Object.freeze(options.deployments.map(validateXLayerPublicDeployment));
  if (new Set(deployments.map((item) => item.vaultAddress.toLowerCase())).size !== deployments.length)
    throw new Error('INVALID_PUBLIC_DEPLOYMENT_SET');
  if (
    !['disabled', 'read-only'].includes(options.rpcAccess) ||
    (options.rpcAccess === 'disabled' && options.runtimeDeployments.length !== 0) ||
    (options.rpcAccess === 'read-only' && options.runtimeDeployments.length !== deployments.length)
  )
    throw new Error('INVALID_PUBLIC_RPC_ACCESS');
  const addresses = new Set<string>();
  const inputs = options.runtimeDeployments.map((input) => {
    if (
      input.deploymentStatus !== 'DEPLOYED' ||
      input.expectedNetwork?.chainId !== 1952 ||
      input.expectedNetwork.environment !== 'xlayer-testnet'
    )
      throw new Error('PUBLIC_RUNTIME_DEPLOYMENT_MISMATCH');
    const record = deployments.find(
      (item) => item.vaultAddress.toLowerCase() === input.expectedContractAddress.toLowerCase(),
    );
    if (
      !record ||
      record.manifestDigest.toLowerCase() !== input.expectedManifestDigest.toLowerCase() ||
      addresses.has(record.vaultAddress.toLowerCase())
    )
      throw new Error('PUBLIC_RUNTIME_DEPLOYMENT_MISMATCH');
    addresses.add(record.vaultAddress.toLowerCase());
    validateDeploymentManifest(input.manifestDocument, {
      ...expectedNetwork,
      manifestDigest: record.manifestDigest,
      contractAddress: record.vaultAddress,
    });
    return publicDeploymentToRuntimeInput(record, {
      ...input,
      dbPath: resolve(input.dbPath),
      rpcEndpoints: validateXLayerPublicRpcEndpoints(input.rpcEndpoints),
    });
  });
  validateStorage(inputs, options.webRoot);
  const runtimes: M3ChainRuntime[] = [];
  const lifecycle = createM3RuntimeLifecycle(runtimes, interval);
  let app: FastifyInstance | undefined;
  try {
    for (const input of inputs) runtimes.push(composeM3ChainRuntime(input, dependencies)!);
    app = await buildXLayerPublicApp({
      origin: options.origin,
      deployments,
      runtimes,
      ...(options.webRoot === undefined ? {} : { webRoot: options.webRoot }),
    });
    app.addHook('preClose', lifecycle.stop);
    // Failed reads leave the website available; configuration/storage failures above are fatal.
    await lifecycle.syncNow().catch(() => undefined);
    if (options.listen) await app.listen({ ...options.listen });
    lifecycle.start();
  } catch (error) {
    await lifecycle.stop();
    if (app) await app.close();
    else for (const runtime of runtimes) runtime.close();
    throw error;
  }
  let closePromise: Promise<void> | undefined;
  const close = () => (closePromise ??= lifecycle.stop().then(() => app!.close()));
  return Object.freeze({ app, runtimes: Object.freeze([...runtimes]), syncNow: lifecycle.syncNow, close });
}
