# X Layer combined-source QA fixture retest

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM (AF_Xlayer).
Worker: Macbeth05. Task-ID: AF-XLAYER-05-QA. Date: 2026-09-22.

## Decision and source

Subsequent actual C/R/S acceptance is recorded in [FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md). The pending state below describes this earlier G/C2 checkpoint, not the later candidate.

The five failures found during manager integration were reproduced and corrected in the QA fixture. This is **PASS_LOCAL_QA_FIXTURE_RETEST**, not final product acceptance. A separate pending-review session race remains **BLOCKED** pending 04's production fix and a new exact combined source.

Manager source G: `0e31259c583fed08375c09018f778a4de8bc7c7d`, tree `22357dd43da276fbc5f69ee30c9a61ff364f6a50`. Its parent is `24af1ffcd134d81d8b8dd337df4d21bc9e9d9489`, where the manager first reported 21 PASS / 5 FAIL. Public API confirmed G's SHA/tree. GitHub Git transport failed repeatedly; the manager supplied a complete Git bundle with SHA-256 `dfaf011a1070b319a32d43242b0039011833a64be9f2b9648a5e904614ca0105`. QA verified that digest and `git bundle verify`, then cloned independently and restored the canonical public origin. The clone is not shallow and begins clean at G.

QA fix source C2: `7f2ccf0b1ab847d8743d80d5dcb9e33fc5d86885`, tree `93d711202b636e6469798e078681adbb02b8c109`. The worker branch remains based on imported master, without manager production commits.

The retest overlay is G plus **only** `test/xlayer-qa-integration.test.mjs` from C2. Its Git blob is `224efd7625c253c43cc9c2e9ec72aeb07c29c617`; SHA-256 `9ed649606537a979dc8a63f1710810ea77c4e908f2266739beeb04e8dbf4a7c5`. Git status/diff verified that this was the sole changed tracked file. The API test and all production files stayed exactly at G. This overlay is not an actual committed final integration candidate.

Node 24.21.0 / npm 11.19.1, same package-lock SHA-256 `67f717aaad4f0f7f0a24fb658095ce1953fcd323c63a9a9fc052e46edc33a26b`. QA copied its own package cache into the new clone and ran `npm ci --offline --ignore-scripts --cache .checks/xlayer-qa/npm-cache`: exit 0, 193 packages, no shared installed dependencies/cache/database and no package/network upgrade. This offline installation is not a fresh vulnerability audit.

## Cause and correction

Three wrong-chain cases expected exactly one `eth_accounts` and one `eth_chainId` call. The integrated wallet now revalidates the session with another pair of reads. The wrong-chain rejection already worked; the exact-count assertion incorrectly failed.

The old mock stored one callback per event and removed the whole event on any unsubscribe. Integrated `submit()` retains an outer session guard while `#session()` adds and removes temporary guards. The mock replaced and then deleted the outer guard, causing the two round-trip scenarios to miss session changes.

[EIP-1193 Events](https://eips.ethereum.org/EIPS/eip-1193#events) requires Node EventEmitter semantics. C2 uses the built-in [EventEmitter](https://nodejs.org/api/events.html#emitterremovelistenereventname-listener), preserving multiple callbacks, repeated registration and callback-specific removal without a new dependency. Wrong-chain assertions require exactly the set of observed method names `{eth_accounts, eth_chainId}`: both must occur and simulation/signing/sending cannot occur. Simulation assertions still require rejection, exactly one `eth_call`, only the two account/chain reads besides it, and all listeners removed.

## Actual executions

All commands use `fnm exec --using 24.21.0` and local mocked providers.

```sh
node --test --test-reporter=tap test/xlayer-qa-integration.test.mjs test/xlayer-qa-api.integration.test.mjs
node --test --test-reporter=tap test/ui-chain-wallet.test.ts test/m3-product-runtime.test.ts test/m3-chain-action-flow.test.ts test/m3-browser-runtime.test.ts
```

| Source | Command | Observed result |
| --- | --- | --- |
| G unchanged | First | 26 tests: 21 PASS / 5 FAIL; exit 1 |
| G plus C2 test file | First | 26/26 PASS; exit 0 |
| G plus C2 test file | Second | 71/71 PASS; exit 0; does not cover the separate pending-review race |
| Own C2 branch with imported production | First | 18 PASS / 8 FAIL; earlier foundation/adapter prerequisites remain unintegrated on this worker branch |

No skips, cancellations or TODO tests. Scoped lint/format, secrets/privacy and all five worker commit identities passed at C2. A read-only reviewer checked the production listener lifetime, sole-file diff and both retained logs and confirmed the fixture diagnosis. This is engineering review, not independent GitHub/security approval.

| Private raw log | SHA-256 |
| --- | --- |
| combined-G-original.tap | `a589ed2e89b4e49cd766c2624589c0731da257e1d4fc6bdb79b83a8a80e081ab` |
| combined-G-C2.tap | `1e881856caf102ff26d346a06532dee61245e6b87b1d8c274ba0b4788a495bb3` |
| combined-wallet-focused.tap | `38ab504f3d38d45f790b3dc96c2b63e062684a68e687940c7fb02073bff999c3` |
| combined-install.log | `e373ca20bfdf8a129a20472473bf2dad956c0af8a69ad72802adb3472d55d6d2` |
| source-7f2ccf0-baseline.tap | `99cc440f918542a438a9d3646887e1265400da95aedb6e726eba38fdaeb658db` |

## Separate acceptance blocker

Manager/03 reported a real P2 in async `reviewAction` and `reviewDepositApprovals`: a request begun before `clearSession`, followed by reconnect, can return later and be inserted into the current review WeakMap. The 26 wallet/component tests do not exercise that controller race, so their PASS does not close it. 04 owns the authorized session-epoch fix. QA must independently reproduce/retest the exact delivered fix and final manager composition before acceptance.

The prior [RESULTS.md](RESULTS.md) remains evidence for its original C/O sources. Final full gate, environment/hosted CI, contract/browser evidence and formal C/R/S remain separately required. NOT_DEPLOYED, no real RPC/signing/broadcast; Robinhood assignment/checkpoint/results remain separate.
