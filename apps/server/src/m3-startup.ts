import type { FastifyInstance } from 'fastify';
import { resolve } from 'node:path';
import { buildM3App } from './m3-app.ts';
import { createM3RuntimeLifecycle } from './m3-runtime-lifecycle.ts';
import {
  composeM3ChainRuntime,
  type M3ChainRuntime,
  type M3ChainRuntimeDependencies,
  type M3ChainRuntimeDeployment,
  type M3RuntimeSyncResult,
} from './m3-chain-runtime.ts';

interface M3ServerStartupBaseOptions {
  readonly app: {
    readonly dbPath: string;
    readonly env: Readonly<Record<string, string | undefined>>;
    readonly origin: string;
    readonly webRoot?: string;
  };
  readonly listen?: {
    readonly host: '127.0.0.1' | 'localhost';
    readonly port: number;
  };
  readonly syncIntervalMs?: number | null;
}

export type M3ServerStartupOptions = M3ServerStartupBaseOptions &
  (
    | {
        readonly deployment: M3ChainRuntimeDeployment;
        readonly deployments?: never;
      }
    | {
        readonly deployment?: never;
        readonly deployments: readonly M3ChainRuntimeDeployment[];
      }
  );

export interface M3ServerHandle {
  readonly app: FastifyInstance;
  readonly runtime: M3ChainRuntime | null;
  readonly runtimes: readonly M3ChainRuntime[];
  syncNow(): Promise<M3RuntimeSyncResult | null>;
  close(): Promise<void>;
}

function deploymentSet(options: M3ServerStartupOptions): readonly M3ChainRuntimeDeployment[] {
  const hasSingle = options.deployment !== undefined;
  const hasMultiple = options.deployments !== undefined;
  if (hasSingle === hasMultiple) throw new Error('INVALID_M3_DEPLOYMENT_SET');
  const deployments = hasMultiple ? options.deployments! : [options.deployment!];
  if (
    deployments.length === 0 ||
    (deployments.length > 1 && deployments.some((item) => item.deploymentStatus === 'NOT_DEPLOYED'))
  )
    throw new Error('INVALID_M3_DEPLOYMENT_SET');
  const paths = deployments.flatMap((item) =>
    item.deploymentStatus === 'DEPLOYED' ? [resolve(item.dbPath)] : [],
  );
  if (new Set(paths).size !== paths.length || paths.includes(resolve(options.app.dbPath)))
    throw new Error('INVALID_M3_DEPLOYMENT_SET');
  return Object.freeze([...deployments]);
}

export async function startM3Server(
  options: M3ServerStartupOptions,
  dependencies: M3ChainRuntimeDependencies = {},
): Promise<M3ServerHandle> {
  const deployments = deploymentSet(options);
  const interval =
    options.syncIntervalMs === undefined && deployments.some((item) => item.deploymentStatus === 'DEPLOYED')
      ? 5_000
      : options.syncIntervalMs;
  if (
    interval !== null &&
    interval !== undefined &&
    (!Number.isSafeInteger(interval) || interval < 1_000 || interval > 300_000)
  )
    throw new Error('INVALID_M3_SYNC_INTERVAL');
  if (
    options.listen &&
    (!['127.0.0.1', 'localhost'].includes(options.listen.host) ||
      !Number.isSafeInteger(options.listen.port) ||
      options.listen.port < 0 ||
      options.listen.port > 65_535)
  )
    throw new Error('INVALID_M3_LISTEN_ADDRESS');

  const runtimes: M3ChainRuntime[] = [];
  try {
    for (const deployment of deployments) {
      const runtime = composeM3ChainRuntime(deployment, dependencies);
      if (runtime) runtimes.push(runtime);
    }
  } catch (error) {
    for (const runtime of runtimes) runtime.close();
    throw error;
  }
  const runtime = runtimes.length === 1 ? runtimes[0]! : null;
  let app: FastifyInstance | null = null;
  const lifecycle = createM3RuntimeLifecycle(runtimes, interval);
  const { syncNow } = lifecycle;

  try {
    app = (
      await buildM3App({
        ...options.app,
        ...(runtimes.length ? { chainRuntimes: runtimes } : {}),
      })
    ).app;
    app.addHook('preClose', lifecycle.stop);
    // Configuration and storage construction above remain fatal. A failed chain read or
    // durable reorg fault must still leave the UI accessible and its stale API reads closed.
    await syncNow().catch(() => undefined);
    if (options.listen) await app.listen(options.listen);
  } catch (error) {
    await lifecycle.stop();
    if (app) await app.close();
    else for (const item of runtimes) item.close();
    throw error;
  }

  lifecycle.start();
  let closePromise: Promise<void> | null = null;
  const close = () => (closePromise ??= lifecycle.stop().then(() => app!.close()));
  return Object.freeze({ app, runtime, runtimes: Object.freeze([...runtimes]), syncNow, close });
}
