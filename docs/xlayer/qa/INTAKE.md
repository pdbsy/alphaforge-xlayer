# Macbeth05 X Layer QA intake

Agent: Macbeth05. Task-ID: AF-XLAYER-05-QA. Date: 2026-09-22.

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM (AF_Xlayer).

This assignment does not replace, pause or relabel the separate Robinhood track. Checkouts, dependencies, data, results and blockers remain separate by track.

## Authority and exact source

The user confirmed the new repository and continuing this task. Public assignment: [migration PR #1](https://github.com/pdbsy/alphaforge-xlayer/pull/1), read at head `955f0fccd38be76ab6b7f7e9715a91eecbf3aa14`; its `docs/xlayer/MIGRATION.md` and `ASSIGNMENTS.md` define this scope.

- Repository: `pdbsy/alphaforge-xlayer`; default branch: `master`.
- Imported base and initial QA HEAD: `18f5352070910a867b9729b031aa2e3951785e01`.
- Base tree: `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba`.
- Worker branch: `macbeth05/xlayer-qa`.
- Fresh full independent clone; shallow status false; startup tracked/untracked status clean. No shared writable dependencies or SQLite data. Local operational paths are retained privately.
- Original AlphaForge work remains preserved in its original checkout. Its two latest bounded review reports were completed and returned to Macbeth01 before this task; no source history or ongoing assignment was revoked.
- Versions observed: fnm 1.39.0, Node 24.21.0, npm 11.19.1, Git 2.50.1, macOS arm64.
- Existing public dependencies at intake: PR #1 foundation/assignment and PR #2 contracts. No Macbeth05 PR existed at intake; this task's Draft PR is the public receipt.

## Goal and ownership

Deliver an exact-candidate engineering acceptance matrix and executable offline negative/integration tests for X Layer identity and cross-chain state separation. Only new `docs/xlayer/qa/` documents and new X Layer integration tests are owned here.

Expected files: this intake, `PLAN.md`, `ACCEPTANCE-MATRIX.md`, `RESULTS.md`, `COMBINED-RETEST.md`, `FINAL-ACCEPTANCE.md`, `test/xlayer-qa-integration.test.mjs` and `test/xlayer-qa-api.integration.test.mjs`. Shared npm/CI registration is proposed to the manager, not edited by QA.

Protected: production contracts/backend/UI, `packages/xlayer-chain/`, root scripts/lock, shared planning/ADR, generated C/R/S records and historical PASS evidence. Preserve authors and every existing gate. No manager/worker commit cherry-picks into this worker branch.

## Dependencies and acceptance

- Foundation API remains manager-owned; adapter trust-pair/runtime changes belong to Macbeth03; UI/session defaults to Macbeth04; repository admission/CI to Macbeth06; contract domain evidence to Macbeth02.
- Pin every executed result to an actual source SHA and the new test bytes. Baseline compatibility tests are not X Layer deployment or integrated-runtime acceptance.
- Exercise invalid chain/environment pairs and same-address/hash isolation for events, checkpoints, projections and operations; retain Robinhood controls.
- Local/mock only, target X Layer Testnet 1952 / OKB. No actual deployment, credentials, wallet signing, broadcast, RPC access or mainnet. Fixture identities are synthetic and never deployment addresses.
- Missing candidate inputs stay BLOCKED/NOT_RUN. Reproduced defects stay FAIL and go to their owner through the manager; QA does not fix production files outside ownership.
- Finish at Draft / READY FOR REVIEW of the QA deliverable, not approval, merge or final product acceptance.

## Startup verification

PASSED: exact base/tree, full history, clean clone, branch isolation; environment inputs/tools/platform/history/workspace/index/identity/files/isolation/overrides/npm-config/local-mock/manager checks.

FAILED: the inherited environment repository check still targets the upstream repository; ports check also returned FAIL (`ports-lsof` exit 1). Overall environment exit 1, `eligibleForEvidence=false`. This is not formal environment admission. Initial sandboxed fnm activation was refused; normal approval allowed the approved runtime activation, without modifying shell profiles.

NOT_RUN at intake: new QA tests, complete engineering checks, browser workflows, X Layer RPC/contract deployment, hosted validation on this worker head, independent external approval. Dependency installation and focused offline diagnosis do not upgrade the admission result.

Risks: the imported manifest types pin Robinhood while runtime comparisons may trust the supplied expectation; same identifiers across chains must never let one chain's reorg or recovery modify the other. Finality defaults 3/128 are inherited assumptions, not established X Layer guarantees.
