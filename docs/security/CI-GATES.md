# AlphaForge M3 engineering gates

Implementation owner: Macbeth01. Operational evidence/check owner: Macbeth06. The user selected a private-repository hackathon readiness path without purchasing or migrating, then explicitly assigned Macbeth06 to CI/gate checks. This supersedes the earlier organization-purchase proposal as the current engineering direction; it does not supply missing independent approval.

## Actual capabilities and limitations

| Check | Runs | Explicit limits |
| --- | --- | --- |
| verify / verify-macos / verify-windows | Existing complete engineering gates, attribution, environment, source/tests/build and unchanged checkout | Existing responsibilities retained; Linux also retains its original npm audit |
| contracts-m3-macos | Locked bootstrap, tool verification, Python regressions, offline Forge tests/fuzz/invariants, strict Slither, published Vault ABI comparison | macOS ARM only; local/mock, no deployment/RPC/signing; not an independent audit |
| source-policy-js | All tracked JS/MJS/TS/TSX in apps/packages/src/tools/docs, excluding dependency/build directories; four ESLint rules forbid eval, Function construction, implied eval and script URLs | No cross-function/data-flow analysis, HTML inline script, Solidity or native component analysis; not equivalent to CodeQL |
| dependency-delta-audit | Exact Git base/head lock graphs, all entry metadata differences, current source/integrity/license policy on both inputs, isolated head-lock npm audit with high/critical rejection | Root npm known advisories only; no reachability, unknown/malicious package detection, Python/tool binary/Action advisory coverage; not equivalent to GitHub Dependency Review |

New contexts have distinct names. Original CodeQL and Dependency Review workflows, required status contexts, review thresholds and CODEOWNERS remain in force. Feature-availability failures stay visible. GOV-001/SUPPLY-001 remain open: repository-owned validators cannot create an external trust root. A substitute passing does not mark the unavailable service or independent reviewer as passed.

## Execution and evidence

Jobs use full-history pinned checkout without persistent credentials, read-only contents permission and bounded timeouts. No pull_request_target, secret, self-hosted runner, continue-on-error or conditional skip is introduced. A parsed workflow contract rejects missing/replaced/skipped new jobs and steps; the existing validator still rejects unapproved Actions and permissions. New tests are registered in both the full npm suite and management collector.

Gate reports are bounded JSON on stdout, retained in hosted job logs rather than editable PASS files. They record source head/base when present, actual checkout/tree, root lock hash, UTC and run/image identifiers. Contract reports additionally bind the contract lock hash and Python identity. Clean tracked Git state is required and checked again after execution. Contract subprocess output is bounded; timeout/signal/capture failure is BLOCKED. Tool bootstrap/probe failures are BLOCKED; actual contract test failure is FAIL; ABI remains unconfirmed when the enclosing entry point fails. Success requires the existing script's ABI check to complete.

Source parsing/unreadable/empty/missing/escaping coverage is BLOCKED. Rule findings are FAIL; inline configuration cannot disable them. Dependency network, malformed/inconsistent/partial JSON, history or policy errors are BLOCKED, not zero-vulnerability success. All non-PASS states exit nonzero. Moderate/low advisories remain reported under existing SLA; PASS only describes the high/critical threshold.

Dependency audit receives only manifest/lock JSON in a new temporary directory, empty user/global npm configuration and a minimal environment. It never executes the inspected revision's package scripts or .npmrc. Base/head objects are read without checkout or code execution; missing objects fail. A new-branch push explicitly uses fetched origin/master as baseline. Audit sends root dependency information to the already-approved npm registry; private source code is not uploaded by the new jobs.

The management collector's four unregistered contract entries remain NOT_RUN. Hosted contract results are separate evidence and are never copied into those fields by hand. Source C, report-only R and snapshot-only S remain the manager's evidence workflow.

## Locked runtime and reviewed new Action

Node 24.21.0/npm 11.19.1 and all npm packages remain unchanged. Source rules reuse ESLint 10.10.0 and typescript-eslint 8.69.0, both already locked. No new scanner, remote rule feed or package dependency is installed.

Contract job uses the existing `contracts/toolchain.lock.json`: CPython 3.12.9 ARM, Forge 1.5.1, solc 0.8.31, Slither 0.11.3 and 47 hash-locked binary wheels. Existing protected contract scripts, compiler settings and lockfiles are unchanged. Fixed solc is an x86_64 macOS binary; execution failure on the ARM runner blocks the job. No automatic Rosetta installation or compiler substitution is permitted.

The only added Action is [actions/setup-python v6.0.0](https://github.com/actions/setup-python/tree/e797f83bcb11b83ae66e0230d6156d7c80228e7c), pinned to `e797f83bcb11b83ae66e0230d6156d7c80228e7c`. Macbeth01 reviewed its [MIT license](https://github.com/actions/setup-python/blob/e797f83bcb11b83ae66e0230d6156d7c80228e7c/LICENSE), [input contract](https://github.com/actions/setup-python/blob/e797f83bcb11b83ae66e0230d6156d7c80228e7c/action.yml) and [Python download/install path](https://github.com/actions/setup-python/blob/e797f83bcb11b83ae66e0230d6156d7c80228e7c/src/install-python.ts). Exact Python version/architecture are checked before bootstrap. It selects distributions from the official actions/python-versions manifest or hosted cache; the manifest is mutable and this is not independently attested binary provenance. No cache or pip-upgrade input is enabled.

Macbeth06 recorded official release `3.12.9-13149478207`, asset `python-3.12.9-darwin-arm64.tar.gz`, published SHA-256 `a9e5e8ebe360c3a35d13e342ebf758eb856f53dbc82549c5769476243d734ae1`. This reference is not a claim that setup-python enforces that hash. Forge/OpenZeppelin/solc downloads and Python wheels retain the existing bootstrap's hash checks. Slither AGPL and solc GPL are separate toolchain licenses; the root npm license allowlist is unchanged. Full transitive toolchain license/advisory qualification remains outside the npm gate.

## Readiness acceptance

Acceptance needs actual new-head hosted results, not the previous c0b05e9 checks. CI configuration alone is not PASS. Macbeth06 reads the resulting run/head/checks and reports operational state. Resolving unavailable required contexts needs a concrete replacement decision that states the loss of coverage; independent GitHub approval is still required. No merge, ruleset change, purchase, repository transfer or chain transaction is authorized by this document.
