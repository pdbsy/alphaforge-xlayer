import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { XLAYER_ASSIGNMENTS, validateCommitIdentity, validateCommitProvenance } from './agent-identity.mjs';

const repository = 'pdbsy/alphaforge-xlayer';
const sourceBase = 'b2ed61311df8d1c97a48f623d1b4872798f5e888';
const sha = /^[a-f0-9]{40}$/;
function requireValue(value, reason) {
  if (!value) throw new Error(`XLayer identity rejected: ${reason}`);
}

// An exact original object plus retained assigned ref binds each imported patch.
// This is attribution, not independent review or permission to merge/deploy.
export function verifyXLayerIntegration(root, { branch, head, prTitle = null, pullBase = null }) {
  const profile = XLAYER_ASSIGNMENTS.find((entry) => entry.branch === branch);
  requireValue(profile, 'unassigned branch');
  requireValue(sha.test(head), 'exact candidate SHA required');
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' });
  const git = (...args) =>
    execFileSync('git', ['--no-replace-objects', ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const exact = (ref) => {
    const value = git('rev-parse', '--verify', `${ref}^{commit}`);
    requireValue(sha.test(value), 'invalid commit object');
    return value;
  };
  const ancestor = (before, after) => {
    try {
      git('merge-base', '--is-ancestor', before, after);
      return true;
    } catch (error) {
      if (error.status === 1) return false;
      throw error;
    }
  };
  requireValue(git('rev-parse', '--is-shallow-repository') === 'false', 'complete history required');
  requireValue(!git('for-each-ref', 'refs/replace'), 'replace refs forbidden');
  requireValue(!existsSync(resolve(root, git('rev-parse', '--git-path', 'info/grafts'))), 'grafts forbidden');
  requireValue(
    [
      `https://github.com/${repository}.git`,
      `https://github.com/${repository}`,
      `git@github.com:${repository}.git`,
    ].includes(git('remote', 'get-url', 'origin')),
    'canonical origin required',
  );
  requireValue(
    exact(head) === head && exact(sourceBase) === sourceBase && ancestor(sourceBase, head),
    'fixed source base required',
  );
  const master = exact('refs/remotes/origin/master');
  requireValue(ancestor(master, head), 'candidate must include actual target master');
  if (pullBase)
    requireValue(pullBase.ref === 'master' && pullBase.sha === master, 'PR must target actual master');
  const start = profile.base ?? sourceBase;
  requireValue(ancestor(sourceBase, start) && ancestor(start, head), 'assigned starting point required');
  const records = new Map();
  const record = (id) => {
    if (!records.has(id)) {
      const parts = git('show', '-s', '--format=%s%x00%b%x00%an%x00%ae%x00%at%x00%P', id).split('\0');
      requireValue(parts.length === 6, 'ambiguous commit record');
      const [subject, body, author, email, date, parents] = parts;
      records.set(id, {
        subject,
        body: body.trim(),
        author: [author, email, date].join('\0'),
        parents: parents.split(' '),
      });
    }
    return records.get(id);
  };
  const retainedSource = (id, identity) =>
    XLAYER_ASSIGNMENTS.some((entry) => {
      if (entry.agent !== identity.agentId || entry.task !== identity.taskId) return false;
      try {
        const ref = `refs/remotes/origin/${entry.branch}`;
        // A symbolic ref must not turn one assigned source into a different owner.
        try {
          git('symbolic-ref', '-q', ref);
          return false;
        } catch (error) {
          if (error.status !== 1) throw error;
        }
        return (
          ancestor(entry.base ?? sourceBase, id) &&
          id !== (entry.base ?? sourceBase) &&
          ancestor(id, exact(ref))
        );
      } catch {
        return false;
      }
    });
  const commits = git('rev-list', '--reverse', `${start}..${head}`).split('\n').filter(Boolean);
  requireValue(commits.length > 0 && commits.length <= 4096, 'bounded nonempty candidate required');
  let own = 0;
  let imported = 0;
  for (const id of commits) {
    const current = record(id);
    const identity = validateCommitProvenance(current);
    const trailers = [...current.body.matchAll(/^\(cherry picked from commit ([a-f0-9]{40})\)$/gm)];
    const ownIdentity = identity.agentId === profile.agent && identity.taskId === profile.task;
    if (ownIdentity && trailers.length === 0) {
      validateCommitIdentity({ branch, prTitle, ...current });
      own += 1;
      continue;
    }
    requireValue(trailers.length <= 1, 'ambiguous source trailer');
    const originalId = trailers[0]?.[1] ?? id;
    requireValue(
      exact(originalId) === originalId && ancestor(sourceBase, originalId),
      'original source object required',
    );
    const original = record(originalId);
    const sourceIdentity = validateCommitProvenance(original);
    requireValue(
      sourceIdentity.agentId === identity.agentId && sourceIdentity.taskId === identity.taskId,
      'source owner/task mismatch',
    );
    requireValue(retainedSource(originalId, sourceIdentity), 'retained source ref required');
    if (originalId !== id) {
      requireValue(
        current.parents.length === 1 && original.parents.length === 1,
        'cherry-pick requires single-parent source and result',
      );
      const body = current.body.replace(/\n*\(cherry picked from commit [a-f0-9]{40}\)\s*$/, '').trim();
      requireValue(
        current.subject === original.subject && current.author === original.author && body === original.body,
        'source metadata changed',
      );
      const patch = (commit) =>
        git(
          'diff-tree',
          '--no-ext-diff',
          '--no-textconv',
          '--no-commit-id',
          '--no-renames',
          '-r',
          '-p',
          '--binary',
          '--full-index',
          `${commit}^`,
          commit,
        );
      requireValue(patch(id) === patch(originalId), 'source patch changed');
    }
    imported += 1;
  }
  requireValue(own > 0, 'assigned owner contribution required');
  return {
    skipped: false,
    verified: commits.length,
    imported,
    own,
    base: start,
    sourceBase,
    targetBase: master,
  };
}
