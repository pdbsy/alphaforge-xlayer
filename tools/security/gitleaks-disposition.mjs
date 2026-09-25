import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { classifyGitleaks } from './results.mjs';
import { cleanEnvironment } from '../ci/context.mjs';

// GITLEAKS-FP-001: one user-approved immutable provenance occurrence, not a detector allowlist.
const occurrence = Object.freeze({
  rule: 'generic-api-key',
  commit: '69330dfffeceb86cf793fa0163ff4f72a466f3eb',
  file: 'docs/product/PHASE1-PRODUCT-WALLET-FLOWS.md',
  line: 12,
  blob: 'b118b774535825efd5d7afe8931e134827f4f974',
  sourceCommit: '28ff3d4b5c6e70ff0c6ea1b11ad0fea4283887fd',
  tree: '7f4abc27757e099c1b5b26a66509395015bdb7b7',
  validFrom: '2026-09-20T00:00:00Z',
  expiresAt: '2026-10-20T00:00:00Z',
});
const objectDigests = Object.freeze({
  historicalCommit: '7758538a852a6a936b6bb4c67fa429afb1a2f68a4985dee02c509a00b596db65',
  blob: 'd015e673f683bd9cc24608f1e0981109cb66e804729220541be0937997daf282',
  sourceCommit: 'a78de8e1ff75cad43b30a982eea4463bd115211432486a4f7d889851e716f6e9',
  tree: '41011151ed23434cd2f3743951b414ab65705f36b5e45082de27afcc055298a7',
});

export function readGitleaksExceptionProof(cwd) {
  const read = (...args) =>
    execFileSync('git', ['--no-replace-objects', ...args], {
      cwd,
      env: {
        ...cleanEnvironment(),
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_TERMINAL_PROMPT: '0',
      },
      timeout: 15000,
      maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  try {
    return {
      historicalCommit: read('cat-file', 'commit', occurrence.commit),
      blobOid: read('rev-parse', '--verify', `${occurrence.commit}:${occurrence.file}`).toString().trim(),
      blob: read('cat-file', 'blob', occurrence.blob),
      sourceCommit: read('cat-file', 'commit', occurrence.sourceCommit),
      tree: read('cat-file', 'tree', occurrence.tree),
    };
  } catch {
    return null;
  }
}

export function adjudicateGitleaksHistory(value, proof, observedAt = new Date()) {
  const raw = classifyGitleaks(value);
  const result = { raw, state: raw.state, dispositions: [] };
  if (raw.state !== 'FAIL' || raw.findings.length !== 1) return result;
  const row = value.report[0];
  if (
    row.RuleID !== occurrence.rule ||
    row.Commit !== occurrence.commit ||
    row.File !== occurrence.file ||
    row.StartLine !== occurrence.line ||
    row.EndLine !== occurrence.line
  )
    return result;
  const instant = observedAt instanceof Date ? observedAt.getTime() : NaN;
  if (
    !Number.isFinite(instant) ||
    instant < Date.parse(occurrence.validFrom) ||
    instant >= Date.parse(occurrence.expiresAt) ||
    !proof ||
    proof.blobOid !== occurrence.blob ||
    Object.entries(objectDigests).some(
      ([key, digest]) =>
        !Buffer.isBuffer(proof[key]) || createHash('sha256').update(proof[key]).digest('hex') !== digest,
    )
  )
    return { ...result, state: 'BLOCKED', reason: 'Approved historical proof missing, altered or expired' };
  const lines = proof.blob.toString('utf8').split('\n');
  if (
    lines[10] !== '- Chain/API handoff consumed read-only: `' + occurrence.sourceCommit + '`' ||
    lines[11] !== '- Chain/API handoff tree: `' + occurrence.tree + '`' ||
    proof.sourceCommit.toString('utf8').split('\n')[0] !== `tree ${occurrence.tree}`
  )
    return { ...result, state: 'BLOCKED', reason: 'Approved historical source binding mismatch' };
  return {
    ...result,
    state: 'PASS',
    dispositions: [
      {
        id: 'GITLEAKS-FP-001',
        decision: 'USER_APPROVED_FALSE_POSITIVE',
        proof: 'VERIFIED',
        ...occurrence,
        objectSha256: objectDigests,
      },
    ],
  };
}
