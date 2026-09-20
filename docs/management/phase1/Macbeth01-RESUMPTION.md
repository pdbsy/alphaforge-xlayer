# AlphaForge Phase One resumption and integration record

Task: M3-01-PHASE1-CLOSEOUT. Manager: Macbeth01. Canonical repository: pdbsy/quantpass-arbitrum-hackathon.

The user requested that all existing Macbeth02–06 workers continue. The prior temporary manager checkout and Macbeth05 temporary raw-evidence directories no longer exist. The cause is not established. Published commits and versioned historical evidence remain intact. Missing raw artifacts are not reconstructed under their former hashes or described as still available.

The manager restored the published source `62b3097ec60e5a5ee49d5438b344734e5df51a9c` into a Codex-managed persistent isolated worktree, with its own dependencies and runtime data. The protected base remains `18f5352070910a867b9729b031aa2e3951785e01`. Node 24.21.0 / npm 11.19.1 were activated through fnm 1.39.0; locked `npm ci --ignore-scripts` succeeded. Fresh baseline tests: 591/591. Previously uncommitted domain boundary tests, the full Phase One contract entrypoint and the exact bounded manager profile were restored from the recorded changes: the new admission tests first failed (30 pass / 3 fail), then all 50 focused identity, CI, domain and provenance tests passed after the minimal implementation. These are fresh local checks, not final-candidate or Hosted CI acceptance.

The integration manifest pins genuine, individually validated worker ranges: 02 has 5 commits, 03 has 6, 04 has 7 and 05 has 6 at the initial integration inputs. Source authors and commit objects are retained; manager additions carry the manager task. The manifest will advance only to real reviewed descendant sources when remediation lands.

## Current receipts and boundaries

- 02: PR24 / `a13052993b6f408b7be835ecd6f4b13ef6df367d`; contract artifact/ABI cross-check continues without changing the stable source.
- 03: PR26 / `67b7d48e7e393133b1b231aa4dc20d1319665278`; multi-Vault startup, Keccak boundary tests and three local recovery drills delivered; 617/617 is worker self-test evidence. Three-platform CI reaches management checking and rejects stale shared context; the manager owns its correction through fresh C/R/S.
- 04: PR27 / `332549c07239c41c1f1c3735cc1e5e8f247d3d6b`; actual task receipt received. Public Forum ACK must still be verified separately. The worker reported 637/638, with the shared product-ui migration hash mismatch left for manager reconciliation.
- 05: PR25 / `a35f19bf0ed61efbd95490f340ceb7cb32159218`; preparing final acceptance and recovering its isolated checkout. Coverage uses six runtime/source classes. Old 77/98 and 78/98 are extension-inventory observations, not a full executable denominator. Overall and browser source coverage remain NOT_MEASURED; P1-001 remains open. Missing old raw artifacts stay unavailable.
- 06: the user-authorized minimum metadata transmission now succeeded after direct permission in its task. Received only the three relative report names, commit `8c86276d5a4c24bd2052132bd8608ad9bb55fe4b`, branch `macbeth06/m3-phase1-gates`, and 130 added lines. This does not authorize report-body transfer, push or publication. Existing committed local reports survive; old temporary evidence does not. Fresh read-only CI checks continue within the allowed boundary.

## Existing decision: shared Strategy Pass

The frozen D1 specification says one Strategy has one independent ERC-20 Pass. `StrategyPass.sol` binds strategyId, not a Vault/Owner; `AlphaForgeVault.sol` checks Pass strategy identity and constructs a new immutable `PassLocker` for each Vault. Therefore several same-strategy Owner/Vault instances may share a Pass while retaining separate custody/locks. The manager directed 03 to correct the routing assumption that every Pass address must be globally unique, preserve Vault and deployment identity constraints, and test shared-Pass isolation and conflicting metadata. 04 must check its consumer assumptions. This is implementation conformance, not a new product decision. Final candidate freezing must include that correction.

## Previously authorized metadata correction

The user explicitly approved rebuilding only four Macbeth03 commits on `macbeth03/m3-phase1-recovery-final`, preserving original refs, PR23, per-commit code trees, authors and author dates. The mappings are:

| Original | Corrected |
| --- | --- |
| e2e7d97cbbbd21cfdaeeaad9f4b93c10a30991e7 | 28c396e52a55d9caecba09e54b1dde71bb1595e5 |
| 9886ffc04e3f234a87ab8dd67a69d47a24e2f802 | 02e7e9ea5519f002494a3ff5757388f18ff0c6a2 |
| bec0f2d1c1be5d9ca3f6cbdedd59fe657fe78022 | e0c7ca6dadb96bc91bbc5aedf06db3633d356c64 |
| d3cdec1d88e91a300e529d1d014a1a1633c56eb6 | 500914b900d61ea5b26c32ab5cc39c4b0d829c3c |

The final repaired tree is `f5257183b1b114295e565f1799b736a124797f72`. The manager previously verified 4/4 tree/author/date/parent mappings and 5/5 identity including intake. The current source also contains the subsequent normally attributed implementation commit 67b7d48. No further history correction is authorized by that limited decision.

No current merge, deployment, signing, broadcast, review exemption, rule weakening or credential expansion is authorized by resumption. Existing external governance and independent-review blockers remain separate from implementation and CI. Shared generated evidence is regenerated only through the real source C, manifest R, snapshot S workflow; stale evidence is never edited into PASS.

## Fresh intermediate integration verification

Normal merges of the four pinned worker sources produced intermediate HEAD `ccab59f0a81fb408b3c3a74aaa3ee794ecd25d42`. The bounded validator accepted 37 commits (24 original worker commits and 13 manager commits). Manager reconciliation registers the previously omitted Keccak test in both test entrypoints and updates migration provenance only for legitimate changed artifacts. With those reconciliations in the working tree, fresh typecheck, lint and format checks passed, followed by 670/670 tests with no skips. This is an intermediate local result, not an immutable final-candidate, CI, independent-review or deployment acceptance. Fresh logs are stored under the ignored `.checks/phase1-resume/` directory in the restored persistent worktree.

05 separately reproduced PR26 67b7d48 tests (617/617), but the explicitly included 13 key chain/API files measured 96.44% lines, 88.98% branches and 98.52% functions. This does not meet the frozen 100% critical authorization/accounting branch requirement; P1-001 remains OPEN. 03 must address real missing behavioral cases with 05's inventory. 05's PR24 independent rerun is blocked by missing fixed contract tools; 02 is validating the existing pinned recovery steps. PR27 targeted 125/125 and typecheck passed in 05's new environment, but final source composition is still changing.

04 is implementing an allowlisted Vault selection path and safe invalidation on switching. User scope says creation OR selection; a verified selection path meets this product requirement while initial creation remains the reviewed explicit-Owner deployment workflow. No factory or self-service deployment is added.

## Shared Pass integration and CI base correction

03's shared Pass correction `dd28febcc30f1f86e5e892dd7f446781fed73f5c` was normally merged and source-pinned. Related chain startup/runtime/API tests passed 25/25. Intermediate source `fc8967594dc713cb65b82362679eda109fe8bfca`, manifest `2957b47` and snapshot `1a22948b08fafcb5a800e60d467ab0b199242a72` passed full local check (672/672 tests), identity (43 records), and dashboard consistency. The collector's actual registered subset passed 663/663, with 11 PASS / 0 FAIL / 4 unregistered NOT_RUN.

Fresh hosted runs 35495833182 and 35495830271 exposed `GENERATED_ARTIFACT_DRIFT` after passing application tests. The restored shared Git repository still had local master `45e80f921df2d3f9172ddbbc8e6ab37c327107e7`, two commits behind verified origin/master `18f5352070910a867b9729b031aa2e3951785e01`. The generated snapshot recorded ahead=44 whereas CI correctly computed ahead=42. No worktree had master checked out; ancestry was verified and the unused local master ref was normally fast-forwarded to the exact remote master. No code, required check, historical commit or generated PASS record was manually changed to resolve this mismatch. Fresh C/R/S must replace the stale-base snapshot; failed runs remain evidence.

The manager independently restored locked Forge 1.5.1 / solc 0.8.31 / Slither 0.11.3 using the existing bootstrap. The first fixed solc download failed; one bounded retry succeeded and passed the locked hash checks. The full `contracts/script/check-phase1-contracts.sh` then passed on unchanged snapshot 1a22948, including local tests, static analysis, manifest equality and the explicit local deployment rehearsal. This is local/mock acceptance, not Testnet deployment or independent external review.

03 subsequently delivered test-only identity-boundary follow-up `28ff3d4b5c6e70ff0c6ea1b11ad0fea4283887fd` (worker 627/627; 13-file 96.59% lines / 92.26% branches / 98.56% functions). It is integrated without changing the implementation. 05 is independently classifying the remaining zero-count branches against the critical authorization/accounting inventory; the worker handoff is not final acceptance.

05 independently restored its isolated locked tools and passed the complete PR24 `a130529` contract entrypoint: 24/24 Python and 134/134 Solidity, fuzz/invariant, ABI/manifest equality and local deployment rehearsal, with successful Slither and zero detectors. Core Vault/Locker/Pass coverage is independently 100% for all four reported dimensions; compiled totals remain 95.53% lines / 95.12% statements / 73.42% branches / 95.54% functions. This closes the missing-tool prerequisite at that source checkpoint, not the final unified-candidate replay or P1-001. Its gate-log SHA-256 is `ce21fa201e92aa7751e95a95e091d2930356b7af197eed6c70c32017b9f400dd`; LCOV SHA-256 is `ab68b1355c159d195c72ef262246b7ad7ffcc5fcee0b127fa31b2141ffa95115`.
