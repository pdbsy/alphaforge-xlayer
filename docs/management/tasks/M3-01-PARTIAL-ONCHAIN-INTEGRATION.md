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
