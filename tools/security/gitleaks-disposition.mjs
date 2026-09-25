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

// Approved by the XLayer user on 2026-09-26; only these two immutable occurrences.
const xlayerOccurrences = Object.freeze(
  [
    {
      id: 'GITLEAKS-FP-002',
      commit: 'd86cea95a6e3c478bd5d373f404d4980f2580cb2',
      commitSha256: 'fbde96c8fa98e2e3039b981151f5230e62c7c89fb1b10c6af47a350559681379',
    },
    {
      id: 'GITLEAKS-FP-003',
      commit: 'a270b36d7cde2fd87e283580d20b107249d072bf',
      commitSha256: '56d70070dcb4d0626d2506271cce5e0959ec3e5e8615fdd0792a14333cc72828',
    },
  ].map((item) =>
    Object.freeze({
      ...item,
      rule: 'generic-api-key',
      file: 'docs/xlayer/ci/AF-XLAYER-06-CI.md',
      line: 18,
      blob: '168f7009d4191ee6b803716fd9e205c11e59c843',
      blobSha256: 'e585d0ad77715fec4ff88f130c499aa172ecf5918141ea9c1487dbd648943ab2',
      lineSha256: 'bd921ec17d275de4a2e37aaf03f392f29b0f8b102c626808182626b8cfdf22e7',
      validFrom: '2026-09-25T18:07:21Z',
      expiresAt: '2026-10-20T00:00:00Z',
    }),
  ),
);

function matches(row, approved) {
  return (
    row.RuleID === approved.rule &&
    row.Commit === approved.commit &&
    row.File === approved.file &&
    row.StartLine === approved.line &&
    row.EndLine === approved.line
  );
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function readGitleaksExceptionProof(cwd, findings) {
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
  let proof = null;
  try {
    proof = {
      historicalCommit: read('cat-file', 'commit', occurrence.commit),
      blobOid: read('rev-parse', '--verify', `${occurrence.commit}:${occurrence.file}`).toString().trim(),
      blob: read('cat-file', 'blob', occurrence.blob),
      sourceCommit: read('cat-file', 'commit', occurrence.sourceCommit),
      tree: read('cat-file', 'tree', occurrence.tree),
    };
  } catch {
    // Missing legacy objects do not substantiate the legacy occurrence.
  }
  if (!Array.isArray(findings)) return proof;
  const xlayer = {};
  for (const approved of xlayerOccurrences) {
    if (!findings.some((row) => matches(row, approved))) continue;
    try {
      xlayer[approved.commit] = {
        historicalCommit: read('cat-file', 'commit', approved.commit),
        blobOid: read('rev-parse', '--verify', `${approved.commit}:${approved.file}`).toString().trim(),
        blob: read('cat-file', 'blob', approved.blob),
      };
    } catch {
      // Each requested occurrence must provide its own complete immutable proof.
    }
  }
  return { ...proof, xlayer };
}

function adjudicateLegacy(value, proof, observedAt = new Date()) {
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

export function adjudicateGitleaksHistory(value, proof, observedAt = new Date()) {
  const raw = classifyGitleaks(value);
  const result = { raw, state: raw.state, dispositions: [] };
  if (raw.state !== 'FAIL') return result;
  const approvedRows = value.report.map((row) =>
    [occurrence, ...xlayerOccurrences].find((approved) => matches(row, approved)),
  );
  // Never partially clear a scan containing an unknown or duplicate occurrence.
  if (approvedRows.some((item) => !item) || new Set(approvedRows).size !== approvedRows.length) return result;
  const dispositions = [];
  for (const approved of approvedRows) {
    if (approved === occurrence) {
      const legacy = adjudicateLegacy(
        { ...value, report: value.report.filter((row) => matches(row, occurrence)) },
        proof,
        observedAt,
      );
      if (legacy.state !== 'PASS') return { ...result, state: legacy.state, reason: legacy.reason };
      dispositions.push(...legacy.dispositions);
      continue;
    }
    const evidence = proof?.xlayer?.[approved.commit];
    const instant = observedAt instanceof Date ? observedAt.getTime() : NaN;
    if (
      !Number.isFinite(instant) ||
      instant < Date.parse(approved.validFrom) ||
      instant >= Date.parse(approved.expiresAt) ||
      !evidence ||
      evidence.blobOid !== approved.blob ||
      !Buffer.isBuffer(evidence.historicalCommit) ||
      sha256(evidence.historicalCommit) !== approved.commitSha256 ||
      !Buffer.isBuffer(evidence.blob) ||
      sha256(evidence.blob) !== approved.blobSha256 ||
      sha256(evidence.blob.toString('utf8').split('\n')[approved.line - 1] ?? '') !== approved.lineSha256
    )
      return { ...result, state: 'BLOCKED', reason: 'Approved historical proof missing, altered or expired' };
    dispositions.push({
      ...approved,
      decision: 'USER_APPROVED_FALSE_POSITIVE',
      proof: 'VERIFIED',
    });
  }
  return { ...result, state: 'PASS', dispositions };
}
