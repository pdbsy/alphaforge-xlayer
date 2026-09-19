# Independent execution log

Date: 2026-09-19

QA starting source: `7ecba357d5a19f387e86f578822af04a6261fed2`

## Environment intake

The repository, branch, HEAD, worktree cleanliness, remote identity, package scripts, development toolchain policy, and toolchain status were inspected before review. The default shell reported Node `24.2.0` and npm `11.3.0`; focused retests used the approved Node `24.21.0` and npm `11.19.1` through `fnm exec` in an isolated temporary checkout.

No dependency installation, shared `node_modules` use, SQLite write, RPC call, wallet access, signature, deployment, broadcast, asset operation, merge, or business-code modification was performed.

## Read-only source and provider inspection

Representative commands:

```text
git status --short --branch
git rev-parse HEAD
git remote -v
git diff --name-status <base> <head>
git show <head>:<path>
gh pr view 16|17|18|19 --json ...
gh run view 35435772149 --log-failed
```

Provider readback at the recorded checkpoint:

| PR | Exact head | State | Base | Hosted observation |
| --- | --- | --- | --- | --- |
| #16 | `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` | Open draft | `macbeth03/m3-chain-adapter` | Current `verify*` jobs fail at history admission because the stacked base is not `master`; install/tests do not start. |
| #17 | `20347ec22729346d617525d64dc76f58354b5f0d` | Open draft | `master` | Listed CodeQL, dependency review, Linux, macOS, and Windows checks successful; both prior findings independently verified fixed. |
| #18 | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | Open draft | `master` | Listed checks successful; contract analyzers remain `NOT_RUN` in committed evidence. |
| #19 | `b5d429c7a4a4dc05843d6233288d546596285879` | Open draft | `master` | Listed checks successful; registration only. |

## Codex Security diff scans

| Target | Immutable range | Scan ID | Result | Coverage qualification |
| --- | --- | --- | --- | --- |
| Macbeth02 / PR #18 | `7ecba357d5a19f387e86f578822af04a6261fed2..5d1a26d0dff967940dcf452ba9745d80ca9be12d` | `dd275442-ca10-4950-8c4a-03dbbb305be9` | 0 reportable findings; 1 deferred venue-trust candidate | Static diff review; dynamic and contract-tool coverage absent. |
| Macbeth03 / PR #17 | `7ecba357d5a19f387e86f578822af04a6261fed2..9f87275dc6c328ff0be10c7238a966109372856d` | `f91656d0-9132-4bc0-b547-bcca503ecad3` | 2 Low reportable findings; 1 deferred ancestry/composition candidate | Static diff review; dynamic tests absent. |
| Macbeth04 / PR #16 delta | `9f87275dc6c328ff0be10c7238a966109372856d..0e5fed1bb67b8cda25cd837b37e25a6c02731067` | `17767064-b4c0-4c60-84cd-9244455c215f` | 0 reportable findings; 1 deferred `productReady` candidate | All four generated delta review items inspected; final product composition and runtime absent. |
| Macbeth04 / PR #16 replacement delta | `20347ec22729346d617525d64dc76f58354b5f0d..037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` | `ad808dec-fc29-41fb-ad91-fd7540cab616` | 0 reportable findings; 1 deferred `productReady` candidate | Four authoritative review items inspected; focused runtime passed, while final product composition and Testnet remain absent. |

The replacement PR #16 scan measured `2,093,897` total tokens (`2,087,313` input, `2,047,360` cached input, `6,584` output, `558` reasoning output) with complete usage measurement. Its semantic coverage is partial because concrete product-evidence composition and Testnet/browser runtime remain deferred.

The workbench reports were generated in a temporary local scan directory. They are not committed because their machine-specific paths are not suitable public evidence. Stable scan IDs, exact revision ranges, source lines, and canonical finding identities are retained here.

## Independent focused retests

| Candidate | Command scope | Result | Qualification |
| --- | --- | --- | --- |
| PR #17 `20347ec22729346d617525d64dc76f58354b5f0d` | `ui-chain-wallet`, `chain-store`, `chain-sync` | **42/42 PASS** | Independently verifies the two reported fixes, including wallet context races, ambiguous provider outcomes, cross-fork mismatch, restart, and competing synchronizers. |
| PR #16 `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` stacked on fixed PR #17 | `chain-lifecycle`, `chain-rpc-manifest`, `chain-store`, `chain-sync`, `ui-chain-wallet`, `m3-product-ui` | **71/71 PASS** | Verifies wallet ambiguity presentation, chain regressions, escaping, hash handling, and disabled unsupported actions on the exact head. |

Both runs used the approved runtime in an isolated temporary checkout; the checkout remained clean. No shared dependencies or SQLite data were written. The machine-specific temporary path is intentionally omitted from public evidence.

## Tests intentionally not executed

The following are `NOT_RUN`, not failures and not passes:

- Full `npm test`, `npm run check`, browser QA, and E2E on a common candidate.
- Forge contract tests, fuzz, invariant, and Slither.
- Local EVM reorg/replacement simulations.
- Any Testnet RPC read.
- Any Testnet deployment, signing, approve, transfer, transaction, or broadcast.

Reasons: no official combined candidate, unresolved acceptance scope and accounting/ABI/finality rules, blocked PR #16 hosted admission, and no Testnet authorization. The focused branch-local suites support only their exact slices and cannot support an integrated acceptance conclusion.

## Independence boundary

Worker-authored local manifests, tests, and hosted CI are inputs. Macbeth05 independently inspected the exact source ranges and provider status and repeated the listed focused tests under the approved runtime. No unexecuted worker PASS has been copied into the matrix as an independent PASS.

## Unified foundation candidate review

Later candidate facts:

| Item | Exact value |
| --- | --- |
| PR | `#20` |
| Fixed base | `7ecba357d5a19f387e86f578822af04a6261fed2` |
| Initial identity-review head | `5340dfe2cd2323d21c32786396ec2236ab78a0ee` |
| Identity remediation source | `00d3b0e0015084fdc5cae6caa6c3ffabd7e5cc2e` |
| Final evidence head | `919505b45572916a3868ecf355691fb09fa1e2c3` |
| Macbeth03 ancestry fix source | `588efa531b83548ffa7b1b01f976dfc49ff470b7` |
| Macbeth04 contradictory-evidence fix source | `22616d809a5bbd83e4d15c9946bd91006c1417b2` |

The Codex Security identity-mode scan used immutable range `7ecba357d5a19f387e86f578822af04a6261fed2..5340dfe2cd2323d21c32786396ec2236ab78a0ee` and scan ID `fcd15838-e8e3-4026-9aad-df58a2038ea9`. It sealed two Low, high-confidence findings. Both original proofs were reproduced against the vulnerable version and rejected after remediation.

Independent commands were run from exact `git archive` snapshots or a separate temporary Git repository. The approved runtime was confirmed as Node `24.21.0` and npm `11.19.1` through `fnm exec`.

| Exact source | Independent scope | Result |
| --- | --- | --- |
| PR #20 final head `919505b...` | integration identity, lifecycle, bypass, management | **59/59 PASS** |
| PR #20 final head `919505b...` | real canonical PR event against all pinned source refs | **PASS**, 102 records: 84 source + 18 manager |
| PR #20 final head `919505b...` | same-name foreign-repository PR PoC | **REJECTED** |
| PR #20 final head `919505b...` | closeout merge-group PoC | **REJECTED** |
| Macbeth04 included source | `m3-product-ui` including four contradictory `productReady` cases | **15/15 PASS** |
| Macbeth03 source `588efa5...` | chain store, chain sync, wallet, product adapter | **60/60 PASS** |

One broader `ui-product-adapter-races` attempt from the dependency-free Macbeth03 archive could not start because `fastify` was not installed in that isolated snapshot. This was an environment limitation, not a test assertion failure, and that file does not exercise the FU-003 ancestry path. No dependency installation or shared `node_modules` use was introduced to mask the limitation.

`npm run management:check` was also attempted on the QA documentation worktree and stopped before validation because the isolated QA checkout had no installed `prettier` package. It is recorded as `NOT_RUN`; no dependency was installed and no generated management evidence was rewritten.

Final provider readback for PR #20 showed all Linux, macOS, and Windows engineering-check runs successful. CodeQL scanned 61 JavaScript, 60 TypeScript, and 3 Actions files before failing on GitHub result-upload/run-metadata permission. Dependency review failed because the feature was unavailable. These platform failures are not source-test failures, but failed required checks are not converted into PASS.
