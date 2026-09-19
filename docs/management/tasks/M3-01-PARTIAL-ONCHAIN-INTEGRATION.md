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
