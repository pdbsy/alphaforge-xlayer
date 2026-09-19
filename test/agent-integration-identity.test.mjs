import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

const branch = 'macbeth01/AF-M3-CLOSEOUT';
const repository = 'pdbsy/quantpass-arbitrum-hackathon';
const repo = { full_name: repository };
const title = '[Macbeth01][AF-M3-CLOSEOUT] Integrate reviewed sources';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'af-integration-identity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  for (const k of Object.keys(env)) if (k.startsWith('GITHUB_')) delete env[k];
  const git = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'master');
  git('config', 'user.name', 'Identity fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('remote', 'add', 'origin', 'https://github.com/pdbsy/quantpass-arbitrum-hackathon.git');
  git('commit', '--allow-empty', '-qm', 'Initial fixture');
  const base = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/master', base);
  const sources = [];
  for (const n of [2, 3, 4, 5]) {
    const agent = `Macbeth0${n}`;
    const task = `AF-FIXTURE-0${n}`;
    const sourceBranch = `macbeth0${n}/fixture`;
    git('switch', '-qc', sourceBranch, base);
    git(
      'commit',
      '--allow-empty',
      '-qm',
      `[${agent}][${task}] Source`,
      '-m',
      `Agent-ID: ${agent}\nTask-ID: ${task}`,
    );
    const head = git('rev-parse', 'HEAD');
    git('update-ref', `refs/remotes/origin/${sourceBranch}`, head);
    sources.push({ agent, task, branch: sourceBranch, head });
  }
  git('switch', '-qc', branch, base);
  const manager = (message = 'Integrate source', task = 'AF-M3-CLOSEOUT') => [
    '-m',
    `[Macbeth01][${task}] ${message}`,
    '-m',
    `Agent-ID: Macbeth01\nTask-ID: ${task}`,
  ];
  for (const source of sources) git('merge', '--no-ff', ...manager(), source.head);
  const manifest = {
    schema_version: 1,
    repository: 'pdbsy/quantpass-arbitrum-hackathon',
    branch,
    task: 'AF-M3-CLOSEOUT',
    base,
    sources,
  };
  mkdirSync(join(root, 'docs/management/agents/integrations'), { recursive: true });
  mkdirSync(join(root, 'tools'));
  for (const name of [
    'agent-identity.mjs',
    'agent-identity-set.mjs',
    'check-agent-identity.mjs',
    'agent-integration-identity.mjs',
  ]) {
    const path = new URL(`../tools/${name}`, import.meta.url);
    if (existsSync(path)) copyFileSync(path, join(root, 'tools', name));
  }
  function record(value = manifest, task = 'AF-M3-CLOSEOUT') {
    writeFileSync(
      join(root, 'docs/management/agents/integrations/AF-M3-CLOSEOUT.json'),
      JSON.stringify(value),
    );
    git('add', 'docs');
    git('commit', '--allow-empty', ...manager('Record sources', task));
    return git('rev-parse', 'HEAD');
  }
  record();
  return {
    root,
    git,
    manifest,
    record,
    sources,
    base,
    env,
    run(options = {}) {
      const head = git('rev-parse', 'HEAD');
      const event = options.event ?? {
        pull_request: {
          title,
          head: { ref: branch, sha: head, repo },
          base: { ref: 'master', sha: base, repo },
        },
      };
      writeFileSync(join(root, 'event.json'), JSON.stringify(event));
      return spawnSync(process.execPath, ['tools/check-agent-identity.mjs'], {
        cwd: root,
        env: {
          ...env,
          GITHUB_EVENT_NAME: options.name ?? 'pull_request',
          GITHUB_EVENT_PATH: join(root, 'event.json'),
        },
        encoding: 'utf8',
      });
    },
  };
}
function succeeds(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
function rejects(result, pattern) {
  assert.notEqual(result.status, 0);
  if (pattern) assert.match(result.stdout + result.stderr, pattern);
}

test('registered integration accepts preserved mixed worker history and manager merge commits', (t) => {
  const s = fixture(t);
  succeeds(s.run());
});
test('integration rejects an omitted imported worker source', (t) => {
  const s = fixture(t);
  s.record({ ...s.manifest, sources: s.sources.slice(0, 3) });
  rejects(s.run());
});
test('integration rejects source-head substitution and wrong declared agent/task', (t) => {
  const s = fixture(t);
  s.record({
    ...s.manifest,
    sources: s.sources.map((source, i) => (i === 0 ? { ...source, head: s.sources[1].head } : source)),
  });
  rejects(s.run());
});
test('integration rejects a pinned source not reachable from its official source ref', (t) => {
  const s = fixture(t);
  s.git('update-ref', `refs/remotes/origin/${s.sources[0].branch}`, s.base);
  rejects(s.run());
});
test('integration validates full pinned-base range even when push.before skips a bad addition', (t) => {
  const s = fixture(t);
  s.git(
    'commit',
    '--allow-empty',
    '-qm',
    '[Macbeth02][AF-FIXTURE-02] Unregistered addition',
    '-m',
    'Agent-ID: Macbeth02\nTask-ID: AF-FIXTURE-02',
  );
  const before = s.git('rev-parse', 'HEAD');
  const head = s.record();
  rejects(s.run({ name: 'push', event: { ref: `refs/heads/${branch}`, before, after: head } }));
});
test('integration rejects a manager addition labelled with another task', (t) => {
  const s = fixture(t);
  s.record(s.manifest, 'AF-UNRELATED');
  rejects(s.run());
});
test('integration pins master base and never enables stacked target admission', (t) => {
  const s = fixture(t);
  const head = s.git('rev-parse', 'HEAD');
  rejects(
    s.run({
      event: {
        pull_request: {
          title,
          head: { ref: branch, sha: head, repo },
          base: { ref: 'macbeth03/fixture', sha: s.base, repo },
        },
      },
    }),
  );
  s.git('update-ref', 'refs/remotes/origin/master', s.sources[0].head);
  rejects(s.run());
});
test('integration reads pinned head manifest rather than an uncommitted working copy', (t) => {
  const s = fixture(t);
  writeFileSync(join(s.root, 'docs/management/agents/integrations/AF-M3-CLOSEOUT.json'), '{}');
  succeeds(s.run());
});
test('ordinary worker branches do not inherit manager integration privileges', (t) => {
  const s = fixture(t);
  const head = s.git('rev-parse', 'HEAD');
  rejects(
    s.run({
      event: {
        pull_request: {
          title,
          head: { ref: 'macbeth01/AF-OTHER', sha: head },
          base: { ref: 'master', sha: s.base },
        },
      },
    }),
  );
});

test('stacked worker history requires and accepts its independently pinned parent source', (t) => {
  const s = fixture(t);
  const parent = s.sources[1];
  const child = s.sources[2];
  s.git('switch', child.branch);
  s.git(
    'merge',
    '--no-ff',
    '-m',
    '[Macbeth04][AF-FIXTURE-04] Integrate adapter',
    '-m',
    'Agent-ID: Macbeth04\nTask-ID: AF-FIXTURE-04',
    parent.head,
  );
  const head = s.git('rev-parse', 'HEAD');
  s.git('update-ref', `refs/remotes/origin/${child.branch}`, head);
  s.git('switch', branch);
  s.git(
    'merge',
    '--no-ff',
    '-m',
    `${title} stacked source`,
    '-m',
    'Agent-ID: Macbeth01\nTask-ID: AF-M3-CLOSEOUT',
    head,
  );
  s.manifest.sources = s.sources.map((source) => (source === child ? { ...source, head } : source));
  s.record();
  succeeds(s.run());
  s.record({ ...s.manifest, sources: s.manifest.sources.filter((source) => source !== parent) });
  rejects(s.run());
});

test('worker source cannot launder foreign unregistered task provenance', (t) => {
  const s = fixture(t);
  const source = s.sources[0];
  s.git('switch', source.branch);
  s.git(
    'commit',
    '--allow-empty',
    '-qm',
    '[Macbeth03][AF-FOREIGN-03] Foreign work',
    '-m',
    'Agent-ID: Macbeth03\nTask-ID: AF-FOREIGN-03',
  );
  s.git(
    'commit',
    '--allow-empty',
    '-qm',
    '[Macbeth02][AF-FIXTURE-02] Source tip',
    '-m',
    'Agent-ID: Macbeth02\nTask-ID: AF-FIXTURE-02',
  );
  const head = s.git('rev-parse', 'HEAD');
  s.git('update-ref', `refs/remotes/origin/${source.branch}`, head);
  s.git('switch', branch);
  s.git(
    'merge',
    '--no-ff',
    '-m',
    `${title} source`,
    '-m',
    'Agent-ID: Macbeth01\nTask-ID: AF-M3-CLOSEOUT',
    head,
  );
  s.record({ ...s.manifest, sources: s.sources.map((item) => (item === source ? { ...item, head } : item)) });
  rejects(s.run(), /unregistered provenance/);
});

for (const side of ['head', 'base']) {
  for (const badRepo of [undefined, { full_name: 'foreign/quantpass-arbitrum-hackathon' }]) {
    test(`integration rejects ${side} ${badRepo ? 'foreign' : 'missing'} repository identity`, (t) => {
      const s = fixture(t);
      const pull = {
        title,
        head: { ref: branch, sha: s.git('rev-parse', 'HEAD'), repo },
        base: { ref: 'master', sha: s.base, repo },
      };
      pull[side].repo = badRepo;
      rejects(s.run({ event: { pull_request: pull } }), /canonical.*repository/);
    });
  }
}
for (const advanced of [false, true]) {
  test(`closeout merge queue fails closed with ${advanced ? 'advanced' : 'fixed'} base`, (t) => {
    const s = fixture(t);
    const candidate = s.git('rev-parse', 'HEAD');
    let base = s.base;
    if (advanced) {
      s.git('switch', 'master');
      s.git('commit', '--allow-empty', '-qm', 'Advance protected base');
      base = s.git('rev-parse', 'HEAD');
      s.git('update-ref', 'refs/remotes/origin/master', base);
      s.git('merge', '--no-ff', '-m', 'Synthetic queue merge', candidate);
    }
    rejects(
      s.run({
        name: 'merge_group',
        event: {
          repository: repo,
          merge_group: {
            base_ref: 'refs/heads/master',
            base_sha: base,
            head_sha: s.git('rev-parse', 'HEAD'),
            head_ref: 'refs/heads/gh-readonly-queue/master/pr-20-fixture',
          },
        },
      }),
      /integration.*queue/i,
    );
  });
}
test('removing integration manifest cannot launder closeout history through merge queue', (t) => {
  const s = fixture(t);
  s.git('rm', 'docs/management/agents/integrations/AF-M3-CLOSEOUT.json');
  s.git(
    'commit',
    '-qm',
    '[Macbeth01][AF-OTHER] Remove manifest',
    '-m',
    'Agent-ID: Macbeth01\nTask-ID: AF-OTHER',
  );
  rejects(
    s.run({
      name: 'merge_group',
      event: {
        merge_group: {
          base_ref: 'refs/heads/master',
          base_sha: s.base,
          head_sha: s.git('rev-parse', 'HEAD'),
          head_ref: 'refs/heads/gh-readonly-queue/master/pr-20-fixture',
        },
      },
    }),
    /integration.*queue/i,
  );
});

test('ordinary queued change after an already integrated base remains admissible', (t) => {
  const s = fixture(t);
  const base = s.git('rev-parse', 'HEAD');
  s.git(
    'commit',
    '--allow-empty',
    '-qm',
    '[Macbeth01][AF-OTHER] Ordinary follow-up',
    '-m',
    'Agent-ID: Macbeth01\nTask-ID: AF-OTHER',
  );
  succeeds(
    s.run({
      name: 'merge_group',
      event: {
        merge_group: {
          base_ref: 'refs/heads/master',
          base_sha: base,
          head_sha: s.git('rev-parse', 'HEAD'),
          head_ref: 'refs/heads/gh-readonly-queue/master/pr-21-fixture',
        },
      },
    }),
  );
});
