# AlphaForge on X Layer

AlphaForge X Layer edition is being ported from the AlphaForge Hackathon M3 codebase. This repository preserves the public upstream Git history, original authors, source branches and evidence tags.

**Current stage: migration in progress; local/mock only. No X Layer deployment, live wallet transaction, mainnet operation or real funds are enabled.**

- Canonical repository: https://github.com/pdbsy/alphaforge-xlayer
- Source repository: https://github.com/pdbsy/quantpass-arbitrum-hackathon
- Imported master: `18f5352070910a867b9729b031aa2e3951785e01`
- Target: X Layer Testnet, chain ID **1952**, gas token **OKB**
- Runtime baseline: Node **24.21.0**, npm **11.19.1**

The imported M3 code includes Vault/Pass contracts, adapter and recovery primitives, wallet runtime and product UI. Its inherited default configuration still targets Robinhood until the corresponding X Layer migration tasks pass. Historical tests, dashboards and PASS reports describe their recorded upstream commits; they do not certify this repository or X Layer.

Read the [migration specification](docs/xlayer/MIGRATION.md), [worker assignments](docs/xlayer/ASSIGNMENTS.md), and [implementation plan](docs/superpowers/plans/2026-09-22-xlayer-foundation.md). The [original README](docs/xlayer/UPSTREAM-README.md) is retained as source context.

## Current work

Governance decision status: **independent review (not accepted)**.

The canonical plan is [planning/roadmap.json](planning/roadmap.json). It generates [TODO.md](TODO.md), the [Markdown board](docs/TASK-BOARD.md) and the standalone [Chinese HTML security board](docs/task-board.html), so CI can reject status drift. Network assumptions and authoritative references are documented in [docs/ROBINHOOD-CHAIN.md](docs/ROBINHOOD-CHAIN.md). The proposed testnet scope and closed privilege baseline are documented in [ADR-0001](docs/adr/0001-testnet-mvp-scope-and-authority.md), with machine validation in [planning/security-boundary.json](planning/security-boundary.json). The generated [threat model](docs/THREAT-MODEL.md) records open risks without claiming they are fixed.

The active SUPPLY-001 work is documented in [docs/security/SUPPLY-CHAIN.md](docs/security/SUPPLY-CHAIN.md). Its offline check binds npm packages to the canonical registry and SHA-512 integrity, enforces the reviewed license and GitHub Action allowlists, and keeps the committed SPDX 2.3 SBOM synchronized with the lockfile. Vulnerability reports should follow [SECURITY.md](SECURITY.md).

GOV-001 acceptance evidence is tied to a real Git ancestor and a closed first-transition diff. Its repository validator can reject accidental or uncoordinated drift in the accepted ADR, this README's governance section, roadmap policy fields, the validator/tests and CI workflow while allowing roadmap lifecycle progress. The workflow invokes that validator and its tests directly instead of trusting mutable package-script indirection. Git provenance checks sanitize ambient Git configuration, ignore replace refs, distinguish an absent historical review file from an unreadable one, and reject reviewed commits dated after the verification instant.

This in-repository check is defense in depth, not its own trust root: one hostile commit could otherwise replace the workflow, validator and tests together. GOV-001 is therefore explicitly blocked on the current task, SUPPLY-001, which must establish a protected repository-external required workflow/status check and branch policy before governance can be accepted. In-repository reviewer IDs remain audit labels only; they are not external identity assurance. Both Testnet write planes remain closed.

## Local development

Use the exact toolchain and isolated dependencies described in [development instructions](docs/DEVELOPMENT-TOOLCHAIN.md). Run environment admission before `npm ci --ignore-scripts`. `npm run check` retains the full inherited checks; unresolved repository or chain assumptions must fail visibly until migrated.

No credentials, deployment addresses or live asset addresses are supplied. Missing deployment inputs remain NOT_DEPLOYED. Existing protocol identifiers and accounting semantics stay stable unless separately assigned.
