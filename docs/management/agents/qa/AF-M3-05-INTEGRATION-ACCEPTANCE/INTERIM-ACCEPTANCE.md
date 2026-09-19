# Interim integration acceptance report

> Historical checkpoint: the missing-candidate condition recorded here was later resolved by PR #20. See `FOUNDATION-CANDIDATE-REVIEW.md` for the current version-bound verdict. Product acceptance remains blocked for different, concrete delivery gaps.

Status at this checkpoint: **integrated offline acceptance BLOCKED; Testnet NOT_RUN**.

## Versions reviewed

No single version was accepted. Static review was performed separately on:

- Macbeth02: `5d1a26d0dff967940dcf452ba9745d80ca9be12d`
- Macbeth03 replacement: `20347ec22729346d617525d64dc76f58354b5f0d`
- Macbeth04 replacement delta: `20347ec22729346d617525d64dc76f58354b5f0d..037c2b55f7eb03b80b60dd11f4b4c400fb9c1215`

The QA branch began at registration base `7ecba357d5a19f387e86f578822af04a6261fed2`. That SHA does not contain the product deliveries and is not an acceptance candidate.

## What the static review established

- PR #18 implements useful protocol foundations, including an immutable-supply fractional Pass and typed Spot Swap test primitives. It does not implement the Vault/accounting/authorization closed loop required by the frozen product decisions.
- PR #17 implements substantial wallet/RPC lifecycle, indexer, projection, and adapter foundations. The two Low issues reported against its old head are **FIXED** at `20347ec22729346d617525d64dc76f58354b5f0d`; an independent approved-runtime focused regression passed 42/42.
- PR #16 installs its shell in the real `product-ui.ts` account and strategy pages. It keeps local and Testnet identities distinct, escapes display data, validates explorer hashes, disables unsupported asset actions, and maps ambiguous wallet submissions without automatic retry. The exact replacement head passed an independent 71/71 focused regression and a diff scan found no reportable issue. It remains disconnected from live chain evidence or Pass/Vault actions.
- None of these results proves a wallet-to-contract-to-indexer-to-account loop.

## Failed, blocked, and not-run work

- `FIXED`: `AF-M3-05-SEC-001` and `AF-M3-05-SEC-002` at PR #17 replacement head `20347ec22729346d617525d64dc76f58354b5f0d`.
- `BLOCKED`: official combined candidate, final A/B milestone scope, Vault/accounting ABI and transition details, owner action rules, and finality/rebuild policy.
- `BLOCKED`: PR #16 clean hosted admission because current `verify*` jobs stop at history admission while the PR is stacked on a non-master base.
- `NOT_RUN`: common-candidate approved-environment suite, contract analyzers, browser QA, E2E, local EVM execution beyond the focused mock regressions, and all Testnet work.
- `NOT_APPLICABLE`: none. Strategy execution is intentionally not classified this way until the scope is approved.

## Testnet conclusion

No real Testnet closed loop was attempted or completed. No Testnet read, wallet signature, deployment, transaction, or asset action was authorized. GOV/SUPPLY and write-plane conditions were not treated as satisfied.

## Required next actions

| Owner | Action | Resume condition |
| --- | --- | --- |
| Macbeth03 | Preserve the verified fixes and exact evidence for `AF-M3-05-SEC-001/002` | Ensure `20347ec22729346d617525d64dc76f58354b5f0d` reaches the accepted integration ancestry unchanged. |
| Macbeth01 | Designate the official combined candidate and coordinate 02/03/04 ancestry | Supply one exact SHA; no 05-side merge/cherry-pick. |
| Macbeth01 / user | Freeze A/B scope and the accounting/ABI/owner/finality details needed by it | Update authoritative task/decision records. |
| Macbeth02 | Complete the Vault/accounting/authorization pieces required by the approved scope | Supply final ABI, events, errors, state transitions, and exact delivery SHA. |
| Macbeth04 | Retarget after PR #17 reaches `master`, rerun required hosted checks, and compose against the final protocol surface | Supply a clean exact product candidate with live evidence wiring or truthful remaining disablement. |
| Macbeth05 | Retest fixes, run approved-environment offline matrix, then issue a version-bound conclusion | All candidate and decision prerequisites satisfied. |
| User / governance owner | Authorize a bounded Testnet plan if real-chain acceptance is desired | Explicit chain/account/contracts/assets/limits/signing authorization and satisfied gates. |

No business repair, merge, approval, or Testnet action was performed by Macbeth05. This checkpoint is a durable handoff for the next exact SHA; it does not declare M3 complete.
