import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  adjudicateGitleaksHistory,
  readGitleaksExceptionProof,
} from '../tools/security/gitleaks-disposition.mjs';

const commits = ['d86cea95a6e3c478bd5d373f404d4980f2580cb2', 'a270b36d7cde2fd87e283580d20b107249d072bf'];
const rows = commits.map((Commit) => ({
  RuleID: 'generic-api-key',
  File: 'docs/xlayer/ci/AF-XLAYER-06-CI.md',
  StartLine: 18,
  EndLine: 18,
  Commit,
  Secret: 'REDACTED',
  Match: 'REDACTED',
  Email: 'not-for-public-output@example.test',
}));
const legacy = {
  RuleID: 'generic-api-key',
  File: 'docs/product/PHASE1-PRODUCT-WALLET-FLOWS.md',
  StartLine: 12,
  EndLine: 12,
  Commit: '69330dfffeceb86cf793fa0163ff4f72a466f3eb',
};
const time = new Date('2026-09-26T12:00:00Z');
const proof = (report) => readGitleaksExceptionProof(process.cwd(), report);
const adjudicate = (report, evidence = proof(report), observedAt = time) =>
  adjudicateGitleaksHistory({ status: 10, report }, evidence, observedAt);

test('only the exact approved historical occurrences qualify together or individually, retaining every raw finding', () => {
  for (const [report, ids] of [
    [[rows[0]], ['GITLEAKS-FP-002']],
    [[rows[1]], ['GITLEAKS-FP-003']],
    [rows, ['GITLEAKS-FP-002', 'GITLEAKS-FP-003']],
    [
      [legacy, ...rows],
      ['GITLEAKS-FP-001', 'GITLEAKS-FP-002', 'GITLEAKS-FP-003'],
    ],
  ]) {
    const before = JSON.stringify(report);
    const result = adjudicate(report);
    assert.equal(result.state, 'PASS');
    assert.equal(result.raw.state, 'FAIL');
    assert.equal(result.raw.findings.length, report.length);
    assert.deepEqual(
      result.dispositions.map((item) => item.id),
      ids,
    );
    assert.ok(result.dispositions.every((item) => item.proof === 'VERIFIED'));
    assert.equal(JSON.stringify(report), before);
    assert.ok(!JSON.stringify(result).includes('REDACTED'));
    assert.ok(!JSON.stringify(result).includes('not-for-public-output'));
  }
});

test('changed rule, commit, file or line, duplicate and additional findings still fail', () => {
  for (const patch of [
    { RuleID: 'github-pat' },
    { File: 'another.md' },
    { Commit: 'a'.repeat(40) },
    { StartLine: 19 },
    { EndLine: 19 },
    { EndLine: undefined },
  ]) {
    assert.equal(adjudicate([rows[0], { ...rows[1], ...patch }]).state, 'FAIL');
  }
  for (const report of [
    [...rows, rows[0]],
    [...rows, { ...legacy, File: 'another.md' }],
  ]) {
    const result = adjudicate(report);
    assert.equal(result.state, 'FAIL');
    assert.deepEqual(result.dispositions, []);
    assert.equal(result.raw.findings.length, report.length);
  }
});

test('missing or altered Git objects cannot justify either new disposition', (t) => {
  const empty = mkdtempSync(join(tmpdir(), 'af-xlayer-gitleaks-'));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  assert.equal(adjudicate(rows, readGitleaksExceptionProof(empty, rows)).state, 'BLOCKED');
  for (const row of rows) {
    const evidence = proof([row]);
    assert.ok(evidence.xlayer?.[row.Commit]);
    for (const field of ['historicalCommit', 'blobOid', 'blob']) {
      for (const value of [undefined, field === 'blobOid' ? 'a'.repeat(40) : Buffer.from('altered')]) {
        const altered = {
          ...evidence,
          xlayer: { ...evidence.xlayer, [row.Commit]: { ...evidence.xlayer[row.Commit], [field]: value } },
        };
        assert.equal(adjudicate([row], altered).state, 'BLOCKED', field);
      }
    }
    assert.equal(adjudicate([row], { ...evidence, xlayer: {} }).state, 'BLOCKED');
  }
});

test('the new exceptions expire and cannot hide scanner failures or malformed reports', () => {
  for (const observedAt of [
    new Date('2026-09-25T18:07:20Z'),
    new Date('2026-10-20T00:00:00Z'),
    new Date('invalid'),
  ]) {
    assert.equal(adjudicate(rows, proof(rows), observedAt).state, 'BLOCKED');
  }
  for (const patch of [{ status: 0 }, { status: 1 }, { signal: 'SIGTERM' }, { report: null }]) {
    assert.equal(
      adjudicateGitleaksHistory({ status: 10, report: rows, ...patch }, proof(rows), time).state,
      'BLOCKED',
    );
  }
  assert.equal(adjudicateGitleaksHistory({ status: 0, report: [] }, null, time).state, 'PASS');
});

test('the approved local date resolves to an already active UTC instant', () => {
  assert.equal(adjudicate(rows, proof(rows), new Date('2026-09-25T18:07:21Z')).state, 'PASS');
});
