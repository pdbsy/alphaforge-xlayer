# AlphaForge scanner qualification — 2026-09-20

User-selected tools were qualified as isolated developer/CI executables. Runtime selection is an implementation decision under that explicit task; it does not upgrade product dependencies, deploy contracts, replace independent review, or certify the tools free of vulnerabilities.

| Tool | Fixed version | License | Official release |
| --- | --- | --- | --- |
| Semgrep CE | 1.177.0 | LGPL-2.1-or-later (wheel metadata; LGPL 2.1 license text) | https://github.com/semgrep/semgrep/releases/tag/v1.177.0 |
| OSV-Scanner | 2.6.0 | Apache-2.0 | https://github.com/google/osv-scanner/releases/tag/v2.6.0 |
| Gitleaks CLI | 8.30.1 | MIT | https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1 |
| Slither | 0.11.3, unchanged | AGPL-3.0 | https://github.com/crytic/slither/releases/tag/0.11.3 |

Semgrep release notes and official PyPI 1.177.0 metadata were read before executing its wheels. All 66 exact package releases were resolved into CPython 3.12 native macOS ARM/Linux x64 binary wheel sets; every selected wheel's downloaded SHA-256 was reconciled with its version-specific PyPI metadata. The committed lock stores each asset's filename, version, source URL, hash and license observation. Two requirements files bind the actual platform wheel bytes; no mutable resolver runs in CI. Semgrep prerelease-numbered OpenTelemetry 0.58b0 dependencies are upstream exact transitive constraints, explicitly frozen; they are not floating beta upgrades.

Transitive license metadata was inspected. Face 26.0.1 and glom 25.12.0 had incomplete metadata; their included license texts establish BSD-3-Clause. Peewee 3.19.0 includes MIT. Other observed families include MIT/MIT-0, BSD, Apache-2.0, MPL-2.0 and PSF-2.0. Semgrep LGPL is scoped to this standalone unmodified tool, not added to the npm product license allowlist. No third-party registry rule bundle is downloaded: the 22 local rules and fixtures are authored for this project. This records engineering qualification, not legal advice or an independent provenance attestation.

OSV and Gitleaks native macOS ARM/Linux x64 downloads were compared to SHA-256 values from their precise official GitHub release asset records. Exact asset hashes are committed in `planning/security-scanners.lock.json`. Official tagged LICENSE texts were inspected. Gitleaks CLI is invoked directly, without its separately licensed Action or any cloud secret service. Only the reviewed pinned checkout/setup-node/setup-python Actions are needed.

Actual local qualification probes (before source C): Semgrep's 22 rules detected all 22 positive cases and rejected all 22 safe cases; the first Gitleaks synthetic alphabet fixture was ignored by built-in rules, correctly failing the detector canary. It was replaced with a deterministic, never-issued synthetic token fixture; detection of root/deleted/side/tag-only/merge-only history and current files, plus full redaction, then passed. Existing repository history scanned zero findings. OSV returned all 317 combined identities with zero advisories. These are probes, not hosted CI acceptance of a future head. Node fail-closed regression tests were red before implementation and green afterward.

Trust limitations: release/PyPI checksums verify downloaded bytes against reviewed upstream metadata; they are not independent attestations. Hosted runner images and setup-python distribution selection remain externally mutable. Vulnerability databases are network/current-state inputs and can change without a code change. Go scanner embedded-library coverage, native solc, Actions and Node/Python runtime advisories remain separate from the package inventory. Existing Slither, Forge, solc and OpenZeppelin lock values are unchanged.

Primary capability references:

- https://docs.semgrep.dev/semgrep-ce-languages
- https://docs.semgrep.dev/metrics
- https://google.github.io/osv-scanner/supported-languages-and-lockfiles/
- https://github.com/gitleaks/gitleaks/tree/v8.30.1
- https://github.com/crytic/slither
