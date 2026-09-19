# Findings and follow-up

## Unified foundation candidate disposition

Current reviewed candidate: PR #20 head `919505b45572916a3868ecf355691fb09fa1e2c3`.

| ID | Severity | Current status | Exact evidence |
| --- | --- | --- | --- |
| `integration-identity.merge-group-fixed-base-bypass` | Low, high confidence | **FIXED** | Initial finding in scan `fcd15838-e8e3-4026-9aad-df58a2038ea9`; fixed by source commit `5170886c1780bf265b864d1e4a0d37d71a262960` and independently verified at final head with fixed/advanced-base, manifest-deletion, ordinary-queue, and original reproducer coverage. |
| `integration-identity.same-name-fork-bypass` | Low, high confidence | **FIXED** | Initial finding in scan `fcd15838-e8e3-4026-9aad-df58a2038ea9`; canonical head/base repository and refs are now required. Foreign and missing head/base repository cases fail closed. |
| `AF-M3-05-FU-002` | Potential Low | **FIXED** | Commits `4f54f94ddfafdd101c4b6b0ec1937859ba596829` and `91777c93c52011b13515d44056a9b56cfefc3c2a`; independent 15/15 focused tests. |
| `AF-M3-05-FU-003` | Previously deferred | **FIXED** for the original security boundary | Macbeth03 source `588efa531b83548ffa7b1b01f976dfc49ff470b7`; independent 60/60 chain/wallet/adapter tests. The API/UI product composition remains absent and is not accepted. |
| `AF-M3-05-FU-001` | Unassigned | **FOLLOW_UP** | Test Venue quote trust remains relevant only when a future Vault/risk consumer derives execution bounds from it. Strategy execution is deferred in the current scope. |

The final candidate retains a product delivery blocker rather than an unresolved reportable security finding: the required Pass/Vault implementation and real end-to-end product composition are absent.

## Historical reportable findings — fixed on the replacement PR #17 head

### AF-M3-05-SEC-001 — Wallet context can change while submission is pending

- Severity: **Low**, high-confidence static finding.
- Requirement: signing/submission must remain bound to the checked wallet account and Robinhood Chain Testnet context; switching chain or account during submission must invalidate or explicitly make the outcome ambiguous.
- Exact source: Macbeth03 PR #17 head `9f87275dc6c328ff0be10c7238a966109372856d`.
- Location: `apps/web/src/chain-wallet.ts:206-249`.
- Preconditions: an action is prepared; the wallet account or chain changes after preflight checks and before `eth_sendTransaction` resolves; the provider accepts the changed context.
- Minimal static reproduction: inspect `submitAction`; it reads/checks account and chain before the RPC call, then trusts the returned hash without a provider-session epoch, change listeners, or a post-response account/chain check.
- Expected: the context change invalidates the submission or returns an explicit ambiguous result requiring reconciliation.
- Actual: a syntactically valid hash returns a submitted operation stamped with the configured chain and prechecked owner.
- Impact: a same-user timing race may create or attribute a side effect on a different wallet context. Configured-chain backend reconciliation reduces false final confirmation but does not undo a wrong-context submission.
- Owner: Macbeth03.
- Remediation direction: maintain an account/chain session epoch, invalidate on `accountsChanged`/`chainChanged`, check the epoch and current context after the RPC resolves, and represent ambiguous submission separately.
- Retest: mocked mid-request account and chain changes, including A → B → A, rejection, late hash, and confirmation reconciliation, on the new exact SHA.
- Impact tags: `MERGE_BLOCKER` for PR #17/current adapter head; `OFFLINE_ACCEPTANCE_BLOCKER` for any common candidate containing it.
- Evidence: Codex Security diff scan `f91656d0-9132-4bc0-b547-bcca503ecad3`; canonical finding `wallet-submission.context-race`, finding ID `csf_676eac01b5c6426c1dbfad18`, occurrence `occ_d7e3d20e6ff651efe39bf505`.
- Verification status: **FIXED** at PR #17 head `20347ec22729346d617525d64dc76f58354b5f0d`. Independent exact-head regression covered mid-request account/chain changes, A → B → A, provider uncertainty, and optional late hashes; 42/42 focused tests passed under Node `24.21.0` and npm `11.19.1`. Post-response context checks, provider event epochs, and `SUBMISSION_AMBIGUOUS` with `retryable: false` close the reported path.

### AF-M3-05-SEC-002 — A late parent mismatch can leave a partially committed projection healthy

- Severity: **Low**, high-confidence static finding.
- Requirement: reorg and parent-mismatch handling must roll back orphan-derived events/projections or deny reads until recovery.
- Exact source: Macbeth03 PR #17 head `9f87275dc6c328ff0be10c7238a966109372856d`.
- Locations: `apps/server/src/chain-sync.ts:226-250`; `apps/server/src/chain-store.ts:432-465,858-886`.
- Preconditions: one `syncTo` call processes multiple blocks; at least one earlier block in that call is committed; a later fetched block does not descend from the now-current checkpoint.
- Minimal static reproduction: follow the per-block commit loop, then the later parent comparison. The mismatch throws before applying the later block but does not roll back blocks already committed by the same call and does not mark the store unhealthy. `projection()` continues serving while health remains true.
- Expected: roll back to the scan-start checkpoint, or mark the projection unavailable/unhealthy until canonical recovery.
- Actual: an earlier block from the abandoned scan prefix can remain readable as healthy.
- Impact: Account state may temporarily reflect an orphan fork during a reorg or inconsistent RPC sequence. Custody remains chain-authoritative, limiting impact.
- Owner: Macbeth03.
- Remediation direction: make the multi-block sync atomic relative to its starting checkpoint, or set a general unhealthy state before exposing reads; recover only after canonical rollback/rescan.
- Retest: a two-block fork-straddle test that commits the first fetched block and mismatches the next, followed by assertions for rollback or denied projection reads, then reconfirmation.
- Impact tags: `MERGE_BLOCKER` for PR #17/current adapter head; `OFFLINE_ACCEPTANCE_BLOCKER` for any common candidate containing it.
- Evidence: Codex Security diff scan `f91656d0-9132-4bc0-b547-bcca503ecad3`; canonical finding `indexer-sync.partial-commit`, finding ID `csf_d3eb78155bfb686b714b229c`, occurrence `occ_173ce85b95d7730dc2115a24`.
- Verification status: **FIXED** at PR #17 head `20347ec22729346d617525d64dc76f58354b5f0d`. Independent exact-head regression covered cross-fork parent mismatch, restart, and competing synchronizers; 42/42 focused tests passed. Persistent sync targets and owner leases prevent competing commits, projection reads require a healthy owned checkpoint, and health is restored only after the indexed/projected target is reached.

The fixes were verified with the `codex-security:verify-fix` workflow against exact source `20347ec22729346d617525d64dc76f58354b5f0d`. This closes the two old finding paths only; it does not accept a combined product candidate or authorize Testnet.

## Follow-up security candidates

### AF-M3-05-FU-001 — Test Venue quote trust boundary

- Severity: unassigned; current disposition `FOLLOW_UP`.
- Exact source: Macbeth02 PR #18 head `5d1a26d0dff967940dcf452ba9745d80ca9be12d`.
- Locations: `contracts/src/AlphaForgeTestVenue.sol:60,82,95`.
- Evidence: public `addLiquidity` accepts arbitrary reserve ratios, so an untrusted account can change the venue quote.
- Current counterevidence: no Vault, Risk Permit service, production quote consumer, or min-amount policy exists in this delivery. The venue is explicitly test-only.
- Re-evaluate when: the final Vault/risk service chooses which venue quote is trusted or derives `minAmountOut`.
- Required check: prove the consumer treats the venue quote as manipulable, enforces an independent slippage bound, and cannot be induced to authorize an unsafe trade.
- Evidence source: PR #18 scan `dd275442-ca10-4950-8c4a-03dbbb305be9`.

### AF-M3-05-FU-002 — `productReady` precedes contradictory failure checks

- Severity: potential Low; current disposition **FIXED**.
- Exact source: Macbeth04 PR #16 head `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` stacked on fixed PR #17 head `20347ec22729346d617525d64dc76f58354b5f0d`.
- Location: `apps/web/src/m3-product-shell.ts:164-181`.
- Evidence: `transactionPresentationFromEvidence` immediately returns `READY` when `productReady` is true, before checking `REORGED`, reverted receipt, failed reconciliation, or stale projection.
- Current counterevidence: the intended `operationEvidence` constructor creates a correlated frozen object, repository search finds no production caller of the presentation helper, and the real product entrypoint passes no transaction evidence at all.
- Re-evaluate when: the final API/cache/UI composition supplies `ProductOperationEvidence`, especially if fields come from separate requests, caches, or decoded JSON.
- Required check: malformed and non-atomic evidence must fail closed; contradictory failure fields can never display `READY`.
- Evidence source: PR #16 replacement scan `ad808dec-fc29-41fb-ad91-fd7540cab616`, candidate `candidate-8e43751ee7355a25` (0 reportable findings; partial coverage because final composition is absent).
- Verification status: **FIXED** at unified candidate head `919505b45572916a3868ecf355691fb09fa1e2c3`. The test-first change `4f54f94ddfafdd101c4b6b0ec1937859ba596829` covers contradictory `productReady: true` inputs; implementation `91777c93c52011b13515d44056a9b56cfefc3c2a` checks lifecycle, receipt, reconciliation, and projection failure first. Independent exact-source execution passed 15/15 under Node `24.21.0`.

### AF-M3-05-FU-003 — Product readiness does not bind projection block hash or canonical ancestry

- Severity: unknown; current disposition `DEFERRED` with medium confidence.
- Exact original source: Macbeth03 PR #17 head `9f87275dc6c328ff0be10c7238a966109372856d`.
- Current static status: the same readiness logic remains at Macbeth03 head `20347ec22729346d617525d64dc76f58354b5f0d` and Macbeth04 stacked head `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215`.
- Location: `apps/web/src/strategy-adapter.ts:23-59`.
- Evidence: `projectionState` compares stale state, chain, owner, contract, and block height but does not use `projection.blockHash` or prove that a later projection descends from the operation block. A confirmed, canonical, reconciled operation can therefore combine with an independently cached same-height or later competing-fork projection and produce `productReady`.
- Current counterevidence: the backend's known-reorg path marks operations `REORGED` and deletes affected projections together. No concrete Account API/UI composition currently combines independently cached records; a same-checkpoint atomic read contract could prevent the mixed-fork input.
- Re-evaluate when: the final API/cache composition and its canonical checkpoint or ancestry contract are available.
- Required check: a same-height mismatched block hash and a higher unproven competing-fork projection must not become ready; records from different cache epochs must fail closed; a higher projection may become ready only with verifiable ancestry or an equivalent atomic canonical checkpoint.
- Evidence source: PR #17 scan `f91656d0-9132-4bc0-b547-bcca503ecad3`, candidate `candidate-493db71e81bc7950`.
- Verification status: **FIXED** for the original security boundary at Macbeth03 source `588efa531b83548ffa7b1b01f976dfc49ff470b7`, included by unified candidate `919505b45572916a3868ecf355691fb09fa1e2c3`. The client-side raw composition helper is removed. `ChainStore.operationEvidence` verifies operation-to-checkpoint canonical ancestry, projection and endpoint hashes, continuous heights, and every parent edge in one SQLite read transaction, with a 2,000-block fail-closed bound. Independent exact-source chain/wallet/adapter execution passed 60/60 under Node `24.21.0`. No production API/UI caller exists, so this closure does not claim completion of the product path.

## Evidence and admission gaps

- PR #20 final head `919505b45572916a3868ecf355691fb09fa1e2c3` is a unified source-bound foundation candidate. It still lacks the required Pass/Vault implementation and live wallet-to-Account composition, so product acceptance remains `PARTIAL_BLOCKED`.
- At the final provider checkpoint, all Linux, macOS, and Windows engineering-check runs had passed. CodeQL completed source extraction and analysis, then failed at result upload/run metadata access with `Resource not accessible by integration`. Dependency review failed because the repository/account did not expose the required feature.
- Manager-reported full-suite, Forge, Slither, and artifact-equivalence results are supporting evidence and are not relabelled as Macbeth05 independent execution.

- PR #18's committed management receipt records Foundry, fuzz, invariant, and Slither as `NOT_RUN` because the approved toolchain was unavailable. This prevents an independent contract-test acceptance claim; it is not itself a vulnerability.
- PR #16 head `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` has no clean hosted acceptance: all current `verify`, `verify-windows`, and `verify-macos` jobs stop at history admission because the stacked PR base is not `master`. They must be rerun after PR #17 reaches `master` and PR #16 is retargeted.
- All three product PRs remain draft and unmerged. No deployment manifest or verified runtime bytecode exists.
