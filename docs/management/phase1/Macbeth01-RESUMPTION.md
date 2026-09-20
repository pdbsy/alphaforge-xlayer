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
