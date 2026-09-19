import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, inspect, assertUnchanged, run, emit, main } from './context.mjs';

export function validateContractHost(host) {
  if (
    host.platform !== 'darwin' ||
    host.arch !== 'arm64' ||
    host.python !== '3.12.9' ||
    host.pythonArch !== 'arm64'
  )
    throw new Error('Contract CI requires Darwin arm64 and native CPython 3.12.9');
}
export function runContractStages(execute) {
  const stages = [
    ['bootstrap', 'python3.12', ['contracts/script/bootstrap.py']],
    ['compiler-probe', './.checks/af-chain01/toolchain/bin/solc', ['--version']],
    ['contracts-and-abi', '/bin/bash', ['contracts/script/check-m3-vault.sh']],
  ];
  const results = [];
  for (const [stage, file, args] of stages) {
    const result = execute(file, args);
    const incomplete = Boolean(result.error || result.signal || !Number.isInteger(result.status));
    const state =
      incomplete || (result.status !== 0 && stage !== 'contracts-and-abi')
        ? 'BLOCKED'
        : result.status === 0
          ? 'PASS'
          : 'FAIL';
    results.push({ stage, state, exitCode: result.status, incomplete });
    if (state !== 'PASS')
      return { state, abi: stage === 'contracts-and-abi' ? 'UNCONFIRMED' : 'NOT_RUN', stages: results };
  }
  return { state: 'PASS', abi: 'PASS', stages: results };
}
await main(import.meta.url, () => {
  const before = inspect();
  assertUnchanged(before, before);
  const probe = run('python3.12', [
    '-c',
    'import platform,sys,json; print(json.dumps({"python":platform.python_version(),"pythonArch":platform.machine()}))',
  ]);
  if (probe.status !== 0 || probe.error || probe.signal)
    throw new Error('Native Python prerequisite unavailable');
  validateContractHost({ platform: process.platform, arch: process.arch, ...JSON.parse(probe.stdout) });
  const lockBytes = readFileSync(resolve(root, 'contracts/toolchain.lock.json'));
  const lock = JSON.parse(lockBytes);
  const report = runContractStages((file, args) => {
    const result = run(file, args, { timeout: 20 * 60 * 1000 });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    if (file.endsWith('/solc') && result.status === 0 && !result.stdout.includes(lock.solc.longVersion))
      return { status: 2, error: new Error('Compiler version mismatch') };
    return result;
  });
  assertUnchanged(before, inspect());
  emit({
    gate: 'contracts-m3-macos',
    ...before,
    contractLockSha256: createHash('sha256').update(lockBytes).digest('hex'),
    python: JSON.parse(probe.stdout),
    ...report,
    boundary: 'local tests only; no deployment, RPC or wallet operation',
  });
});
