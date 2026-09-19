# M3 GitHub security configuration audit

Task: `M3-01-PARTIAL-ONCHAIN-INTEGRATION`; owner Macbeth01; inspected 2026-09-19.

## Evidence and root causes

Canonical repository `pdbsy/quantpass-arbitrum-hackathon` is currently private, personal-account owned. Repository API reports admin capability for the authenticated operator, but that does not establish a Code Security entitlement. `security_and_analysis: null` is not treated as proof of any feature being enabled.

- Dependency graph SBOM API succeeds and returns 217 packages. The graph is available.
- Dependency-review compare API returns HTTP 403. Run [35446059384](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35446059384) explicitly reports that dependency review is not supported by this repository and requests the graph plus Advanced Security. Since the graph is available, enabling it again cannot solve this feature-access blocker.
- Code-scanning default-setup API returns HTTP 403 with `Code scanning is not enabled for this repository`.
- CodeQL run [35446059377](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35446059377) completed extraction/analysis and SARIF generation, then failed on Actions run metadata access with `Resource not accessible by integration`.
- The existing analysis job sets `contents: read`, `packages: read`, `security-events: write`, but omits `actions: read`. The [official CodeQL starter workflow](https://github.com/actions/starter-workflows/blob/main/code-scanning/codeql.yml) requires Actions read access for private repositories. This explains a specific metadata API permission failure; it does not establish that adding the permission enables code scanning.
- [GitHub dependency review documentation](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) requires Code Security or Advanced Security for private repositories. The [dependency-review API documentation](https://docs.github.com/en/enterprise-cloud%40latest/rest/dependency-graph/dependency-review) documents the private-repository missing-entitlement 403.

## Authorized minimal change

The user's frozen specification XI explicitly allows minimal workflow permissions and repository-level non-paid repairs while prohibiting new secrets, organization expansion, visibility changes, purchases and weakened gates.

| Setting | Before | After / current action | Reason |
| --- | --- | --- | --- |
| CodeQL job `actions` permission | omitted (none under explicit job map) | `read` in the task branch | Read workflow-run metadata in a private repository |
| Workflow default permissions | `contents: read` | unchanged | Avoid broad token grants |
| Repository Actions defaults | `default_workflow_permissions: read`; PR approval false | unchanged | No global write token needed |
| Job `security-events` | `write` | unchanged | Existing SARIF reporting scope |
| Job `packages` | `read` | unchanged | Existing CodeQL package scope |
| Dependency graph | SBOM accessible | unchanged | Already available |
| Code Security / paid features | unavailable or unproven entitlement | no activation attempted | Feature purchase/activation is outside authorization |
| Repository visibility | private | unchanged | Explicit prohibition |
| Required checks / protection | ruleset 22507334 active | unchanged | Preserve review and security gates |

The workflow policy allowlist is updated only for `actions: read` on the existing CodeQL analysis job. A regression rejects `actions: write`. All pinned actions, PR triggers, names and real failure behavior are retained.

## Required rules baseline

Ruleset 22507334 is active; deletion and non-fast-forward changes are prohibited; linear history is required. One approving review, CODEOWNER review, last-push approval, stale-review dismissal and thread resolution remain required. Strict status checks, all with integration ID 15368: `verify`, `verify-windows`, `verify-macos`, `analyze-javascript-typescript`, `dependency-review`.

No repository-level setting has been mutated. Re-read these values after implementation to detect concurrent changes; do not silently normalize them.

## Results and blockers

The initial permissions patch has a real hosted rerun recorded below. It repaired metadata access; code-scanning feature availability remains a separate gate. The final integrated candidate still requires its own hosted results.

Code Security/Dependency Review availability is a merge blocker until the repository has the necessary pre-existing permitted entitlement or the user separately authorizes an appropriate account-level resolution. Do not purchase, enable paid features, modify visibility, add a token, skip uploads, replace jobs or remove required contexts to turn it green. Product implementation and offline validation continue independently.

## Actual hosted verification after the minimal permission repair

PR21 initial head `8fcb14bd8f34bdbd56565344cb4f65158c725614` ran [CodeQL 35452845916](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35452845916). The former Actions run-metadata access error is no longer the terminal failure. After analysis and SARIF preparation, the run explicitly fails: `Please verify that the necessary features are enabled: Code scanning is not enabled for this repository`.

This is direct evidence that the minimal metadata permission repair does not resolve the separate repository feature gate. `security-events: write` was already present and remains present; the generic permission hint accompanying the feature-denied response is not evidence to grant broader permissions. Dependency review [35452845922](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35452845922) also remains failed. No paid feature was enabled and no repository setting was changed. Both required checks remain real merge blockers while implementation continues.

Initial-head Engineering runs [35452842803](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35452842803) (push) and [35452845871](https://github.com/pdbsy/quantpass-arbitrum-hackathon/actions/runs/35452845871) (pull request) completed successfully for all three contexts: `verify`, `verify-macos`, and `verify-windows`. These six successful jobs certify the initial manager head only; they do not replace final product-candidate verification.

## Protection readback during integration (2026-09-20 Asia/Shanghai)

The manager re-read ruleset 22507334 from GitHub and compared `id`, `name`, `target`, `enforcement`, `conditions`, `rules`, and `bypass_actors` with the pre-change API response. All fields matched. The five strict required contexts and their integration ID 15368 remain unchanged, as do review, history, deletion and force-update protections. No setting write occurred.

## Ready-to-merge follow-up (2026-09-20)

Fresh API inspection still identifies a personal private repository and code-scanning 403. Exact PR head `6643fea04a15925239f290010d043adcd6255d57` has both three-platform Engineering runs passing, CodeQL/Dependency Review feature failures, and `REVIEW_REQUIRED` with no reviews. The PR author and all CODEOWNERS are `pdbsy`; that identity cannot approve its own PR. The user selected preparation of a private organization + Code Security solution, without approving purchase or transfer. See the [concrete preparation plan](M3-PRIVATE-ORGANIZATION-READINESS-PLAN.md), including billing assumptions, strict repository-identity migration, base-branch CODEOWNER bootstrapping and unresolved inputs. Required checks and repository settings are unchanged.
