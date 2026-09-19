import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.ts';
import {
  composeM3ChainRuntime,
  type M3ChainRuntime,
  type M3ChainRuntimeDependencies,
  type M3ChainRuntimeDeployment,
  type M3RuntimeSyncResult,
} from './m3-chain-runtime.ts';

export interface M3ServerStartupOptions {
  readonly deployment: M3ChainRuntimeDeployment;
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

export interface M3ServerHandle {
  readonly app: FastifyInstance;
  readonly runtime: M3ChainRuntime | null;
  syncNow(): Promise<M3RuntimeSyncResult | null>;
  close(): Promise<void>;
}

export async function startM3Server(
  options: M3ServerStartupOptions,
  dependencies: M3ChainRuntimeDependencies = {},
): Promise<M3ServerHandle> {
  const interval =
    options.syncIntervalMs === undefined && options.deployment.deploymentStatus === 'DEPLOYED'
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

  const runtime = composeM3ChainRuntime(options.deployment, dependencies);
  let app: FastifyInstance | null = null;
  let closed = false;
  let timer: NodeJS.Timeout | null = null;
  let syncTail: Promise<M3RuntimeSyncResult | null> = Promise.resolve(null);
  const syncNow = (): Promise<M3RuntimeSyncResult | null> => {
    if (closed) return Promise.reject(new Error('M3_SERVER_CLOSED'));
    const next = syncTail.then(() => (runtime ? runtime.syncToHead() : null));
    syncTail = next.catch(() => null);
    return next;
  };

  try {
    app = (
      await buildApp({
        ...options.app,
        ...(runtime ? { chainRuntime: runtime } : {}),
      })
    ).app;
    app.addHook('onClose', async () => {
      closed = true;
      if (timer) clearTimeout(timer);
    });
    await syncNow();
    if (options.listen) await app.listen(options.listen);
  } catch (error) {
    if (app) await app.close();
    else runtime?.close();
    throw error;
  }

  if (runtime && interval) {
    const schedule = () => {
      timer = setTimeout(() => {
        void syncNow()
          .catch(() => undefined)
          .finally(() => {
            if (!closed) schedule();
          });
      }, interval);
      timer.unref();
    };
    schedule();
  }

  let closePromise: Promise<void> | null = null;
  const close = () => {
    if (closePromise) return closePromise;
    closed = true;
    if (timer) clearTimeout(timer);
    closePromise = syncTail
      .catch(() => null)
      .then(async () => {
        await app!.close();
      });
    return closePromise;
  };
  return Object.freeze({ app, runtime, syncNow, close });
}
