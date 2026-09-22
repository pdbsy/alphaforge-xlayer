# X Layer integration identity implementation plan

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM. Worker: Macbeth06. Task: AF-XLAYER-06-CI.

**Goal:** validate the exact manager aggregation without relaxing existing worker or historical integration rules, and invoke the X Layer contract entrypoint in CI.

**Architecture:** a separate `tools/xlayer-integration-identity.mjs` reads the committed manager manifest at the tested head. `tools/check-agent-identity.mjs` dispatches only the exact registered X Layer branch; merge queue introduction remains blocked. The checker validates full fixed-base history, pinned source heads belonging to their canonical branch history, exact allowed worker/task/branch/author pairs, and one-to-one imported commit mappings. Commit messages and authors must match; text patches compare exact content while ignoring Git object-index metadata and hunk line offsets caused by earlier cherry-picks. Binary patches remain exact. The manager owns the manifest and root test registration.

**Tech stack:** existing Node 24.21.0, npm 11.19.1, Git, Node test runner; no dependencies.

**Spec:** XLayerPM's AF-XLAYER-06-CI-INTEGRATION assignment on 2026-09-22. Fixed base `18f5352070910a867b9729b031aa2e3951785e01`; branch `codex/xlayer-bootstrap`; manager task `AF-XLAYER-MIGRATION`; author `pdbsy <pdbsy@users.noreply.github.com>`.

## Task 1: exact aggregation checker

- [x] Add `test/xlayer-integration-identity.test.mjs` using independent real Git fixtures rooted in the imported base. Assert accepted preserved cherry-picks, rejected patch/message/author substitution, source ref/head drift, omitted/duplicate/foreign source mappings, wrong base/repository/branch/task, unknown legacy commits, unregistered manager additions, forged PR contexts, and merge-queue rejection.
- [x] Observe RED before implementation: `node --test test/xlayer-integration-identity.test.mjs` must reject the valid aggregation with the inherited generic worker-prefix error.
- [x] Implement `verifyXLayerIntegration(root, { branch, head, pull })` with fixed constants, bounded committed manifest, full history and exact identity checks. Keep the two historical profiles unchanged. Legacy manager exceptions are fixed reviewed SHA values, never arbitrary manifest grants.
- [x] Add the minimal exact-branch dispatch and X Layer merge-queue rejection to the existing checker, preserving ordinary worker validation.
- [x] Run new tests plus agent integration/lifecycle/bypass/security regressions, typecheck/lint/format. Supply the manifest schema and new test filename to the manager for root registration.

## Task 2: contract CI entry

- [x] Change the expected command in `test/ci-gates.test.mjs` to `contracts/script/check-xlayer-contracts.sh` and observe RED.
- [x] Update only the contract stage command in `tools/ci/verify-contracts.mjs`; keep host pins, workflow jobs, permissions, stop-on-failure and ABI semantics.
- [x] Verify the committed Macbeth02 script first executes `check-m3-vault.sh`, then the X Layer validator. Do not copy manager or worker implementation into this branch.
- [ ] Publish the final worker receipt on the existing PR; report manager integration dependencies separately from actual hosted execution.

No source-manifest fabrication, generated PASS edit, scanner exception, rule relaxation, deployment or history rewrite is authorized. Self-checks are not independent approval.

## Validation checkpoint

Implementation source: `46efeeaa6a4b1394432b9e00f38de020a5826377`. The new suite and existing identity/security/CI regression suites passed 86 tests. The root suite passed 596 tests. The only authorized artifact-provenance row adaptation is recorded separately after implementation. See `INTEGRATION-CHECKER-RECEIPT.md` for execution boundaries.
