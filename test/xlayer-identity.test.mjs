import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureExec } from './helpers/git-fixture.mjs';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const base = 'b2ed61311df8d1c97a48f623d1b4872798f5e888';
const targetBase = '18f5352070910a867b9729b031aa2e3951785e01';
const repository = 'pdbsy/alphaforge-xlayer';
function fixture(t, cloneSource = sourceRoot) {
  const root = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-identity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  for (const key of Object.keys(env)) if (/^(?:GIT_|GITHUB_|ACTIONS_|RUNNER_)/.test(key)) delete env[key];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' });
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('clone', '--quiet', '--no-hardlinks', '--no-checkout', cloneSource, '.');
  // Clone inherits the source HEAD branch. Reserve its history under a fixture
  // name before creating the synthetic manager/worker branches below.
  const inheritedBranch = git('branch', '--show-current');
  if (inheritedBranch && inheritedBranch !== 'xlayer-fixture-seed')
    git('branch', '-m', 'xlayer-fixture-seed');
  git('config', 'user.name', 'Identity fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('remote', 'set-url', 'origin', `https://github.com/${repository}.git`);
  git('update-ref', 'refs/remotes/origin/master', targetBase);
  const commit = (label, task, text, file = 'fixture.txt') => {
    writeFileSync(join(root, file), text);
    git('add', file);
    git(
      'commit',
      '-qm',
      `[${label}][${task}] Fixture`,
      '-m',
      `${label === 'XLayer' ? 'Manager-ID: XLayerPM' : 'Agent-ID: ' + label}\nTask-ID: ${task}`,
    );
    return git('rev-parse', 'HEAD');
  };
  git('checkout', '-qb', 'macbeth03/xlayer-r2-adapter', base);
  const source = commit('Macbeth03', 'AF-XLAYER-R2-03-ADAPTER', 'reviewed source\n');
  git('update-ref', 'refs/remotes/origin/macbeth03/xlayer-r2-adapter', source);
  git('checkout', '-qb', 'codex/xlayer-r2', base);
  const shared = commit('XLayer', 'AF-XLAYER-R2', 'manager dependency\n', 'manager.txt');
  git('cherry-pick', '-x', source);
  const integrated = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/codex/xlayer-r2', integrated);
  for (const name of [
    'agent-identity.mjs',
    'agent-identity-set.mjs',
    'check-agent-identity.mjs',
    'agent-integration-identity.mjs',
    'xlayer-integration-identity.mjs',
  ]) {
    try {
      copyFileSync(join(sourceRoot, 'tools', name), join(root, 'tools', name));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const run = ({
    branch = 'codex/xlayer-r2',
    event = 'push',
    head = git('rev-parse', 'HEAD'),
    repo = repository,
    baseRef = 'master',
    baseSha = targetBase,
  } = {}) => {
    const profile =
      branch === 'codex/xlayer-r2' ? ['XLayer', 'AF-XLAYER-R2'] : ['Macbeth03', 'AF-XLAYER-R2-03-ADAPTER'];
    const payload =
      event === 'pull_request'
        ? {
            pull_request: {
              title: `[${profile[0]}][${profile[1]}] Fixture`,
              head: { ref: branch, sha: head, repo: { full_name: repo } },
              base: { ref: baseRef, sha: baseSha, repo: { full_name: repository } },
            },
          }
        : { ref: `refs/heads/${branch}`, before: targetBase, after: head };
    const eventPath = join(root, '.git', 'event.json');
    writeFileSync(eventPath, JSON.stringify(payload));
    return spawnSync(process.execPath, ['tools/check-agent-identity.mjs'], {
      cwd: root,
      env: {
        ...env,
        GITHUB_EVENT_NAME: event,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_REPOSITORY: repo,
        GITHUB_SHA: head,
      },
      encoding: 'utf8',
      timeout: 15000,
    });
  };
  return { root, git, commit, run, source, integrated, shared };
}
function pass(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /XLayer identity/);
}
function fail(result, pattern) {
  assert.notEqual(result.status, 0);
  if (pattern) assert.match(result.stdout + result.stderr, pattern);
}

test('XLayer manager verifies retained original objects and unchanged cherry-picked patches through the real CLI', (t) => {
  const f = fixture(t);
  pass(f.run());
  pass(f.run({ event: 'pull_request' }));
  fail(f.run({ event: 'pull_request', repo: 'pdbsy/quantpass-arbitrum-hackathon' }), /repository/);
  f.git('update-ref', '-d', 'refs/remotes/origin/macbeth03/xlayer-r2-adapter');
  fail(f.run(), /retained source/);
});

test('XLayer corrected UI source requires its exact retained branch and declared worker identity', (t) => {
  const f = fixture(t);
  f.git('checkout', '-qb', 'macbeth04/xlayer-r2-ui-corrected', base);
  const source = f.commit('Macbeth04', 'AF-XLAYER-R2-04-UI', 'reviewed UI source\n', 'ui-fixture.txt');
  const sourceRef = 'refs/remotes/origin/macbeth04/xlayer-r2-ui-corrected';
  f.git('update-ref', sourceRef, source);
  f.git('checkout', '--quiet', 'codex/xlayer-r2');
  f.git('cherry-pick', '-x', source);
  pass(f.run());
  f.git('update-ref', '-d', sourceRef);
  f.git('update-ref', `${sourceRef}-unassigned`, source);
  fail(f.run(), /retained source/);
});

test('XLayer source attribution rejects a forged cherry-pick that changes the reviewed patch', (t) => {
  const f = fixture(t);
  f.git('checkout', '--quiet', f.shared);
  f.commit('Macbeth03', 'AF-XLAYER-R2-03-ADAPTER', 'unreviewed replacement\n');
  f.git(
    'commit',
    '--amend',
    '--date=' + f.git('show', '-s', '--format=%aI', f.source),
    '--no-edit',
    '-m',
    '[Macbeth03][AF-XLAYER-R2-03-ADAPTER] Fixture',
    '-m',
    `Agent-ID: Macbeth03\nTask-ID: AF-XLAYER-R2-03-ADAPTER\n\n(cherry picked from commit ${f.source})`,
  );
  fail(f.run(), /patch/);
});

test('XLayer workers can retain exactly verified shared manager dependencies without owning their attribution', (t) => {
  const f = fixture(t);
  f.git('checkout', '--quiet', 'macbeth03/xlayer-r2-adapter');
  f.git('cherry-pick', '-x', f.shared);
  pass(f.run({ branch: 'macbeth03/xlayer-r2-adapter' }));
  f.git('remote', 'set-url', 'origin', 'https://github.com/other/alphaforge-xlayer.git');
  fail(f.run({ branch: 'macbeth03/xlayer-r2-adapter' }), /canonical origin/);
});

test('XLayer identity rejects unassigned branches and mismatched manager declarations', (t) => {
  const f = fixture(t);
  fail(f.run({ branch: 'codex/xlayer-r2-unassigned' }));
  f.git(
    'commit',
    '--allow-empty',
    '-qm',
    '[XLayer][AF-XLAYER-R2] Bad manager',
    '-m',
    'Manager-ID: Macbeth01\nTask-ID: AF-XLAYER-R2',
  );
  fail(f.run(), /identity/);
});

test('XLayer admission retains master-only PR targeting and exact public-startup starting point', (t) => {
  const f = fixture(t);
  for (const patch of [
    { baseRef: 'codex/xlayer-r2-base', baseSha: base },
    { baseRef: 'other' },
    { baseSha: f.shared },
  ])
    fail(f.run({ event: 'pull_request', ...patch }));
  fail(f.run({ branch: 'macbeth03/xlayer-r2-public-startup' }));
  f.git('update-ref', 'refs/remotes/origin/master', f.shared);
  fail(f.run({ event: 'pull_request' }), /master/);
});

test('XLayer imported evidence rejects symbolic refs and altered original author metadata', (t) => {
  const f = fixture(t);
  const sourceRef = 'refs/remotes/origin/macbeth03/xlayer-r2-adapter';
  f.git('update-ref', '-d', sourceRef);
  f.git('symbolic-ref', sourceRef, 'refs/remotes/origin/codex/xlayer-r2');
  fail(f.run(), /retained source/);
  f.git('symbolic-ref', '--delete', sourceRef);
  f.git('update-ref', sourceRef, f.source);
  f.git('commit', '--amend', '--no-edit', '--author=Different Fixture <changed@example.invalid>');
  fail(f.run(), /source metadata changed/);
});

for (const defaultBranch of ['codex/xlayer-r2', 'macbeth03/xlayer-r2-adapter', 'codex/xlayer-r2-ci']) {
  test(`XLayer fixture preserves source history with inherited default branch ${defaultBranch}`, (t) => {
    const seed = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-seed-'));
    t.after(() => rmSync(seed, { recursive: true, force: true }));
    const seedGit = (...args) =>
      fixtureExec('git', ['-C', seed, ...args], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    seedGit('clone', '--quiet', '--bare', '--no-hardlinks', sourceRoot, '.');
    const before = seedGit('rev-parse', 'HEAD');
    seedGit('update-ref', `refs/heads/${defaultBranch}`, before);
    seedGit('symbolic-ref', 'HEAD', `refs/heads/${defaultBranch}`);
    const f = fixture(t, seed);
    pass(f.run());
    pass(f.run({ event: 'pull_request' }));
    assert.equal(seedGit('symbolic-ref', '--short', 'HEAD'), defaultBranch);
    assert.equal(seedGit('rev-parse', 'HEAD'), before);
    assert.equal(f.git('rev-parse', 'refs/heads/xlayer-fixture-seed'), before);
    f.git('update-ref', '-d', 'refs/remotes/origin/macbeth03/xlayer-r2-adapter');
    fail(f.run(), /retained source/);
  });
}
