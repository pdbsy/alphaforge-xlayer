import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceBase = 'b2ed61311df8d1c97a48f623d1b4872798f5e888';
const retainedSource = '77a35249dc1b95605bf32e4cabed456ea104a669';
const tree = '0c113a58f9d8d739ca9f4cae4c0b6c87794ed241';
const sourceUrl = 'https://github.com/pdbsy/quantpass-arbitrum-hackathon.git';
const refs = [
  [sourceBase, 'refs/remotes/upstream/master'],
  [retainedSource, 'refs/remotes/upstream/macbeth01/m3-phase1-closeout'],
];
function requireValue(value, reason) {
  if (!value) throw new Error(`XLayer source evidence rejected: ${reason}`);
}
function runner(root) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' });
  return (...args) =>
    execFileSync('git', ['--no-replace-objects', ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}
function prerequisites(root, git) {
  requireValue(git('rev-parse', '--is-shallow-repository') === 'false', 'complete checkout required');
  requireValue(!git('for-each-ref', 'refs/replace'), 'replace refs forbidden');
  requireValue(!existsSync(resolve(root, git('rev-parse', '--git-path', 'info/grafts'))), 'grafts forbidden');
  const keys = git('config', '--local', '--name-only', '--list').split('\n');
  requireValue(
    !keys.some((key) => /^(?:filter\.|include\.|includeif\.|url\.|http\.|credential\.)/i.test(key)),
    'unsafe Git configuration',
  );
  const origin = git('remote', 'get-url', 'origin');
  requireValue(
    [
      'https://github.com/pdbsy/alphaforge-xlayer.git',
      'https://github.com/pdbsy/alphaforge-xlayer',
      'git@github.com:pdbsy/alphaforge-xlayer.git',
    ].includes(origin),
    'canonical target origin required',
  );
  for (const [, ref] of refs) {
    let symbolic = false;
    try {
      git('symbolic-ref', '-q', ref);
      symbolic = true;
    } catch (error) {
      if (error.status !== 1) throw error;
    }
    requireValue(!symbolic, 'symbolic source ref forbidden');
  }
}
export function verifyXLayerSources(root) {
  const git = runner(root);
  prerequisites(root, git);
  for (const [commit, ref] of refs) {
    requireValue(git('rev-parse', '--verify', `${ref}^{commit}`) === commit, 'pinned source ref mismatch');
    requireValue(git('rev-parse', `${commit}^{tree}`) === tree, 'whole-tree source bridge mismatch');
    git('merge-base', '--is-ancestor', '18f5352070910a867b9729b031aa2e3951785e01', commit);
  }
  return { sourceBase, retainedSource, tree };
}
export function fetchXLayerSources(root) {
  const git = runner(root);
  prerequisites(root, git);
  const before = git('rev-parse', '--verify', 'refs/remotes/origin/master^{commit}');
  git(
    'fetch',
    '--atomic',
    '--no-tags',
    '--no-write-fetch-head',
    '--no-recurse-submodules',
    sourceUrl,
    ...refs.map(([commit, ref]) => `${commit}:${ref}`),
  );
  requireValue(
    git('rev-parse', '--verify', 'refs/remotes/origin/master^{commit}') === before,
    'target master changed',
  );
  return verifyXLayerSources(root);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    requireValue(process.argv.length === 2, 'no runtime source overrides accepted');
    requireValue(
      process.versions.node === readFileSync(resolve(root, '.node-version'), 'utf8').trim(),
      'approved Node required',
    );
    console.log(JSON.stringify(fetchXLayerSources(root)));
  } catch {
    console.error('XLayer source evidence BLOCKED; fixed public source objects and refs must verify.');
    process.exitCode = 1;
  }
}
