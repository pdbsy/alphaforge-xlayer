import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.length !== 2) throw new Error('This build command does not accept arguments.');
const env = {
  ...process.env,
  VITE_AF_APP_MODE: 'preview',
  VITE_AF_CHAIN: 'xlayer-testnet',
  VITE_AF_CHAIN_ID: '1952',
};
for (const args of [
  ['tools/import-user-ui.mjs'],
  [
    'node_modules/vite/bin/vite.js',
    'build',
    'apps/web',
    '--config',
    'apps/web/vite.config.ts',
    '--mode',
    'xlayer-preview',
  ],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit', timeout: 120_000 });
  if (result.error || result.status !== 0) {
    process.stderr.write('XLayer preview build failed.\n');
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
}
