# X Layer adapter implementation plan

Agent-ID: Macbeth03  
Task-ID: AF-XLAYER-03-ADAPTER

## Goal

Support the explicit trusted `xlayer-testnet` / `1952` pair in the AlphaForge
manifest and M3 runtime while retaining Robinhood. The default entrypoint remains
NOT_DEPLOYED and verification stays offline or local/mock.

## Authority and actual startup receipt

- Repository: `pdbsy/alphaforge-xlayer`.
- Branch: `macbeth03/xlayer-adapter`, independent full clone and dependencies.
- Imported base and initial HEAD: `18f5352070910a867b9729b031aa2e3951785e01`.
- Initial worktree: clean; shallow repository: false.
- Tool versions: Node `24.21.0`, npm `11.19.1`.
- Intake: manager PR #1, MIGRATION.md and ASSIGNMENTS.md at
  `5896ff45510b214d45a3469f9536a8434e2493d3`.
- Original project checkpoint: `379d9cc9a8f10c5b57b5552bbe11313d52fe2c28`,
  clean and preserved. Later original-project work is not imported here.

## Architecture and constraints

Use a discriminated union of the approved environment/chain ID pairs and validate
the pair at runtime, including the trusted expectation. Add explicit network
selection to deployed runtime composition, preserving the Robinhood default.
Never derive the trusted network from the manifest. Keep canonical serialization,
SQLite schema and protocol identifiers stable. Reject X Layer mainnet 196,
historical testnet 195 and mismatched pairs.

Tech stack: existing TypeScript, Node test runner, node:sqlite and read-only RPC.
No new dependencies, signers, RPC writes, live probes, deployment or merge.

Foundation metadata remains manager-owned. This adapter adds the approved identity
boundary and accepts endpoint configuration through existing composition; it does
not duplicate network metadata. Root scripts, lockfile, foundation, frontend,
contracts and CI remain outside scope.

## Tasks

- [x] Publish this actual receipt on the worker Draft PR.
- [x] Add failing behavioral tests for explicit X Layer selection and invalid pairs.
- [x] Implement strict manifest pairs and explicit runtime expectation.
- [x] Verify wrong RPC rejection before indexing, NOT_DEPLOYED inert behavior,
      and cross-chain event, checkpoint and operation isolation.
- [x] Run chain regressions, types, lint, formatting and privacy/secret scans.
- [ ] Document interface and limitations; publish source SHA and verification on
      the Draft PR for manager integration and independent review.

Expected files: `packages/chain-adapter/src/manifest.ts`,
`apps/server/src/m3-chain-runtime.ts`, corresponding existing chain test files,
and `docs/xlayer/adapter/`.

XLayerPM approved one additional file, `apps/server/src/chain-routes.ts`, for
restricting operation evidence to the selected chain and Vault. A same-database
regression reproduced foreign-chain evidence returning HTTP 200. The fix preserves
the existing HTTP 404 / CHAIN_OPERATION_NOT_FOUND response and normal reads.

## Evidence at intake

Implementation tests: NOT_RUN. Foundation integration: awaiting manager publication.
New-repository CI admission: BLOCKED pending AF-XLAYER-06-CI repository bindings.
Independent approval: NOT_RUN. Deployment/signing/broadcast/live RPC: NOT_RUN.
Inherited softReadyDepth 3 and reorg lookback 128 are defaults, not X Layer finality
evidence; L1 finality remains UNKNOWN.
