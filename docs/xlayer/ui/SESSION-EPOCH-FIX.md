# AF-XLAYER-04-UI-FIX: pending session work

Project: AlphaForge-XLayer
Track: X Layer
Repository: pdbsy/alphaforge-xlayer
Manager: XLayerPM
Worker: Macbeth04
Parent task / PR: AF-XLAYER-04-UI / https://github.com/pdbsy/alphaforge-xlayer/pull/3

## Finding and correction

Macbeth03 independently reported a P2 on manager candidate `0e31259c583fed08375c09018f778a4de8bc7c7d`: replacing review WeakMaps did not cancel pending writers. An old action review could complete after reconnect, an old allowance review could restore ownership without reconnecting, and confirmation could resume through its pre-wallet snapshot await after session invalidation. Each path could issue one mock send. The public report and executable reproducer are [PR #4 comment 5778401685](https://github.com/pdbsy/alphaforge-xlayer/pull/4#issuecomment-5778401685).

Source C for this correction: `fe8a7ac967cb057112483666174d3efa537ebb2f`, tree `84675cf4d573c8ee8a1d12ac7e4e39b277e843ff`, previous worker head `37e6045de7ca87f9e06cc45237d6c495d3442f7f`.

Every clearSession now advances a monotonic epoch. Action/approval reviews and confirmations capture it and the session identity; scoped account/chain/disconnect listeners invalidate pending work. Async read, prepare, simulate, publish and review registration boundaries verify the captured session. A compatible optional guard reaches through M3ChainActionFlow.confirm and Eip1193Wallet.submit to the final pre-send boundary, including invalidation without provider events followed by reconnecting the same wallet.

If a wallet request already reached eth_sendTransaction, a late hash remains a non-retryable SUBMISSION_AMBIGUOUS / SESSION_CHANGED result. It is returned without overwriting the new session. Late submission registration cannot attach an old pending operation to the new session. Existing transaction evidence is not discarded by a post-send epoch exception.

This correction changes three production files and two targeted test files. It does not enable X Layer deployment or writes; the demonstrated issue is in the configured Robinhood regression path inside this X Layer repository. The separate Robinhood worktree is unchanged. No manager checkout, package, shared CI, contract, storage or accounting change is included.

## Reproduction and validation

Verification uses the same isolated full clone and separately installed dependencies described in VERIFICATION.md. Its tracked implementation files are byte-identical to C. The sole source overlay is the manager's `packages/xlayer-chain/src/network.ts` at `728c3df217f586fb7f7d86f595406dc46372ac1a`, blob `27266cf5b188cf22eec22c410573d253275194d4`. No manager history or file is included in the worker commit. These are qualified local C-plus-overlay results, not standalone, hosted CI or integrated-master certification.

| Check | Actual result |
| --- | --- |
| Original public reproducer against old worker source + overlay | 1 control passed / 3 defect paths failed; all three printed mock SUBMITTED and send count 1 |
| Same reproducer after correction, changing only defect expectations to rejection | 4/4 passed; original no-send assertions retained, disabled ownership asserted where applicable |
| All 17 new repository regressions against old production code | RED: 53 tests, 36 passed / 17 failed |
| Wallet, flow, browser runtime and injected runtime at C + overlay | 85/85 passed |
| Complete existing npm test command at C + overlay | 649/649 passed, zero failures or skips |
| Typecheck, ESLint, Prettier | Passed |
| Explicit X Layer web build | Passed, existing classic-script/CSS importer warnings retained |
| Bounded source secrets/privacy scans | Passed, 507 files; ignored local/binary files outside coverage |
| Commit identity at C | Passed, five worker provenance records from original base |

The regressions cover pending canonical/allowance/simulation/prepare work, same-wallet reconnect with no provider events, invalidation without reconnect, the pre-wallet confirm interval, wallet pre-send simulation, late wallet hashes, and late registration. Only mock providers were used; no live RPC, wallet signing, broadcasting or deployment occurred. Browser visual checks were not repeated because this correction does not change the UI rendering; earlier browser checks remain bound to their earlier source.

The machine-readable receipt `session-epoch-fix-verification.json` binds C, the declared overlay and local RED/GREEN log hashes. These logs are not public hosted CI artifacts. Earlier VERIFICATION.md and verification.json remain historical records for their original source; they do not constitute verification of this correction. Independent Macbeth03 follow-up and Macbeth05 combined-candidate acceptance remain pending at this receipt. XLayerPM owns fresh integrated C/R/S evidence and any subsequent integration decision.
