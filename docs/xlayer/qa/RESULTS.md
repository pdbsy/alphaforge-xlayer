# X Layer QA exact-source results

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM (AF_Xlayer).
Worker: Macbeth05. Task-ID: AF-XLAYER-05-QA. Date: 2026-09-22.
Public receipt: [Draft PR #5](https://github.com/pdbsy/alphaforge-xlayer/pull/5).

## Decision

READY FOR REVIEW of the QA artifacts. The imported production baseline fails the new acceptance suite: **18 PASS / 8 FAIL**. Independently tested candidate O passes **26/26 new QA tests and 72/72 focused chain tests**, with typecheck PASS. These runs contain no skipped, cancelled or TODO tests.

XLQA-MANIFEST-01 and XLQA-API-01 are closed for O. Final combined product acceptance remains BLOCKED on the actual integrated source and applicable environment, CI, browser and contract evidence. This report supplies no merge/deployment approval or formal generated C/R/S evidence. The [matrix](ACCEPTANCE-MATRIX.md) distinguishes local behavior from unexecuted acceptance.

This task belongs only to X Layer. Robinhood task ownership, original checkpoint, checkout and evidence remain separate.

## Exact source definitions

| Symbol | Immutable source |
| --- | --- |
| B, imported production base | `18f5352070910a867b9729b031aa2e3951785e01`; tree `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba` |
| C, final QA test source | `38eff43df48db9e920d59336ca1284f624096b6b`; tree `853f6b9abf2d2c77d7f4783f7eb4d73871369165`; branch `macbeth05/xlayer-qa` |
| A, earlier QA source | `a08cbdef30e376f801601fa982bb540bfd03accc`; inherited regression/typecheck evidence below remains bound to A |
| D, independently tested 03 implementation | `6a2350f50852731c8a6433bcce0aa4e53c4f772c`; tree `474149061771f915673819d32456ef5611edaa1e`; [PR #4](https://github.com/pdbsy/alphaforge-xlayer/pull/4) |
| F, manager foundation file | `728c3df217f586fb7f7d86f595406dc46372ac1a`; only `packages/xlayer-chain/src/network.ts`; blob `27266cf5b188cf22eec22c410573d253275194d4` |
| O, test overlay | Full independent clone at D, plus exactly the F network file and the two test files from C; tracked D files unchanged. A composite source definition, not a new commit or completed cross-PR integration |

The QA worker branch contains no manager/03 production changes or cherry-picks. O has a separate full Git object copy, locked dependency installation, npm cache and temporary SQLite fixtures. No writable node_modules or databases are shared with the QA branch or original project.

Runtime: fnm 1.39.0, Node 24.21.0, npm 11.19.1, macOS arm64. Both installations used `npm ci --ignore-scripts --cache .checks/xlayer-qa/npm-cache`; 193 packages, exit 0. No dependency or lockfile edit. Package-lock SHA-256: `67f717aaad4f0f7f0a24fb658095ce1953fcd323c63a9a9fc052e46edc33a26b`.

| Executed file | Git blob | SHA-256 |
| --- | --- | --- |
| C: test/xlayer-qa-integration.test.mjs | `4b47955500bf90a3e68d381a82ec04288417d416` | `a44a96f88cfc4348e1f57c0d398484cc570bc84e150ad1ce7bda6739a8ac9b54` |
| C: test/xlayer-qa-api.integration.test.mjs | `dfbf123433e492200671b88e2251ad087bf5c20f` | `90f4af82772e75cd750fb425c0a29bdaf66613c5f33b05c42a848dc9b232f9c5` |
| F: packages/xlayer-chain/src/network.ts | `27266cf5b188cf22eec22c410573d253275194d4` | `af3ec6f9edce2a1cd0764a6eadb85d6af2d940ba98aa6b05115ed532b1fcd683` |

## Commands and actual results

Commands used the prefix `fnm exec --using 24.21.0`. Dependency installation accesses the package registry; test RPC/wallet providers are in-memory fixtures. API tests use Fastify injection without an HTTP listener.

```sh
node --test --test-reporter=tap test/xlayer-qa-integration.test.mjs test/xlayer-qa-api.integration.test.mjs
node --test --test-reporter=tap test/chain-rpc-manifest.test.ts test/chain-runtime.test.ts test/chain-store.test.ts test/chain-sync.test.ts test/chain-startup.test.ts test/chain-api.test.ts
node --test --test-reporter=tap test/chain-store.test.ts test/chain-rpc-manifest.test.ts test/ui-chain-wallet.test.ts test/chain-api.test.ts
npm run typecheck
node node_modules/eslint/bin/eslint.js test/xlayer-qa-integration.test.mjs test/xlayer-qa-api.integration.test.mjs --max-warnings=0
node node_modules/prettier/bin/prettier.cjs --check test/xlayer-qa-integration.test.mjs test/xlayer-qa-api.integration.test.mjs
npm run secrets:check
npm run privacy:check
npm run verify:agent-identity -- --base 18f5352070910a867b9729b031aa2e3951785e01 --head 38eff43df48db9e920d59336ca1284f624096b6b --pr-title '[Macbeth05][AF-XLAYER-05-QA] X Layer acceptance matrix and isolation tests'
```

| Check | Actual source | Result |
| --- | --- | --- |
| New QA suite, first command | C with B production | 26 tests: 18 PASS / 8 FAIL; exit 1 |
| New QA suite, first command | O | 26/26 PASS; exit 0 |
| Six-file chain regression, second command | O | 72/72 PASS; exit 0 |
| Four-file inherited regression, third command | A with B production | 43/43 PASS; exit 0 |
| Typecheck | A and O separately | PASS; exit 0; configured TypeScript coverage, not a type proof for the new .mjs tests |
| Scoped ESLint / Prettier | C | PASS / PASS; exit 0 |
| Secrets / public metadata | C | PASS / PASS, 508 bounded files; ignored local environment/binary files outside coverage |
| Worker identity | B..C | PASS, three worker commits; provenance does not constitute independent approval |
| Read-only test review | C | No outstanding blocking test issue; independently reproduced baseline 18/8; reviewer did not claim O PASS |

At C, failures are the missing foundation module (one), invalid self-consistent network pairs accepted (five), and foreign-chain/foreign-vault evidence returned 200 instead of 404 (two). They remain failures on the worker branch until manager dependencies are integrated. Assertions are not skipped or marked expected-failure.

At O, valid X Layer 1952 and Robinhood 46630 pairs remain accepted with digest/address pins. Historical 195, mainnet 196, crossed pairs and an unknown environment are rejected. Every evidence API fixture contains a normal same-database control returning 200 before testing the candidate operation. Foreign chain, foreign vault and foreign owner return the existing 404 error. Store rollback/restart/idempotency and mock wallet/RPC isolation tests also pass.

03's reported 600-test result was an input only; this report claims the 72 and 26 tests actually rerun here, not an inherited full-suite PASS.

## Retained raw evidence identities

Raw logs remain private because they can contain local operational paths. SHA-256 values below bind unedited output; these are diagnostic evidence, not a generated management PASS manifest.

| Log | Source / meaning | SHA-256 |
| --- | --- | --- |
| source-38eff43-baseline.tap | C QA, 18/8 | `6191285a63c5fe100d8ce522ee8d541a79ceaa023357041f01c0a42bb4f19640` |
| 03-candidate-qa.tap | O QA, 26/26 | `ebf7f088bdddd1875cf8bde982de1958dadb94929a006ceb15c8e389fbcbc660` |
| 03-candidate-focused.tap | O regression, 72/72 | `fb7ff4885e4f66ddffb698691616e0a289b5140eea894ac85e474297ee5465bf` |
| source-C-inherited.tap | A tests, 43/43; filename does not change source binding | `c8426ecc8af59a6650fd3fd7ecb5fb351b371840533662f36bf1edbb131f3944` |
| source-C-typecheck.log / 03-candidate-typecheck.log | A / O separately executed; identical output | `2a6a2c0222a96232b5dd3dea2c3e4411abfc22401c3a741d0a8e3f88ad508016` |
| source-38eff43-format.log | C formatting | `17aa973d3f004560237d9a95171210b0671deff23d61628eecf7322ff5938f20` |
| source-38eff43-lint.log | C lint, empty successful output | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| source-38eff43-secrets.log | C secrets | `173d76193283840cd3aade4d3c50e1162c768fbfd0184d21db970eff907de563` |
| source-38eff43-privacy.log | C public metadata | `8da79033310ecfd6ae9182e9bca64aad8e08d26d36612bb7731aa45e023b54e4` |
| source-38eff43-identity.log | B..C provenance | `14aa88e6ce0bc7878e768bd880141171f145f9358cf55f050746f1650e8dc058` |
| environment.json | Startup repository/ports FAIL; eligibleForEvidence=false | `8ee9adf6f6923e48ba2c9896e12ed17e316a00889a433e895c5bd9ff536b901b` |
| install.log | O independent locked install | `159e9a794096c05b23ffdeaa418d6e3be6d1c56e45f1c7d82ad737559418d3cf` |

Test-development failures were retained, not relabelled: the initial API run used the wrong error-body accessor, corrected to the existing `error` string contract. A introduced a normal same-DB control with a conflicting same-chain transaction hash; three cases stopped at the legitimate identity-conflict guard. C gives that control a distinct synthetic transaction hash. A's 16 PASS / 10 FAIL log is `source-C-baseline.tap`, SHA-256 `6ec941956b161de242e5d10e6c601bd775a18c8358f5fa4f599c20b123dd6b4e`. Neither test defect was counted as a production defect.

Review prompted explicit wrong trusted-digest cases, bounded wallet simulation waits and cleanup registered before API fixture initialization. Invalid manifest digests are computed independently in the fixture so the production digest helper cannot prevent exercising the runtime validator. Both approved pairs compare that serialization with the production helper.

## Required manager closure

1. Integrate the exact foundation and 03 fixes, preserving authors/history. Add both new QA files to `npm test` and management unit registration; QA did not edit shared scripts. A green old test list does not execute these files automatically.
2. Rerun on the actual integrated commit, then execute the complete applicable gate and genuine C → R → S process. This later documentation commit must not be relabelled as executed QA source C.
3. Obtain 04 UI/browser, 02 contract-domain and 06 new-repository/hosted CI evidence at the appropriate exact candidate. Full combined browser/contract/CI checks are NOT_RUN here.
4. Keep NOT_DEPLOYED. Actual RPC availability, deployed-bytecode attestation, deployment/asset/Owner addresses, signatures, broadcast and funds are not tested or authorized here. Finality 3/128 remains inherited; L1 finality is UNKNOWN.

Startup repository binding and ports checks failed, so no formal environment admission is claimed. No required gate or existing generated PASS evidence was removed or edited. This assigned-worker QA is not independent GitHub/security approval.

Hosted status readback before publication: PR #5 still pointed to intake `07183230c921206e4a030263326b6742952995bb`. Engineering runs [35712952866](https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35712952866) and [35713026343](https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35713026343) reported FAILURE across their listed jobs. This observation is not a diagnosis of each job and is not evidence for C or O; new-repository CI closure remains with 06/manager.
