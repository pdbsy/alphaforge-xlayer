# AlphaForge M3 Product UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. In this session, execute inline because the repository instructions keep Darwin and additional workers inactive.

**Goal:** Extend the warm AlphaForge product UI with a truthful pre-Strategy-Runtime product shell that can consume Macbeth03 chain projections when they exist, while clearly separating fixtures and local simulation from Robinhood Chain Testnet state.

**Architecture:** Keep the protected prototype byte-identical and add a small, pure presentation module beside `product-ui.ts`. The module renders values supplied by a caller and never owns wallet, RPC, transaction, receipt, or readback transitions. It consumes Macbeth03's normalized `ProductOperationEvidence`, `WalletSubmission`, `BrowserWalletPort` and strategy-adapter contracts while keeping provider access, session listeners and lifecycle transitions in the shared chain adapter. The actual product entry accepts one injected Macbeth03-owned runtime; without that runtime and verified deployment metadata, real asset reads and writes remain disabled.

**Tech Stack:** TypeScript, browser DOM, existing imported AlphaForge prototype, Node 24.21.0, npm 11.19.1, Node test runner; no new dependency.

**Spec:** User attachment `pasted-text.txt` dated 2026-09-14, freezing D1 canonical `strategyId`, D2 the complete user path before Strategy Runtime, and D3 Macbeth03 ownership of chain transaction truth.

## Global Constraints

- Branch is `macbeth04/M3-product-ui` at canonical baseline `7ecba357d5a19f387e86f578822af04a6261fed2`.
- Do not edit `apps/web/prototype/AlphaForge_v3_EN.html` or generated `apps/web/public` assets.
- Do not add a wallet/EVM dependency, provider integration, ABI, contract address, deployment metadata, transaction transition engine, or second chain adapter.
- Use `ROBINHOOD_CHAIN_TESTNET` as the only frontend source for network name, chain ID and explorer base URL.
- Alice/Bob and current API values remain visibly `LOCAL SIMULATION`; original charts remain visibly `FIXTURE`.
- Keep Buy Pass, Sell Pass and Approve visible but disabled with `NOT IMPLEMENTED`. Deposit, Withdraw and Close may be enabled only when one injected runtime supplies a verified deployment, current wallet ownership, live simulation and an explicit write mode; the default product path keeps writes off.
- Never present local command IDs, localStorage, SQLite revisions, fixture values, or static UI state as chain-confirmed evidence.
- Treat `CHAIN_CONFIRMED` as receipt success and `READY` as receipt success plus required readback, but render only projections received from Macbeth03.
- Strategy Runtime, venue execution, positions, fills and strategy-generated PnL remain `NOT IMPLEMENTED / FUTURE PHASE`.
- Task-ID is `M3-04-PRODUCT-UI`. Macbeth01 fixed `trend` as the first canonical M3 product strategy; `core-flow-demo` and `satellite-flow-demo` remain isolated historical local identities.

## Capability Classification

| Class             | Current baseline capability                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAN IMPLEMENT NOW | Pure presentation; canonical network display; dynamic route/account projection; typed product runtime boundary; exact AF-USDC input; re-read/simulate/review/confirm action orchestration |
| UI SHELL ONLY     | Wallet/network/transaction/Vault rendering from one injected Macbeth03-owned runtime; injected mock controls are visibly marked and hold no real rights                                   |
| BLOCKED           | Live Pass/Vault state and writes until Macbeth02 completes the implementation/deployment manifest and Macbeth03 publishes the product runtime with live reads and simulation              |
| NOT IMPLEMENTED   | Buy/Sell/Approve end-to-end capabilities and all Strategy Runtime/venue/order/position/PnL behavior                                                                                       |

## Task 1: Add semantic presentation tests

**Files:** Add `test/m3-product-ui.test.ts`; update `package.json` test list only after the focused test exists.

**Interfaces:** Tests import pure presentation functions from `apps/web/src/m3-product-shell.ts`. The presentation input is immutable data supplied by a chain owner; it contains no provider or state-transition methods.

- [x] Assert fixture and local-simulation provenance remain distinct from Testnet.
- [x] Assert network name and chain ID come from `ROBINHOOD_CHAIN_TESTNET`.
- [x] Assert unsupported asset actions stay visible, disabled and labeled `NOT IMPLEMENTED`.
- [x] Assert wallet statuses and all frozen transaction lifecycle statuses have distinct, human-readable output.
- [x] Assert `CHAIN_CONFIRMED` explicitly says readback is pending while `READY` says product state is updated.
- [x] Assert unknown/untrusted text is escaped.
- [x] Run the focused test and record the expected missing-module failure before implementation.

## Task 2: Implement a read-only M3 product shell renderer

**Files:** Add `apps/web/src/m3-product-shell.ts`.

**Interfaces:** Export immutable wallet, network and transaction presentation types plus `renderM3StrategyShell(input)` and `renderM3AccountShell(input)`. These functions only map supplied values to escaped HTML. They do not connect wallets, derive transaction states, poll RPC, build explorer URLs for transactions, or mutate product state.

- [x] Import `ROBINHOOD_CHAIN_TESTNET`; do not copy network constants.
- [x] Render `trend` as the first canonical product strategy and keep historical local identities isolated.
- [x] Render account identity and wallet identity as separate concepts.
- [x] Render fixture/local/Testnet provenance labels on every data group.
- [x] Render disabled roadmap actions and explicit dependency reasons.
- [x] Render all frozen wallet/network/transaction status labels when provided by a future Macbeth03 projection.
- [x] Keep the default public-baseline projection disconnected, idle, and unavailable.
- [x] Run the focused test until it passes.

## Task 3: Integrate through existing product extension points

**Files:** Modify `apps/web/src/product-ui.ts`; extend `test/m3-product-ui.test.ts` or the existing UI build test.

**Interfaces:** Prepend the M3 shell through `AF.pages.trade` and `AF.pages.account`. Preserve `AF.pages.*`, `AF.app.*`, the original page bodies and local ProductAdapter behavior.

- [x] Add a failing pure page-extension test proving existing account/trade content is preserved.
- [x] On original strategy routes, label original content `FIXTURE` and render the Testnet capability shell separately.
- [x] On backend strategy routes and account data, label the existing API content `LOCAL SIMULATION`.
- [x] Keep `/trade/:strategyId` as the single detail-route shape; do not add a Testnet-only page.
- [x] Add the account wallet/network/asset shell while keeping current local account data separated.
- [x] Run targeted UI, importer and build tests.

## Task 4: Record evidence and close only the implemented phase

**Files:** Add `docs/management/agents/logs/M3-04-PRODUCT-UI.md`; update this plan's checkboxes.

- [x] Record Task, status, branch, exact commit, change rationale, files, tests, limitations, dependencies, decision requests and next step.
- [x] Run typecheck, lint, format check, focused UI tests, full test suite and web build with the approved toolchain.
- [x] Verify the protected prototype byte count and SHA-256 tests still pass.
- [x] Request independent review before integration.
- [x] Create small commits and Draft PR with Task-ID `M3-04-PRODUCT-UI`.

## Task 5: Consume Macbeth03 normalized evidence

**Files:** Modify `apps/web/src/m3-product-shell.ts` and `test/m3-product-ui.test.ts`; merge the exact Macbeth03 source history without copying its adapter.

- [x] Fetch and verify immutable interface source `b640489fccf704394eaf2721424652f167675148` from Draft PR #17.
- [x] Add failing tests for receipt success, strict confirmation, product projection, reorg, reconciliation failure and stale projection.
- [x] Preserve the upstream history through a merge commit; do not create a second wallet, RPC or lifecycle adapter.
- [x] Map receipt success to `CHAIN_CONFIRMED`, reconciled chain evidence awaiting UI projection to `INDEXING`, and only `productReady=true` to `READY`.
- [x] Fail closed for `REORGED`, `RECONCILIATION_FAILED`, reverted receipts and stale projections.
- [x] Run 37 focused integration tests and the complete 435-test repository gate; retain the expected sandbox-only loopback failure and the successful loopback-capable rerun.
- [x] Regenerate source-bound management manifest R and Dashboard snapshot S, then verify the exact final head.

## Deferred Integration Gates

- Macbeth01: resolved Task-ID and first canonical strategy; AF-M3-CLOSEOUT now owns the `master`-based unified integration candidate and final hosted CI. Future product strategy assignments still require explicit decisions.
- Macbeth02: reviewed ABI, deployed Testnet addresses, supported operations, authorization semantics, events and stable error behavior.
- Macbeth03: normalized wallet/lifecycle/projection evidence is consumed from immutable source `b640489`; Vault/Pass ABI and deployment metadata remain blocked.
- Macbeth05: acceptance validation for happy, rejection, wrong-network, failed, replaced, stale and readback-lag paths.

## Task 6: Handle race-safe wallet submission results

**Files:** Modify `apps/web/src/m3-product-shell.ts` and `test/m3-product-ui.test.ts`; consume Macbeth03 source `14ebe2c2c40d3292a95f56ec23b1328afc5f759c` and final dependency head `20347ec22729346d617525d64dc76f58354b5f0d`.

- [x] Preserve Macbeth03's provider listener, session race and backend projection changes through the stacked merge history.
- [x] Consume `WalletSubmission` directly; do not add another EIP-1193 provider or submission state owner.
- [x] Keep `SUBMITTED` separate from receipt success and product readiness.
- [x] Render `SUBMISSION_AMBIGUOUS` as a distinct non-ready status with the sanitized reason and optional transaction hash.
- [x] Explicitly state that ambiguous submissions must not be retried automatically.
- [x] Cover all four reasons: `SESSION_CHANGED`, `POST_SUBMISSION_CHECK_FAILED`, `PROVIDER_RESULT_UNKNOWN` and `LOCAL_EVIDENCE_INVALID`.
- [x] Run the expanded 63-test lifecycle/store/sync/wallet/UI integration set, typecheck, lint and formatting.
- Evidence closeout for this update follows the same source C → manifest R → snapshot S workflow; exact immutable SHAs are recorded in Draft PR #16.

## Task 7: Fail closed on contradictory product evidence

**Files:** Modify `apps/web/src/m3-product-shell.ts` and `test/m3-product-ui.test.ts`; record the independent review correction in the worker log.

- [x] Add a failing regression for explicit failure evidence combined with `productReady=true`.
- [x] Evaluate lifecycle, receipt, reconciliation and stale-projection failures before accepting product readiness.
- [x] Keep the correction inside the pure presentation mapper without changing Macbeth03 ownership.
- [x] Run the expanded 64-test lifecycle/store/sync/wallet/UI integration set.
- [x] Verify the actual strategy and account entry routes in a real local browser, including reload recovery, disabled actions, fixture/live labels and console diagnostics.
- Evidence closeout for this correction follows the source C → manifest R → snapshot S workflow; exact immutable SHAs are recorded in Draft PR #16.

## Task 8: Consume canonical backend readiness evidence

**Files:** Preserve Macbeth03 source `1023caf` and final head `588efa531b83548ffa7b1b01f976dfc49ff470b7`; update the UI evidence boundary without deriving readiness in the browser.

- [x] Preserve Macbeth03's removal of browser-side raw operation/projection readiness derivation.
- [x] Consume the final `ProductOperationEvidence` type through the Web adapter re-export.
- [x] Keep `ChainStore.operationEvidence(operationId, projectionKey)` as the sole readiness computation owner.
- [x] Retain failure-before-`productReady` defense for contradictory input crossing API/cache boundaries.
- [x] Run the expanded 68-test lifecycle/store/sync/wallet/UI set.
- [x] Re-run actual strategy/account browser acceptance on the exact integrated head.
- Evidence closeout follows the source C → manifest R → snapshot S workflow; exact immutable SHAs are recorded in Draft PR #16.

## Task 9: Add the partial on-chain product runtime seam

**Files:** Add `apps/web/src/m3-product-runtime.ts`, `apps/web/src/m3-chain-action-flow.ts`, and focused tests; modify the product shell, actual product entry, strategy adapter types and worker log.

- [x] Verify Macbeth02 review-interface commit `135be1e1074436e2092487099f8376cc963b714f`, retain its `NOT DEPLOYED / IMPLEMENTATION IN PROGRESS` boundary, and record that independent review still requires mutation-resistant comparison with the concrete compiled Vault artifact.
- [x] Add red-first tests for soft-ready wording, unknown L1 finality, degraded/reorg owner exits, default-off writes and fresh chain state on both product routes.
- [x] Consume wallet, network, transaction and contract presentation through one injected runtime in the existing `/trade/:strategyId` and Account pages.
- [x] Reuse `BrowserWalletPort` and extend the existing Robinhood Testnet strategy-adapter seam with live simulation; do not add a provider, RPC client, receipt evaluator or second lifecycle owner.
- [x] Re-read and simulate before review and again before wallet submission; bind reviews to one flow and one use, and clear the old session after a failed reconnect.
- [x] Parse Deposit/Withdraw as exact AF-USDC six-decimal base units; reject zero, excess precision and noncanonical values; keep Close amount-free and recipient-free.
- [x] Keep real product writes off when no runtime is injected. Allow an injected mock only with an explicit `INJECTED MOCK — no real rights or funds` label.
- [x] In degraded/reorg states, disable Deposit and preserve owner Withdraw/Close only when the runtime exposes a live RPC or simulation exit path.
- [ ] Consume the final Macbeth03 product runtime plus Macbeth02's mutation-resistant concrete artifact and verified deployment manifest when those sources are published; this remains BLOCKED rather than inferred.
- [x] Run the final full repository gate and regenerate C/R/S evidence through the repository commands.
- [ ] Publish the immutable candidate and request Macbeth05 review after remote push and agent messaging are explicitly authorized.

## Task 10: Validate the injected-provider product journey in a real browser

**Files:** Add `apps/web/src/m3-injected-runtime-fixture.ts` and `test/m3-injected-runtime.test.ts`; modify the development-only product entry and Vite asset middleware; update this plan and the worker log.

- [x] Add a red-first injected-provider regression that uses the existing `Eip1193Wallet`, prepared-action authority and `M3ChainActionFlow` instead of introducing a second wallet path.
- [x] Expose the fixture only in Vite development mode when `?m3Fixture=1` is explicit, and label it `INJECTED MOCK / NO REAL RIGHTS OR FUNDS / NO BROADCAST`.
- [x] Exercise the actual `/trade/trend` product entry through wrong-network rejection, correct-network connection, immutable-owner read, exact AF-USDC review, repeated live simulation and mock submission.
- [x] Verify soft-ready wording, reorg failure and indexer-degraded owner exit behavior; Deposit stays disabled in degraded/reorg states while Withdraw and Close remain available through simulation.
- [x] Verify a clean browser page has no warning/error console entries and that the production application JavaScript contains no fixture marker, query switch, fixture class or draft selector.
- [x] Keep live RPC, signing, broadcast, deployment and receipt confirmation NOT_RUN; the fixture returns a deterministic mock hash only.
- [ ] Consume the final concrete Vault artifact and Macbeth03 runtime when published; draft selectors in this explicitly development-only fixture are not accepted deployment evidence.
