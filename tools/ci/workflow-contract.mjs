import { parse } from 'yaml';
import { isDeepStrictEqual } from 'node:util';

const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const node = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';
const python = 'actions/setup-python@e797f83bcb11b83ae66e0230d6156d7c80228e7c';
export function validateCIGateWorkflows(text) {
  const workflow = parse(text);
  for (const jobId of ['verify', 'verify-windows', 'verify-macos']) {
    const steps = workflow.jobs?.[jobId]?.steps ?? [];
    const evidence = steps.filter((step) => step.run === 'node tools/fetch-xlayer-source.mjs');
    const index = steps.indexOf(evidence[0]);
    if (
      evidence.length !== 1 ||
      Object.keys(evidence[0]).some((key) => !['name', 'run'].includes(key)) ||
      steps[index - 1]?.run !== 'node tools/check-environment.mjs --ci' ||
      steps[index + 1]?.run !== 'npm ci --ignore-scripts'
    )
      throw new Error(`Invalid immutable source evidence step: ${jobId}`);
  }
  for (const [jobId, runner, command] of [
    ['contracts-m3-macos', 'macos-15', 'node tools/ci/verify-contracts.mjs'],
    ['source-policy-js', 'ubuntu-24.04', 'node tools/ci/check-source-policy.mjs'],
    ['dependency-delta-audit', 'ubuntu-24.04', 'node tools/ci/check-dependency-delta.mjs'],
    ['semgrep-ce', 'ubuntu-24.04', 'node tools/ci/check-semgrep.mjs'],
    ['osv-scanner', 'ubuntu-24.04', 'node tools/ci/check-osv.mjs'],
    ['gitleaks', 'ubuntu-24.04', 'node tools/ci/check-gitleaks.mjs'],
  ]) {
    const job = workflow.jobs?.[jobId];
    const fail = () => {
      throw new Error(`Invalid mandatory CI gate: ${jobId}`);
    };
    if (
      !job ||
      Object.keys(job).some((key) => !['runs-on', 'timeout-minutes', 'permissions', 'steps'].includes(key)) ||
      job['runs-on'] !== runner ||
      !Number.isInteger(job['timeout-minutes']) ||
      job['timeout-minutes'] < 1 ||
      job['timeout-minutes'] > 35 ||
      !isDeepStrictEqual(job.permissions, { contents: 'read' }) ||
      !Array.isArray(job.steps)
    )
      fail();
    for (const step of job.steps)
      if (Object.keys(step).some((key) => !['name', 'uses', 'with', 'run'].includes(key))) fail();
    const expected = [
      checkout,
      node,
      'node tools/bootstrap-ci-npm.mjs',
      'node tools/check-environment.mjs --ci',
    ];
    if (['contracts-m3-macos', 'semgrep-ce'].includes(jobId)) expected.push(python);
    if (jobId !== 'contracts-m3-macos') expected.push('npm ci --ignore-scripts');
    if (['dependency-delta-audit', 'semgrep-ce', 'osv-scanner', 'gitleaks'].includes(jobId))
      expected.push('npm run supply:check');
    expected.push(command);
    if (JSON.stringify(job.steps.map((step) => step.uses ?? step.run)) !== JSON.stringify(expected)) fail();
    if (
      !isDeepStrictEqual(job.steps[0].with, { 'fetch-depth': 0, 'persist-credentials': false }) ||
      !isDeepStrictEqual(job.steps[1].with, { 'node-version-file': '.node-version' })
    )
      fail();
    if (
      ['contracts-m3-macos', 'semgrep-ce'].includes(jobId) &&
      !isDeepStrictEqual(job.steps[4].with, {
        'python-version': '3.12.9',
        architecture: jobId === 'contracts-m3-macos' ? 'arm64' : 'x64',
        'check-latest': false,
      })
    )
      fail();
  }
}
