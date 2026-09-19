# AF-M3-CLOSEOUT — Current-stage integration

Agent: Macbeth01. Status: **IN_PROGRESS / DECISION-DEPENDENT**. Canonical repository: `pdbsy/quantpass-arbitrum-hackathon`. Branch: `macbeth01/AF-M3-CLOSEOUT`.

User instruction SHA-256: `c5a6dfa8e4be082e2ee3da5313ef3a3e4c89ccde9418ef1ea8647c5eba3936a6`.

## Intake — 2026-09-19

Fixed base / verified remote master: `7ecba357d5a19f387e86f578822af04a6261fed2`. No equivalent closeout branch or PR existed at intake. Manager implementation starts in a separate full checkout with private dependency/data directories.

| Delivery | Verified intake SHA | Meaning |
| --- | --- | --- |
| 02 / PR18 | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | Pass/test assets/locker/venue/typed adapter; not a complete Vault |
| 03 / PR17 | `20347ec22729346d617525d64dc76f58354b5f0d` | Chain adapter and verified wallet/sync fixes |
| 04 / PR16 | `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` | Contains 03; no 02 protocol delivery; UI actions disabled |
| 05 original report | `2efed688353579160a5f03ed4fa1f4b52178ecdf` | Six reports read in full; per-source focused QA, not common acceptance |
| 05 published handoff | `aaccaac6d2e7e675d50450b2a6a9634d42bbc7d0` | Preserves original report and corrects public metadata/scope |
| 04 registration / PR15 | `8be566b0c405ddf32ad7cd9886810b8dda23007e` | Task metadata; not product completion |
| 05 registration / PR19 | `b5d429c7a4a4dc05843d6233288d546596285879` | Task metadata; not latest QA report |

Initially the user reported QA as pushed, but origin did not expose it. Read-only inspection of the known QA checkout verified the full report; 05 confirmed it had originally committed locally only. Under the current delivery authorization, 05 subsequently published `aaccaac6…` and confirmed local/remote equality. Preserve that distinction rather than inventing a prior push.

QA's tested code was 02 `5d1a26d…` (static), 03 `20347ec…` (42/42 focused), and 04 `037c2b5…` on 03 (71/71 focused). The report commit is not any of those tested code versions. These results cannot be added together into common-candidate PASS.

## Frozen current scope

The latest user instruction resolves the former A/B question: **complete the pre-runtime Pass/Vault user flow; strategy execution is explicitly deferred**. The complete Pass/Vault requirement is not deferred or downgraded to foundations. Existing execution code still receives relevant negative/security checks.

Maintain fixed-supply fractional tradable Pass, one Pass per one USDC principal capacity, profit/principal/loss lock rules and full-close release. Wallet is the asset authority; Account is separate and projection is not custody truth. Preserve canonical `trend` and distinct LOCAL demo identities, warm Doodle UI/protected prototype, ambiguous submission/no automatic retry, and receipt/confirmation/reconciliation/projection/READY distinctions.

No new LP proportions, lock terms, thresholds, issuance economics or fees. Equal first-user Pass pricing remains a product requirement; test distribution is not a purchase. No merge, auto-merge, direct master update, rule removal, deployment, RPC access, signature or broadcast is authorized here.

## Task-to-acceptance matrix

| Task / requirement | Original basis | Implemented / evidence | Gap | Owner | Handling |
| --- | --- | --- | --- | --- | --- |
| Preserve source and QA history | Current user sections II/VI/VIII | Exact refs and six QA reports read | Common candidate not yet designated | 01 | 本轮必须完成 |
| Wallet context race and sync health | QA SEC-001/002 | Fixed at `20347ec…`, 05 independent 42/42 | Recheck integration impact | 03/05 | 已完成且证据有效 for that slice |
| Contradictory productReady evidence | QA FU-002 | Deferred on former unconnected entry | Fail-closed guard and composition regressions | 04/05 | 本轮必须完成 |
| Projection ancestry composition | QA deferred candidate | Adapter foundations | Confirm API/checkpoint ancestry exposure | 03/05 | 本轮必须完成 within actual surface |
| Vault custody/accounting/owner ABI | Current user IV/VII | PassLocker and token foundations only | Vault implementation and precise semantics | 02 | 本轮必须完成; dependent choices below |
| Precision/owner/withdrawal behavior | 02 decision requests | Capacity principles frozen | Exact ABI and dust/accounting choices pending | User/01/02 | 等待用户决定 |
| Contract-to-adapter-to-product wiring | Current user VII | ABI-independent adapter and UI shell | Actual owner-only ABI, events, views, supported actions | 03/04 | 本轮必须完成 |
| Finality/recovery policy | User III/IX | Injected policy / local fixtures | Authoritative deployment policy values | User/01/03 | 等待用户决定 |
| Runtime, Risk Permit execution | User IV.2 | Test venue/adapter foundations | Not in this closeout user flow | 02/03/04 | 用户已明确延期 |
| Common engineering/contract/browser QA | User IX | Slice reports only | Exact integrated candidate and independent runs | 01/05 | 本轮必须完成 |
| Testnet operations | User III/IX | None claimed | Explicit operation authorization and deployment gates | User | 等待外部权限或条件 |
| Traceable PR and current docs/dashboard | User X/XI | Existing PR15–19 open | One manager PR and source-bound C/R/S | 01 | 本轮必须完成 |

## Finding closure register

| Finding | Source / root cause | Fix and regression | QA | Remaining limit |
| --- | --- | --- | --- | --- |
| SEC-001, Low; former adapter merge blocker | `9f87275…`; wallet context could change while submit awaited | `20347ec…`; provider epochs, postchecks, explicit non-retryable ambiguity | 05 `2efed688…`, 42/42 focused, FIXED | Candidate impact / real composition not yet accepted |
| SEC-002, Low; former adapter merge blocker | `9f87275…`; late parent mismatch left partial projection healthy | `20347ec…`; persistent sync target/lease and atomic healthy-read gate | Same 05 report, 42/42 focused, FIXED | Candidate impact / full integration not yet accepted |
| FU-001, deferred | Venue quote can be manipulated | No frozen trust consumer; runtime deferred | Static only; not a confirmed vulnerability | Reassess if current Vault consumes quote |
| FU-002, deferred | `productReady` precedence over contradiction | 04 asked to reject contradictory ready/failure evidence | Await exact new source and 05 | Do not silently mark closed |

## Decision record

### AF-M3-CLOSEOUT-ID-001 — APPROVED

Requester: Macbeth01. Problem: existing branch identity rejects original 02–05 commits on a manager branch. Reproduced with an original Macbeth03 commit: branch/commit identity mismatch.

User approved restricted manager integration verification: only designated `macbeth01/AF-M3-CLOSEOUT` / `AF-M3-CLOSEOUT`, fixed base and registered source SHAs; validate original Agent/Task provenance, strictly validate new manager additions, preserve all required checks. Alternative was leaving identity CI blocked. Implement graph/source checks, not generic bypasses; ordinary worker and protected-master behavior stays strict. Source metadata is process provenance, not independent approval.

### Remaining protocol decisions — AWAITING USER

02 supplied `AF-M3-DEC-PRECISION-01`, `AF-M3-DEC-WITHDRAW-01`, `AF-M3-DEC-OWNER-01`, `AF-M3-DEC-OWNER-OPS-01`.

- Precision/owner proposal: six-decimal AF-USDC base-unit ABI, exact `* 10^12` Pass conversion, immutable explicitly selected wallet owner distinct from deployer. Alternative: 18-decimal normalized ABI with separately decided rounding, or implicit deployer owner.
- Withdrawal proposal: track protocol-origin non-USDC positions independently; real accounted positions block partial withdrawal, unsolicited dust does not affect equity/principal/capacity and exits in-kind on close. Alternative: any raw non-USDC balance blocks partial withdrawal, accepting third-party dust griefing. No oracle or threshold may be invented.
- Custody operation proposal: owner directly submits deposit/withdraw/close with fixed owner recipient; no per-operation relay/fee/nonce system. Alternative: new relayed-intent system requiring another explicit design. This proposal does **not** approve deferred runtime activation/signature/nonce fields bundled in 02's broader suggestion.

Affected files: 02 Vault/interface/accounting tests; 03 calldata/receipt decoding; 04 amount input/action states; 05 boundary/negative tests. Final ABI and dependent wiring are blocked until decisions; getters/error/event preparation, existing-surface fixes, source integration and regression work continue. Finality policy requests are coordinated separately when 03 supplies evidence.

## Candidate and evidence

Current candidate: not yet designated. Never substitute the documentation commit for a complete product version. Pinned inclusion is recorded in the integration source manifest when assembled. PR15–19 remain open; none is closed, merged or deleted by this task.

Results are separate: 01 local / 05 independent / GitHub hosted / actual Testnet. Testnet is NOT_RUN / BLOCKED_ON_AUTHORIZATION. Final status is PARTIAL_BLOCKED until all current-scope requirements or approved limitations have evidence. New source after QA triggers affected retests; generated R/S commits must not change tested business code.

## Unified foundation candidate assembly

The first assembly preserves protocol `5d1a26d`, adapter `20347ec`, updated UI/browser evidence `22616d8` (contains adapter), QA follow-ups `8dbf976`, and registration PRs #15/#19 via merge commits. Exact refs live in `../agents/integrations/AF-M3-CLOSEOUT.json`. The historical QA report `2efed688` remains an ancestor. This is a foundation candidate pending protocol decisions and follow-up fixes, not a completed Pass/Vault loop.

Conflict resolutions retain the union of all test commands; retain both worker 04/05 registrations and bootstrap test expectations with the manager assigned to AF-M3-CLOSEOUT; retain both provenance adaptation histories and hash the resolved source files. Conflicting generated management evidence/snapshots were restored byte-for-byte from fixed master, not edited into PASS. They remain stale for this candidate until a new C→R→S collection.

The approved identity mode passed 35 targeted tests, including independently pinned stacked sources and rejection of foreign task laundering. This is local implementation validation, not independent approval or whole-candidate acceptance. Required checks/protection remain unchanged.
