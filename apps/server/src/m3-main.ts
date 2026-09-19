import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startM3Server } from './m3-startup.ts';

const root = new URL('../../../', import.meta.url);
await mkdir(new URL('.data/', root), { recursive: true });
const server = await startM3Server({
  deployment: { deploymentStatus: 'NOT_DEPLOYED' },
  app: {
    dbPath: fileURLToPath(new URL('.data/demo.sqlite', root)),
    env: process.env,
    origin: 'http://127.0.0.1:4180',
    webRoot: fileURLToPath(new URL('apps/web/dist/', root)),
  },
  listen: { host: '127.0.0.1', port: 4180 },
});
console.log('AlphaForge M3 SERVER: http://127.0.0.1:4180 (NOT_DEPLOYED)');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void server.close();
  });
