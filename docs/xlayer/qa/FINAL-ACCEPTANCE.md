# X Layer final combined engineering acceptance

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM.
Worker: Macbeth05. Parent task: AF-XLAYER-05-QA. Acceptance dispatch: AF-XLAYER-05-FINAL-ACCEPTANCE.
Date: 2026-09-22. Receipt: [QA PR #5](https://github.com/pdbsy/alphaforge-xlayer/pull/5). Candidate: [manager PR #1](https://github.com/pdbsy/alphaforge-xlayer/pull/1).

## Decision

**PASS_LOCAL_ENGINEERING / HOSTED_GATE_BLOCKED.** The assigned offline combined-source acceptance passes at C below. Previously reproduced manifest-pair, evidence-route, pending-session and provenance-comparison defects are closed for this exact source. No new reproducible P1/P2 was established by this bounded review.

This does not assert release readiness, independent GitHub approval, formal environment admission or deployment readiness. Exact-S hosted Gitleaks jobs are still FAILURE; Windows jobs were IN_PROGRESS at readback. The manager reports local reserved-port admission failure. Four management contract checks remain NOT_RUN. These states are preserved and are not replaced by local test results or worker contract evidence.

## Exact source and isolation

| Record | SHA | Tree |
| --- | --- | --- |
| Implementation C | `727a8a52584ea87a9ff5a71b8a7f1d88177d1961` | `8febfa79e516c969e3b994d327e466b8abe9e563` |
| Manifest-only R | `4ed0ae83b1c91bf2754642c8e4fa238ff083007c` | Parent is exactly C |
| Snapshot-only S | `2ea74969849c8f8ff6b4fc4ec0199e463c162bed` | `9650ce78b1723a3414ff7d982132bcec46ef8ea0` |

The manager's complete C bundle SHA-256 was independently checked as `fc6f4e131a0d6e642af013bb64f25deec84ebfeebf1019b783edf55fcc597ebb`, and S bundle as `27261458e1a506993bd3074eac8a18dacc75ecddfcad703d0ec9ef04e89a1193`. `git bundle verify` passed. QA used a new full clone, canonical public origin and restored worker source refs; public SSH fetch subsequently verified the current refs. A stale bundled manager remote ref was refused as a backward update and was not used in place of C.

Node 24.21.0 / npm 11.19.1; package-lock SHA-256 `abbbc856d6faad44cb6709a3b86de9f3e0ab4d70eaccf290c5811c5f54c9c01a`. Installation used an independent copy of QA's package cache and `npm ci --offline --ignore-scripts --cache .checks/xlayer-qa/npm-cache` (193 packages, exit 0). No writable installed dependency/cache/database was shared. The offline installation is not a fresh vulnerability audit. The CI review subtask used another full clone and required no dependency installation.

The accepted pinned worker heads are the manifest's 02 `e86728c`, 03 `966b5c6`, 04 `8e99890` (includes implementation `fe8a7ac`), 05 `5c843e6` (includes fixture `7f2ccf0`) and 06 `a4a490a`. Source/import mappings were checked by actual execution, not accepted from the manager's reported count. Public 06 documentation later at `08f36a1` does not change the pinned source's ancestry or the tested implementation.

No manager source file was edited. At C, diagnostic scripts/logs existed only under ignored paths. The local acceptance checkout was later advanced to S solely to check its generated artifacts; tracked status remained clean. The original Robinhood checkout, assignments and results remain separate.

## Independently executed checks

All Node commands used the `fnm exec --using 24.21.0` prefix.

| Check | Source | Actual result |
| --- | --- | --- |
| `npm test` | C | **727/727 PASS**, no skipped/cancelled/TODO; exit 0 |
| `npm run typecheck` | C | PASS, exit 0 |
| `node --test --test-reporter=tap test/xlayer-qa-integration.test.mjs test/xlayer-qa-api.integration.test.mjs` | C | **26/26 PASS**; these are also included in the 727 suite, not additional unique registered tests |
| Temporary independent session acceptance harness | C | **18/18 PASS**, including unchanged-session positive controls; no skips/cancellations |
| Same session harness against old G `0e31259` | Old production, control comparison only | **3 controls PASS / 15 negative cases FAIL**, demonstrating the assertions detect pre-fix behavior |
| Temporary independent provenance mutation harness | C checker | **4/4 PASS**, seven checker invocations including positive controls |
| Exact integration identity | C | **41 records = 27 preserved imports + 14 manager records**, exit 0 |
| C → R → S parents, restricted changed paths, manifest source/tree | C/R/S | PASS; C..R only report, R..S only two snapshot files |
| `npm run management:check` | S | PASS, zero diagnostics; checked existing artifacts without rewriting them |
| `npm run verify:agent-identity -- --branch codex/xlayer-bootstrap --head 2ea74969849c8f8ff6b4fc4ec0199e463c162bed` | S | **43 records = 27 preserved imports + 16 manager records**, exit 0 |

The complete `npm run check` and its two builds at S were reported by the manager, not rerun by QA. The application code/test/lockfile inputs are unchanged between C and S, so the passing full application suite was not repeated for generated-only changes. Both QA files and the X Layer provenance suite are present in `npm test` and the management unit registry.

## Session lifetime and transaction evidence

The independent harness starts from the [public 03 reproduction](https://github.com/pdbsy/alphaforge-xlayer/pull/4#issuecomment-5778401685) with synthetic identities and a standard EventEmitter provider. Acceptance expectations require rejection on corrected paths and retain zero-send assertions; unchanged-session action and approval controls must each submit exactly once to the in-memory mock.

It verifies all three original paths: pending action review after invalidation/reconnect, approval review returning without reconnect, and confirmation paused before wallet submission. It additionally tests direct same-wallet reconnect with no preceding wrong-chain refresh or provider event; final wallet observation paused before send; accountsChanged and disconnect during action/approval review; delayed action/approval hashes; and both successful and rejected late registration.

Before sending, stale operations reject with WALLET_SESSION_CHANGED, issue no mock send, do not re-enable ownership/write capability, and do not overwrite the new session. After a send has occurred, the result retains its hash as non-retryable SUBMISSION_AMBIGUOUS / SESSION_CHANGED, with exactly one mock send. Late registration cannot attach an old pending operation or make a later refresh read it. Event listeners are removed. No real wallet, signing, broadcast or RPC is used.

All 17 new 04 repository regressions were also executed as part of the 727 suite. The independent harness result closes the controller race at actual C; the earlier 26 component-test result alone did not close it.

## Provenance mutation verification

The [two public CI counterexamples](https://github.com/pdbsy/alphaforge-xlayer/pull/4#issuecomment-5778697843) were reproduced against the final checker using disposable full-history Git fixtures. Each mutation first passes its correct-import control.

- Identical inserted text moved from alpha to beta is rejected: `imported tree differs from replayed source change`.
- Distinct NUL-free file bytes `80 0a` versus `81 0a` are rejected with the same tree-replay mismatch.
- Extra negative control: commit-message byte `80` versus `81` is rejected: `imported author or message differs`.
- A legitimate README hunk offset change from -84 to -85 remains accepted.

The harness restores the final checker files after resetting each disposable fixture to its imported commit; otherwise the original reproduction's reset could accidentally test the historical checker. Mutation bytes, source/import mappings and positive controls were preserved. The checker replays the source change with its original parent as merge base and compares the resulting whole tree, while author/message preservation uses raw bytes. No source tree/index or generated PASS evidence was edited by these checks.

## R/S and remaining gates

Verified C..S changes are exactly `.checks/management/latest.json`, `docs/management/dashboard/data/build-log.json`, and `docs/management/dashboard/data/dashboard.json`. The complete full-profile report binds C and its exact tree and records **11 PASS / 0 FAIL / 4 NOT_RUN**. The latter are foundry, fuzz, invariant and slither, each with `NOT_REGISTERED_IN_MANAGEMENT_COLLECTOR`. Separate contract worker/hosted results do not convert these collector entries to PASS.

Exact-S hosted readback from [run 35745681608](https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35745681608) and [run 35745673609](https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35745673609): Linux verify, macOS verify, contracts-m3-macos, source-policy-js, dependency-delta-audit, semgrep-ce and osv-scanner were SUCCESS; Windows was IN_PROGRESS; both Gitleaks jobs were FAILURE. This is a timestamped status observation, not a diagnosis, suppression or approval of that failure. The source of truth remains the exact-head hosted run.

Formal local environment admission is not granted by this report; the manager reported reserved ports still failing. Independent live contract/VM compatibility, visual browser walkthrough, live RPC availability, deployed-bytecode attestation, real wallet, deployment, signing/broadcast and finality measurement are NOT_RUN by this final QA. NOT_DEPLOYED remains required; finality 3/128 stays inherited and L1 finality UNKNOWN. No merge, rule change or independent GitHub/security approval is asserted.

## Evidence identities

Raw private output is retained without editing. Log/script SHA-256 values bind the exact executions and their diagnostic inputs; these are QA records, not newly generated management PASS files.

| Artifact | SHA-256 |
| --- | --- |
| final-npm-test.log | `cb095924dd476862090ac6925684db4018244deb0ab2e1444e74ff54f4f20f04` |
| final-typecheck.log | `33d54e6c1fd57a1c32bdb78dabf43c308f371ca032741ef4d42c70da7f1341aa` |
| final-26-qa.tap | `e401d63e43d1ad6a4a61007b9af0c85389cad210ce01e73ff5721ca679a7f6b7` |
| session-acceptance.mjs | `101e767ddd237aa9737159671262ab28b72bd231b92c347f7da3e3ea7645f626` |
| final-session-acceptance.tap | `d8105dfc509910c8c3c2aa6342bfaa278dded5b5f88ebfc08e262f996e651a5e` |
| old-G-session-negative-control.tap | `25e92d50598aca1e7a6ed7ae92a023a92e2832a5902d5b7289b8a60b924d79f4` |
| public-ci-repros.test.mjs | `849fc5db553e3a3b1dd720b8491f9fb218353edd9f3578876fedba5e2a945322` |
| public-ci-repros.tap | `533f0e5c771f2fba53b8240531c639f1d9a4e8544ffde6839c3670c675cbec34` |
| fixture-evidence.jsonl | `c5d4ef5cb0d1ba72aee8cbe2191f197647ec88b26dc5e1e7e04d7a5d8395e1f4` |
| final-c-identity.log | `75de5bdbaf8e08a88beb60fc1b27bb1baf6d61fc671c54831912079092377cd2` |
| final-CRS-structure.json | `c3e8506209c894bbced9c809cbf8fc5e7e179a57e02ae52f2afad5aad42d179b` |
| final-S-management-check.log | `f807b8c134cf7d60d12ac834be4b212ee82b6f1f86ab702ef66b74d3b1a61380` |
| final-S-identity.log | `5c698dcb1ef6dfb38bc149ea11d53d590f18f88ea492138258d4afe59b563575` |
| final-install.log | `8d4e8886a6368b7390c54506fefa2da392c79babf50ba481b3c0d355951521fa` |

Earlier [RESULTS.md](RESULTS.md) and [COMBINED-RETEST.md](COMBINED-RETEST.md) retain their historical source bindings and failures. This later QA documentation commit does not change or relabel C, R, S, or the manager's manifest-pinned worker sources.
