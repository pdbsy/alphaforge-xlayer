import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validatePackageLock } from '../check-supply-chain.mjs';
import { root, git, inspect, assertUnchanged, cleanEnvironment, run, emit, main } from './context.mjs';

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function compareLocks(base, head) {
  if (!base?.packages || !head?.packages) throw new Error('Lock package graph missing');
  const result = { added: [], removed: [], changed: [] };
  for (const path of [...new Set([...Object.keys(base.packages), ...Object.keys(head.packages)])].sort()) {
    const before = base.packages[path],
      after = head.packages[path];
    if (canonical(before) === canonical(after)) continue;
    const kind = before === undefined ? 'added' : after === undefined ? 'removed' : 'changed';
    result[kind].push({ path, before: before ?? null, after: after ?? null });
  }
  return result;
}
export function classifyAudit({ status, signal, error, report }) {
  const blocked = { state: 'BLOCKED', exitCode: 2 };
  const levels = ['info', 'low', 'moderate', 'high', 'critical'];
  const counts = report?.metadata?.vulnerabilities;
  const entries = report?.vulnerabilities;
  if (
    error ||
    signal ||
    ![0, 1].includes(status) ||
    report?.error ||
    report?.auditReportVersion !== 2 ||
    !counts ||
    !entries ||
    Array.isArray(entries) ||
    typeof entries !== 'object' ||
    !Number.isInteger(report.metadata.dependencies?.total) ||
    report.metadata.dependencies.total <= 0
  )
    return blocked;
  if (
    [...levels, 'total'].some((level) => !Number.isInteger(counts[level]) || counts[level] < 0) ||
    counts.total !== levels.reduce((sum, level) => sum + counts[level], 0)
  )
    return blocked;
  const actual = Object.fromEntries(levels.map((level) => [level, 0]));
  for (const row of Object.values(entries)) {
    if (!row || !levels.includes(row.severity)) return blocked;
    actual[row.severity]++;
  }
  if (levels.some((level) => actual[level] !== counts[level])) return blocked;
  const fails = counts.high + counts.critical > 0;
  if (status !== (fails ? 1 : 0)) return blocked;
  return { state: fails ? 'FAIL' : 'PASS', exitCode: fails ? 1 : 0, counts };
}
export function candidateRefs(name, event, checkout) {
  let base,
    head,
    baselineKind = name;
  if (name === 'pull_request')
    ({ base: { sha: base } = {}, head: { sha: head } = {} } = event.pull_request ?? {});
  else if (name === 'merge_group') ({ base_sha: base, head_sha: head } = event.merge_group ?? {});
  else if (name === 'push') {
    base = event.before;
    head = event.after;
    if (base === '0'.repeat(40)) {
      base = checkout.master;
      baselineKind = 'new-branch-origin-master';
    }
  } else if (['local', 'workflow_dispatch'].includes(name)) {
    base = checkout.master;
    head = checkout.head;
    baselineKind = 'origin-master';
  } else throw new Error('Unsupported event context');
  if (
    ![base, head].every((sha) => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha) && !/^0+$/.test(sha))
  )
    throw new Error('Missing exact base/head');
  return { base, head, baselineKind };
}
await main(import.meta.url, () => {
  const before = inspect();
  assertUnchanged(before, before);
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  const refs = candidateRefs(process.env.GITHUB_EVENT_NAME ?? 'local', event, {
    head: before.head,
    master: git('rev-parse', 'origin/master'),
  });
  for (const sha of [refs.base, refs.head])
    if (git('rev-parse', '--verify', `${sha}^{commit}`) !== sha)
      throw new Error('Exact candidate object unavailable');
  git('merge-base', refs.base, refs.head);
  git('merge-base', '--is-ancestor', refs.head, before.head);
  const policy = JSON.parse(readFileSync(resolve(root, 'planning/supply-chain-policy.json'), 'utf8'));
  const inputs = [refs.base, refs.head].map((sha) => {
    const lock = JSON.parse(git('show', `${sha}:package-lock.json`));
    const manifest = JSON.parse(git('show', `${sha}:package.json`));
    validatePackageLock(lock, manifest, policy);
    return { lock, manifest };
  });
  const delta = compareLocks(inputs[0].lock, inputs[1].lock);
  const directory = mkdtempSync(join(tmpdir(), 'af-dependency-audit-'));
  let result;
  try {
    writeFileSync(join(directory, 'package.json'), JSON.stringify(inputs[1].manifest));
    writeFileSync(join(directory, 'package-lock.json'), JSON.stringify(inputs[1].lock));
    writeFileSync(join(directory, 'empty-user.npmrc'), '');
    writeFileSync(join(directory, 'empty-global.npmrc'), '');
    const audit = run(
      'npm',
      [
        'audit',
        '--package-lock-only',
        '--include=dev',
        '--include=optional',
        '--ignore-scripts',
        '--audit-level=high',
        '--json',
        '--registry=https://registry.npmjs.org/',
      ],
      {
        cwd: directory,
        env: {
          ...cleanEnvironment(),
          NPM_CONFIG_USERCONFIG: join(directory, 'empty-user.npmrc'),
          NPM_CONFIG_GLOBALCONFIG: join(directory, 'empty-global.npmrc'),
          NPM_CONFIG_CACHE: join(directory, 'cache'),
        },
      },
    );
    let report;
    try {
      report = JSON.parse(audit.stdout);
    } catch {
      report = null;
    }
    result = classifyAudit({ ...audit, report });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  assertUnchanged(before, inspect());
  emit({
    gate: 'dependency-delta-audit',
    ...before,
    ...refs,
    checkoutHead: before.head,
    delta,
    registry: 'https://registry.npmjs.org',
    ...result,
    boundary:
      'Root npm dependencies and known advisories only; not GitHub Dependency Review equivalent; no Python/tool binary/Action vulnerability coverage',
  });
});
