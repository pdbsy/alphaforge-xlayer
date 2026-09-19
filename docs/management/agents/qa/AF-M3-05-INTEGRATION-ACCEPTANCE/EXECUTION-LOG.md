# Independent execution log

Date: 2026-09-19

QA starting source: `7ecba357d5a19f387e86f578822af04a6261fed2`

## Environment intake

The repository, branch, HEAD, worktree cleanliness, remote identity, package scripts, development toolchain policy, and toolchain status were inspected before review. The current shell reported Node `24.2.0` and npm `11.3.0`; the approved pair is Node `24.21.0` and npm `11.19.1`.

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
| #16 | `0e5fed1bb67b8cda25cd837b37e25a6c02731067` | Open draft | `macbeth03/m3-chain-adapter` | One successful run and one failed run; failed `verify*` jobs stopped at history admission. |
| #17 | `9f87275dc6c328ff0be10c7238a966109372856d` | Open draft | `master` | Listed checks successful; independent static findings remain open. |
| #18 | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | Open draft | `master` | Listed checks successful; contract analyzers remain `NOT_RUN` in committed evidence. |
| #19 | `b5d429c7a4a4dc05843d6233288d546596285879` | Open draft | `master` | Listed checks successful; registration only. |

## Codex Security diff scans

| Target | Immutable range | Scan ID | Result | Coverage qualification |
| --- | --- | --- | --- | --- |
| Macbeth02 / PR #18 | `7ecba357d5a19f387e86f578822af04a6261fed2..5d1a26d0dff967940dcf452ba9745d80ca9be12d` | `dd275442-ca10-4950-8c4a-03dbbb305be9` | 0 reportable findings; 1 deferred venue-trust candidate | Static diff review; dynamic and contract-tool coverage absent. |
| Macbeth03 / PR #17 | `7ecba357d5a19f387e86f578822af04a6261fed2..9f87275dc6c328ff0be10c7238a966109372856d` | `f91656d0-9132-4bc0-b547-bcca503ecad3` | 2 Low reportable findings; 1 deferred ancestry/composition candidate | Static diff review; dynamic tests absent. |
| Macbeth04 / PR #16 delta | `9f87275dc6c328ff0be10c7238a966109372856d..0e5fed1bb67b8cda25cd837b37e25a6c02731067` | `17767064-b4c0-4c60-84cd-9244455c215f` | 0 reportable findings; 1 deferred `productReady` candidate | All four generated delta review items inspected; final product composition and runtime absent. |

The PR #16 scan measured `2,389,149` total tokens (`2,381,050` input, `2,317,184` cached input) with complete usage measurement. The scan's semantic coverage is partial because the concrete product evidence composition and runtime validation remain deferred.

The workbench reports were generated in a temporary local scan directory. They are not committed because their machine-specific paths are not suitable public evidence. Stable scan IDs, exact revision ranges, source lines, and canonical finding identities are retained here.

## Tests intentionally not executed

The following are `NOT_RUN`, not failures and not passes:

- `npm test`, `npm run check`, focused Node tests, browser QA, and E2E on a common candidate.
- Forge contract tests, fuzz, invariant, and Slither.
- Local EVM reorg/replacement simulations.
- Any Testnet RPC read.
- Any Testnet deployment, signing, approve, transfer, transaction, or broadcast.

Reasons: no official combined candidate, unresolved acceptance scope and accounting/ABI/finality rules, current Node/npm mismatch, and no Testnet authorization. Running a branch-local suite now would test a worker slice and could not support an integrated acceptance conclusion.

## Independence boundary

Worker-authored local manifests, tests, and hosted CI are inputs. Macbeth05 independently inspected the exact source ranges and provider status but did not repeat dynamic tests under the approved runtime. No worker PASS has been copied into the matrix as an independent PASS.
