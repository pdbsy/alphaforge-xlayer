# Phase 1 base coverage gaps

Source base: `18f5352070910a867b9729b031aa2e3951785e01`

Recorded: 2026-09-20 (Asia/Shanghai)

The effective rule is versioned in `docs/TASK-BOARD.md` on this base: line 108 requires 100% branch coverage for critical authorization and accounting paths, and line 109 sets the overall automated coverage target at no less than 90%. This report does not reinterpret test count as either threshold.

## Corrected executable-file denominator

The executable first-party denominator is every regular `.ts`, `.tsx`, `.mjs`, and `.js` file below `apps/server/src`, `apps/web/src`, `packages`, `src`, and `tools`. It excludes `.d.ts`, CSS, HTML, JSON, YAML, lock data, tests, generated outputs, dependencies, and Solidity, which has a separate Forge report.

This produces 98 executable files. Node's coverage report contains 77, leaving 21 unrepresented. The earlier 99/22 checkpoint was an off-by-one error: `apps/web/src/vite-env.d.ts` remained in the inventory even though the written method excluded declaration files. No test result changes; only the denominator statement is corrected.

Full 98-file list: `/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/first-party-executable-98.txt`, SHA-256 `ccffd7aefa1c4075883bbdee1c04934a18a2fe90682dbf9a6e3b3dc82734a9d8`.

The 21 unrepresented files are:

```text
apps/server/src/m3-main.ts
apps/server/src/main.ts
apps/web/src/App.tsx
apps/web/src/main.tsx
apps/web/src/product-ui.ts
apps/web/src/webmcp.ts
packages/chain-adapter/src/index.ts
packages/chain-adapter/src/reconciliation.ts
tools/agent-forum-app.js
tools/agent-integration-identity.mjs
tools/backup-demo.ts
tools/bootstrap-ci-npm.mjs
tools/check-agent-identity.mjs
tools/check-config.ts
tools/check-environment.mjs
tools/check-secrets.mjs
tools/ci/check-osv.mjs
tools/ci/check-semgrep.mjs
tools/run-management-checks.mjs
tools/verify-management-browser.mjs
tools/verify-ui-browser.mjs
```

Missing-list evidence: `/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/coverage-unrepresented-21.txt`, SHA-256 `af4bbc5763c6f7ebbe4d292fba34aff9b496d5b338ed75168dcb542f9e7811d2`.

## Reproduction command and limits

Node 24.21.0 was invoked with the exact 57 test paths in `package.json` `scripts.test`, placing these arguments before `--test` and the unchanged file list:

```text
--experimental-test-coverage
--test-coverage-include=apps/server/src/**/*.ts
--test-coverage-include=apps/web/src/**/*.ts
--test-coverage-include=apps/web/src/**/*.tsx
--test-coverage-include=packages/**/*.ts
--test-coverage-include=src/**/*.ts
--test-coverage-include=tools/**/*.ts
--test-coverage-include=tools/**/*.mjs
--test-coverage-include=tools/**/*.js
--test-coverage-exclude=**/*.d.ts
--test-reporter=spec
--test-reporter-destination=/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/coverage-detailed-tests.log
--test-reporter=lcov
--test-reporter-destination=/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/coverage-detailed.lcov
--test <the exact 57 paths from package.json scripts.test>
```

The complete executable, Node version, working directory, include/exclude patterns, 57 test paths, and final argument vector are preserved in `/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/coverage-command.json`, SHA-256 `515bf1f81aa76f3949402cc88abc91001aa81bcf28912b41d206661356a866f6`.

The permitted local run passed all 591 tests. Its spec log SHA-256 is `f98bb57f09ae8197db21af035c0baa8e71a7b23057d47921068578e14a129ae5`; LCOV SHA-256 is `e7e91c1f68ea725fdc108a6497ac7a7d798ed2a5e013cabc9ea37b8deedc4207`.

Node's include patterns filter loaded modules; they do not synthesize zero-coverage records for files that no test loads. Therefore the reported 91.67% lines, 84.66–84.67% branches across repeat runs, and 94.30% functions are loaded-file values. The LCOV branch records give a source line and count but no semantic branch label; more than one branch record can map to one source line. Neither test count nor the loaded-file percentage establishes actual overall coverage.

## Critical JS/TS uncovered branches

The detailed LCOV has the following zero-count branch source lines. The complete machine-readable list includes source text and branch-record counts at `/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/js-ts-critical-branch-gaps.json`, SHA-256 `a5a7c77cd73d72ae98c1751d6a82c64111086be86f077c63ee3570f350915dc8`.

| File                                      | Covered branches | Zero-count branch source lines                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | ---------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/chain-store.ts`          | 270/339 (79.65%) | 110, 159, 195, 220, 225, 259, 268, 271, 326, 410, 531, 603, 605, 650, 662, 665, 671, 689, 697, 733, 737, 766, 772, 774, 813, 828, 830, 838, 877, 898, 996, 1005, 1022, 1039, 1051, 1069, 1106, 1115, 1123, 1129, 1148, 1150, 1196, 1232, 1260, 1269, 1272, 1274, 1291, 1295, 1319, 1321, 1371, 1388, 1392, 1401, 1404, 1414, 1423, 1428, 1517, 1521, 1528, 1531–1533, 1551, 1561, 1623 |
| `apps/server/src/chain-sync.ts`           | 113/139 (81.29%) | 55, 61, 106, 126, 157, 216, 219, 242, 249, 250, 252, 253, 262, 274, 278, 284, 331, 337, 343, 347, 359, 375, 401, 402, 444, 456                                                                                                                                                                                                                                                         |
| `apps/server/src/m3-vault-integration.ts` |   37/46 (80.43%) | 119, 127, 132, 135, 142, 145, 236, 244, 246                                                                                                                                                                                                                                                                                                                                            |
| `apps/web/src/chain-wallet.ts`            |   74/96 (77.08%) | 84, 89, 112, 169, 172, 179, 182, 197, 213, 223, 231, 237, 260, 292, 301, 318, 321, 340, 342, 343, 372, 396                                                                                                                                                                                                                                                                             |
| `apps/web/src/m3-browser-runtime.ts`      | 105/138 (76.09%) | 82, 84, 96, 158, 184, 197, 213, 219, 221, 236, 263, 267, 275, 280, 337, 353, 385, 389, 395, 396, 401, 404, 411, 413, 473, 489, 505, 545, 548, 566, 588, 602, 613                                                                                                                                                                                                                       |
| `apps/web/src/m3-chain-action-flow.ts`    |   16/21 (76.19%) | 14, 44, 46, 52, 62                                                                                                                                                                                                                                                                                                                                                                     |
| `apps/web/src/m3-vault-allowance.ts`      |   36/50 (72.00%) | 33, 36, 43, 74, 152, 162, 171, 175, 179, 194, 196, 203, 238, 240                                                                                                                                                                                                                                                                                                                       |
| `apps/web/src/m3-vault-client.ts`         |   62/77 (80.52%) | 85, 105, 111, 161, 225, 232, 242, 286, 324, 325, 364, 382, 385, 405, 408                                                                                                                                                                                                                                                                                                               |
| `apps/web/src/m3-vault-live-reader.ts`    |   18/21 (85.71%) | 30, 36, 47                                                                                                                                                                                                                                                                                                                                                                             |
| `packages/chain-adapter/src/rpc.ts`       |   49/93 (52.69%) | 108–110, 117, 127, 150, 151, 161, 164, 170, 176, 182, 187, 194, 198, 212, 219, 228, 235, 238, 241, 248, 249, 252, 268, 275, 277, 283, 300, 301, 305, 308, 321, 324, 330, 337, 348, 357, 364, 373, 376, 383                                                                                                                                                                             |
| `packages/chain-adapter/src/vault-abi.ts` |   67/83 (80.72%) | 83, 88, 94, 109, 134, 142, 149, 177, 184, 214, 228, 242, 251, 256, 265, 274                                                                                                                                                                                                                                                                                                            |
| `packages/domain/src/money.ts`            |   24/26 (92.31%) | 16, 32                                                                                                                                                                                                                                                                                                                                                                                 |
| `packages/domain/src/vault.ts`            |   80/81 (98.77%) | 193                                                                                                                                                                                                                                                                                                                                                                                    |

High-priority semantic groups for new tests are:

- authority/session: `chain-wallet.ts` 260, 301, 318, 321, 340, 342, 343; `m3-chain-action-flow.ts` 44, 46, 62; `m3-vault-allowance.ts` 171, 179, 194, 203; `m3-browser-runtime.ts` 184 and 505;
- amount/precision/ABI: `money.ts` 16 and 32; `m3-vault-allowance.ts` 43; `m3-vault-integration.ts` 142 and 145; `vault-abi.ts` 83, 88, 94, 109, 149;
- settlement/recovery identity: `m3-vault-integration.ts` 236, 244, 246; `chain-store.ts` 1051, 1196, 1260, 1269, 1272, 1274, 1291, 1295, 1319; `chain-sync.ts` 216, 274, 331, 359, 375, 401, 402;
- RPC receipt/finality: `rpc.ts` 219, 235, 241, 249, 300, 301, 305, 308, 321; `m3-vault-client.ts` 324 and 325.

### `packages/domain/src/vault.ts:193` criticality judgment

The sole zero-count branch in this file is `Array.isArray(value)` inside private fingerprint serializer `canonical()`. It is reached only from line 235 with `{ actor, command, policyId }`:

- the `Actor` and `Command` unions contain string, number, and object fields but no arrays;
- the public command routes use a closed `oneOf` schema whose every shape has `additionalProperties: false`; none permits an array;
- the actor comes from the authenticated session/simulation boundary, and `policyId` is a validated string or `null`;
- the whole ledger is marked `scope: TEST_ONLY`; Phase 1 onchain Vault accounting uses the separate contract and M3 chain modules.

On this evidence, line 193 is not a reachable branch of a valid public command and is not a critical Phase 1 authorization or accounting decision. A synthetic extra array property would be rejected at the HTTP schema boundary, while a direct type-unsafe call would be outside the accepted interface. Macbeth05 therefore does not recommend adding a meaningless array input merely to increment coverage.

The branch remains visible in the module and overall metrics: `vault.ts` is 80 / 81 branches, not 100%. This exclusion applies only to the explicit critical authorization/accounting inventory; it does not turn the entire module or overall coverage into 100%, and it does not close `M3-05-P1-001` while the other recorded critical gaps remain.

## Solidity uncovered branches

The exact locked Forge 1.5.1 / solc 0.8.31 environment ran `forge coverage --offline --report lcov` and passed 121 / 121 tests. LCOV SHA-256: `cc174b349cad013a5045bd8ce1e58cdb7f6a498eaf914776e174728fc0716ab0`.

| Source                          | Uncovered branch lines                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| `src/AlphaForgeSwapAdapter.sol` | 44, 47, 87                                                              |
| `src/AlphaForgeTestAsset.sol`   | none                                                                    |
| `src/AlphaForgeTestVenue.sol`   | 49, 52, 103, 156, 164, 178                                              |
| `src/AlphaForgeVault.sol`       | 43, 88, 108, 110, 166, 183, 205, 212, 218, 238, 249, 257, 261, 283, 294 |
| `src/PassLocker.sol`            | 35, 47                                                                  |
| `src/StrategyPass.sol`          | none                                                                    |
| `src/VaultIntentPreview.sol`    | none                                                                    |

The complete source-text mapping is `/private/tmp/AlphaForge-M3-05-PHASE1-EVIDENCE/solidity-branch-gaps.json`, SHA-256 `3f3c41de9102f19a384b2ace436c4b27c660a9d6db7dd0c4acb2c4dfaf134bba`.

Priority contract gaps are:

- amount/principal: Vault lines 88 (deposit overflow), 108 (zero withdrawal), 110 (withdrawal above tracked funds), 183 (zero native rescue), 238 and 249 (exact transfer deltas), 257 (tracked deficit);
- capacity/close: Vault lines 43 (closed mutation), 205 (closed withdrawable amount), 212 (tracked investment reserve), 218 (zero-token excess query), 261 (unsupported tracked asset); PassLocker lines 35 (zero constructor identity) and 47 (escrow accounting deficit);
- settlement: SwapAdapter line 87 (venue return below minimum), Vault lines 238/249/257 (custody settlement mismatch/deficit), and Vault line 283 (StrategyPass identity call failure).

The direct Owner authorization branch at Vault line 38 and the PassLocker controller authorization branch at line 72 are covered in this report. That does not satisfy the broader 100% critical authorization/accounting target while the listed session, amount, capacity, settlement, and recovery branches remain uncovered.
