import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { XLAYER_TESTNET } from '../packages/xlayer-chain/src/network.ts';

if (process.argv.length !== 2) {
  process.stderr.write('X Layer build accepts no arguments.\n');
  process.exitCode = 2;
} else {
  const root = new URL('../', import.meta.url);
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)),
      'build',
      'apps/web',
      '--config',
      'apps/web/vite.config.ts',
    ],
    {
      cwd: fileURLToPath(root),
      env: {
        ...process.env,
        VITE_AF_CHAIN: XLAYER_TESTNET.key,
        VITE_AF_CHAIN_ID: String(XLAYER_TESTNET.chainId),
      },
      shell: false,
      stdio: 'inherit',
    },
  );
  process.exitCode = result.status ?? 1;
}
