# AlphaForge open source security gates implementation plan

> **For agentic workers:** Use executing-plans to implement this plan in the existing independent manager checkout. Macbeth06 performs the already assigned read-only operational verification; shared files remain serialized.

**Goal:** Replace unavailable automatic CodeQL/Dependency Review gates with the user-selected Semgrep CE, OSV-Scanner and Gitleaks CLI, retaining strict Slither and all engineering/review protections.

**Architecture:** Three separately named, read-only Ubuntu jobs run exact, hash-locked scanners. Semgrep uses reviewed repository-local rules with telemetry/version checks disabled; OSV receives an explicitly generated inventory derived from npm and Python/toolchain locks; Gitleaks scans full fetched Git history with redacted output. Missing input, incomplete scan, unknown output or process failure cannot pass. The current lightweight source and dependency-delta checks remain as additional engineering checks.

**Tech Stack:** Existing Node 24.21.0/npm 11.19.1, CPython 3.12.9; candidate Semgrep CE 1.177.0, OSV-Scanner 2.6.0, Gitleaks 8.30.1. Slither 0.11.3 and the existing contract toolchain stay fixed. Exact scanner wheels/binaries must be qualified before execution.

**Spec:** User instruction of 2026-09-20 selecting these four tools; current `docs/security/CI-GATES.md`, `AGENTS.md`, `docs/DEVELOPMENT-TOOLCHAIN.md` and its status supplement.

## Global constraints

- Repository `pdbsy/quantpass-arbitrum-hackathon`, PR #21, branch `macbeth01/m3-partial-onchain-integration`; initial HEAD `cdc6af829d86a9e79af115893470a7f5a83ab804`.
- No merge, deployment, signatures, credential use, force push, history rewrite or independent approval claim. User tool-replacement instruction authorizes this exact gate migration after real checks pass.
- Preserve Linux/Windows/ARM macOS checks, contract/fuzz/invariant/Slither/ABI, existing npm policy/delta checks, review threshold, CODEOWNERS and all non-status rules.
- Separate scanner install directory and wheels; no global installs, lifecycle/source builds, mutable registry rules or latest runtime references.
- Keep source C, manifest-only R and snapshot-only S. Reports bind actual source and checkout hashes, immutable inputs and scanner versions. Redact findings; no raw secret/code snippets in logs.
- Semgrep is not equivalent to CodeQL; OSV covers identified known advisories, not unknown vulnerabilities or all binary/tool ecosystems. GOV-001/SUPPLY-001 and missing independent review stay open.

## Task 1: Qualify fixed tools and fail-closed inputs

**Files:** Create `planning/security-scanners.lock.json`, `tools/security/requirements-semgrep-{darwin-arm64,linux-x64}.lock`, `tools/security/bootstrap.mjs`, `tools/security/inputs.mjs`, `test/security-scanners.test.mjs`.

- [ ] Read official release/license/CLI sources; download exact release assets and binary wheels to an isolated qualification directory. Record SHA-256, upstream URLs, licenses and platform support; reject source-only or unqualified installs.
- [ ] Write regression cases: changed download bytes must fail integrity validation; unsupported hosts must stop; empty/malformed npm/Python inventories and conflicting pins must stop. Hand-derived fixture expectations: npm `a@1.0.0`, PyPI `foo-bar@2.0.0`, named Git tool revisions.
- [ ] Run `node --test test/security-scanners.test.mjs` and confirm intended RED. Implement `buildInventory({npmLock,pythonLocks,contractLock})`, strict pin parsing and immutable tool bootstrap. Run the same tests GREEN.
- [ ] Download/install only the approved complete wheel set with `--require-hashes --only-binary=:all: --no-index`; verify CLI versions and retain qualification receipts outside tracked evidence.

## Task 2: Implement and exercise actual scanner gates

**Files:** Create `tools/security/semgrep.yml`, `tools/security/rule-fixtures.json`, `tools/ci/check-semgrep.mjs`, `tools/ci/check-osv.mjs`, `tools/ci/check-gitleaks.mjs`, shared bounded report helpers if needed; extend `test/security-scanners.test.mjs`.

- [ ] Add RED behavior tests for malformed/error/signal/timeout/empty coverage reports and scanner findings. Semgrep must compare scanned paths to all selected tracked JS/TS/Python paths; OSV must account for every inventory entry; Gitleaks must reject shallow history and remove secret/match/email fields from emitted findings.
- [ ] Implement `classifySemgrep`, `classifyOSV`, `classifyGitleaks` against observed pinned CLI formats. PASS requires complete known schemas plus zero blocking findings; unavailable/network failures are BLOCKED, findings are FAIL. No catch-to-success paths.
- [ ] Author local Semgrep rules covering dynamic code, command injection, SQL injection, unsafe deserialization, weak TLS/configuration and Python equivalents including intraprocedural taint. Each rule has one positive and one safe fixture run by the real engine before repository scanning. No implicit remote config or inline suppression.
- [ ] Invoke OSV using only the generated custom inventory, including root npm graph, all 47 Slither Python pins, both Semgrep wheel graphs, and identifiable OpenZeppelin/tool source revisions. Document unmapped binaries/Actions separately rather than calling them covered.
- [ ] Invoke Gitleaks CLI with pinned built-in rules, an explicit repository-controlled config, no implicit ignore file/inline allowances, full non-shallow reachable history and current files, complete redaction. Confirm a synthetic secret in a temporary history is detected without leaking it.
- [ ] Execute all three real scanners; resolve actionable code defects within scope. If a scanner finds a genuine credential or a dependency change requires a new decision, report the concrete issue without exposing the value or weakening the gate.

## Task 3: Wire mandatory CI and evidence

**Files:** Modify `.github/workflows/ci.yml`, legacy service workflows, `tools/ci/workflow-contract.mjs`, `tools/check-supply-chain.mjs`, `tools/environment/policy.mjs`, `planning/development-environment.json`, test registration in `package.json` and `tools/management-dashboard/checks.mjs`, `docs/security/CI-GATES.md`, qualification documentation and task log.

- [ ] Add failing workflow/admission mutations for `semgrep-ce`, `osv-scanner`, `gitleaks`: missing or conditional job, replaced command, shallow checkout, wrong architecture, unpinned installation and permission drift must reject.
- [ ] Add exact full-history read-only jobs using existing pinned checkout/setup-node/setup-python. Gate scripts own bootstrap and bounded sanitized reports. Keep original service workflows available manually as historical optional integrations, clearly superseded for automatic checks.
- [ ] Run focused gates/environment/supply tests, format/type/lint, regenerate supply output if required, and review actual diff. Commit source C with Macbeth01/Task trailers; generate R and S via existing commands; run complete `npm run check`.
- [ ] Normal push to the existing authorized PR branch and update PR #21 with concrete capabilities, limitations and actual candidate evidence. Have Macbeth06 verify hosted results on that exact SHA, including no skipped steps and all scanner coverage counts.

## Task 4: Apply the authorized status-context replacement

- [ ] Re-read live ruleset 22507334 and PR head; stop on unrelated drift. Save exact before snapshot and proposed payload.
- [ ] Once current-head checks pass, replace `analyze-javascript-typescript` with `semgrep-ce`, replace `dependency-review` with `osv-scanner`, add `gitleaks` and `contracts-m3-macos`; retain `verify`, `verify-macos`, `verify-windows`, integration 15368 and every other rule field.
- [ ] Read back and compare the full ruleset, PR review state and current head. Record the exact operation and keep independent-review/Draft blockers explicit. Do not merge.
