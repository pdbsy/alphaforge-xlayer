# Unified foundation candidate review

Recorded: 2026-09-19

Owner: `Macbeth05`

Candidate: PR #20 head `919505b45572916a3868ecf355691fb09fa1e2c3`

Fixed base: `7ecba357d5a19f387e86f578822af04a6261fed2`

Source-code checkpoint: `00d3b0e0015084fdc5cae6caa6c3ffabd7e5cc2e`

## Verdict

The source-bound foundation candidate passed the focused identity and security-fix verification described below. It does not implement the required Wallet -> Pass/Vault -> confirmation -> Indexer -> Account user journey, so current-stage product acceptance remains **PARTIAL_BLOCKED**. Strategy execution remains deferred by the approved closeout scope. Testnet remains **NOT_RUN**.

This is a version-bound AI-assisted QA result. It is not a third-party contract audit, merge approval, or Testnet authorization.

## Source binding

The candidate manifest at `docs/management/agents/integrations/AF-M3-CLOSEOUT.json` pins the fixed base and these reviewed sources:

| Owner | Task | Exact source |
| --- | --- | --- |
| Macbeth02 | `M3-02-PROTOCOL` | `d473f9df9eb5d1be41024b4b58ebc5ec4f5d9fcd` |
| Macbeth03 | `M3-03-ADAPTER` | `588efa531b83548ffa7b1b01f976dfc49ff470b7` |
| Macbeth04 | `M3-04-PRODUCT-UI` | `22616d809a5bbd83e4d15c9946bd91006c1417b2` |
| Macbeth05 | `AF-M3-05-INTEGRATION-ACCEPTANCE` | `8dbf976aa161f57251bf522b95efebdbc3bad389` |
| Macbeth01 | `AF-M3-ASSIGNMENT-04` | `8be566b0c405ddf32ad7cd9886810b8dda23007e` |
| Macbeth01 | `AF-M3-05-REGISTRATION` | `b5d429c7a4a4dc05843d6233288d546596285879` |

The exact final-head checker independently verified 102 records: 84 imported source records and 18 manager records.

## Identity security review

Codex Security scan `fcd15838-e8e3-4026-9aad-df58a2038ea9` reviewed immutable range `7ecba357d5a19f387e86f578822af04a6261fed2..5340dfe2cd2323d21c32786396ec2236ab78a0ee` and reported two Low, high-confidence findings:

1. `integration-identity.merge-group-fixed-base-bypass`: a closeout merge-group event could fall through to ordinary protected-target validation and omit the fixed-base/source-graph contract.
2. `integration-identity.same-name-fork-bypass`: a foreign repository could reuse the designated short branch name and enter manager integration mode.

Both are **FIXED** at `919505b45572916a3868ecf355691fb09fa1e2c3`:

- Pull-request mode now requires the canonical head and base repository plus the designated refs; missing or foreign repository identity fails closed.
- Because merge-group metadata does not provide the trusted closeout PR/source binding required by the approved protocol, a queue range that introduces closeout task history or any history of the closeout manifest is rejected. This includes fixed-base, advanced-base, manifest deletion, manifest modification followed by restoration, and rename/delete histories.
- An ordinary queued change after the integration history is already in the protected base remains admissible under the ordinary protected-target rules.

Independent approved-runtime evidence:

- Identity, lifecycle, bypass, and management tests: **59/59 PASS**.
- Exact candidate canonical pull-request event: **PASS**, 102 records verified.
- Original same-name foreign-repository reproducer: **REJECTED**.
- Original closeout merge-group reproducer: **REJECTED**.
- No remaining reportable bypass was found within the preserved-history and canonical-origin assumptions.

## Follow-up closure verification

### AF-M3-05-FU-002

Status: **FIXED**.

The current candidate contains test commit `4f54f94ddfafdd101c4b6b0ec1937859ba596829` and implementation commit `91777c93c52011b13515d44056a9b56cfefc3c2a`. `transactionPresentationFromEvidence` now evaluates terminal lifecycle failure, reverted receipt, failed reconciliation, and stale projection before accepting `productReady`.

The exact source archive passed `test/m3-product-ui.test.ts` **15/15** under Node `24.21.0`. Four contradictory inputs with `productReady: true` returned `FAILED`; the legitimate `CONFIRMED + SUCCESS + MATCHED + READY` input still returned `READY`.

### AF-M3-05-FU-003

Status: **FIXED** for the original readiness-composition security boundary.

At source `588efa531b83548ffa7b1b01f976dfc49ff470b7`, the client-side raw operation/projection-to-ready constructor is removed. `ChainStore.operationEvidence` computes final evidence in one SQLite read transaction and verifies:

- operation block hash at the first canonical height;
- contiguous heights through the current checkpoint;
- every parent-hash edge;
- the projection's exact block number and hash;
- the final checkpoint hash;
- a fail-closed engineering bound of 2,000 ancestry blocks.

Independent approved-runtime tests for chain store, chain sync, wallet, and product adapter passed **60/60**. They include a competing-fork projection, internally consistent endpoints with broken ancestry, the 2,000-block success boundary, and the 2,001-block fail-closed boundary.

No production API/UI caller currently composes `operationEvidence`. Closing this finding therefore does not establish that the end-user Pass/Vault chain path exists.

## Hosted and independent evidence boundary

Macbeth01 reports `npm run check` **479/479 PASS**, management checks **11 PASS / 0 FAIL / 4 NOT_RUN**, 12 Python tests, 66 Forge tests, ABI/runtime-bytecode equivalence, and strict Slither with zero findings for the source-bound candidate. These remain manager-produced evidence unless repeated above as Macbeth05 independent execution.

At the final provider readback for head `919505b45572916a3868ecf355691fb09fa1e2c3`, all Linux, macOS, and Windows engineering-check runs had passed. Dependency review failed because the repository/account did not provide the required feature. CodeQL scanned 61 JavaScript, 60 TypeScript, and 3 Actions files, then failed while uploading/reading run metadata with `Resource not accessible by integration`. Required hosted checks were retained, so hosted admission was not all green at this checkpoint.

## Remaining blockers

- The current required Pass/Vault accounting and authorization implementation is absent; fixed-supply Pass and adapter/UI foundations do not constitute the approved user journey.
- The live wallet, contract, confirmation, server evidence, Account API, and real product entry are not composed into an end-to-end Pass/Vault flow.
- Full Macbeth05 independent `npm run check`, browser QA, E2E, Forge/fuzz/invariant/Slither, and contract artifact equivalence were not run on the final unified head.
- No Testnet RPC read, wallet signature, deployment, approval, transfer, transaction, or broadcast was authorized or performed.
- Required hosted checks were not all successful at the recorded provider checkpoint.

Resume final product acceptance only after an exact candidate implements the approved Pass/Vault journey and the remaining offline, browser, hosted, and separately authorized Testnet gates can be executed against that same version.
