# Interim integration acceptance report

Status at this checkpoint: **integrated offline acceptance BLOCKED; Testnet NOT_RUN**.

## Versions reviewed

No single version was accepted. Static review was performed separately on:

- Macbeth02: `5d1a26d0dff967940dcf452ba9745d80ca9be12d`
- Macbeth03: `9f87275dc6c328ff0be10c7238a966109372856d`
- Macbeth04 delta: `9f87275dc6c328ff0be10c7238a966109372856d..0e5fed1bb67b8cda25cd837b37e25a6c02731067`

The QA branch began at registration base `7ecba357d5a19f387e86f578822af04a6261fed2`. That SHA does not contain the product deliveries and is not an acceptance candidate.

## What the static review established

- PR #18 implements useful protocol foundations, including an immutable-supply fractional Pass and typed Spot Swap test primitives. It does not implement the Vault/accounting/authorization closed loop required by the frozen product decisions.
- PR #17 implements substantial wallet/RPC lifecycle, indexer, projection, and adapter foundations. Two Low security/integrity issues must be repaired and retested before integration: submission context can change during a wallet prompt, and a late parent mismatch can leave a partial scan prefix readable as healthy.
- PR #16 installs its shell in the real `product-ui.ts` account and strategy pages. It keeps local and Testnet identities distinct, escapes display data, validates explorer hashes, and disables unsupported asset actions. It is not connected to live chain evidence or Pass/Vault actions.
- None of these results proves a wallet-to-contract-to-indexer-to-account loop.

## Failed, blocked, and not-run work

- `FAIL`: two reportable findings at the PR #17 head, `AF-M3-05-SEC-001` and `AF-M3-05-SEC-002`.
- `BLOCKED`: official combined candidate, final A/B milestone scope, Vault/accounting ABI and transition details, owner action rules, and finality/rebuild policy.
- `BLOCKED`: PR #16 clean hosted admission because one `verify*` run stops on history admission.
- `NOT_RUN`: approved-environment dynamic offline suite, contract analyzers, browser QA, E2E, local EVM reorg tests, and all Testnet work.
- `NOT_APPLICABLE`: none. Strategy execution is intentionally not classified this way until the scope is approved.

## Testnet conclusion

No real Testnet closed loop was attempted or completed. No Testnet read, wallet signature, deployment, transaction, or asset action was authorized. GOV/SUPPLY and write-plane conditions were not treated as satisfied.

## Required next actions

| Owner | Action | Resume condition |
| --- | --- | --- |
| Macbeth03 | Reproduce and repair `AF-M3-05-SEC-001/002`; add focused regressions | Publish a new immutable head and evidence for Macbeth05 retest. |
| Macbeth01 | Designate the official combined candidate and coordinate 02/03/04 ancestry | Supply one exact SHA; no 05-side merge/cherry-pick. |
| Macbeth01 / user | Freeze A/B scope and the accounting/ABI/owner/finality details needed by it | Update authoritative task/decision records. |
| Macbeth02 | Complete the Vault/accounting/authorization pieces required by the approved scope | Supply final ABI, events, errors, state transitions, and exact delivery SHA. |
| Macbeth04 | Rebase/compose against the accepted adapter and protocol surface, then clear hosted admission | Supply an exact product candidate with live evidence wiring or truthful remaining disablement. |
| Macbeth05 | Retest fixes, run approved-environment offline matrix, then issue a version-bound conclusion | All candidate and decision prerequisites satisfied. |
| User / governance owner | Authorize a bounded Testnet plan if real-chain acceptance is desired | Explicit chain/account/contracts/assets/limits/signing authorization and satisfied gates. |

No business repair, merge, approval, or Testnet action was performed by Macbeth05. This checkpoint is a durable handoff for the next exact SHA; it does not declare M3 complete.
