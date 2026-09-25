import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
test('XLayer release build contains only website assets, without source documents or private configuration', async () => {
  const result = spawnSync(process.execPath, ['tools/build-xlayer.mjs'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const output = resolve(root, 'dist/xlayer/web');
  const entries = await readdir(output, { recursive: true });
  assert.ok(entries.includes('index.html'));
  assert.ok(entries.includes('user-ui.js'));
  assert.ok(entries.includes('user-ui.css'));
  assert.equal(
    entries.some(
      (entry) =>
        /\.(?:md|json|ts|tsx|map)$/.test(entry) || entry.includes('.env') || entry.includes('management'),
    ),
    false,
  );
  assert.match(await readFile(resolve(output, 'index.html'), 'utf8'), /<script[^>]*type="module"/);
});
