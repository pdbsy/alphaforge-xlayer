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

The permissions patch needs a real new-head hosted run. Local YAML/policy tests do not establish a successful hosted scan. Even if metadata access succeeds, code-scanning feature availability is a separate gate.

Code Security/Dependency Review availability is a merge blocker until the repository has the necessary pre-existing permitted entitlement or the user separately authorizes an appropriate account-level resolution. Do not purchase, enable paid features, modify visibility, add a token, skip uploads, replace jobs or remove required contexts to turn it green. Product implementation and offline validation continue independently.
