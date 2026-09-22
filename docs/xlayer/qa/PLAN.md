# X Layer QA Implementation Plan

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM (AF_Xlayer). Worker: Macbeth05. Task-ID: AF-XLAYER-05-QA.

> **For agentic workers:** use the executing-plans workflow task by task. Changes remain inside the QA-owned paths; code review can use a bounded read-only reviewer.

**Goal:** Produce reproducible offline checks and an honest exact-source acceptance matrix for AF-XLAYER-05-QA.

**Architecture:** Test existing public manifest, RPC, wallet and chain-store APIs with explicit X Layer/Robinhood inputs and isolated temporary data. Keep missing migration dependencies and genuine negative-test failures visible; production fixes remain with their owners.

**Tech Stack:** Node 24.21.0 native test runner/SQLite, npm 11.19.1, existing reviewed lockfile; no new dependency.

**Spec:** [PR #1 frozen migration and assignments](https://github.com/pdbsy/alphaforge-xlayer/tree/955f0fccd38be76ab6b7f7e9715a91eecbf3aa14/docs/xlayer).

## Global constraints

- Source baseline `18f5352070910a867b9729b031aa2e3951785e01`; branch `macbeth05/xlayer-qa`.
- New QA documents and integration tests only; no shared scripts, production files or generated PASS edits.
- Local/mock, NOT_DEPLOYED, X Layer Testnet 1952/OKB; reject 195/196 and mixed network identities.
- Preserve original work/history/authors; no merge, force push, rule changes, signing or broadcast.
- No raw machine paths or secret data in public results. Record exact commands, source SHA, test digest, counts and genuine limitations.

## Task 1 — Intake and baseline

- [x] Read exact public spec, imported toolchain/agent instructions and package scripts.
- [x] Verify fresh full clone and approved tool versions; record environmental failures.
- [x] Publish intake-only Draft PR with current verification and dependencies before substantive tests.
- [x] Run locked dependency installation in this clone and the focused inherited manifest/store/wallet regression baseline; save raw logs privately.

## Task 2 — Behavioral QA tests

Create `test/xlayer-qa-integration.test.mjs`; consume `validateDeploymentManifest`, `deploymentManifestDigest`, `JsonRpcClient`, `ChainStore`, `createOperation`/`transitionOperation`, `PreparedActionFactory`/`Eip1193Wallet`.

- [x] Construct synthetic documents for `(xlayer-testnet,1952)` and `(robinhood-chain-testnet,46630)`. Assert trusted digest/address requirements. Recompute attacker-supplied digests for invalid pairs and assert rejection even when an expectation repeats the invalid pair.
- [x] Inject local RPC transports returning 195,196,46630 instead of 1952; require `CHAIN_ID_MISMATCH` before data reads. No fetch or public RPC.
- [x] Store identical contract/owner/transaction/block identifiers on both chains with different amount strings. Assert idempotency, restart persistence, per-chain checkpoint/projection isolation and X Layer-only rollback.
- [x] Prepare X Layer actions using the public wallet API. Simulate wrong-chain and chain-change-during-simulation responses via an in-memory provider; assert zero send/sign requests.
- [x] Run `node --test test/xlayer-qa-integration.test.mjs`. Preserve actual failures; inspect causal production code and report actionable findings without weakening assertions.
- [x] Add `test/xlayer-qa-api.integration.test.mjs` to independently reproduce the evidence-route isolation gap first reported by 03; include matching and wrong-owner controls. Use Fastify injection without an HTTP listener.

## Task 3 — Evidence and review

- [x] Create `ACCEPTANCE-MATRIX.md` mapping foundation, manifest, RPC, store, wallet, contracts, CI, finality and final C/R/S checks to exact evidence or BLOCKED/NOT_RUN.
- [x] Run relevant existing regressions, scoped lint/format, typecheck, secrets/privacy, and identity checks as available. Record inherited failures separately.
- [x] Commit source C with correct Agent-ID/Task-ID; rerun the new suite at C and record raw-log SHA-256. Report evidence in `RESULTS.md` as a later documentation commit without relabelling C.
- [x] Review the new tests for false positives, no network effects and scope compliance. No production fix is permitted in this QA branch.
- [x] Independently retest manager-specified 03 source `6a2350f` with exact foundation file from `728c3df` and tests from C; record 26/26 QA and 72/72 focused PASS with composite source identity.
- [x] Publish intake ACK; report exact candidate results and blockers to the manager and request shared registration of both new files. Final documentation is prepared for the same Draft PR; final integrated acceptance stays BLOCKED.

## Task 4 — Manager integration follow-up

- [x] Independently reproduce G `0e31259`'s 21 PASS / 5 FAIL; diagnose concurrent EIP-1193 listener semantics and overly strict read counts.
- [x] Correct only the QA fixture in C2 `7f2ccf0`; retain strict no-sign/send and stale-session rejection assertions. Independently execute G plus this test file: 26/26, with 71/71 related wallet/controller regressions.
- [x] Record the distinct async controller review P2 as BLOCKED, assigned to 04; do not mistake the fixture repair for its closure.
- [ ] After manager supplies the repaired exact combined source, independently verify the async-review fix and final acceptance evidence. This remains dependent on 04/manager delivery.
