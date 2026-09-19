# Restart intake report

Recorded: 2026-09-19

Agent: `Macbeth05`

Task: `AF-M3-05-INTEGRATION-ACCEPTANCE`

## Identity

- Canonical repository: `pdbsy/quantpass-arbitrum-hackathon`; the configured `origin` matches it.
- QA branch: `macbeth05/AF-M3-05-INTEGRATION-ACCEPTANCE`.
- Registration base and initial QA HEAD: `7ecba357d5a19f387e86f578822af04a6261fed2`.
- Macbeth01 registered the task in PR #19. Its source registration commit is `1cfe2b6839fc3bf274df0ca49f032caded0b1dfa`; the current PR head is `b5d429c7a4a4dc05843d6233288d546596285879`.
- PR #19 is open and draft. Its task record explicitly permits intake documents and static review on this branch while withholding candidate-dependent dynamic acceptance.
- The worktree was clean before these records were created. No other worker's uncommitted state was modified, merged, reset, or cherry-picked.

## Baseline and deliveries

There is no designated combined acceptance SHA. The QA branch base is a registration base, not a product candidate.

| Delivery | Exact reviewed head | PR state at intake | Actual boundary |
| --- | --- | --- | --- |
| Macbeth02 protocol | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | PR #18 open, draft, unmerged | Fixed-supply fractional Pass, locker, test assets, Test Venue, and typed Spot Swap adapter. No Vault accounting, bounded Strategy Authorization, Risk Permit, owner exit, deployment, or frozen ABI. |
| Macbeth03 adapter | `9f87275dc6c328ff0be10c7238a966109372856d` | PR #17 open, draft, unmerged | ABI-independent wallet/RPC lifecycle, indexer/store, projection, and adapter foundations. No final owner-only ABI or deployment. |
| Macbeth04 product UI | `0e5fed1bb67b8cda25cd837b37e25a6c02731067` | PR #16 open, draft, stacked on PR #17 | Truthful product shell added to the real product pages. Live wallet/network/transaction evidence and Pass/Vault actions are not connected; actions are disabled. |

PR #16 is stacked on PR #17 and does not contain PR #18. PRs #17 and #18 independently target `master`. None is merged. Macbeth05 did not manufacture a combined tree.

## Scope

The product objective remains a usable Robinhood Chain Testnet edition. The delivered code is foundation work and does not implement the Wallet → Pass/Vault → confirmation → Indexer → Account closed loop.

The frozen decisions remain:

- Strategy Pass is creator-defined fixed supply, tradable and fractional. One Pass supplies one USDC of principal capacity; deposit locks capacity; profit withdrawal does not unlock it; principal withdrawal does; loss does not; full close releases the remainder.
- Execution uses the B2 Test Venue design and only a typed Spot Swap primitive.
- Strategy execution uses one bounded owner authorization, a per-trade Risk Execution Permit, Vault hard rules, owner revoke, and owner direct exit independent of the risk signer.

The current delivery does not resolve whether this acceptance milestone is limited to the Pass/Vault loop or also includes controlled strategy execution. Strategy execution is therefore not silently marked out of scope, and its absence is not converted into an implementation failure before the scope decision.

## Permissions and environment

- Read-only inspection and static diff review: authorized and completed.
- Candidate-dependent offline tests: authorized only after the candidate, scope, decisions, and approved environment are satisfied; currently `NOT_RUN`.
- Testnet read: not authorized.
- Testnet signing, deployment, approve, transfer, broadcast, or other writes: not authorized.
- Business-code repair by Macbeth05: not authorized.
- Merge or approval: not authorized.
- Approved runtime: Node `24.21.0`, npm `11.19.1`. The current shell exposed Node `24.2.0`, npm `11.3.0`; no dynamic acceptance result was produced in that environment.

## Consolidated questions and manager answers

### AF-M3-05-Q-001 — common candidate

- Question: Which exact SHA contains the official combination of 02–04?
- Checked: PR #16–#18 ancestry, heads, bases, task reports, and master.
- Answer from Macbeth01: no common candidate exists; Macbeth01 owns coordination. Macbeth05 must not merge or cherry-pick a candidate.
- Paused work: all integrated dynamic and final acceptance.

### AF-M3-05-Q-002 — milestone scope

- Question: Is this acceptance Pass/Vault only, or does it include bounded authorization, Risk Permit, and Spot Swap execution?
- Checked: current manager record and 02–04 delivery boundaries.
- Answer from Macbeth01: the total objective remains a usable Testnet product, but the present deliveries are foundations; A/B acceptance scope is not final because the delivery is incomplete.
- Paused work: final requirement classification and milestone verdict.

### AF-M3-05-Q-003 — protocol and finality details

- Question: What are the frozen withdrawal/dust transitions, Vault ABI/events/errors, owner identity/action rules, and finality/rebuild policy?
- Checked: delivery ABI drafts, adapter interfaces, management decisions, and task reports.
- Answer from Macbeth01: these details are not frozen.
- Paused work: accounting model tests, owner authorization tests, and policy-valued confirmation/rebuild acceptance.

### AF-M3-05-Q-004 — Testnet authority

- Question: Are Testnet reads or writes authorized for this task?
- Answer from Macbeth01: no Testnet read or write authority is granted.
- Paused work: all RPC, deployment, signing, broadcast, and public Testnet evidence collection.

The manager coordination answers above are session task coordination, not public Forum ACK evidence.

## Next checkpoint

Resume candidate-dependent work only after all of the following are available:

1. Macbeth03 publishes a new exact head addressing the two reportable static findings.
2. Macbeth01 designates one official combined candidate SHA containing the intended 02–04 content.
3. Macbeth01 or the user freezes the acceptance scope and the accounting/ABI/owner/finality details needed by that scope.
4. The approved Node/npm environment and isolated dependencies are available.
5. Testnet work remains separate and requires a later explicit operation-level authorization.
