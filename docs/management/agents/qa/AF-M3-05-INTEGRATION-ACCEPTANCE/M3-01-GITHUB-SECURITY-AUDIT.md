# M3-01 GitHub security configuration audit intake

Recorded: 2026-09-19

Mode: read-only. Macbeth05 changed no workflow, repository setting, required check, ruleset, visibility, secret, credential, or plan.

## Observed repository state

| Item | Observed value | Evidence |
| --- | --- | --- |
| Repository | `pdbsy/quantpass-arbitrum-hackathon` | Canonical `origin` and GitHub API |
| Visibility | Private | Repository API `private=true`, `visibility=private` |
| Macbeth05 API role | Admin reported by API | Used only for readback; no setting write performed |
| Default Actions token | Read | `/actions/permissions/workflow` |
| Dependency Graph | Enabled and populated | Dependency SBOM endpoint returned HTTP 200 |
| Code Scanning | Disabled/unavailable | Code scanning alerts endpoint returned HTTP 403: `Code scanning is not enabled for this repository` |
| CodeQL workflow permissions | `contents: read`, `packages: read`, `security-events: write`; missing `actions: read` | `.github/workflows/codeql.yml` |
| Dependency Review workflow permissions | `contents: read` | `.github/workflows/dependency-review.yml` |
| Master protection | Active repository ruleset `master-protection` (`22507334`) | Ruleset API; direct branch-protection endpoint returns HTTP 404 because protection is ruleset-based |
| Required checks | `verify`, `analyze-javascript-typescript`, `dependency-review`, `verify-macos`, `verify-windows` | Ruleset `required_status_checks`; strict mode enabled |

## Failure evidence and separate root causes

Dependency Review run `35446059384` failed with the provider error that dependency review is unsupported for this repository and requires Dependency Graph plus GitHub Advanced Security. The dependency graph is independently confirmed enabled, leaving private-repository Code Security/GHAS availability as the unsatisfied feature gate.

CodeQL run `35446059377` extracted and scanned 61 JavaScript files, 60 TypeScript files, and 3 GitHub Actions files and exported SARIF. The action then failed while reading GitHub workflow-run metadata with `Resource not accessible by integration`. The code-scanning API independently reports that code scanning is not enabled.

### Issue A: CodeQL job permission gap

The CodeQL job declares explicit job-level permissions but omits `actions: read`. Under GitHub Actions permission semantics, permissions not specified in that block become `none`; the repository's default read setting therefore does not supply the omitted permission. GitHub's [official CodeQL starter workflow](https://github.com/actions/starter-workflows/blob/main/code-scanning/codeql.yml) explicitly grants `actions: read` and identifies it as required for workflows in private repositories. The least-privilege YAML correction is to add only `actions: read` to the CodeQL job.

### Issue B: private-repository Code Security feature gate

The permission correction does not resolve or waive the separate product entitlement. The Code Scanning API currently reports the feature disabled, and Dependency Review explicitly reports that the private repository lacks the required Code Security/GHAS capability. GitHub documents that [dependency review for private repositories requires GitHub Code Security](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) and that [SARIF uploads for private repositories require GitHub Code Security](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/ghas-required).

Changing repository visibility is explicitly outside the user's authorization.

## Minimum safe resolution

1. Macbeth01 adds only job-level `actions: read` to the CodeQL job and records the exact diff.
2. Rerun CodeQL on the exact M3-01 candidate and retain the new run evidence. Do not infer that the entitlement is available merely because workflow-run metadata access succeeds.
3. Check the repository's Advanced Security page for an existing Code Security entitlement.
4. If an entitlement already exists and enabling it requires no purchase, visibility change, organization-policy expansion, new credential, or new secret, Macbeth01 may enable Code Security under the task's repository-setting authorization.
5. Record the exact setting before/after value and rerun CodeQL and Dependency Review on the exact candidate.
6. If no existing entitlement is available, preserve the feature-gated failures as real blockers and report the minimum external condition: an authorized GitHub Code Security entitlement.

No permission beyond job-level `actions: read` is justified by current evidence. Do not broaden other token permissions, disable SARIF upload, replace the security jobs with local no-op checks, suppress failure, skip pull-request triggers, remove required contexts, change repository visibility, or buy/enable a paid plan without new authorization.

## Final verification required

- Exact M3-01 source head and workflow files.
- CodeQL and Dependency Review rerun links and conclusions.
- Repository security-setting before/after readback.
- Required-check/ruleset readback proving no removal or weakening.
- Fork-PR behavior if the final PR source repository differs from the canonical repository.
- Any unresolved licensing or policy constraint retained as `BLOCKED`, not converted to `PASS`.
