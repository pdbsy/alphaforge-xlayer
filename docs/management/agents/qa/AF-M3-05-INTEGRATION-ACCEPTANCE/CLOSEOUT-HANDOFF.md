# AF-M3-CLOSEOUT QA handoff

Recorded: 2026-09-19

Owner: `Macbeth05`

This record supplements the immutable history at QA commits `728d0268fcbe6bd2e628972779596f72e6e62c8c` and `2efed688353579160a5f03ed4fa1f4b52178ecdf`. It does not rewrite the conditions or results recorded at those checkpoints.

## Current acceptance scope

The later user closeout instruction resolves the earlier A/B scope question:

- The required current-stage scope is the Pass/Vault user journey before strategy execution.
- Strategy execution, autonomous trading, bounded Strategy Authorization, Risk Permit, and the complete execution system are explicitly deferred.
- Existing B2 Test Venue and typed Spot Swap foundations still require security review when included, but they do not substitute for the Pass/Vault delivery and do not establish a completed strategy-execution flow.
- Missing Pass/Vault capabilities remain current-stage delivery gaps and must not be reclassified as future follow-up merely because implementation is incomplete.

This scope update supersedes the earlier `A/B pending` coordination status for closeout planning. It does not retroactively turn any unexecuted check into a pass.

## Evidence binding

| Evidence | Exact version | Qualification |
| --- | --- | --- |
| Macbeth02 protocol static review | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | Separate PR #18 slice; no integrated Pass/Vault runtime acceptance. |
| Macbeth03 security-fix verification | `20347ec22729346d617525d64dc76f58354b5f0d` | 42/42 focused tests; `AF-M3-05-SEC-001` and `AF-M3-05-SEC-002` fixed on this exact source. |
| Macbeth04 focused review | `20347ec22729346d617525d64dc76f58354b5f0d..037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` | 71/71 focused tests and 0 reportable findings in scan `ad808dec-fc29-41fb-ad91-fd7540cab616`; one composition-dependent candidate deferred. |
| QA focused-retest report | `2efed688353579160a5f03ed4fa1f4b52178ecdf` | Report commit, not a product candidate. Results apply only to the exact slices above. |

The 42/42 and 71/71 results must not be combined into an overall pass. A unified candidate containing the intended Macbeth02, Macbeth03, and Macbeth04 content has not yet been supplied to Macbeth05.

## Retest requirements for the unified candidate

When Macbeth01 supplies one immutable integration SHA, Macbeth05 will independently verify that SHA and its actual remote/CI state. The matrix must cover the current Pass/Vault scope, including contract accounting and authorization boundaries, wallet transaction ambiguity, confirmation/reconciliation, index recovery, cross-account and cross-strategy isolation, and the real browser entrypoint.

The existing deferred candidates retain these bounded retest conditions:

- `AF-M3-05-FU-001`: if the integrated Pass/Vault code consumes a Test Venue quote or derives `minAmountOut` from it, prove the quote is treated as manipulable and an independent slippage bound fails closed. If the execution path remains outside the approved scope, retain the code-security limitation without claiming a completed execution flow.
- `AF-M3-05-FU-002`: once the real entrypoint composes `ProductOperationEvidence`, contradictory lifecycle, receipt, reconciliation, or projection states must never display `READY`. Exercise malformed and non-atomic evidence at the actual call site.

No new dynamic candidate is inferred from the separate slice results. The final candidate determines any additional impact-based retest.

## Current limits

- Unified-candidate QA: `NOT_RUN` pending Macbeth01's exact integration SHA.
- Testnet: `NOT_RUN`; no read, signing, deployment, approval, transfer, transaction, or broadcast authority was granted to this QA task.
- Merge and approval: not performed by Macbeth05.
- This AI-assisted review is not a third-party security audit or formal repository approval.
