# M3-01 partial on-chain integration acceptance matrix

Recorded: 2026-09-19

QA owner: `Macbeth05`

QA task identity: `AF-M3-05-INTEGRATION-ACCEPTANCE`

Parent integration task: `M3-01-PARTIAL-ONCHAIN-INTEGRATION`

## Intake state

- Formal repository: `pdbsy/quantpass-arbitrum-hackathon`.
- QA branch: `macbeth05/AF-M3-05-INTEGRATION-ACCEPTANCE`.
- QA intake HEAD: `1a7eab60b8ac93f8d0ee20068e7a22671e4197b3`.
- Approved runtime: Node `24.21.0`, npm `11.19.1`.
- Current remote master: `7ecba357d5a19f387e86f578822af04a6261fed2`.
- A new M3-01 integration branch, exact candidate SHA, and PR were not present at intake.
- The prior foundation candidate `919505b45572916a3868ecf355691fb09fa1e2c3` is impact-analysis input only. None of its previous PASS results is carried forward as acceptance of the new implementation.
- No merge, deployment, RPC operation, wallet signature, transaction broadcast, repository-setting mutation, or workflow edit was performed during this intake.

Status vocabulary: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `NOT_APPLICABLE`. Every item below starts `NOT_RUN` until executed against one exact M3-01 integration candidate. A missing exact candidate blocks execution but is not recorded as a product failure.

## Contract and protocol matrix: 37 required cases

| ID | Frozen requirement / expected result | Required execution evidence | Intake status | Evidence target / notes |
| --- | --- | --- | --- | --- |
| C-01 | 1 AF-USDC base unit converts to exactly `10^12` Pass raw units | Unit + boundary test | `NOT_RUN` | Exact final contract source and test name required. |
| C-02 | Capacity conversion reverts when `passRaw % 10^12 != 0` | Negative unit + fuzz | `NOT_RUN` | Must prove no truncation, rounding, or hidden dust. |
| C-03 | Ordinary Pass transfer retains full 18-decimal precision | ERC-20 unit + fuzz | `NOT_RUN` | Capacity divisibility must not restrict ordinary transfer. |
| C-04 | Vault creation rejects `owner == address(0)` | Negative unit | `NOT_RUN` | Verify constructor/factory path. |
| C-05 | Vault owner is explicitly supplied and does not default to `msg.sender` | Multi-actor unit | `NOT_RUN` | Include creator/factory caller distinct from owner. |
| C-06 | Factory owner does not automatically become Vault owner | Multi-actor unit | `NOT_RUN` | Inspect factory and deployed Vault state. |
| C-07 | Strategy creator has no automatic Vault asset authority | Access-control negative | `NOT_RUN` | Deposit/withdraw/close/rescue coverage. |
| C-08 | Strategy creator and Vault owner may be the same address | Positive unit | `NOT_RUN` | Role separation must not force distinct addresses. |
| C-09 | Strategy creator and Vault owner may be different addresses | Positive + negative access tests | `NOT_RUN` | Creator cannot use owner-only functions. |
| C-10 | Owner cannot transfer, renounce, reinitialize, or otherwise replace ownership | ABI/inheritance review + negative tests | `NOT_RUN` | Include upgrade/admin surfaces if present. |
| C-11 | Non-owner cannot deposit | Multi-actor negative | `NOT_RUN` | Third-party allowance must not bypass owner check. |
| C-12 | Non-owner cannot withdraw | Multi-actor negative | `NOT_RUN` | Contract enforcement, not UI-only. |
| C-13 | Non-owner cannot close | Multi-actor negative | `NOT_RUN` | Contract enforcement, not UI-only. |
| C-14 | Settlement recipient is fixed to Vault owner and cannot be changed to a third party | ABI review + negative tests | `NOT_RUN` | Deposit/withdraw/close/rescue signatures checked. |
| C-15 | Deposit 100 AF-USDC locks exactly 100 PASS | Unit + invariant | `NOT_RUN` | AF-USDC 6 decimals, Pass 18 decimals. |
| C-16 | Profit withdrawal unlocks no Pass | Accounting scenario + invariant | `NOT_RUN` | Example equity 150, principal 100, withdraw 30. |
| C-17 | Principal withdrawal unlocks Pass 1:1 with actual principal reduction | Accounting scenarios + fuzz | `NOT_RUN` | Profit portion must be consumed first under frozen rule. |
| C-18 | Principal loss does not automatically unlock Pass | Loss scenario + invariant | `NOT_RUN` | Loss cannot reduce locked capacity automatically. |
| C-19 | Full close after loss does not require principal top-up | Loss/close unit | `NOT_RUN` | Close settles remaining known assets only. |
| C-20 | Full close returns all remaining locked Pass | Close unit + invariant | `NOT_RUN` | Required Pass transfer failure must revert safely. |
| C-21 | Locked Pass is excluded from protocol-tracked non-USDC position blocking | Position/withdraw/close tests | `NOT_RUN` | Prevent self-deadlock after deposit. |
| C-22 | A non-zero protocol-tracked non-USDC strategy position blocks partial principal withdrawal | Position negative | `NOT_RUN` | Must use explicit protocol state, not raw token balance. |
| C-23 | A protocol-tracked position must be zero before full close | Position negative + settlement positive | `NOT_RUN` | Unknown dust is handled separately. |
| C-24 | Directly transferred unknown ERC-20 changes none of principal, equity, PnL, or capacity | Dust injection + state assertions | `NOT_RUN` | Use at least one ordinary external token. |
| C-25 | Unknown ERC-20 dust does not block withdraw | Dust/withdraw integration | `NOT_RUN` | No arbitrary-token enumeration. |
| C-26 | Unknown ERC-20 dust does not block close | Dust/close integration | `NOT_RUN` | Close handles protocol-known obligations only. |
| C-27 | Native dust does not block close | Forced/native transfer + close | `NOT_RUN` | Include receive/selfdestruct-style fixture as applicable. |
| C-28 | Active Vault cannot rescue | Negative unit | `NOT_RUN` | Token and native rescue paths. |
| C-29 | Non-owner cannot rescue after close | Multi-actor negative | `NOT_RUN` | Original immutable owner only. |
| C-30 | Rescue recipient is fixed to the original Vault owner | ABI review + balance assertions | `NOT_RUN` | No caller-selected recipient. |
| C-31 | Locked Pass is reserved and cannot be rescued as untracked excess | Reserved-balance negative | `NOT_RUN` | Must hold before and after close obligations. |
| C-32 | Rescue amount is exactly `max(actualBalance - reservedTrackedBalance, 0)` in each token's own units | Boundary + fuzz | `NOT_RUN` | Never subtract AF-USDC principal from another token. |
| C-33 | A malicious token rescue failure does not undo an already completed close | Adversarial token integration | `NOT_RUN` | Rescue is a separate post-close transaction. |
| C-34 | Required AF-USDC settlement failure prevents a false-success close | Failing token negative | `NOT_RUN` | State remains safely retryable or transaction reverts atomically. |
| C-35 | Required locked-Pass return failure prevents a false-success close | Failing token negative | `NOT_RUN` | State remains safely retryable or transaction reverts atomically. |
| C-36 | Withdraw, close, and rescue resist reentrancy and follow safe effects/interactions | Adversarial reentrancy tests + static review | `NOT_RUN` | Include token callbacks and state re-entry attempts. |
| C-37 | Extreme values do not overflow or truncate precision | Boundary + fuzz + invariant | `NOT_RUN` | Cover multiplication by `10^12`, principal/equity arithmetic, rescue differences. |

Required invariants to execute with recorded seed, runs, depth, and exact tool version:

| ID | Invariant | Intake status |
| --- | --- | --- |
| INV-01 | `lockedPassRaw` always maps exactly to recorded principal capacity | `NOT_RUN` |
| INV-02 | Untracked token transfer never increases withdrawable amount | `NOT_RUN` |
| INV-03 | A non-owner can never change Vault asset state | `NOT_RUN` |
| INV-04 | Rescue never reduces any `reservedTrackedBalance` | `NOT_RUN` |
| INV-05 | Successful close leaves no unfulfilled AF-USDC or locked-Pass protocol obligation | `NOT_RUN` |

## Indexer and reorg matrix: 14 required cases

| ID | Frozen requirement / expected result | Required execution evidence | Intake status | Evidence target / notes |
| --- | --- | --- | --- | --- |
| I-01 | Transaction block counts as confirmation 1 | Unit with explicit head/tx heights | `NOT_RUN` | Formula: `latestCanonical - transactionBlock + 1`. |
| I-02 | Confirmation 3 enters `soft-ready` | Unit at depths 1, 2, 3 | `NOT_RUN` | `softReadyDepth=3` must be configurable. |
| I-03 | `soft-ready` is never represented as finalized | Model/API/UI assertions | `NOT_RUN` | No irreversible/finality wording. |
| I-04 | Without verifiable L1 evidence, L1-posted/finalized remain unknown or not observed | Negative evidence test | `NOT_RUN` | No time- or depth-based promotion. |
| I-05 | Canonical block-hash change is detected as reorg | Fork fixture | `NOT_RUN` | Persist and compare block hashes. |
| I-06 | A common ancestor within 128 blocks is found | Bounded fork fixtures | `NOT_RUN` | Boundary cases 1 and 128. |
| I-07 | All events and derived state after the common ancestor are rolled back | Store integration | `NOT_RUN` | Not only transaction labels. |
| I-08 | Events replay from the block after the common ancestor | Rollback/replay integration | `NOT_RUN` | Projection rebuilt from canonical evidence. |
| I-09 | No common ancestor within 128 blocks enters degraded/manual recovery | Boundary case 129+ | `NOT_RUN` | `reorgSearchLimit=128` configurable. |
| I-10 | Degraded mode stops advancement based on stale projection | Integration/state test | `NOT_RUN` | Automated dependent actions stop. |
| I-11 | Degraded mode preserves history and failure evidence | Persistence/restart test | `NOT_RUN` | No silent reset to latest. |
| I-12 | Indexer degraded state does not become a contract withdraw/close permission condition | Contract/adapter integration | `NOT_RUN` | Owner live-RPC exit path remains available. |
| I-13 | Duplicate event processing is idempotent | Replay/restart test | `NOT_RUN` | Stable event identity and no double accounting. |
| I-14 | Removed/reorged logs cannot remain confirmed asset state | Removed-log/fork integration | `NOT_RUN` | API/UI projection must retract or mark stale. |

## Frontend and wallet matrix

| ID | Frozen requirement / expected result | Required execution evidence | Intake status | Evidence target / notes |
| --- | --- | --- | --- | --- |
| F-01 | Wrong network is detected and explained | Unit + browser | `NOT_RUN` | Robinhood Chain Testnet identity from approved config. |
| F-02 | Wallet connect, disconnect, account change, and chain change remain isolated | Unit + browser/provider mock | `NOT_RUN` | Preserve prior race protections; rerun on exact candidate. |
| F-03 | Owner and non-owner operation controls reflect contract authority | Unit + browser + contract simulation | `NOT_RUN` | UI hiding is not the security control. |
| F-04 | Pending, included, soft-ready, unknown, reorged, failed, and degraded states render distinctly | Unit + browser | `NOT_RUN` | L1-posted/finalized shown only with evidence. |
| F-05 | Soft-ready is not labelled final/finalized/irreversible | Content assertions + browser | `NOT_RUN` | Check all transaction surfaces. |
| F-06 | Mock/demo balances, PnL, and trading are labelled and cannot alter real Vault rights | Static + unit + browser | `NOT_RUN` | No mock success on live path. |
| F-07 | Degraded indexer displays stale-risk warning and stops stale automated actions | Unit + browser | `NOT_RUN` | Projection must not appear current. |
| F-08 | Degraded indexer does not hide owner withdraw/close; live RPC read/simulation path remains | Integration + browser | `NOT_RUN` | RPC outage must be described as chain connection failure. |
| F-09 | Display formatting never supplies authoritative contract amount arithmetic | Static + boundary unit | `NOT_RUN` | Integer base units through transaction preparation. |
| F-10 | Non-integral capacity input is warned before submission and still independently reverts on-chain | Unit + contract/browser integration | `NOT_RUN` | Frontend validation cannot replace contract validation. |

## GitHub security and admission matrix

| ID | Required evidence | Intake result | Exact intake evidence | Next condition |
| --- | --- | --- | --- | --- |
| G-01 | Original failing run/error retained | `PASS` | CodeQL run `35446059377`; Dependency Review run `35446059384` | Retain links and logs in M3-01 PR. |
| G-02 | Root cause established from logs, settings, and feature availability | `PASS` | Two independent causes are separated: the private-repository CodeQL job omits `actions: read`; Code Security/GHAS is also unavailable, while Dependency Graph SBOM API returns 200 and code-scanning API returns 403 disabled | Rerun after the permission fix to expose any remaining feature gate. |
| G-03 | Workflow permission review proves least privilege | `FAIL` | The CodeQL job explicitly scopes permissions but omits `actions: read`; unspecified permissions become `none`, and GitHub's official private-repository starter workflow requires job-level `actions: read` | Add only `actions: read` to the CodeQL job. |
| G-04 | Any workflow file change is reviewed and bound to exact candidate | `NOT_RUN` | Macbeth05 performed no workflow write; Macbeth01 will own the serialized change | Review the exact one-line permission change and rerun. |
| G-05 | Repository-setting before/after values are recorded | `NOT_RUN` | Before: private; Dependency Graph enabled; Code Scanning disabled; no setting changed by Macbeth05 | Only enable Code Security if already entitled and permitted; otherwise preserve blocker. |
| G-06 | Modified workflows produce successful authoritative checks | `NOT_RUN` | No M3-01 candidate/run exists | Required final exact-head provider readback. |
| G-07 | Required checks and branch protection remain unchanged or explicitly authorized | `PASS` for intake baseline | Active ruleset `master-protection` (`22507334`) targets `master`; required contexts are `verify`, `analyze-javascript-typescript`, `dependency-review`, `verify-macos`, and `verify-windows`; direct branch-protection endpoint returns 404 because protection is ruleset-based | Repeat readback on the final exact head and compare with this baseline. |

Current GitHub conclusion: one narrow YAML defect is proven. Add only job-level `actions: read` to the CodeQL job, matching GitHub's official private-repository starter workflow, and rerun before classifying the remaining failure. This permission fixes access to workflow-run metadata; it does not establish that private-repository Code Security/GHAS is available. Dependency Review already demonstrates that the separate feature gate is unsatisfied. If an existing, no-purchase entitlement is available, a repository admin may enable Code Security and rerun. Otherwise the affected checks remain real admission blockers. Do not broaden other permissions, use `continue-on-error`, skip PR triggers, set CodeQL upload to `never`, remove required contexts, change repository visibility, purchase a plan, or add credentials to manufacture green checks.

## Final-candidate evidence bundle to collect

The final M3-01 verdict requires one exact source SHA and tree, fixed base, integrated worker commits, clean isolated checkout, Node/npm/OS/CPU, lockfile digest, contract compiler and EVM configuration, ABI/creation/runtime bytecode digests, unit/fuzz/invariant/static-analysis commands and results, indexer and browser results, hosted run/job links, ruleset readback, and explicit `NOT_RUN` records for all unperformed Testnet work.

The following may support impact analysis but cannot satisfy the final matrix by themselves:

- prior PR #20 foundation checks;
- worker-authored PASS summaries;
- tests that exist but were not executed by Macbeth05;
- manager test results not independently repeated;
- CodeQL analysis that generated SARIF but could not complete the required hosted check;
- local/mock behavior presented as Testnet evidence.
