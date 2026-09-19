import { parse } from 'yaml';
import { isDeepStrictEqual } from 'node:util';

const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const node = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';
const python = 'actions/setup-python@e797f83bcb11b83ae66e0230d6156d7c80228e7c';
export function validateCIGateWorkflows(text) {
  const workflow = parse(text);
  for (const [jobId, runner, command] of [
    ['contracts-m3-macos', 'macos-15', 'node tools/ci/verify-contracts.mjs'],
    ['source-policy-js', 'ubuntu-24.04', 'node tools/ci/check-source-policy.mjs'],
    ['dependency-delta-audit', 'ubuntu-24.04', 'node tools/ci/check-dependency-delta.mjs'],
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
    if (jobId === 'contracts-m3-macos') expected.push(python);
    else expected.push('npm ci --ignore-scripts');
    if (jobId === 'dependency-delta-audit') expected.push('npm run supply:check');
    expected.push(command);
    if (JSON.stringify(job.steps.map((step) => step.uses ?? step.run)) !== JSON.stringify(expected)) fail();
    if (
      !isDeepStrictEqual(job.steps[0].with, { 'fetch-depth': 0, 'persist-credentials': false }) ||
      !isDeepStrictEqual(job.steps[1].with, { 'node-version-file': '.node-version' })
    )
      fail();
    if (
      jobId === 'contracts-m3-macos' &&
      !isDeepStrictEqual(job.steps[4].with, {
        'python-version': '3.12.9',
        architecture: 'arm64',
        'check-latest': false,
      })
    )
      fail();
  }
}
