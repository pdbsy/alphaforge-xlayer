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
| AF-XLAYER-02-CONTRACTS | https://github.com/pdbsy/alphaforge-xlayer/pull/2 | `000063f5b6bc257d63bc3426ee5ec20423aa475c` | Explicit 1952/OKB template; strict offline validation; local domain and custody tests |
| AF-XLAYER-03-ADAPTER | https://github.com/pdbsy/alphaforge-xlayer/pull/4 | `966b5c69e5b03ab8b45c9edfaad94b826ca3c243` | Runtime allowlist; trusted expected network; cross-chain/contract evidence isolation |
| AF-XLAYER-04-UI | https://github.com/pdbsy/alphaforge-xlayer/pull/3 | `37e6045de7ca87f9e06cc45237d6c495d3442f7f` | Explicit network display, explorer and gas; stale wallet/review invalidation |
| AF-XLAYER-05-QA | https://github.com/pdbsy/alphaforge-xlayer/pull/5 | Pending final receipt | Independent adversarial tests and candidate acceptance |
| AF-XLAYER-06-CI | https://github.com/pdbsy/alphaforge-xlayer/pull/6 | `0244de746dd532336a8314ac72ce34d84a75f0bc` | Exact new repository binding; preserve upstream evidence and all gates; manager integration follow-up pending |

All worker imports preserve original authors and messages. Original source branches remain published. Manager additions are separately attributed. Project ownership is mandatory in every dispatch and receipt; parallel Robinhood tasks, repositories, data and acceptance are independent.

## Manager verification checkpoints

- Foundation candidate `d982e3207438953c0a61af8c9cacb3497fe62202`: full local check passed, 599 tests. Its actual source/manifest/snapshot chain is historical to later imports.
- First combined implementation `4a2504c`: 654 tests passed, no failures/skips; typecheck, lint, formatting, bounded scans, both network checks, governance, supply, planning and Forum checks passed. Management replay rejected the old snapshot with RECORDED_GIT_DESCENDANT_PATH_MISMATCH, correctly requiring fresh evidence.
- The new explicit `xlayer:build` command builds static assets with the reviewed X Layer pair, irrespective of ambient Vite chain selection. Both builds remain in `check` and the management build collector.
- Current manager identity gate rejects a mixed-author worker range on the unregistered manager branch. AF-XLAYER-06-CI is implementing a narrowly registered integration path with pinned original/imported Git evidence; no check is skipped.
- Final combined source C, manifest R, snapshot S and independent QA remain pending. Source-bound worker logs do not certify the combined candidate.

## Review and remaining boundaries

The manager reviewed contract template/validator, adapter and wallet/runtime changes. Separate foundation and PR6 engineering diff reviews found no P1/P2 issues in their bounded scopes. Additional review agents failed to start because of a platform account error; this is not an approval. Existing Macbeth05 remains assigned independent combined-candidate acceptance.

Hosted CI is not all green. Previous worker runs stopped at inherited repository checks or old management snapshot identity. Gitleaks also reported two historical generic-api-key matches: one ordinary scope phrase and one Git tree identifier, independently classified by Macbeth06 with redacted fingerprints. Published history and scanner policy remain unchanged; these failures are not relabeled PASS. Newly adapted CI and fresh C/R/S require their own exact-head hosted results.

Inherited soft-ready depth 3 and reorg window 128 are implementation assumptions, not verified X Layer finality. Real RPC/VM compatibility, deployed addresses and transaction execution remain NOT_RUN. Local contract and mocked transaction tests are not live-chain acceptance. External governance and independent GitHub approval remain separate requirements.
