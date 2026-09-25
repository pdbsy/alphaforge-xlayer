import Fastify, { type FastifyError } from 'fastify';
import staticFiles from '@fastify/static';
import { DomainError } from '../../../packages/domain/src/vault.ts';
import { registerChainEvidenceRoutes } from './chain-routes.ts';
import { apiError } from './api-errors.ts';
import { configureM3StrategyPassProjectionOwners, type M3ChainRuntime } from './m3-chain-runtime.ts';
import { validateXLayerPublicDeployment, type XLayerPublicDeployment } from './xlayer-public-config.ts';

export function validatePublicOrigin(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('INVALID_PUBLIC_ORIGIN');
  }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('INVALID_PUBLIC_ORIGIN');
  return url;
}

/** Public website boundary, independent of the local ledger and account API. */
export async function buildXLayerPublicApp(options: {
  readonly origin: string;
  readonly webRoot?: string;
  readonly deployments: readonly XLayerPublicDeployment[];
  readonly runtimes?: readonly M3ChainRuntime[];
}) {
  const origin = validatePublicOrigin(options.origin);
  if (!Array.isArray(options.deployments) || options.deployments.length > 32)
    throw new Error('INVALID_PUBLIC_DEPLOYMENT_SET');
  const deployments = Object.freeze(options.deployments.map(validateXLayerPublicDeployment));
  if (new Set(deployments.map((item) => item.vaultAddress.toLowerCase())).size !== deployments.length)
    throw new Error('INVALID_PUBLIC_DEPLOYMENT_SET');
  const runtimes = Object.freeze([...(options.runtimes ?? [])]);
  if (
    runtimes.length &&
    (runtimes.length !== deployments.length ||
      new Set(runtimes.map((runtime) => runtime.manifest.contractAddress.toLowerCase())).size !==
        runtimes.length ||
      runtimes.some(
        (runtime) =>
          runtime.manifest.chainId !== 1952 ||
          !deployments.some(
            (item) =>
              item.vaultAddress.toLowerCase() === runtime.manifest.contractAddress.toLowerCase() &&
              item.manifestDigest.toLowerCase() === runtime.manifest.manifestDigest.toLowerCase(),
          ),
      ))
  )
    throw new Error('PUBLIC_RUNTIME_DEPLOYMENT_MISMATCH');
  configureM3StrategyPassProjectionOwners(runtimes);
  const deploymentStatus = deployments.length ? 'DEPLOYED' : 'NOT_DEPLOYED';
  const config = Object.freeze({
    schemaVersion: 1,
    environment: 'xlayer-testnet',
    chainId: 1952,
    deploymentStatus,
    deployments,
  });
  const app = Fastify({
    logger: false,
    bodyLimit: 16_384,
    requestTimeout: 10_000,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  const rate = new Map<string, { count: number; expires: number }>();
  app.addHook('onClose', async () => {
    for (const runtime of runtimes) runtime.close();
  });
  app.addHook('onRequest', async (request, reply) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer')
      .header('Cache-Control', 'no-store')
      .header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
    if (
      request.headers.host !== origin.host ||
      (request.headers.origin && request.headers.origin !== origin.origin) ||
      request.headers['sec-fetch-site'] === 'cross-site' ||
      (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.origin !== origin.origin)
    )
      return reply.code(403).send({ error: 'ORIGIN_REJECTED', message: 'Request origin is not allowed.' });
    const now = Date.now();
    for (const [key, value] of rate) if (value.expires <= now) rate.delete(key);
    let entry = rate.get(request.ip);
    if (!entry) {
      if (rate.size >= 10_000)
        return reply.code(429).send({ error: 'RATE_LIMITED', message: 'Try again later.' });
      entry = { count: 0, expires: now + 60_000 };
      rate.set(request.ip, entry);
    }
    if (++entry.count > 500)
      return reply
        .code(429)
        .header('Retry-After', '60')
        .send({ error: 'RATE_LIMITED', message: 'Try again later.' });
  });
  app.setErrorHandler((error, _request, reply) => {
    const httpError = error as Partial<FastifyError>;
    const response = error instanceof DomainError ? apiError(error.code) : null;
    const status = response?.status ?? (httpError.validation ? 400 : 500);
    return reply.code(status).send({
      error: response?.body.code ?? (status === 400 ? 'INVALID_REQUEST' : 'SERVICE_UNAVAILABLE'),
      message:
        status === 400
          ? 'Invalid request.'
          : status === 404
            ? 'Requested record was not found.'
            : 'The operation is currently unavailable.',
    });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: 'NOT_FOUND', message: 'Requested resource was not found.' }),
  );
  app.get('/api/xlayer/config', async () => config);
  app.get('/api/health', async (_request, reply) => {
    const ready =
      runtimes.length > 0 &&
      runtimes.every((runtime) => {
        const status = runtime.chainEvidence.syncStatus();
        return runtime.caughtUp && status.database.status === 'HEALTHY';
      });
    return reply.code(ready ? 200 : 503).send({ ready, network: 'xlayer-testnet', deploymentStatus });
  });
  if (runtimes.length)
    registerChainEvidenceRoutes(
      app,
      runtimes.map((runtime) => runtime.chainEvidence),
    );
  if (options.webRoot)
    await app.register(staticFiles, { root: options.webRoot, index: ['index.html'], dotfiles: 'deny' });
  return app;
}
