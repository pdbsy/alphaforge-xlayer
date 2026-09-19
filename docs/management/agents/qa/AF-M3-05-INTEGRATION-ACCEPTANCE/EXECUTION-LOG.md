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

Both runs used the approved runtime in `/private/tmp/af-verify-20347ec.wLQqsv/repo`; the checkout remained clean. No shared dependencies or SQLite data were written.

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
