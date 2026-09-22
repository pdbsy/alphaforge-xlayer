import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixtureExec } from './helpers/git-fixture.mjs';

const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
const base = '18f5352070910a867b9729b031aa2e3951785e01';
const branch = 'codex/xlayer-bootstrap';
const repository = 'pdbsy/alphaforge-xlayer';
const task = 'AF-XLAYER-MIGRATION';
const managerMessage = `[XLayer][${task}] Record integration\n\nManager-ID: XLayerPM\nTask-ID: ${task}`;

function fixture(t, { legacy = false, variant = 'standard' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'alphaforge-xlayer-identity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    fixtureExec('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'master');
  git('fetch', '-q', sourceRoot, base);
  git('reset', '--hard', base);
  git('remote', 'add', 'origin', `https://github.com/${repository}.git`);
  git('update-ref', 'refs/remotes/origin/master', base);
  const author = (name) => {
    git('config', 'user.name', name);
    git('config', 'user.email', `${name}@users.noreply.github.com`);
  };
  const commit = (message) => {
    git('add', '-A');
    git('commit', '--allow-empty', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  const sources = [];
  for (const [agent, workerTask, workerBranch] of [
    ['Macbeth02', 'AF-XLAYER-02-CONTRACTS', 'macbeth02/xlayer-contracts'],
    ['Macbeth06', 'AF-XLAYER-06-CI', 'macbeth06/xlayer-ci-bindings'],
  ]) {
    git('switch', '-qc', workerBranch, base);
    author(agent);
    writeFileSync(join(root, `${agent}.txt`), 'public fixture content\n');
    writeFileSync(join(root, `${agent}.bin`), Buffer.from([0, 1, 2, 3, 255]));
    if (agent === 'Macbeth06' && variant === 'bytes')
      writeFileSync(join(root, 'Macbeth06.txt'), Buffer.from([128, 10]));
    if (agent === 'Macbeth06' && variant === 'relocation')
      writeFileSync(
        join(root, 'relocation.js'),
        'function alpha() {\n  return 0;\n}\n\nfunction beta() {\n  return 0;\n}\n',
      );
    if (agent === 'Macbeth06' && !legacy) {
      writeFileSync(
        join(root, 'README.md'),
        readFileSync(join(root, 'README.md'), 'utf8') + '\nFixture source suffix.\n',
      );
    }
    let head = commit(`[${agent}][${workerTask}] Source\n\nAgent-ID: ${agent}\nTask-ID: ${workerTask}`);
    if (agent === 'Macbeth06' && variant === 'message-bytes') {
      const bytes = fixtureExec('git', ['cat-file', 'commit', head], { cwd: root });
      head = fixtureExec('git', ['hash-object', '-t', 'commit', '-w', '--stdin'], {
        cwd: root,
        encoding: 'utf8',
        input: Buffer.concat([bytes, Buffer.from([128, 10])]),
      }).trim();
      git('update-ref', 'HEAD', head);
    }
    const commits = [{ source: head }];
    if (agent === 'Macbeth06' && variant === 'relocation') {
      writeFileSync(
        join(root, 'relocation.js'),
        'function alpha() {\n  audit();\n  return 0;\n}\n\nfunction beta() {\n  return 0;\n}\n',
      );
      head = commit(`[${agent}][${workerTask}] Audit alpha\n\nAgent-ID: ${agent}\nTask-ID: ${workerTask}`);
      commits.push({ source: head });
    }
    git('update-ref', `refs/remotes/origin/${workerBranch}`, head);
    sources.push({ agent, task: workerTask, branch: workerBranch, head, commits });
  }
  const legacySha = '5896ff45510b214d45a3469f9536a8434e2493d3';
  if (legacy) git('fetch', '-q', sourceRoot, legacySha);
  git('switch', '-qc', branch, legacy ? legacySha : base);
  author('pdbsy');
  mkdirSync(join(root, 'docs/xlayer'), { recursive: true });
  writeFileSync(join(root, 'docs/xlayer/fixture.md'), 'Manager integration fixture\n');
  writeFileSync(
    join(root, 'README.md'),
    'Fixture manager prefix.\n' + readFileSync(join(root, 'README.md'), 'utf8'),
  );
  commit(managerMessage);
  for (const source of sources) {
    for (const mapping of source.commits) {
      git('cherry-pick', mapping.source);
      mapping.imported = git('rev-parse', 'HEAD');
      if (source.agent === 'Macbeth06' && variant === 'message-bytes') {
        const original = fixtureExec('git', ['cat-file', 'commit', mapping.source], { cwd: root });
        const imported = fixtureExec('git', ['cat-file', 'commit', mapping.imported], { cwd: root });
        const preserved = Buffer.concat([
          imported.subarray(0, imported.indexOf('\n\n') + 2),
          original.subarray(original.indexOf('\n\n') + 2),
        ]);
        mapping.imported = fixtureExec('git', ['hash-object', '-t', 'commit', '-w', '--stdin'], {
          cwd: root,
          encoding: 'utf8',
          input: preserved,
        }).trim();
        git('update-ref', 'HEAD', mapping.imported);
      }
      assert.notEqual(mapping.source, mapping.imported);
    }
  }
  for (const name of ['check-agent-identity.mjs', 'xlayer-integration-identity.mjs']) {
    const from = join(sourceRoot, 'tools', name);
    if (existsSync(from)) copyFileSync(from, join(root, 'tools', name));
  }
  const manifest = {
    schema_version: 1,
    repository,
    branch,
    task,
    base,
    legacyManagerCommits: legacy ? [legacySha] : [],
    sources,
  };
  function record(value = manifest, message = managerMessage) {
    writeFileSync(join(root, 'docs/xlayer/integration-provenance.json'), JSON.stringify(value));
    return commit(message);
  }
  record();
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GITHUB_')) delete env[k];
  return {
    root,
    git,
    author,
    commit,
    manifest,
    record,
    sources,
    run(change = {}) {
      const sha = git('rev-parse', 'HEAD');
      const event = change.event ?? {
        pull_request: {
          title: '[XLayerPM] Integration',
          head: { ref: branch, sha, repo: { full_name: repository } },
          base: { ref: 'master', sha: base, repo: { full_name: repository } },
        },
      };
      const eventFile = join(root, '.checks/xlayer-event.json');
      writeFileSync(eventFile, JSON.stringify(event));
      return spawnSync(process.execPath, ['tools/check-agent-identity.mjs'], {
        cwd: root,
        env: { ...env, GITHUB_EVENT_NAME: change.name ?? 'pull_request', GITHUB_EVENT_PATH: eventFile },
        encoding: 'utf8',
      });
    },
  };
}
const pass = (r) => assert.equal(r.status, 0, r.stdout + r.stderr);
const fail = (r) => assert.notEqual(r.status, 0, r.stdout + r.stderr);

for (const variant of ['relocation', 'bytes', 'message-bytes']) {
  test(`X Layer rejects lossy ${variant} provenance while accepting the original import`, (t) => {
    const s = fixture(t, { variant });
    pass(s.run());
    const mapping = s.sources[1].commits.at(-1);
    s.git('reset', '--hard', mapping.imported);
    if (variant === 'message-bytes') {
      const bytes = fixtureExec('git', ['cat-file', 'commit', mapping.imported], { cwd: s.root });
      const changed = Buffer.from(bytes);
      assert.equal(changed.at(-2), 128);
      changed[changed.length - 2] = 129;
      mapping.imported = fixtureExec('git', ['hash-object', '-t', 'commit', '-w', '--stdin'], {
        cwd: s.root,
        encoding: 'utf8',
        input: changed,
      }).trim();
      s.git('update-ref', 'HEAD', mapping.imported);
    } else {
      const path = variant === 'bytes' ? 'Macbeth06.txt' : 'relocation.js';
      writeFileSync(
        join(s.root, path),
        variant === 'bytes'
          ? Buffer.from([129, 10])
          : 'function alpha() {\n  return 0;\n}\n\nfunction beta() {\n  audit();\n  return 0;\n}\n',
      );
      s.git('add', path);
      s.git('commit', '--amend', '--no-edit');
      mapping.imported = s.git('rev-parse', 'HEAD');
    }
    for (const name of ['check-agent-identity.mjs', 'xlayer-integration-identity.mjs'])
      copyFileSync(join(sourceRoot, 'tools', name), join(s.root, 'tools', name));
    s.record();
    fail(s.run());
  });
}

test('X Layer accepts fully attributed cherry-picks without requiring original SHA ancestry', (t) => {
  const s = fixture(t);
  pass(s.run());
  writeFileSync(join(s.root, 'docs/xlayer/integration-provenance.json'), '{}');
  pass(s.run());
});

test('X Layer accepts only explicitly recorded reviewed legacy manager history', (t) => {
  const s = fixture(t, { legacy: true });
  pass(s.run());
  s.manifest.legacyManagerCommits = [];
  s.record();
  fail(s.run());
});

test('X Layer keeps a pinned source valid after later source documentation but rejects importing unregistered future work', (t) => {
  const s = fixture(t);
  const source = s.sources[0];
  s.git('switch', source.branch);
  s.author(source.agent);
  writeFileSync(join(s.root, 'later-source.md'), 'Later source documentation.\n');
  const later = s.commit(
    `[${source.agent}][${source.task}] Later docs\n\nAgent-ID: ${source.agent}\nTask-ID: ${source.task}`,
  );
  s.git('update-ref', `refs/remotes/origin/${source.branch}`, later);
  s.git('switch', branch);
  s.author('pdbsy');
  pass(s.run());
  s.git('cherry-pick', later);
  fail(s.run());
});

test('X Layer rejects shallow history, foreign origin and untrusted PR title', (t) => {
  const s = fixture(t);
  writeFileSync(join(s.root, '.git/shallow'), s.git('rev-parse', 'HEAD') + '\n');
  fail(s.run());
  rmSync(join(s.root, '.git/shallow'));
  s.git('remote', 'set-url', 'origin', 'https://github.com/foreign/alphaforge-xlayer.git');
  fail(s.run());
  s.git('remote', 'set-url', 'origin', `https://github.com/${repository}.git`);
  fail(
    s.run({
      event: {
        pull_request: {
          title: '[Other] Integration',
          head: { ref: branch, sha: s.git('rev-parse', 'HEAD'), repo: { full_name: repository } },
          base: { ref: 'master', sha: base, repo: { full_name: repository } },
        },
      },
    }),
  );
});

for (const [name, mutate] of [
  [
    'repository',
    (m) => {
      m.repository = 'other/alphaforge-xlayer';
    },
  ],
  [
    'branch',
    (m) => {
      m.branch = 'codex/other';
    },
  ],
  [
    'task',
    (m) => {
      m.task = 'AF-OTHER';
    },
  ],
  [
    'base',
    (m) => {
      m.base = m.sources[0].head;
    },
  ],
  [
    'source owner',
    (m) => {
      m.sources[0].agent = 'Macbeth03';
    },
  ],
  [
    'source task',
    (m) => {
      m.sources[0].task = 'AF-XLAYER-06-CI';
    },
  ],
  [
    'source branch',
    (m) => {
      m.sources[0].branch = 'macbeth02/other';
    },
  ],
  [
    'source head',
    (m) => {
      m.sources[0].head = m.sources[1].head;
    },
  ],
  [
    'omitted worker',
    (m) => {
      m.sources.pop();
    },
  ],
  [
    'omitted mapping',
    (m) => {
      m.sources[0].commits = [];
    },
  ],
  [
    'duplicate mapping',
    (m) => {
      m.sources[0].commits.push(m.sources[0].commits[0]);
    },
  ],
  [
    'unregistered legacy grant',
    (m) => {
      m.legacyManagerCommits.push(m.sources[0].commits[0].imported);
    },
  ],
]) {
  test(`X Layer rejects ${name} substitution`, (t) => {
    const s = fixture(t);
    mutate(s.manifest);
    s.record();
    fail(s.run());
  });
}

for (const change of ['patch', 'whitespace', 'binary', 'message', 'author']) {
  test(`X Layer rejects imported ${change} drift`, (t) => {
    const s = fixture(t);
    const mapping = s.sources[1].commits[0];
    s.git('reset', '--hard', mapping.imported);
    if (change === 'binary') {
      writeFileSync(join(s.root, 'Macbeth06.bin'), Buffer.from([0, 1, 2, 4, 255]));
      s.git('add', 'Macbeth06.bin');
    }
    if (change === 'patch' || change === 'whitespace') {
      writeFileSync(
        join(s.root, 'Macbeth06.txt'),
        change === 'patch' ? 'altered content\n' : 'public fixture content \n',
      );
      s.git('add', 'Macbeth06.txt');
    }
    s.git(
      'commit',
      '--amend',
      '--no-edit',
      ...(change === 'message'
        ? ['-m', '[Macbeth06][AF-XLAYER-06-CI] Altered\n\nAgent-ID: Macbeth06\nTask-ID: AF-XLAYER-06-CI']
        : []),
      ...(change === 'author' ? ['--author', 'attacker <attacker@example.test>'] : []),
    );
    mapping.imported = s.git('rev-parse', 'HEAD');
    for (const name of ['check-agent-identity.mjs', 'xlayer-integration-identity.mjs']) {
      const from = join(sourceRoot, 'tools', name);
      if (existsSync(from)) copyFileSync(from, join(s.root, 'tools', name));
    }
    s.record();
    fail(s.run());
  });
}

test('X Layer rejects remote source drift and fixed master movement', (t) => {
  const s = fixture(t);
  s.git('update-ref', `refs/remotes/origin/${s.sources[0].branch}`, base);
  fail(s.run());
  s.git('update-ref', `refs/remotes/origin/${s.sources[0].branch}`, s.sources[0].head);
  s.git('update-ref', 'refs/remotes/origin/master', s.sources[0].head);
  fail(s.run());
});
test('X Layer rejects unlabeled manager additions even when push.before hides them', (t) => {
  const s = fixture(t);
  const before = s.commit('unregistered manager work');
  const after = s.record();
  fail(s.run({ name: 'push', event: { ref: `refs/heads/${branch}`, before, after } }));
});
test('X Layer rejects wrong manager author and duplicate manager trailers', (t) => {
  const s = fixture(t);
  s.author('attacker');
  s.record();
  fail(s.run());
  s.git('reset', '--hard', 'HEAD^');
  s.author('pdbsy');
  s.record(s.manifest, managerMessage + '\nManager-ID: XLayerPM');
  fail(s.run());
});
for (const side of ['head', 'base']) {
  test(`X Layer rejects same-name fork ${side} repository`, (t) => {
    const s = fixture(t);
    const pull = {
      title: '[XLayerPM] Integration',
      head: { ref: branch, sha: s.git('rev-parse', 'HEAD'), repo: { full_name: repository } },
      base: { ref: 'master', sha: base, repo: { full_name: repository } },
    };
    pull[side].repo.full_name = 'foreign/alphaforge-xlayer';
    fail(s.run({ event: { pull_request: pull } }));
  });
}
test('X Layer merge queue cannot introduce integration history even after manifest deletion', (t) => {
  const s = fixture(t);
  s.git('rm', 'docs/xlayer/integration-provenance.json');
  s.commit(managerMessage);
  fail(
    s.run({
      name: 'merge_group',
      event: {
        merge_group: {
          base_ref: 'refs/heads/master',
          base_sha: base,
          head_sha: s.git('rev-parse', 'HEAD'),
          head_ref: 'refs/heads/gh-readonly-queue/master/pr-1',
        },
      },
    }),
  );
});
