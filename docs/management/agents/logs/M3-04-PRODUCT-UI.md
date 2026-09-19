# Macbeth04 M3 Product UI Worker Log

## Current status

- Current task: M3-04-PRODUCT-UI
- Status: IN_PROGRESS — CHAIN EVIDENCE INTEGRATED; C/R/S REFRESH PENDING
- Branch: macbeth04/M3-product-ui
- Last known source commit: a49e648dbea9fd1ac451bf1352820625b3fa7e0e
- Blocker: Real Vault/Pass reads and writes await Macbeth02 ABI, authorization semantics and deployed Testnet manifest.
- Last activity: 2026-09-19

## Activity log

### 2026-09-14T20:18:00+08:00 — Startup and capability audit

- Task: M3-04-PRODUCT-UI
- Status: PASSED
- Branch: macbeth04/M3-product-ui
- Commit: 7ecba357d5a19f387e86f578822af04a6261fed2
- What changed: Created the user-required isolated implementation branch from the fixed baseline and classified public capabilities.
- Why: Prevent unmerged management or worker changes from entering the product branch and keep unavailable chain behavior explicit.
- Files changed: None.
- Tests run: `npm test` baseline with approved Node/npm, including an elevated rerun for loopback tests.
- Tests passed: 378.
- Tests failed: 0 after the loopback-capable rerun.
- Known limitations: Environment doctor reports local port 4181 already occupied by the separate management Dashboard; no process was stopped.
- Dependencies: Macbeth01 task registration; Macbeth02 contract interface; Macbeth03 chain adapter/interface.
- Open questions: Exact Task-ID and canonical strategy mapping were pending at this point.
- Decision requests: Sent both questions to Macbeth01.
- Next step: Continue non-blocking presentation design and tests.

### 2026-09-14T20:47:00+08:00 — Manager registration and strategy decision

- Task: M3-04-PRODUCT-UI
- Status: PASSED
- Branch: macbeth04/M3-product-ui
- Commit: 7ecba357d5a19f387e86f578822af04a6261fed2
- What changed: Fetched PR #15 and verified full head `84fdc15fdfcc0dd6db2f6fe2c9a10df53cc0e358`, task registration and baseline. Recorded `trend` as the first M3 product strategy; retained `core-flow-demo` and `satellite-flow-demo` as isolated local identities.
- Why: Bind commits and product identity to the manager's immutable registration without copying unmerged management changes.
- Files changed: Implementation plan updated locally.
- Tests run: Repository/branch ancestry and registration content checks.
- Tests passed: All startup checks.
- Tests failed: 0.
- Known limitations: Solidity/on-chain ID encoding and deployment mapping remain owned by Macbeth02/03.
- Dependencies: Macbeth01 decision resolved the frontend ID; 02/03 interfaces remain pending.
- Open questions: None for the first product strategy.
- Decision requests: Resolved by Macbeth01.
- Next step: Implement the presentation-only product shell.

### 2026-09-14T21:12:58+08:00 — Canonical product shell and browser acceptance

- Task: M3-04-PRODUCT-UI
- Status: PASSED_WITH_BLOCKED_DEPENDENCIES
- Branch: macbeth04/M3-product-ui
- Commit: Source `a29ce9da10ed1c8e853595da7164ae225ebddff4`; provenance `971e625a9b8a869affd06689d931b730ff566987`.
- What changed: Added a pure M3 presentation renderer; canonical strategy, provenance, wallet/network/transaction status, explorer evidence and disabled action UI; integrated it through account/trade page extension points.
- Why: Deliver a truthful UI boundary now while leaving wallet, RPC and transaction truth with Macbeth03.
- Files changed: `apps/web/src/m3-product-shell.ts`, `apps/web/src/product-ui.ts`, `test/m3-product-ui.test.ts`, `package.json`, plan and provenance evidence.
- Tests run: Focused TDD tests; typecheck; lint; format check; UI importer/build tests; production web build; local browser checks for `trend`, `core-flow-demo` and account routes; browser console inspection; full `npm test`.
- Tests passed: 10/10 new unit/integration tests, 13/13 targeted UI/import/build tests, typecheck, lint, format, web build, manual browser route checks, migration provenance 3/3, and 388/388 tests after refreshing provenance.
- Tests failed: The first full run found only migration provenance hash drift for modified `product-ui.ts`; the recorded hash was updated and the full test stage passed on rerun. The umbrella check then stopped at `management:check` because its commit-bound report correctly rejects a dirty source tree.
- Known limitations: No real wallet connection, RPC state, contract read/write, receipt, readback/indexer projection or deployed strategy mapping exists on the current public baseline.
- Dependencies: Reviewed Macbeth02 ABI/deployment/authorization capability and Macbeth03 shared UI projection.
- Open questions: Macbeth02 partial-withdrawal policy remains outside this UI shell; unknown operations stay disabled.
- Decision requests: None outstanding for this phase.
- Next step: Run final complete checks, commit with required identity metadata, publish a Draft PR and request independent review.

### 2026-09-19 — Macbeth03 normalized chain evidence integration

- Task: M3-04-PRODUCT-UI
- Status: PASSED_WITH_BLOCKED_ASSET_CAPABILITIES
- Branch: macbeth04/M3-product-ui
- Source: Macbeth03 immutable interface commit `b640489fccf704394eaf2721424652f167675148`, Draft PR #17.
- What changed: Preserved Macbeth03's original adapter history and added a pure UI mapping from `ProductOperationEvidence` to the existing transaction presentation states.
- Why: Ensure the product shell can show receipt success, canonical reconciliation and product readback as separate milestones without owning chain truth or creating another adapter.
- Files changed by Macbeth04: `apps/web/src/m3-product-shell.ts`, `test/m3-product-ui.test.ts`, this log and the implementation plan. Macbeth03 files retain their original commits and authorship.
- Tests run: 37 focused lifecycle/sync/wallet/UI tests; typecheck; lint; formatting; and `npm run check` with approved Node/npm.
- Tests passed: 37/37 focused tests and 435/435 complete repository tests. The full loopback-capable run also passed secret, privacy, network, governance, supply-chain, threat, planning and Forum gates.
- Tests failed: The first sandboxed full run had one HTTP timeout and three `127.0.0.1` `EPERM` failures; the identical elevated rerun passed all 435 tests. The run then stopped at `management:check` with `RECORDED_GIT_GRAPH_MISMATCH`, which is the expected signal to regenerate C/R/S after a source graph change.
- Truth boundary: `MINED` plus successful receipt may render `CHAIN_CONFIRMED`; strict backend `CONFIRMED` without the current UI projection renders `INDEXING`; only `productReady=true` renders `READY`. Reorg, reconciliation failure, reverted receipt and stale projection render `FAILED`.
- Known limitations: No Vault/Pass owner-only ABI, deployed contract address or enabled asset action is available. All asset actions remain disabled and labeled `NOT IMPLEMENTED`.
- Dependencies: Macbeth03 interface resolved; Macbeth02 Vault/Pass capability and deployment remain BLOCKED/NOT_RUN.
- Next step: Commit this source record, generate manifest R and snapshot S through repository commands, verify the exact final head, push the Draft stacked branch and update PR #16.
