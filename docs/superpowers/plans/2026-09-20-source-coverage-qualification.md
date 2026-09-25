# Unified Source Coverage Qualification Plan

> **For agentic workers:** Use the existing executing-plans workflow inline, task by task. Do not start additional workers. This plan qualifies a measurement method; it does not declare the Phase One coverage target met.

**Goal:** Establish a reproducible, source-bound Node/Chrome coverage method that includes never-executed first-party code and the tracked prototype script, without fabricating an overall percentage.

**Architecture:** Collect raw V8 data from real Node and browser workflows into isolated directories belonging to one exact candidate. Qualify one fixed mapper against small independently understood fixtures before admitting it for repository measurement. Preserve existing Node/Forge evidence and classify unsupported inputs as NOT_MEASURED.

**Tech Stack:** Approved Node 24.21.0, npm 11.19.1, TypeScript 6.0.3, Vite 8.2.2; separately qualified isolated Chrome transport candidate playwright-core 1.62.1 (Apache-2.0, official commit `26a9e470a7b3c7822084b09fb7f13902c5f37b51`). Prior product functional tests used Codex IAB; its internal transport is not a raw-coverage interface and is not reused here. Mapper candidate: monocart-coverage-reports 2.12.12, MIT, official Git commit `970c489200daa7e32dc942a341ce2a840212ac8a`. These are qualification inputs only, not yet an admitted project-wide coverage method.

**Spec:** `docs/management/specs/PHASE1-CLOSEOUT-2026-09-20.md`; `docs/management/agents/qa/M3-05-PHASE1-ACCEPTANCE/COVERAGE-COLLECTION-METHOD.md`; `FINAL-CANDIDATE-ACCEPTANCE-PREP.md` in the same QA directory.

## Global constraints

- Remain local/mock; no credential, wallet, RPC signing, broadcast, external deployment or public service.
- Preserve the overall 90% target and the separately frozen critical authorization/accounting branch requirement. Report lines, statements, branches and functions separately; never average percentages from different populations.
- No import-only execution to inflate coverage; unexecuted files must have a real executable denominator derived by a qualified parser.
- Preserve the six existing source/runtime classes. Solidity remains separately measured. Declaration-only files are not executable code. Mixed Node driver/browser callback execution is not double counted.
- Do not exclude the tracked inline script in `apps/web/prototype/AlphaForge_v3_EN.html` merely because the served `user-ui.js` is generated.
- Production source-map policy and public assets stay unchanged during qualification. All candidate tools, maps, fixtures and raw reports use ignored `.checks/source-coverage-qualification/` in the manager worktree, with independent dependencies/data.
- Do not execute new package code before exact transitive versions, package artifacts, licenses and advisories are reviewed. Do not run upstream build/publish/install lifecycle scripts. No floating executable or global installation.
- A tool qualification failure is not permission to relax the denominator, modify counters, add ignore comments or claim PASS.

## Task 1: Freeze the isolated mapper input

**Files:** Create ignored `.checks/source-coverage-qualification/registry.json`, `candidate-package.json`, `candidate-lock.json`, `QUALIFICATION.md`. Only after review, add a versioned qualification record under `docs/management/phase1/` and a dedicated exact tool manifest under `planning/`; keep the root product dependency graph unchanged.

**Interface:** The admission record must contain the top-level name/version/source commit, every resolved dependency version, registry URL, artifact integrity and SHA-256, license observation, scripts disposition, Node/npm/platform versions and advisory result. Its state is NOT_ADMITTED until all fields have real evidence.

- [x] Read official source package metadata and MIT license at the exact candidate Git commit. Confirm npm `gitHead` agrees with that commit.
- [x] Read the exact official registry endpoint: `https://registry.npmjs.org/monocart-coverage-reports/2.12.12`.
- [ ] Save fresh exact metadata using this read-only retrieval, which does not execute package code:

```python
import json, urllib.request
from pathlib import Path
root = Path('.checks/source-coverage-qualification')
root.mkdir(parents=True, exist_ok=True)
url = 'https://registry.npmjs.org/monocart-coverage-reports/2.12.12'
with urllib.request.urlopen(url, timeout=30) as response:
    record = json.load(response)
assert record['name'] == 'monocart-coverage-reports'
assert record['version'] == '2.12.12'
assert record['gitHead'] == '970c489200daa7e32dc942a341ce2a840212ac8a'
assert record['license'] == 'MIT'
assert record['dist']['integrity'] == 'sha512-d9FdUr2dn58Crweon0IE0zVi8r/i4vLvfvb2G7eL5vL5LfrxCB2X6F6qzuiwV6RioA4zbAI//7CYi6LjCvN3zA=='
(root / 'registry.json').write_text(json.dumps(record, indent=2) + '\n')
```

- [ ] Resolve metadata only in the ignored isolated qualification directory with an exact top-level manifest and scripts disabled. Review the resulting complete dependency graph before any installation. Store that resolved graph as evidence; do not introduce another product package manager or product lockfile.
- [ ] Verify every tarball against its exact official integrity value, record SHA-256, inspect package scripts/licenses, and check the complete candidate graph for advisories. A missing license/source/integrity, unsupported engine, advisory requiring unresolved action, or changed artifact blocks admission.
- [ ] Install only the reviewed locked graph in that isolated directory with lifecycle scripts disabled. Record the actual loaded package version and byte hashes. This admits a qualification probe, not final production use.

## Task 2: Prove runtime union and the unexecuted denominator

**Files:** Create qualification fixtures `shared.mjs`, `unexecuted.mjs`, `types-only.ts`, and raw Node/Chrome directories under the ignored qualification root. Add first-party regression tests only when implementing the eventual collector; do not add tests that merely mirror configuration text.

**Interface:** Each raw input has `{candidateCommit, candidateTree, sourceSha256, runtimeVersion, command, exitCode}`. Reject differing candidate/source identities before merging. The result records runtime-specific observations, the union and the unexecuted population separately.

- [ ] Use these exact fixtures:

```js
// shared.mjs
export function classify(value) {
  if (value > 0) return 'positive';
  return 'other';
}
export function neverCalled() {
  return 'unused';
}
```

```js
// unexecuted.mjs: do not import or evaluate this file
export function unexecuted(value) {
  return value ? 'left' : 'right';
}
```

```ts
// types-only.ts: TypeScript emits no behavioral statements
export interface Identity { value: string }
export type OptionalIdentity = Identity | null;
```

- [ ] Run an actual Node fixture program importing `shared.mjs` and asserting `classify(1) === 'positive'`, with a fresh NODE_V8_COVERAGE directory. Record normal exit and raw artifact hashes.
- [ ] Use an isolated, empty-profile Chrome test page served only on loopback; import the same `shared.mjs` bytes and assert `classify(0) === 'other'`. Start precise JS coverage before navigation and retain raw function/range data and executed source. Record exact browser and transport versions; do not use the user's browser profile.
- [ ] Feed only validated first-party entries into the candidate mapper. Check that the two runtime observations cover the complementary `classify` paths, `neverCalled` remains uncalled, and `unexecuted.mjs` remains explicitly unexecuted with nonzero executable function/branch denominators. The type-only file must not add behavioral counters.
- [ ] Negative probes: a changed source hash, omitted unexecuted file, absent browser input, malformed range, conflicting duplicate source, and mismatched candidate must be rejected or explicitly NOT_MEASURED. They must never silently shrink the denominator or produce overall PASS.
- [ ] Independently inspect fixture source and raw ranges before recording qualification PASS. Preserve the raw reports even if the mapper has an unexpected branch convention.

## Task 3: Prove TypeScript, bundle and prototype mappings

**Files:** Create ignored qualification build/maps and mapping evidence; inspect the existing `tools/import-user-ui.mjs` and `apps/web/vite.config.ts`. Do not edit production configuration as a shortcut.

**Interface:** A mapping binds exact generated bytes to exact tracked source bytes and source locations. Source identity includes the tracked path and SHA-256; source-map URLs must resolve only inside the isolated build/source inventory.

- [ ] Build the actual selected source with Vite's programmatic `build` API, overriding only the output directory and `build.sourcemap: 'hidden'` in memory. Keep ordinary production output separate. Compare executable JS/CSS bytes against the ordinary build; unexpected differences require investigation before coverage is accepted.
- [ ] Qualify a TypeScript fixture with real executable branches and type-only lines, and a minified bundle containing that fixture. Check that measured source branches correspond to actual fixture branches and that type annotations/generated wrappers do not create product denominator entries.
- [ ] Derive the prototype script mapping from the exact `<script>` extraction and the actual `normalizeStyles` substitutions. Verify generated bytes equal the current served `user-ui.js`. Test locations before, inside and after every substitution, plus the first and last executable script lines. Missing or ambiguous mappings remain NOT_MEASURED.
- [ ] Keep renderer callbacks embedded in Node browser-verifier files identifiable as renderer code. Confirm that merging observations counts each mapped source location once and does not count an unexecuted callback merely because its Node function was registered.
- [ ] Reject maps escaping the source inventory, altered sourcesContent, unknown generated assets, absent source mappings and duplicate mappings with inconsistent bytes. Record each negative probe's real result.

## Task 4: Admit or reject the method, then collect a candidate

**Files:** Publish the qualification report and precise approved tool manifest only after the preceding evidence exists. The subsequent collector implementation requires its own tests for candidate binding, complete inventory, mapping rejection and missing-input behavior, and a fresh C/R/S cycle.

- [ ] Have Macbeth05 independently inspect the fixture proofs and source inventory; implementation self-review alone does not establish independent acceptance.
- [ ] On any failed mapping or denominator probe, record NOT_ADMITTED with the concrete failed case and keep combined coverage NOT_MEASURED. Do not replace that result with loaded-file coverage.
- [ ] Once admitted, run the real complete Node checks, supported CLI/server lifecycles and six-page product/Vault browser journeys on one explicitly frozen candidate. Keep every command's real exit status and bind each raw artifact to that candidate.
- [ ] Reconcile all first-party executable sources, including never-run files and prototype script, before reporting combined metrics. Preserve the independent critical branch inventory and its proof rather than treating a module average as critical-path acceptance.
- [ ] Only actual candidate measurements can close the overall target. If measured coverage is below target, send precise uncovered behaviors to the responsible existing worker; do not alter scope or counters to reach a number.

## Primary references and current limit

- Official fixed source: https://github.com/cenfun/monocart-coverage-reports/tree/970c489200daa7e32dc942a341ce2a840212ac8a
- Official package metadata: https://registry.npmjs.org/monocart-coverage-reports/2.12.12
- Mapper capability documentation: https://github.com/cenfun/monocart-coverage-reports
- Browser coverage collection API: https://playwright.dev/docs/api/class-coverage

The package documentation supports selecting this candidate for evaluation. It is not evidence that AlphaForge's TypeScript/prototype/mixed-runtime mappings already work. After this plan, 20 exact packages were installed only under the ignored isolated qualification directory; artifact and initial fixture evidence is recorded below. Product dependencies and production maps remain unchanged.

## Execution checkpoint: artifact and small runtime-union probe

At clean manager source `9be28063e40700179a222816a9de200137ce79a9`, the isolated exact lock resolved 20 packages. Each tarball matched its official registry SHA-512; all license texts and source repositories were identified; lifecycle scripts were disabled. All 470 installed regular files matched the reviewed archive bytes. The exact graph's npm audit reported zero advisories at collection time. These observations are not a claim that a dependency cannot contain undisclosed problems.

A real Node 24.21.0 fixture and a separately launched empty-profile Chrome 153.0.8010.50 fixture executed opposite `classify` branches. The fixed mapper reported one of two branches per runtime and two of two in the union, with the unused function still uncovered. The never-imported file retained three uncovered lines, one uncovered function and two uncovered branches. These are tiny fixture measurements only; no project-wide percentage follows. The type-only, TypeScript/bundle/prototype mapping, mixed-callback and negative-input probes remain incomplete.

Evidence is in the manager worktree's ignored `.checks/source-coverage-qualification/`: exact registry records, lockfile, tarballs, `artifact-review.json`, `audit.json`, raw Node/Chrome output, fixture driver and `union-result.json`. No user browser profile, wallet, RPC, external service or production source-map setting was used. Overall project coverage remains NOT_MEASURED; method admission remains pending.
