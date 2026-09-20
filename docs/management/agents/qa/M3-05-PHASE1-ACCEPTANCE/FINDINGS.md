# Phase 1 findings and blockers

These records apply to base `18f5352070910a867b9729b031aa2e3951785e01`. A later candidate requires independent retest. Severity describes product or release impact; blocker class states what cannot close while the record remains open.

## M3-05-P1-001 — Coverage targets are not met or completely measured

| Field         | Value                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Status        | `OPEN`                                                                                                                 |
| Severity      | `MEDIUM`                                                                                                               |
| Requirements  | `P1-COVERAGE-01`, `P1-COVERAGE-02`                                                                                     |
| Blocker class | `MILESTONE_COMPLETION_BLOCKER`                                                                                         |
| Owners        | Macbeth02 for contracts, Macbeth03 for adapter/API, Macbeth04 for product; Macbeth01 coordinates the unified candidate |
| Fix SHA       | Pending                                                                                                                |
| Retest        | Pending exact final candidate                                                                                          |

Reproduction: run all 591 top-level tests under Node built-in coverage with the recorded first-party includes, and run `forge coverage` with the locked contract toolchain.

Expected: actual overall automated coverage is at least 90% with a complete stated denominator, and critical authorization/accounting branches are 100% covered.

Actual: Node reports 91.67% lines, 84.67% branches, and 94.30% functions for loaded test files, but only 77 of 98 extension-based candidate files appear. A separate real-workflow collection probe increased representation to 78 / 98 and proved npm/Node child-process union collection. Follow-up established that 98 is not an executable denominator: `reconciliation.ts` is type-only, while the tracked prototype HTML contains the omitted product script emitted as `user-ui.js`. The admitted tools still cannot derive comparable runtime ranges for all unexecuted and production-browser source. Actual combined JS/TS overall coverage therefore remains `NOT_MEASURED`; [Complete Coverage Collection Method](COVERAGE-COLLECTION-METHOD.md) records the corrected classification. Critical JS/TS branches include values from 52.69% to 98.77%. First-party Solidity totals 95.24% lines and 66.23% branches; AlphaForgeVault has 65.12% branch coverage and PassLocker 77.78%. The earlier 99/22 checkpoint was an off-by-one inventory error caused by retaining one `.d.ts` declaration in a list whose stated method excluded declarations; [Coverage Gaps](COVERAGE-GAPS.md) preserves both corrections and the evidence.

Impact: the base cannot demonstrate the project quality bar and leaves authorization, accounting, RPC, ABI, recovery, and allowance branches unexercised.

Latest published checkpoint: PR #26 head `67b7d48e7e393133b1b231aa4dc20d1319665278`
passes all 617 Node tests, but an independent full-suite collection over 13 explicitly included
critical Chain/API sources reports 96.44% lines, 88.98% branches and 98.52% functions. The missing
branches include runtime wrong-chain and StrategyPass-code mismatch handling, manifest identity,
unknown or duplicate routing, unavailable projection/evidence, ABI/event rejection, recovery,
reorg and store cases. This is below the frozen 100% critical-branch requirement, so the finding
remains `OPEN`; the two reconciliation integration modules at 100% do not establish the wider
critical control-path result. Combined JS/TS overall coverage also remains `NOT_MEASURED` under the
six-class method.

Final PR #26 worker checkpoint `28ff3d4b5c6e70ff0c6ea1b11ad0fea4283887fd` passes 627/627
tests and improves the same 13-source population to 96.59% lines, 92.11% branches and 98.56%
functions in Macbeth05's independent run. Wrong-chain, StrategyPass-code mismatch, manifest
identity and Vault ABI/event-cardinality branches are now covered. Critical gaps remain in
operation-evidence unavailability, reorg/projection recovery, canonical checkpoint and lease races,
event/operation identity conflicts, operation-state evidence mapping and malformed RPC evidence.
The 13-file average cannot substitute for the frozen critical-branch 100% requirement, and combined
JS/TS overall coverage remains `NOT_MEASURED`; the finding remains `OPEN`.

## M3-05-P1-002 — Phase 1 has no usable Pass transfer product operation

| Field         | Value                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Status        | `OPEN`                                                                                                                    |
| Severity      | `MEDIUM`                                                                                                                  |
| Requirements  | `P1-SCOPE-01`, `P1-PRODUCT-01`                                                                                            |
| Blocker class | `MILESTONE_COMPLETION_BLOCKER`                                                                                            |
| Owners        | Macbeth04 product flow with Macbeth03 adapter/interface and Macbeth02 contract/interface alignment; Macbeth01 coordinates |
| Fix SHA       | Pending                                                                                                                   |
| Retest        | Pending exact final candidate                                                                                             |

Reproduction: inspect the supported onchain action union and open the actual `/trade/trend` product entrypoint in production and the explicitly marked local fixture.

Expected: Phase 1 exposes a usable Pass transfer operation while paid Buy/Sell remains unavailable.

Actual: the contract provides standard ERC20 transfer and tests prove fractional 18-decimal transfer, but the product action surface contains only Deposit, Withdraw, and Close. Buy/Sell is correctly unavailable and there is no separate Pass transfer action.

Impact: ordinary contract capability cannot substitute for the required user product operation; the frozen Phase 1 scope is incomplete. Macbeth01 selected the full product-operation option and rejected a low-level-only acceptance path.

Closure candidate: PR #27 head `332549c07239c41c1f1c3735cc1e5e8f247d3d6b` adds the exact
18-decimal Pass transfer product operation, fixed-recipient review, single-use submission,
contract-qualified read/registration paths and post-close rescue. Its targeted 125-test product
group passes. The finding remains `OPEN` until those changes are present in the exact unified
candidate and the real final browser journey passes; the checked-in PR #27 browser evidence names
older product and Chain/API source identities.

## Integration and external blockers

| ID           | State     | Basis                                                                                                                                                                | Owner / closure condition                                                                                    |
| ------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| M3-05-P1-B01 | `BLOCKED` | `npm run check` stops at `management:check` because shared C/R/S evidence is recorded for another branch. Macbeth05 will not rewrite shared generated PASS evidence. | Macbeth01 supplies an exact unified candidate with correctly regenerated evidence.                           |
| M3-05-P1-B02 | `BLOCKED` | No exact unified final candidate containing accepted 02/03/04 changes has been supplied.                                                                             | Macbeth01 supplies the candidate SHA/tree/source composition.                                                |
| M3-05-P1-B03 | `BLOCKED` | Historical final security review remains service-limited; ordinary functional QA and the local Slither pass are different evidence.                                  | Authorized qualifying service result for the exact candidate, or explicit closeout retaining the limitation. |
| M3-05-P1-B04 | `BLOCKED` | Real Robinhood Chain Testnet writes, deployment, signing, and broadcast are outside this task's authorization.                                                       | Separate applicable authorization and transaction/readback evidence.                                         |
| M3-05-P1-B05 | `NOT_RUN` | Hosted required checks and independent review are separate from Macbeth05's local evidence.                                                                          | Macbeth06/provider results and eligible independent approval on the exact candidate.                         |

## Resolved execution blocker

`M3-05-P1-X01` initially blocked the unchanged contract gate because the official index could not supply the locked Slither wheel set after the fixed compiler download had also timed out. It is `RESOLVED_FOR_LOCAL_REPRODUCTION`: all 47 wheel bytes and metadata were independently verified against the immutable lock, force-installed offline into this task's isolated venv, and the original gate subsequently passed. The earlier official-source/index failures remain recorded and no version, hash, index configuration, script, or security-service restriction was changed.

`M3-05-P1-B06` was reopened after the original temporary toolchain disappeared and is now
`RESOLVED_FOR_PR24_SOURCE_CHECKPOINT`. The original bootstrap independently restored Forge,
OpenZeppelin and all 47 hash-locked wheels. The fixed solc endpoint timed out twice, so Macbeth05
copied the approved public artifact bytes from a known local task environment into its own isolated
directory. Source and copy had distinct inodes, both were 35,738,976 bytes with SHA-256
`f5a243d6b2dd8fba307e36c5fefa2d8eb3ae74ba81036d1c17c971b5d346ade9`, and the copy was read-only.
The unchanged gate and coverage then passed independently. An exact unified candidate still
requires a fresh verification and rerun.
