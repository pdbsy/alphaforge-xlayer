import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePublicOrigin } from './xlayer-public-app.ts';
import { validateXLayerPublicDeployment, type XLayerPublicDeployment } from './xlayer-public-config.ts';
import {
  publicDeploymentToRuntimeInput,
  startXLayerPublicServer,
  validateXLayerPublicRpcEndpoints,
  type XLayerPublicStartupOptions,
} from './xlayer-public-startup.ts';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const maximumConfigBytes = 262_144;

export type XLayerPublicOperatorConfig = XLayerPublicStartupOptions & {
  readonly dataDir: string;
  readonly listen: NonNullable<XLayerPublicStartupOptions['listen']>;
  readonly webRoot: string;
};

function object(input: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error();
  const keys = Object.keys(input);
  if (keys.length !== fields.length || keys.some((key) => !fields.includes(key))) throw new Error();
  return input as Record<string, unknown>;
}

function localPath(input: unknown, base: string): string {
  if (typeof input !== 'string' || !input.trim() || input.includes('\0')) throw new Error();
  return resolve(base, input);
}

function containedBy(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function prospectiveRealPath(path: string): string {
  const suffix: string[] = [];
  let parent = path;
  while (!existsSync(parent)) {
    suffix.unshift(basename(parent));
    const next = dirname(parent);
    if (next === parent) throw new Error();
    parent = next;
  }
  return resolve(realpathSync(parent), ...suffix);
}

function readDocument(path: string): unknown {
  if (typeof path !== 'string' || !path.trim() || !lstatSync(path).isFile()) throw new Error();
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > maximumConfigBytes) throw new Error();
    const bytes = Buffer.alloc(maximumConfigBytes + 1);
    let count = 0;
    while (count < bytes.length) {
      const size = readSync(fd, bytes, count, bytes.length - count, null);
      if (!size) break;
      count += size;
    }
    if (count > maximumConfigBytes) throw new Error();
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, count)));
  } finally {
    closeSync(fd);
  }
}

/** Operator-only configuration. It is never returned by a browser route. */
export function readXLayerPublicConfig(configPath?: string, root = projectRoot): XLayerPublicOperatorConfig {
  if (configPath === undefined)
    return Object.freeze({
      origin: 'http://127.0.0.1:4180',
      webRoot: resolve(root, 'dist/xlayer/web'),
      dataDir: resolve(root, '.data/xlayer-public'),
      rpcAccess: 'disabled',
      deployments: Object.freeze([]),
      runtimeDeployments: Object.freeze([]),
      listen: Object.freeze({ host: '127.0.0.1', port: 4180 }),
    });
  try {
    const input = object(readDocument(configPath), [
      'schemaVersion',
      'origin',
      'webRoot',
      'dataDir',
      'rpcAccess',
      'rpcEndpoints',
      'deployments',
      'listen',
    ]);
    if (
      input.schemaVersion !== 1 ||
      typeof input.origin !== 'string' ||
      !['disabled', 'read-only'].includes(input.rpcAccess as string)
    )
      throw new Error();
    const origin = validatePublicOrigin(input.origin).origin;
    const base = dirname(resolve(configPath));
    const webRoot = localPath(input.webRoot, base),
      dataDir = localPath(input.dataDir, base);
    const publicRoot = realpathSync(webRoot);
    if (
      containedBy(publicRoot, realpathSync(configPath)) ||
      containedBy(publicRoot, prospectiveRealPath(dataDir))
    )
      throw new Error();
    const listen = object(input.listen, ['host', 'port']);
    if (
      !['127.0.0.1', 'localhost', '0.0.0.0'].includes(listen.host as string) ||
      !Number.isSafeInteger(listen.port) ||
      (listen.port as number) < 0 ||
      (listen.port as number) > 65_535
    )
      throw new Error();
    if (!Array.isArray(input.deployments) || input.deployments.length > 32) throw new Error();
    const deployments = Object.freeze(
      input.deployments.map((item: XLayerPublicDeployment) => validateXLayerPublicDeployment(item)),
    );
    if (new Set(deployments.map((item) => item.vaultAddress.toLowerCase())).size !== deployments.length)
      throw new Error();
    if (!Array.isArray(input.rpcEndpoints)) throw new Error();
    const rpcAccess = input.rpcAccess as 'disabled' | 'read-only';
    if (rpcAccess === 'disabled' && input.rpcEndpoints.length !== 0) throw new Error();
    const rpcEndpoints =
      rpcAccess === 'read-only' ? validateXLayerPublicRpcEndpoints(input.rpcEndpoints) : [];
    const runtimeDeployments =
      rpcAccess === 'read-only'
        ? deployments.map((record) =>
            publicDeploymentToRuntimeInput(record, {
              dbPath: resolve(dataDir, `${record.vaultAddress.toLowerCase()}.sqlite`),
              rpcEndpoints,
            }),
          )
        : [];
    return Object.freeze({
      origin,
      webRoot,
      dataDir,
      rpcAccess,
      deployments,
      runtimeDeployments: Object.freeze(runtimeDeployments),
      listen: Object.freeze({
        host: listen.host as XLayerPublicOperatorConfig['listen']['host'],
        port: listen.port as number,
      }),
    });
  } catch {
    throw new Error('INVALID_XLAYER_PUBLIC_CONFIG');
  }
}

export async function startXLayerPublicMain(configPath?: string) {
  const config = readXLayerPublicConfig(configPath);
  if (config.runtimeDeployments.length) mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  return startXLayerPublicServer(config);
}

async function main() {
  try {
    const server = await startXLayerPublicMain(process.env.AF_XLAYER_CONFIG);
    const shutdown = () => {
      for (const signal of ['SIGINT', 'SIGTERM'] as const) process.off(signal, shutdown);
      void server.close().catch(() => {
        console.error('XLAYER_PUBLIC_SHUTDOWN_FAILED');
        process.exitCode = 1;
      });
    };
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, shutdown);
    console.log('AlphaForge XLayer server started.');
  } catch {
    console.error('XLAYER_PUBLIC_STARTUP_FAILED');
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
