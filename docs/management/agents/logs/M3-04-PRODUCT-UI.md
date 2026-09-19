# Macbeth04 M3 Product UI Worker Log

## Current status

- Current task: M3-04-PRODUCT-UI
- Status: READY_FOR_CLOSEOUT_INTEGRATION_WITH_STACKED_PR_ADMISSION_BLOCKER
- Branch: macbeth04/M3-product-ui
- Evidence: Latest exact source C, manifest R, snapshot S and candidate SHAs are maintained in Draft PR #16 to avoid a self-referential commit hash in this source file.
- Blocker: Real Vault/Pass reads and writes await the reviewed Macbeth02 ABI/deployment and Macbeth03 integration. PR #16 itself remains blocked by stacked-PR admission; Macbeth01 owns the authorized `master`-based closeout integration candidate.
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
- Historical intermediate failures, resolved: The first sandboxed full run had one HTTP timeout and three `127.0.0.1` `EPERM` failures; the identical elevated rerun passed all 435 tests. The first post-merge run then stopped at `management:check` with `RECORDED_GIT_GRAPH_MISMATCH`; C/R/S regeneration resolved that local exact-head gate.
- Truth boundary: `MINED` plus successful receipt may render `CHAIN_CONFIRMED`; strict backend `CONFIRMED` without the current UI projection renders `INDEXING`; only `productReady=true` renders `READY`. Reorg, reconciliation failure, reverted receipt and stale projection render `FAILED`.
- Known limitations: No Vault/Pass owner-only ABI, deployed contract address or enabled asset action is available. All asset actions remain disabled and labeled `NOT IMPLEMENTED`.
- Dependencies: Macbeth03 interface resolved; Macbeth02 Vault/Pass capability and deployment remain BLOCKED/NOT_RUN.
- Next step: After PR #17 reaches `master`, retarget Draft PR #16 to `master` and rerun hosted checks. No merge is authorized.

### 2026-09-19 — Stacked base evidence alignment

- Task: M3-04-PRODUCT-UI
- Status: PASSED_WITH_HOSTED_ADMISSION_BLOCKER
- Upstream base head: `9f87275dc6c328ff0be10c7238a966109372856d` from Draft PR #17.
- Interface source: Unchanged at `b640489fccf704394eaf2721424652f167675148`; the two later upstream commits contain only generated management evidence.
- What changed: Merged the final upstream evidence head so PR #16 can use `macbeth03/m3-chain-adapter` as its review base without a graph conflict.
- Evidence handling: Generated-file conflicts kept the upstream base evidence. Macbeth04 will regenerate its own manifest and snapshot only through the repository commands; no generated PASS content is edited manually.
- Result: The stacked source was validated locally, C/R/S was regenerated through repository commands, and Draft PR #16 was updated without rewriting history.
- Hosted blocker: Linux, Windows and macOS Engineering jobs stop before dependency installation because `tools/environment/observe.mjs` accepts pull-request admission only when `base.ref` is `master`; the intentional PR #17 stack therefore reports `history=BLOCKED`.
- Next step: Preserve the Draft stack until PR #17 is integrated, then retarget to `master` and rerun hosted checks. Vault/Pass ABI and deployment remain BLOCKED/NOT_RUN.

### 2026-09-19 — Documentation consistency closeout

- Task: M3-04-PRODUCT-UI
- Status: READY_FOR_REVIEW_WITH_HOSTED_ADMISSION_BLOCKER
- What changed: Reconciled this log and the implementation plan with the completed local C/R/S flow and the actual hosted admission result reported by PR #16.
- Evidence handling: This source-only correction becomes a new source C; manifest R and snapshot S are regenerated only through the repository commands.
- Product behavior: Unchanged. No adapter, provider, ABI, deployment metadata or write capability changed.
- Next step: Wait for the authorized upstream integration sequence; do not merge, deploy, sign or broadcast.

### 2026-09-19 — Race-safe wallet submission interface update

- Task: M3-04-PRODUCT-UI
- Status: READY_FOR_REVIEW_WITH_HOSTED_ADMISSION_BLOCKER
- Upstream source: Macbeth03 source C `14ebe2c2c40d3292a95f56ec23b1328afc5f759c`; final dependency head `20347ec22729346d617525d64dc76f58354b5f0d`.
- What changed: Updated the read-only UI seam for the new `WalletSubmission` union. A deterministic submission remains `SUBMITTED`; every `SUBMISSION_AMBIGUOUS` outcome renders a distinct non-ready state with its sanitized reason, optional transaction hash and an explicit prohibition on automatic retry.
- Ownership boundary: Macbeth03 continues to own EIP-1193 provider listeners, wallet session validation, submission outcomes, chain reconciliation and canonical projection writes. Macbeth04 added no provider, retry engine, lifecycle owner or second adapter.
- Tests: 63/63 focused lifecycle/store/sync/wallet/UI tests passed with typecheck, lint, formatting and diff checks.
- Product capability: Unchanged. Vault/Pass writes remain disabled and `NOT IMPLEMENTED`; no signing or broadcast is performed by the product shell.
- Evidence handling: This record joins the implementation as the new source C. Manifest R and snapshot S are generated only through repository commands, with exact SHAs maintained in Draft PR #16.
- Next step: Preserve the Draft stack until the authorized upstream integration sequence permits a `master`-based hosted rerun. Entire Testnet closure remains BLOCKED.

### 2026-09-19 — Contradictory evidence failure precedence

- Task: M3-04-PRODUCT-UI
- Status: READY_FOR_REVIEW_WITH_HOSTED_ADMISSION_BLOCKER
- Review source: Macbeth05 independent review identified that `productReady=true` was evaluated before explicit failure evidence.
- What changed: Moved the success projection check after lifecycle, receipt, reconciliation and stale-projection failures. Contradictory evidence now fails closed instead of rendering `READY`.
- Tests: Added a red-first regression covering reorg, reverted receipt, reconciliation failure and stale projection combined with `productReady=true`; the expanded focused lifecycle/store/sync/wallet/UI set passes 64/64.
- Ownership boundary: Product presentation order only. No Macbeth03 state, provider, RPC, adapter, signing, broadcast or retry behavior changed.
- Evidence handling: This correction becomes the new source C. Manifest R and snapshot S are regenerated only through repository commands, with exact SHAs recorded in Draft PR #16.
- Next step: Preserve the Draft stack until PR #17 reaches `master`, then retarget and rerun hosted admission. No merge is authorized.

### 2026-09-19 — AF-M3-CLOSEOUT offline browser acceptance

- Task: M3-04-PRODUCT-UI
- Status: PASSED_OFFLINE_WITH_LIVE_CHAIN_BLOCKED
- Environment: Approved Node 24.21.0/npm 11.19.1; local demo at `http://127.0.0.1:4180`; Codex in-app browser; no wallet, RPC, signing or broadcast.
- Actual entry: Loaded `apps/web/index.html` through the production Web build and local server, then verified `#/trade/trend` and `#/account/trades` before and after browser reload.
- Strategy detail evidence: The M3 shell renders `trend` as the canonical strategy, labels original content `FIXTURE`, reports wallet `DISCONNECTED`, network `UNAVAILABLE`, transaction `IDLE`, and keeps Buy Pass, Sell Pass, Deposit, Withdraw and Approve disabled as `NOT IMPLEMENTED`.
- Account evidence: The account shell labels the backend identity `LOCAL SIMULATION`, states that account and wallet identities are separate, and preserves the same unavailable Testnet boundary and disabled actions after reload.
- Fixture boundary: Synthetic price, holdings and trade sections remain explicitly `DEMO`, `FIXTURE`, `LOCAL` or `NOT LIVE`; no local value is presented as Testnet evidence.
- Browser diagnostics: No browser warning or error entries were observed after navigating and reloading both routes.
- Limitation: This is offline browser acceptance only. Live Pass/Vault reads and supported actions remain blocked on the reviewed Macbeth02 ABI/deployment and Macbeth03 integration; no Testnet result is claimed.
- Integration handoff: AF-M3-CLOSEOUT supersedes the earlier instruction to wait for PR #17 to merge first. Macbeth01 may include this exact candidate in its own `master`-based integration PR while preserving Worker history; PR #16 remains Draft and unmerged.

### 2026-09-19 — Canonical backend readiness evidence boundary

- Task: M3-04-PRODUCT-UI
- Status: READY_FOR_CLOSEOUT_INTEGRATION_WITH_STACKED_PR_ADMISSION_BLOCKER
- Upstream source: Macbeth03 source `1023caf` and final dependency head `588efa531b83548ffa7b1b01f976dfc49ff470b7`.
- What changed: Preserved Macbeth03's removal of the browser-side `operationEvidence` derivation. The Web adapter now only re-exports the final `ProductOperationEvidence` type; `READY` is computed by `ChainStore.operationEvidence(operationId, projectionKey)` inside one canonical SQLite snapshot.
- Product boundary: Macbeth04 continues to consume only the final evidence object. The UI does not combine raw operations and projections or reconstruct canonical ancestry. Its defensive failure-before-`productReady` mapping remains in place for malformed or contradictory API/cache input.
- Tests: The expanded lifecycle/store/sync/wallet/UI set passes 68/68, including canonical-snapshot readiness, competing fork/hash rejection, bounded ancestry failure and contradictory frontend evidence.
- Ownership: No provider, RPC, state transition, database write, ABI, calldata, signing, broadcast or automatic retry behavior was added by Macbeth04.
- Evidence handling: This integration record becomes the new source C. Macbeth04 manifest R and snapshot S are regenerated only through repository commands.
