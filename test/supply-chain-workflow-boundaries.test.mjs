import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isMap, parse, parseDocument } from 'yaml';

import { validateWorkflowText } from '../tools/check-supply-chain.mjs';

const ciPath = '.github/workflows/ci.yml';
const policy = JSON.parse(
  await readFile(new URL('../planning/supply-chain-policy.json', import.meta.url), 'utf8'),
);

function assertKeyOnlyName(text) {
  const document = parseDocument(text, {
    version: '1.2',
    schema: 'core',
    strict: true,
    uniqueKeys: true,
    merge: false,
    resolveKnownTags: false,
    logLevel: 'silent',
  });
  assert.deepEqual(document.errors, []);
  assert.deepEqual(document.warnings, []);
  assert.ok(isMap(document.contents));
  const pair = document.contents.items[0];
  assert.equal(pair.key.value, 'name');
  // A key-only flow pair has no value node, unlike an explicit YAML null scalar.
  assert.equal(pair.value, null);
}

test('key-only flow mapping reaches the missing workflow events rejection', () => {
  const text = '{name}';
  assertKeyOnlyName(text);
  assert.throws(() => validateWorkflowText(ciPath, text, policy), {
    name: 'Error',
    message: 'Invalid supply-chain state: .github/workflows/ci.yml must declare explicit workflow events',
  });
});

test('valid workflow permits a key-only flow pair with no value node', () => {
  const text = `{
  name,
  on: [pull_request],
  permissions: {contents: read},
  jobs: {
    verify: {
      runs-on: ubuntu-24.04,
      steps: [{run: 'echo AlphaForge'}]
    }
  }
}`;
  assertKeyOnlyName(text);
  assert.doesNotThrow(() => validateWorkflowText(ciPath, text, policy));
});

for (const [name, events] of [
  ['codeql', ['pull_request', 'push', 'workflow_dispatch']],
  ['dependency-review', ['pull_request', 'workflow_dispatch']],
]) {
  test(`public ${name} admits automatic review without privileged triggers`, async () => {
    const path = `.github/workflows/${name}.yml`;
    const workflow = parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
    for (const event of events) {
      assert.doesNotThrow(() =>
        validateWorkflowText(path, JSON.stringify({ ...workflow, on: { [event]: null } }), policy),
      );
    }
    for (const event of ['pull_request_target', 'workflow_run', 'repository_dispatch']) {
      assert.throws(
        () => validateWorkflowText(path, JSON.stringify({ ...workflow, on: { [event]: null } }), policy),
        /pull_request_target|unapproved workflow event/,
      );
    }
    assert.deepEqual(workflow.on.pull_request, { branches: ['master'] });
    if (name === 'codeql') assert.deepEqual(workflow.on.push, { branches: ['master'] });
  });
}

test('dependency review compares the PR commits and retains bounded manual execution', async () => {
  const workflow = parse(
    await readFile(new URL('../.github/workflows/dependency-review.yml', import.meta.url), 'utf8'),
  );
  const review = workflow.jobs['dependency-review'].steps.find((step) =>
    step.uses?.startsWith('actions/dependency-review-action@'),
  );
  assert.equal(review.with['base-ref'], "${{ github.event.pull_request.base.sha || 'master' }}");
  assert.equal(review.with['head-ref'], '${{ github.event.pull_request.head.sha || github.sha }}');
  assert.equal(review.with['fail-on-severity'], 'high');
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.jobs['dependency-review']['continue-on-error'], undefined);
  assert.equal(review['continue-on-error'], undefined);
});
