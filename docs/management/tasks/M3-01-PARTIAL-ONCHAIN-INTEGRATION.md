# Partial on-chain integration

Task ID: `M3-01-PARTIAL-ONCHAIN-INTEGRATION`

Title: `Contract-authoritative Pass/Vault and wallet projection integration`

Worker: `Macbeth01`

Start: `2026-09-19`

Finish: `NOT_FINISHED`

Status: `IN_PROGRESS`

## Authority and decisions

The complete user instruction is preserved in `docs/management/specs/M3-01-PARTIAL-ONCHAIN-INTEGRATION.md`. It supersedes the prior pending precision/owner/dust/direct-operation/finality questions. No reapproval is required for those frozen decisions. Uncertain matters are researched against approved evidence before escalation to the user.

## Baseline and integration

Canonical repository: `pdbsy/quantpass-arbitrum-hackathon`.
Protected PR base: master `7ecba357d5a19f387e86f578822af04a6261fed2`.
Reviewed starting source: unmerged PR20 candidate `919505b45572916a3868ecf355691fb09fa1e2c3`.
Branch: `macbeth01/m3-partial-onchain-integration`.

The starting source includes 02 `d473f9df9eb5d1be41024b4b58ebc5ec4f5d9fcd`, 03 `588efa531b83548ffa7b1b01f976dfc49ff470b7`, 04 `22616d809a5bbd83e4d15c9946bd91006c1417b2`, 05 `8dbf976aa161f57251bf522b95efebdbc3bad389` and the registration branches. Later QA report `1a7eab60b8ac93f8d0ee20068e7a22671e4197b3` independently accepts specific foundation findings, not product completion.

## Responsibilities

02 implements protocol authority and all contract/fuzz/invariant acceptance. 03 implements canonical state, configured 3/128 recovery and actual API/live operation composition. 04 connects the existing product entry and verifies browser/provider behavior. 05 owns independent requirements and security acceptance. 01 owns shared integration identity, source registration, GitHub configuration, docs, final candidate testing and PR evidence.

## Current result

Implementation in progress. Prior candidate greens are baseline evidence only. No merge, deployment, live chain initialization or transaction is authorized. Required security-feature licensing and organization-level changes stay blocked if encountered.

## Initial manager checkpoint and audited interface intake

Draft PR21 is the current delivery PR. Initial head `8fcb14bd8f34bdbd56565344cb4f65158c725614` passed local `npm run check` with 483/483 tests; those results certify manager preparation only. CodeQL's real post-permission run now fails specifically because code scanning is not enabled, as documented in the GitHub configuration audit.

The published protocol interface `135be1e1074436e2092487099f8376cc963b714f` and independent matrix `1cd8cf8fc95837270a8e050fdfb757e2e6b4ce75` have been inspected and merged preserving authors. The interface's original test was too weak to certify an ABI freeze: 05 demonstrated that incompatible mutations could retain 3/3 PASS. This is an interface review draft until 02 supplies exact selector/error/event/constructor artifact assertions and the concrete implementation. The current integration does not claim Vault custody is already implemented.

## Independent-review service interruption

Macbeth05's task `01a095c3-8433-7c83-875e-2f542c2e30f3` reported a failed turn at 2026-09-19 16:08:12 UTC. The service returned a possible cybersecurity-risk restriction. Existing version-bound review material remains preserved; unfinished review is BLOCKED, not PASS. Manager checks and worker-authored tests cannot substitute for independent acceptance. Other authorized implementation and local validation continue. No attempt is made to bypass the service restriction.

## User-approved metadata-only exception

The user explicitly approved repairing only the unpublished Macbeth02 commit that omitted identity trailers. Original object `5270a6eb5ec5a9b061285fa2a56d2ef98de500d9` is permanently preserved by the published tag `evidence/macbeth02-m3-02-pre-trailer-5270a6e`. Corrected object `db620d68a635259f53f48c33defff4273237d372` adds only `Agent-ID: Macbeth02` and `Task-ID: M3-02-PROTOCOL` to the message. Both retain tree `92d0f2a2b324e586c5033a19f656828289ac2ea4`, parent `135be1e1074436e2092487099f8376cc963b714f`, author Macbeth02, author email and author date. No force push or other history rewrite was authorized or performed by this exception.

The first canonical-policy/API batch from 03 (`18fa94b4a933bda65a6d7d9b2859d9c9a4fe5a8b`) is integrated. Manager verification passed 62 chain/wallet/provenance tests and the extended UI fixture checks; full Node tests with the pending deployment-template update passed 490/490. This is interim working-tree verification, not the final immutable candidate's C/R/S evidence.

## Integrated Vault verification

02 source `8afb96e4671b2ace5e59c99617c79b4bdca5b627` was imported from the worker's immutable local commit, then confirmed on its canonical remote branch before admission. Merge `586600a886eaf1c961d04e2184a56958583c16ed` preserves its history. The manager independently ran `bash contracts/script/check-m3-vault.sh`: 120 Solidity tests, 20 Python tests, five Vault invariants (64 runs, depth 32), published/compiled ABI equality and zero Slither findings. The first attempt stopped at the expected dependency-tree drift after the pinned subset grew from 21 to 23 files; the old generated tree was verified against its old manifest and archived intact before deriving the new subset. The clean rerun passed.

The offline deployment template now reflects the implemented constructor tuples, direct immutable owner model and configurable 3/128 thresholds; template constructors were compared to the manager's compiler output. Deployment addresses, hashes and block evidence remain null. Ten template/provenance checks passed. Identity admission passed 130 records after the canonical 02 remote ref was updated. This does not resolve the outstanding frontend/runtime integration, independent QA service interruption or GitHub security feature blockers.

The management collector's four contract placeholders remain NOT_RUN within that collector, with the accurate reason `NOT_REGISTERED_IN_MANAGEMENT_COLLECTOR`. The contract toolchain is available and was executed through the separate complete wrapper above; its result is not synthesized into generated management PASS entries. Historical reports retain their original reason and bytes.

## Browser intake, source 10b807d (interim)

The manager exercised the real product DOM through the local Vite DEV fixture on loopback port 5191. Wrong-network connect was rejected; selecting the correct mock network exposed the immutable fixture owner; zero allowances disabled deposit; 1.000001 AF-USDC was reviewed as exactly 1000001 raw units; mock wallet submission displayed SUBMITTED; the three-confirmation fixture showed SOFT READY with unknown L1 finality; reorg removed readiness; degraded mode displayed a warning while Withdraw and Close remained enabled and Deposit disabled. All actions used the injected provider and no RPC transaction was sent.

A real browser failure remains open at this checkpoint: submitting an over-precision amount disables the review button permanently, and the local API error can mask the chain validation error. Closing and reopening the dialog recovers, but that workaround does not satisfy acceptance. 04 has the exact reproduction and is fixing the dialog error/retry boundary. The standalone Vite fixture also lacks the local API backend and displays a JSON parsing error; this is recorded rather than called a clean browser run. Mock presentation must not simultaneously claim live canonical reads. The concrete configured production runtime is still in progress, so this interim fixture run is not final product acceptance.

### Product dialog recovery intake (2026-09-20)

Integrated Macbeth04 `0f5dfa2cdb2b2899c5de2dce22e7fffe3914acd5` as an intermediate checkpoint. The default browser runtime now connects/observes a wallet without assuming a deployed Vault; its configured read/write composition remains pending. Manager resolved the wallet connection refactor against Macbeth03's pre-submit simulation by retaining simulation and the subsequent account/chain check through `connection.observe()`.

The first merged typecheck caught references to removed private wallet methods; they were corrected before admission. The subsequent typecheck and 53 focused wallet/product/dialog/provenance tests passed. In the actual local browser with the injected mock provider, `1.0000001` now displays `EXCESS_PRECISION` and leaves review enabled. Changing the same open dialog to `1.000001` proceeds to confirmation with exactly `1000001` AF-USDC base units. No wallet confirmation was requested during this recovery check. The mock read label is explicit. Configured production runtime and finite dual-token approval UI are still outstanding; this checkpoint is not final frontend acceptance.

### Published Vault adapter intake (2026-09-20)

Integrated Macbeth03 source `0b94ecfd8c0c3b0d8f72da27bbd1c96ed914d1d5`: exact Vault ABI/calldata/event decoding, hash-pinned canonical reads, persisted operation calldata, same-process runtime/projection read API, finite fixed-spender token approval preparation and browser read client. Manager independently recomputed Keccak for every signature from the published contract ABI: all 25 function selectors and seven event topics match the adapter table. Integrated typecheck and 130 chain/wallet/product/provenance tests passed.

This source still needs executable startup composition, browser submission registration and configured product runtime before final acceptance. These are tracked implementation gaps, not deployment prerequisites to excuse missing code. The default unconfigured product page was also checked in the browser: NOT DEPLOYED, writes disabled, deposit/withdraw/close disabled and wallet connect available. No real wallet interaction was performed.


### Explicit factory-owner regression (2026-09-20)

Manager added the specification C-06 test-only factory scenario: a factory administered by BOB creates a Vault with explicit owner ALICE and creator CREATOR. BOB cannot withdraw or close the funded Vault, while ALICE can close normally. No production factory or authority was introduced. The complete locked contract gate subsequently passed 121 Solidity tests, 20 Python tests, all existing fuzz/invariants, compiled/published ABI equality and zero Slither detectors. The prior 120-test report remains valid for the earlier source; this forward test addition raises the current total by one.

The integrated Node source `997be3f` passed 535 tests, typecheck, lint, formatting and production Web build. Final runtime/UI additions and final source C/R/S remain pending.

### Direct browser Vault reads (manager implementation)

Added `readM3VaultLiveSnapshot` for the configured UI to read the actual contract owner and exact integer state directly from an EIP-1193 provider, independently of Account identity and the indexed API. All 18 contract reads use the same block hash with `requireCanonical`; chain identity is checked before/after, and the selected block's canonical hash is checked again. The Pass's Strategy ID must agree with the Vault. This helper never requests accounts, signatures or transactions and never falls back to a database projection. A non-owner viewer can read the true owner so the UI can show the appropriate permission state.

Five targeted tests passed for exact state, wrong/changed network, mid-read reorg, malformed ABI/strategy mismatch, and sanitized provider failure; typecheck, scoped lint and formatting passed. The missing-module red test was observed first; an intermediate strip-only TypeScript syntax incompatibility was corrected before passing. Runtime/UI wiring remains with 04, so this module alone is not claimed as complete owner-exit acceptance.

### Server lifecycle and submission intake

Integrated Macbeth03 `77e2fe623326314c62ebe331d6357e6444aa58b1`: executable inert default startup, configured injected-RPC composition, bounded catch-up and operation rotation, pending submission API/client, retryable reconciliation, and same-block sequential operation handling. No provider transaction call is made by the server. Worker reported 478 full tests and its scoped review; this does not replace the blocked final independent QA.

Manager found and reproduced two startup failures: initial RPC failure and restart while no common ancestor exists both stopped the product server. The correction keeps a validly configured product available, exposes sanitized last-sync-attempt status, and blocks stale indexed reads after failure. Configuration/storage construction failures remain fatal. Tests also cover recovery and later loss of access to a previously healthy cached projection. Initial red failures, an intermediate Fastify-hook placement failure, and corrected results are retained locally. Integrated typecheck and 111 chain/wallet/provenance tests passed.

The worker's push of this source was rejected by automatic approval review because it could not establish trusted destination/export authorization. The confirmed target is the canonical repository and `macbeth03/m3-chain-adapter`; the worker has asked the user once and is waiting. Local intake does not assert remote source admission or bypass the rejected push.

### Frontend source inspection pending identity decision

Macbeth04 committed `484f1b5bfadc9ef444362c66a84d9682940da7ca` with the configured product runtime, but omitted Agent-ID/Task-ID metadata. The existing user exception covers only Macbeth02's `5270a6e`; it does not authorize rewriting this new commit. The worker was instructed to stop descendants and preserve its unresolved merge with 03. The manager has requested a separate one-commit metadata exception. This source has NOT been merged into the manager graph or represented as identity-admitted.

To complete unaffected verification, the manager created an independent full clone at this exact source with its own lockfile-installed dependencies. Typecheck and 75 focused UI/wallet/Vault tests passed. Actual browser testing used the DEV-only transport fixture with the same production `createM3BrowserRuntime`, not the previous separate fixture runtime:

- Wrong chain 1 was rejected; owner connected on mock chain 46630.
- Deposit review requested finite AF-USDC allowance `1000001` and Pass allowance `1000001000000000000`, both to the fixed Vault spender. After each mocked approval, a fresh review observed the remaining requirement; both sufficient allowances led to deposit confirmation with exact AF-USDC base units.
- Mock submission registration/evidence moved the product to soft-ready with finality unknown; a reorg removed readiness.
- With indexed reads degraded, deposit was disabled while withdraw/close remained enabled through the direct provider reader and simulation. Both exit paths reached mock submission without requiring indexed API health.
- `1.0000001` produced `EXCESS_PRECISION` with review still enabled; correcting the same dialog to `1.000001` reached confirmation.
- Switching to a non-owner wallet disabled deposit/withdraw/close, including after reconnect.

All wallet/provider/API transactions above are controlled mock objects and change no chain or funds. The standalone Vite preview's unrelated Local simulation API is not a running backend; this is not evidence of a clean full-stack live deployment. A minor non-owner degraded-message wording issue remains for a forward UI correction. The candidate still needs merge-conflict resolution with 03, final unified tests/C/R/S and remote identity admission after the pending decisions.

At manager source `d9bf7ff`, the full Node suite passed 554 tests. The two current user questions concern exact 03 source publication and exact 04 metadata repair. No denied push is retried indirectly.

### Approved source publication and second metadata exception

The user subsequently answered “允许” to the two pending decisions. Macbeth03 published exactly `77e2fe623326314c62ebe331d6357e6444aa58b1` by normal push to the canonical `macbeth03/m3-chain-adapter` branch; the manager fetched and verified that remote-tracking SHA. No force push was used. A later one-line lint correction is a separate unpublished source and is not covered by that exact-commit approval.

Macbeth04 repaired only the message of unpublished `484f1b5bfadc9ef444362c66a84d9682940da7ca`, producing `d244474ff5b64b14f04c2eef459ff86fb879355f`. Manager readback confirms identical tree `bce88e4c6917f8588bdcfe68b0615845fd278ce6`, parent `3ff7b6f94782cba70d3061cdbab327dde43b90ed`, author name/email and author date `2026-09-20T01:53:35+08:00`. Original evidence remains at `refs/evidence/macbeth04/M3-04-PRODUCT-UI/original-484f1b5`. This exception does not authorize other history rewrites. The unfinished merge was preserved for forward conflict resolution; final source admission remains pending its completion and publication.


### Unified configured runtime candidate

Manager merge `2e2ccc1` integrates corrected Macbeth04 source `1645c590f3d5508338af03e83fee22bf6d263bd1`. The merge retains the manager's startup-failure recovery and wallet session recheck after final simulation. Package test registration remains the full union; the management collector keeps all new chain/UI tests. Incoming generated management artifacts were not adopted as proof of the unified source; final collection is still required.

Typecheck, lint and 68 focused runtime/UI/startup/provenance tests passed. The full integrated Node suite passed 566/566. The incoming worker merge also contains the same error-cause preservation correction reported by 03; 03's separate `8ee2b6a` has not been pushed or imported. The non-owner degraded message now explicitly states that the current wallet is not the Vault owner.

The complete contract gate was repeated locally with 121 Solidity tests, 20 Python tests, invariant/fuzz checks and compiled/published ABI equality passing. The final ruleset readback again matches the original protected master configuration. Final remote source admission, source/report/snapshot collection and exact-head hosted checks remain outstanding. Independent final QA remains BLOCKED, not replaced by these manager checks.
