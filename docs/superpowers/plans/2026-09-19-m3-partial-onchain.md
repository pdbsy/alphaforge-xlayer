# AlphaForge Partial On-chain Integration Implementation Plan

> **For agentic workers:** Use executing-plans in this session with the already authorized Macbeth02–05 tasks. No new worker identities. Steps use checkbox tracking.

**Goal:** Implement contract-authoritative Pass/Vault custody and a tested wallet-to-account flow, without deployment or broadcasts.

**Architecture:** Contracts own assets, principal, capacity and owner permissions. The existing chain adapter/indexer produces bounded canonical evidence; the existing product UI composes live reads and direct owner operations without making SQLite an authorization source. Reuse the independently reviewed foundation and preserve worker authors/history.

**Tech Stack:** Node 24.21.0, npm 11.19.1, current locked TypeScript/Vite/SQLite stack, repository-locked Solidity/Forge/Slither.

**Spec:** `docs/management/specs/M3-01-PARTIAL-ONCHAIN-INTEGRATION.md` (complete user instruction, frozen decisions).

## Global Constraints

- Canonical origin `pdbsy/quantpass-arbitrum-hackathon`; protected base master `7ecba357d5a19f387e86f578822af04a6261fed2`; reviewed unmerged starting candidate `919505b45572916a3868ecf355691fb09fa1e2c3`.
- Task branch `macbeth01/m3-partial-onchain-integration`, Task-ID `M3-01-PARTIAL-ONCHAIN-INTEGRATION`.
- AF-USDC decimals 6; Pass decimals 18; exact capacity factor 10^12. No rounding or floating point authority.
- Direct immutable explicit owner, fixed recipient, D1 principal/profit accounting, closed-only excess rescue, no strategy runtime or new signature system.
- Configurable softReadyDepth 3, reorgSearchLimit 128; transaction block counts as 1. These are engineering thresholds, not finality.
- Local/mock tests only; no merge, chain deployment/broadcast, new credentials, paid features, repository visibility change or weakening checks.
- Uncertainty: inspect frozen spec, code/history, authoritative documentation first; escalate only unresolved semantic conflicts with cited evidence.

### Task 1: Provenance and new manager-task admission (01)

Files: `tools/agent-integration-identity.mjs`, `tools/check-agent-identity.mjs`, `test/agent-integration-identity.test.mjs`, `docs/management/agents/integrations/M3-01-PARTIAL-ONCHAIN-INTEGRATION.json`, agent registry/provenance/task record.

- [x] Fetch canonical refs and inspect open PRs; record master versus unmerged candidate distinctly.
- [x] Add real-Git fixture controls for the new exact branch/task, preserving old branch behavior and negative repository/queue tests.
- [x] Observe failure, then replace the single exact closeout designation with a bounded two-entry task mapping. Keep canonical repo, fixed master, exact source graph and per-agent attribution checks. The new manifest registers prior closeout history as a Macbeth01 source plus all worker sources.
- [x] Run `node --test test/agent-integration-identity.test.mjs test/agent-identity-lifecycle.test.mjs test/agent-identity-bypass.test.mjs` under approved Node; commit with new task trailers and update provenance hashes.

### Task 2: GitHub security configuration (01; 05 independent assessment)

Files: `.github/workflows/codeql.yml`, `docs/security/M3-GITHUB-SECURITY-CONFIGURATION.md`, nearest workflow policy tests if necessary.

- [x] Preserve exact logs and read-only API results for CodeQL, dependency graph/review, Actions defaults and ruleset.
- [x] Compare with official action documentation. Add only `jobs.analyze.permissions.actions: read` if the private-repository log and documented requirement confirm the missing permission; do not broaden defaults or change check names.
- [x] Distinguish security-feature entitlement from workflow syntax. Stop paid/visibility/org actions and document concrete blockers.
- [ ] Run existing YAML/policy/security tests; push candidate and inspect actual hosted rerun. Compare required rules before/after.

### Task 3: Vault authority and accounting (02)

Files: `contracts/src/` Vault/accounting interfaces and implementations, `contracts/test/` unit/fuzz/invariant tests, contract ABI artifact/manifest preparation and accounting document. Reuse StrategyPass/PassLocker only where their authority model matches the spec.

- [x] Derive the contract interface from the frozen specification and existing primitives; publish exact constructor/getters/functions/events/errors to 03/04 early.
- [x] Test then implement all 37 contract cases in specification XII.1, especially excess donation versus tracked equity, loss close, malicious dust isolation and mandatory transfer atomicity.
- [x] Test and implement precise arithmetic: `usdcRaw * 10**12`, inverse remainder rejection only at capacity boundaries; ordinary ERC20 transfers retain full precision.
- [x] Implement reserved balance protection, CEI/reentrancy and no owner migration/inherited owner bypass. Keep strategy position update authority unavailable to arbitrary callers.
- [x] Run the complete locked `bash contracts/script/check-m3-vault.sh` gate (base checks plus mandatory compiler/published ABI equality), inspect ABI/bytecode and publish exact source SHA. Manager repeated 120 Solidity tests, 20 Python tests and zero-finding Slither on 02 source 8afb96e; its explicit factory-owner regression then raised the complete gate to 121 Solidity tests with the same passing ABI/static-analysis checks.

### Task 4: Canonical projection and live operation boundary (03)

Files: `packages/chain-adapter/src/`, `apps/server/src/chain-store.ts`, `chain-sync.ts`, chain API composition, wallet adapter, related tests and reorg document.

- [x] Test block-inclusive count `(latest - included + 1)`, third confirmation soft readiness, no inferred L1/finality and configuration validation.
- [x] Implement 128-bounded rollback/replay with durable degraded evidence and idempotent removed/reorged event handling.
- [x] Consume exact 02 ABI for reads/calldata/events; compose `ChainStore.operationEvidence` through actual server API, without accepting browser-crafted READY evidence.
- [x] Provide direct live state/simulation independently of the indexed API; startup retains product availability while failed indexed reads return unavailable. Final UI wiring is tracked in Task 5.
- [x] Test actual API boundaries and the specified recovery cases; local source 77e2fe6 is integrated and communicated to 04. Remote source publication remains blocked by automatic approval review pending the user’s answer; this is not remote admission.

### Task 5: Product flow and browser acceptance (04)

Files: existing product shell/UI/adapter/wallet entry, browser integration tests and UI evidence document.

- [ ] Reuse 03 provider/session and exact 02 ABI; bind connect/network/owner display and deposit/withdraw/close to the real product routes.
- [ ] Test raw-integer amount conversion, wrong network/non-owner, simulation before submit, soft-ready/unknown/reorged/degraded presentation, clear mock labels.
- [ ] Keep owner exit available through live state when projection is degraded. No server signature or Account owner override.
- [ ] Exercise injected-provider full flow and real browser routes locally; write gate defaults closed without deployment config/authorization, no actual broadcast.
- [ ] Report observed outcomes and exact code version; no static card or mock PnL counts as chain completion.

### Task 6: Unified candidate, independent QA and PR (01/05)

Files: architecture/accounting/reorg/security audit docs, task/evidence manifest, generated management snapshot; complete PR body matching specification XVI.

- [ ] Audit and merge exact published worker commits preserving authors; resolve shared interfaces and registration/provenance/tests serially.
- [ ] Execute meaningful full local suite, contract unit/fuzz/invariant/Slither, product API/E2E/browser checks against the same candidate.
- [ ] BLOCKED: 05 received the source/scope but final independent review was stopped by a service restriction. Do not reroute the restricted review or claim manager checks as independent approval. Existing findings remain recorded.
- [ ] Collect source C → manifest R → snapshot S with repository commands. Do not edit generated PASS.
- [ ] Push manager branch/create PR against master; retain required checks and read actual hosted outcomes. Report implementation evidence separately from platform blockers and unauthorized Testnet operations.
