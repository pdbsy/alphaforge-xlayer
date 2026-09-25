import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const base = 'b2ed61311df8d1c97a48f623d1b4872798f5e888';
const retained = '77a35249dc1b95605bf32e4cabed456ea104a669';
const tree = '0c113a58f9d8d739ca9f4cae4c0b6c87794ed241';
const source = fileURLToPath(new URL('../', import.meta.url));
const baseRef = 'refs/remotes/upstream/master';
const retainedRef = 'refs/remotes/upstream/macbeth01/m3-phase1-closeout';

test('immutable upstream source verification rejects missing, moved and aliased refs without altering target master', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-source-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('clone', '--quiet', '--no-hardlinks', '--no-checkout', source, '.');
  git('remote', 'set-url', 'origin', 'https://github.com/pdbsy/alphaforge-xlayer.git');
  git('update-ref', 'refs/remotes/origin/master', '18f5352070910a867b9729b031aa2e3951785e01');
  git('update-ref', baseRef, base);
  git('update-ref', retainedRef, retained);
  const targetMaster = git('rev-parse', 'refs/remotes/origin/master');
  await assert.doesNotReject(async () => {
    const { verifyXLayerSources } = await import('../tools/fetch-xlayer-source.mjs');
    assert.deepEqual(verifyXLayerSources(root), { sourceBase: base, retainedSource: retained, tree });
    git('update-ref', retainedRef, base);
    assert.throws(() => verifyXLayerSources(root), /pinned source/);
    git('update-ref', retainedRef, retained);
    git('update-ref', '-d', baseRef);
    assert.throws(() => verifyXLayerSources(root));
    git('symbolic-ref', baseRef, 'refs/remotes/origin/master');
    assert.throws(() => verifyXLayerSources(root), /symbolic/);
    assert.equal(git('rev-parse', 'refs/remotes/origin/master'), targetMaster);
  });
});
