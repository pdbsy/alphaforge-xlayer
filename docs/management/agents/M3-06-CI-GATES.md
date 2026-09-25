> Current phase-one assignment (2026-09-20): see [fixed-base task registry](../phase1/ASSIGNMENTS.md). Master is `18f5352070910a867b9729b031aa2e3951785e01`; earlier candidates, task tables and no-assignment states below are historical. No merge/deployment authority or independent approval is implied.

# Macbeth06 CI and merge-gate assignment

Registered by Macbeth01 on 2026-09-20 following the user's explicit request for a sixth worker dedicated to gates and CI checks. This supersedes the historical no-new-worker instruction only for this role. It grants no merge, deployment or protection-bypass authority.

| Field | Assignment |
| --- | --- |
| Agent / task | Macbeth06 / M3-06-CI-GATES |
| Repository / default branch | pdbsy/quantpass-arbitrum-hackathon / master |
| Manager | Macbeth01 |
| Initial candidate | PR #21, ca43c9684fbf34c34d5dd81382df158e2a9ebc0b |
| Candidate branch | macbeth01/m3-partial-onchain-integration |
| Candidate fixed base | 7ecba357d5a19f387e86f578822af04a6261fed2 |
| Working scope | Read-only CI, ruleset, review and evidence checks; actionable implementation proposals |
| Evidence destination | Own task/report and user-authorized receipt to Macbeth01 |

## Responsibilities

1. Re-read the actual PR head before each conclusion. Record workflow run/job links, checkout SHA, result and observation time. Distinguish test failures, unavailable platform features, missing approvals and unexecuted checks.
2. Diagnose CI failures and reproduce applicable local/mock checks using the approved exact toolchain in an isolated workspace. Logs belong to that worker; never manufacture PASS or reuse a prior head's results for a later commit.
3. Prepare a concrete CI plan for the existing locked Foundry tests, fuzz, invariants, Slither and ABI checks, respecting runner architecture, artifact provenance and supply-chain policy.
4. Compare replacement options for unavailable CodeQL and Dependency Review, including their coverage gaps, precise dependencies, license/source qualification, permissions and failure behavior. The user's current direction keeps the repository private without a purchase or migration. A substitute must not claim equivalence or reuse an unavailable check's name to create apparent success.
5. Maintain a clear ready-to-merge assessment. A green engineering suite cannot supply a missing independent reviewer or close GOV-001/SUPPLY-001 by itself.

## Integration and limits

Macbeth01 retains code/integration ownership during the initial audit. Later implementation requires a designated exact base and file boundary, because an ordinary worker branch cannot inherit arbitrary manager/other-worker commits and pass strict attribution. Do not weaken identity verification to solve that dependency.

This role does not rerun Macbeth05's restricted final security review through a different identity or tool. It is engineering verification, not independent GitHub approval. Do not change rulesets, review thresholds, repository visibility, billing, secrets or privileges; do not merge, deploy, sign, broadcast or start further workers. Current review requirements remain in force.

Missing prerequisites remain BLOCKED/NOT_RUN. Historical observations at the initial candidate include three successful engineering platforms and two unavailable GitHub security features; Macbeth06 must independently read their current operational state before reporting. No success or self-confirmation is preassigned by this record.

## Actual initial receipt

Macbeth06 app task `01a0bb1b-3079-7882-af14-56ff1a68843d` sent its own read-only receipt on 2026-09-20. It verified the canonical private repository, PR #21 head `ca43c9684fbf34c34d5dd81382df158e2a9ebc0b` and master `7ecba357d5a19f387e86f578822af04a6261fed2`; its initially created worktree was detached at historical `45e80f9`, so it inspected fetched candidate files separately without relabelling the checkout. It confirmed three successful PR Engineering jobs (run 35462440409), the two platform-feature failures, five unchanged required checks and no reviews. Its default Node/npm were outside the approved baseline and it did not claim new local test results. This self-reported app receipt supports registration status only; Forum communication remains UNVERIFIED and independent approval remains absent.
