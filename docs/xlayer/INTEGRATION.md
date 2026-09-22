# AlphaForge X Layer integration

Project: AlphaForge-XLayer  
Track: X Layer  
Repository: pdbsy/alphaforge-xlayer  
Manager: XLayerPM  
Task: AF-XLAYER-MIGRATION  
Candidate PR: https://github.com/pdbsy/alphaforge-xlayer/pull/1

This is the offline X Layer adaptation candidate. No merge, deployment, signing, broadcast or live RPC verification has occurred. X Layer remains NOT_DEPLOYED, with all deployment inputs null. The default upstream path remains available for regression coverage.

## Included work

| Source task | Public PR | Reviewed source head | Integration |
| --- | --- | --- | --- |
| AF-XLAYER-02-CONTRACTS | https://github.com/pdbsy/alphaforge-xlayer/pull/2 | `e86728cb4692550dcf98124108c19f085d28b3f6` | Explicit 1952/OKB template; strict offline validation; local domain and custody tests |
| AF-XLAYER-03-ADAPTER | https://github.com/pdbsy/alphaforge-xlayer/pull/4 | `966b5c69e5b03ab8b45c9edfaad94b826ca3c243` | Runtime allowlist; trusted expected network; cross-chain/contract evidence isolation |
| AF-XLAYER-04-UI | https://github.com/pdbsy/alphaforge-xlayer/pull/3 | `8e998902a3d391b987c419833ca96a72f1fe881b` | Explicit network display, explorer and gas; stale wallet/review invalidation |
| AF-XLAYER-05-QA | https://github.com/pdbsy/alphaforge-xlayer/pull/5 | `5c843e6c16d418d8584c4d484b4937c5fb396170` | Independent adversarial tests; combined candidate acceptance pending |
| AF-XLAYER-06-CI | https://github.com/pdbsy/alphaforge-xlayer/pull/6 | `a4a490a82b662be5a4684bbc2da3021dd002013d` | Exact new repository binding; preserve upstream evidence and all gates; strict integration source replay and explicit contract-template CI gate |

All worker imports preserve original authors and messages. Original source branches remain published. Manager additions are separately attributed. Project ownership is mandatory in every dispatch and receipt; parallel Robinhood tasks, repositories, data and acceptance are independent.

## Manager verification checkpoints

- Foundation candidate `d982e3207438953c0a61af8c9cacb3497fe62202`: full local check passed, 599 tests. Its actual source/manifest/snapshot chain is historical to later imports.
- First combined implementation `4a2504c`: 654 tests passed, no failures/skips; typecheck, lint, formatting, bounded scans, both network checks, governance, supply, planning and Forum checks passed. Management replay rejected the old snapshot with RECORDED_GIT_DESCENDANT_PATH_MISMATCH, correctly requiring fresh evidence.
- The new explicit `xlayer:build` command builds static assets with the reviewed X Layer pair, irrespective of ambient Vite chain selection. Both builds remain in `check` and the management build collector.
- The inherited identity gate rejected the mixed-author range. AF-XLAYER-06-CI now registers only this canonical repository/branch/fixed base, requires original author/message bytes and the exact Git tree produced by replaying each original change, and preserves all prior worker/manager rules. Its initial comparison had two independently reproduced P2 defects (relocated changes and lossy byte decoding), corrected at a4a490a and independently retested by03. No check is skipped.
- Adding the independent QA tests to the combined implementation first produced 21 PASS / 5 FAIL. Three failures assert the older wallet read count; two involve the QA provider mock supporting only one callback per event while the new runtime adds temporary listeners. Macbeth05 corrected the provider to Node EventEmitter semantics and strictly limited permitted RPC reads; its independent combined rerun and the manager rerun both passed 26/26. Original failures remain recorded.
- Final combined source C, manifest R, snapshot S and independent QA remain pending. Source-bound worker logs do not certify the combined candidate.

## Review and remaining boundaries

The manager reviewed contract template/validator, adapter and wallet/runtime changes. Separate foundation and PR6 engineering diff reviews found no P1/P2 issues in their bounded scopes. Additional review agents failed to start because of a platform account error; this is not an approval. Existing Macbeth05 remains assigned independent combined-candidate acceptance.

Independent Macbeth03 review of `0e31259c583fed08375c09018f778a4de8bc7c7d` reproduced a separate P2 session-invalidation defect using a correct multi-listener provider. Pending action review, pending approval review and pending confirmation could cross session invalidation and later return/send under a restored account/chain. These are three local mocked reproductions, not real wallet transactions or evidence that X Layer writes were enabled. An inner-wallet event control correctly rejected submission. The [public review receipt](https://github.com/pdbsy/alphaforge-xlayer/pull/4#issuecomment-5778401685) contains executable reproductions. Macbeth04 fixed the session epoch at fe8a7ac. Macbeth03 independently verified85 existing and8 additional cases, closing the three original paths while preserving post-send ambiguity. The [fix review](https://github.com/pdbsy/alphaforge-xlayer/pull/4#issuecomment-5778754708) is bounded engineering acceptance; final combined05 acceptance remains separate.

Hosted CI is not all green. Previous worker runs stopped at inherited repository checks or old management snapshot identity. Gitleaks also reported two historical generic-api-key matches: one ordinary scope phrase and one Git tree identifier, independently classified by Macbeth06 with redacted fingerprints. Published history and scanner policy remain unchanged; these failures are not relabeled PASS. Newly adapted CI and fresh C/R/S require their own exact-head hosted results.

Inherited soft-ready depth 3 and reorg window 128 are implementation assumptions, not verified X Layer finality. Real RPC/VM compatibility, deployed addresses and transaction execution remain NOT_RUN. Local contract and mocked transaction tests are not live-chain acceptance. External governance and independent GitHub approval remain separate requirements.

## Final source freeze protocol

The manager's final source commit includes every implementation, exact source/import mapping, test registration and these source-time status records. Final results are published on PR1 and generated through the genuine management collector; they are never copied into historical PASS logs. Follow-up worker documentation may advance its source branch, but the manifest pins the exact reviewed ancestor and will reject importing any unmapped later changes.

Current runtime combination `5ae84a7` passed 697/697 tests plus typecheck. Contract component at `0e31259` independently passed 28 Python/127 Solidity tests and ABI/Slither; final contract subtree is compared to63857df59e7f222d0cdcbf4b84369e7adb1a6b0c, without claiming a new execution. Source mapping and the updated CI test suite require final candidate verification.

Historical scanner content classification received a separate [bounded independent review](https://github.com/pdbsy/alphaforge-xlayer/pull/2#issuecomment-5778776930): the matched ordinary phrase and Git tree identifier are supported by exact public Git objects and value digests. Raw scanner Fingerprints and full-history coverage were not independently rechecked. This does not authorize broad exclusions or change the original scanner failures.
