import { execFileSync } from 'node:child_process';
import { validateCommitIdentity } from './agent-identity.mjs';

const repository = 'pdbsy/alphaforge-xlayer';
const integrationBranch = 'codex/xlayer-bootstrap';
const integrationTask = 'AF-XLAYER-MIGRATION';
const base = '18f5352070910a867b9729b031aa2e3951785e01';
const manifestPath = 'docs/xlayer/integration-provenance.json';
const shaPattern = /^[a-f0-9]{40}$/;
const workers = new Map([
  ['Macbeth02', ['AF-XLAYER-02-CONTRACTS', 'macbeth02/xlayer-contracts']],
  ['Macbeth03', ['AF-XLAYER-03-ADAPTER', 'macbeth03/xlayer-adapter']],
  ['Macbeth04', ['AF-XLAYER-04-UI', 'macbeth04/xlayer-ui']],
  ['Macbeth05', ['AF-XLAYER-05-QA', 'macbeth05/xlayer-qa']],
  ['Macbeth06', ['AF-XLAYER-06-CI', 'macbeth06/xlayer-ci-bindings']],
]);
// Reviewed public bootstrap history only. A manifest cannot grant new exceptions.
const legacyManagerCommits = new Set([
  '5896ff45510b214d45a3469f9536a8434e2493d3',
  '955f0fccd38be76ab6b7f7e9715a91eecbf3aa14',
  '16bb735206ea3741b761fdefc82b08da402b4d70',
  '728c3df217f586fb7f7d86f595406dc46372ac1a',
  '33f47d935e64759b94de68ee13c0aabb22534844',
  '3190b6e2c37874689443cb3defd789f90209a03c',
  '9c10e8ab2e04c2728a330ade742032305c4e450a',
  'f26d117e4b0c0197af7b4a6555366275574d1265',
  'd982e3207438953c0a61af8c9cacb3497fe62202',
]);
function requireValue(condition, label) {
  if (!condition) throw new Error(`X Layer integration identity rejected: ${label}`);
}
function oneTrailer(message, key, value) {
  const lines = message.split('\n').filter((line) => new RegExp(`^${key}:`, 'i').test(line));
  return lines.length === 1 && lines[0] === `${key}: ${value}`;
}

// Process provenance, not independent approval. Original source SHAs need not be
// ancestors of cherry-picked candidates; their full ranges and patches must match.
export function verifyXLayerIntegration(root, { branch, head, pull = null }) {
  const rawGit = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' },
    });
  const git = (...args) =>
    rawGit(...args)
      .toString('utf8')
      .trim();
  const exact = (ref) => git('rev-parse', '--verify', `${ref}^{commit}`);
  const ancestor = (parent, child) => {
    try {
      git('merge-base', '--is-ancestor', parent, child);
    } catch {
      throw new Error('X Layer integration identity rejected: missing fixed-base ancestry');
    }
  };
  const range = (tip) => git('rev-list', `${base}..${tip}`).split('\n').filter(Boolean);
  const record = (sha) => {
    const parents = git('rev-list', '--parents', '-n', '1', sha).split(' ');
    requireValue(parents.length === 2, 'every integration/source commit must have one parent');
    const bytes = rawGit('cat-file', 'commit', sha);
    const separator = bytes.indexOf('\n\n');
    requireValue(separator >= 0, 'invalid raw commit');
    const headers = bytes.subarray(0, separator).toString('utf8').split('\n');
    const authors = headers.filter((line) => line.startsWith('author '));
    requireValue(authors.length === 1, 'exactly one author required');
    const author = authors[0].match(/^author (.+) <([^<>]+)> -?\d+ [+-]\d{4}$/);
    requireValue(author, 'invalid author record');
    const [, name, email] = author;
    const messageBytes = bytes.subarray(separator + 2);
    const message = messageBytes.toString('utf8');
    const [subject, ...body] = message.split('\n');
    const authorStart = bytes.indexOf(Buffer.from('\nauthor ')) + 1;
    requireValue(authorStart > 0, 'missing raw author');
    const authorBytes = bytes.subarray(authorStart, bytes.indexOf(10, authorStart));
    return { name, email, messageBytes, authorBytes, subject, body: body.join('\n') };
  };
  const verifyImportedTree = (original, imported) => {
    // Replay the source change using its original parent as the explicit merge
    // base. Comparing whole trees preserves hunk placement and every blob byte,
    // while allowing unrelated earlier imports and upstream line offsets.
    // merge-tree writes Git objects only, never the working tree or its index.
    const tree = git(
      'merge-tree',
      '--write-tree',
      '--no-messages',
      `--merge-base=${original}^`,
      `${imported}^`,
      original,
    );
    requireValue(
      shaPattern.test(tree) && tree === git('rev-parse', `${imported}^{tree}`),
      'imported tree differs from replayed source change',
    );
  };
  requireValue(
    branch === integrationBranch && shaPattern.test(head),
    'exact registered branch/head required',
  );
  requireValue(git('rev-parse', '--is-shallow-repository') === 'false', 'full history required');
  requireValue(
    [
      `https://github.com/${repository}`,
      `https://github.com/${repository}.git`,
      `git@github.com:${repository}.git`,
    ].includes(git('remote', 'get-url', 'origin')),
    'canonical origin required',
  );
  requireValue(exact('refs/remotes/origin/master') === base, 'master moved from fixed base');
  requireValue(exact(head) === head, 'invalid head');
  ancestor(base, head);
  if (pull)
    requireValue(
      pull.head?.ref === branch &&
        pull.head.sha === head &&
        pull.head.repo?.full_name === repository &&
        pull.base?.ref === 'master' &&
        pull.base.sha === base &&
        pull.base.repo?.full_name === repository &&
        typeof pull.title === 'string' &&
        pull.title.startsWith('[XLayerPM] '),
      'PR requires exact canonical repositories, refs, fixed base and manager title',
    );
  const blob = `${head}:${manifestPath}`;
  requireValue(Number(git('cat-file', '-s', blob)) <= 64 * 1024, 'oversized source manifest');
  const manifest = JSON.parse(rawGit('show', blob));
  requireValue(
    manifest?.schema_version === 1 &&
      manifest.repository === repository &&
      manifest.branch === branch &&
      manifest.task === integrationTask &&
      manifest.base === base,
    'invalid manifest identity',
  );
  requireValue(
    Array.isArray(manifest.sources) && manifest.sources.length >= 1 && manifest.sources.length <= 5,
    'bounded registered sources required',
  );
  requireValue(
    Array.isArray(manifest.legacyManagerCommits) &&
      manifest.legacyManagerCommits.length <= legacyManagerCommits.size,
    'bounded legacy manifest required',
  );
  const legacy = new Set(manifest.legacyManagerCommits);
  requireValue(
    legacy.size === manifest.legacyManagerCommits.length &&
      [...legacy].every((sha) => legacyManagerCommits.has(sha)),
    'duplicate or unregistered legacy grant',
  );
  const candidate = range(head);
  const candidateSet = new Set(candidate);
  requireValue(
    [...legacy].every((sha) => candidateSet.has(sha)),
    'legacy commit absent from candidate',
  );
  const imported = new Set();
  const sourceShas = new Set();
  const agents = new Set();
  for (const source of manifest.sources) {
    const profile = workers.get(source?.agent);
    requireValue(
      profile && source.task === profile[0] && source.branch === profile[1] && !agents.has(source.agent),
      'duplicate or unregistered source owner/task/branch',
    );
    agents.add(source.agent);
    requireValue(shaPattern.test(source.head), 'invalid pinned source head');
    ancestor(source.head, exact(`refs/remotes/origin/${source.branch}`));
    ancestor(base, source.head);
    const originals = new Set(range(source.head));
    requireValue(
      originals.size > 0 && Array.isArray(source.commits) && source.commits.length === originals.size,
      'complete source range mapping required',
    );
    for (const mapping of source.commits) {
      requireValue(
        mapping &&
          shaPattern.test(mapping.source) &&
          shaPattern.test(mapping.imported) &&
          originals.has(mapping.source) &&
          candidateSet.has(mapping.imported) &&
          !sourceShas.has(mapping.source) &&
          !imported.has(mapping.imported),
        'invalid or duplicate source/import mapping',
      );
      sourceShas.add(mapping.source);
      imported.add(mapping.imported);
      const original = record(mapping.source);
      const copy = record(mapping.imported);
      const identity = validateCommitIdentity({
        branch: source.branch,
        subject: original.subject,
        body: original.body,
      });
      requireValue(
        identity.agentId === source.agent &&
          identity.taskId === source.task &&
          original.name === source.agent &&
          original.email === `${source.agent}@users.noreply.github.com`,
        'source author/task attribution differs',
      );
      requireValue(
        copy.authorBytes.equals(original.authorBytes) && copy.messageBytes.equals(original.messageBytes),
        'imported author or message differs',
      );
      verifyImportedTree(mapping.source, mapping.imported);
    }
  }
  let manager = 0;
  for (const sha of candidate) {
    if (imported.has(sha)) continue;
    const commit = record(sha);
    requireValue(
      commit.name === 'pdbsy' && commit.email === 'pdbsy@users.noreply.github.com',
      'unregistered manager author',
    );
    if (!legacy.has(sha))
      requireValue(
        commit.subject.startsWith(`[XLayer][${integrationTask}] `) &&
          oneTrailer(commit.body, 'Manager-ID', 'XLayerPM') &&
          oneTrailer(commit.body, 'Task-ID', integrationTask) &&
          !/^Agent-ID:/im.test(commit.body),
        'unregistered manager commit',
      );
    manager += 1;
  }
  requireValue(manager > 0, 'manager record required');
  return { verified: candidate.length, imported: imported.size, manager };
}
