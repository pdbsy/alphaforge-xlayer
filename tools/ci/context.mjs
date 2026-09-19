import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function cleanEnvironment() {
  const env = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot'])
    if (process.env[key]) env[key] = process.env[key];
  return {
    ...env,
    PYTHONNOUSERSITE: '1',
    PIP_CONFIG_FILE: '/dev/null',
    PIP_NO_INPUT: '1',
    PIP_DISABLE_PIP_VERSION_CHECK: '1',
  };
}
export function git(...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}
export function inspect() {
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
    : {};
  const sourceHead =
    event.pull_request?.head?.sha ?? event.merge_group?.head_sha ?? event.after ?? git('rev-parse', 'HEAD');
  const baseHead = event.pull_request?.base?.sha ?? event.merge_group?.base_sha ?? null;
  if (!/^[a-f0-9]{40}$/.test(sourceHead) || (baseHead !== null && !/^[a-f0-9]{40}$/.test(baseHead)))
    throw new Error('Invalid source identity');
  return {
    head: git('rev-parse', 'HEAD'),
    tree: git('rev-parse', 'HEAD^{tree}'),
    sourceHead,
    baseHead,
    trackedClean: git('status', '--porcelain', '--untracked-files=no') === '',
    lockSha256: createHash('sha256')
      .update(readFileSync(resolve(root, 'package-lock.json')))
      .digest('hex'),
  };
}
export function assertUnchanged(before, after) {
  if (!before.trackedClean || !after.trackedClean || JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('Checkout changed or was not clean; evidence BLOCKED');
}
export function run(file, args, options = {}) {
  return spawnSync(file, args, {
    cwd: root,
    encoding: 'utf8',
    env: cleanEnvironment(),
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
    shell: false,
  });
}
export function emit(report) {
  const text = JSON.stringify({
    observedAt: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID ?? null,
    attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    imageVersion: process.env.ImageVersion ?? null,
    ...report,
  });
  if (Buffer.byteLength(text) > 512 * 1024) throw new Error('Report exceeds bounded output limit');
  console.log(text);
  process.exitCode = report.state === 'PASS' ? 0 : report.state === 'FAIL' ? 1 : 2;
}
export async function main(moduleUrl, task) {
  if (!process.argv[1] || resolve(process.argv[1]) !== fileURLToPath(moduleUrl)) return;
  try {
    if (process.argv.length !== 2) throw new Error('Gate accepts no command-line arguments');
    await task();
  } catch (error) {
    emit({ state: 'BLOCKED', reason: String(error.message).slice(0, 500) });
  }
}
