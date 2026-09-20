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

Actual: Node reports 91.67% lines, 84.67% branches, and 94.30% functions for loaded test files, but only 77 of 98 first-party executable files appear. A separate real-workflow collection probe increased representation to 78 / 98 and proved npm/Node child-process union collection, but the admitted tools still cannot derive comparable runtime ranges for unexecuted files or production browser TypeScript/TSX. Actual combined JS/TS overall coverage therefore remains `NOT_MEASURED`; [Complete Coverage Collection Method](COVERAGE-COLLECTION-METHOD.md) records the reproducible separation. Critical JS/TS branches include values from 52.69% to 98.77%. First-party Solidity totals 95.24% lines and 66.23% branches; AlphaForgeVault has 65.12% branch coverage and PassLocker 77.78%. The earlier 99/22 checkpoint was an off-by-one inventory error caused by retaining one `.d.ts` declaration in a list whose stated method excluded declarations; [Coverage Gaps](COVERAGE-GAPS.md) preserves the correction and complete evidence.

Impact: the base cannot demonstrate the project quality bar and leaves authorization, accounting, RPC, ABI, recovery, and allowance branches unexercised.

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
