# AlphaForge on X Layer Testnet

Hackathon edition · Pre-release

AlphaForge separates Strategy Pass access from funds held in user Vaults. The X Layer edition includes wallet integration, Vault allowances and actions, transaction tracking, and chain event reconciliation.

- **Network:** X Layer Testnet, chain ID **1952** (`0x7a0`).
- **Settlement display:** **USDT**, the application's six-decimal test token. It is not issuer-backed USDT.
- **Native gas token:** **OKB**.
- **Deployment status:** **NOT_DEPLOYED**. No deployed contract addresses or live acceptance are claimed by this repository's preparation record.

## Build the website

Use **Node 24.21.0** and **npm 11.19.1**, pinned in [`.node-version`](.node-version) and [`package.json`](package.json). On macOS, activate the approved runtime through fnm. See the [toolchain specification](docs/DEVELOPMENT-TOOLCHAIN.md) and [implementation status](docs/DEVELOPMENT-TOOLCHAIN-STATUS.md) for environment setup.

```bash
node tools/check-environment.mjs
npm ci --ignore-scripts
npm run build:xlayer
```

The X Layer build writes the website to **`dist/xlayer/web`** and selects Testnet chain ID 1952. Building it does not deploy contracts or publish a website. Strategy descriptions, charts and rankings are illustrative.

The public application requires a configured origin and explicit reviewed deployment data. Its health endpoint reports not ready until the configured chain runtimes are healthy and caught up. The repository currently exposes this application through [`buildXLayerPublicApp`](apps/server/src/xlayer-public-app.ts); deployment and hosting integration remain part of the [XLayer R2 plan](docs/superpowers/plans/2026-09-25-xlayer-r2.md).

## Deployment preparation

The [X Layer deployment template](contracts/deployment/m3-xlayer-testnet.template.json) is a **NOT_DEPLOYED / PRE_RELEASE** preparation record. Addresses, constructor inputs and transaction evidence remain unset. It cannot substitute for an actual reviewed deployment record.

The [contract delivery notes](docs/xlayer/r2/contracts/DELIVERY.md) describe the test assets, Strategy Pass, Vault and Vault-created Locker. The USDT asset uses the existing `afUsdc` contract role to preserve ABI and storage compatibility. Testnet deployment, signing and broadcasting require a separate authorized operation; ordinary builds and tests stay local/mock.

## Development checks

```bash
npm run typecheck
npm test
npm run check
```

These are registered repository checks. A passing historical run does not establish acceptance of the current X Layer candidate. Missing deployment evidence and external prerequisites remain explicit.

## Compatibility and historical documentation

This repository is [AlphaForge XLayer](https://github.com/pdbsy/alphaforge-xlayer). It preserves the upstream Robinhood history and stable protocol, storage and package identifiers. Historical plans, localized boards and evidence describe their original scope; they are not X Layer launch instructions or current deployment evidence.

The governance policy below is retained unchanged because its exact section is checked by the governance provenance validator. Current X Layer implementation work is tracked in the [R2 plan](docs/superpowers/plans/2026-09-25-xlayer-r2.md).

## Current work

Governance decision status: **independent review (not accepted)**.

The canonical plan is [planning/roadmap.json](planning/roadmap.json). It generates [TODO.md](TODO.md), the [Markdown board](docs/TASK-BOARD.md) and the standalone [Chinese HTML security board](docs/task-board.html), so CI can reject status drift. Network assumptions and authoritative references are documented in [docs/ROBINHOOD-CHAIN.md](docs/ROBINHOOD-CHAIN.md). The proposed testnet scope and closed privilege baseline are documented in [ADR-0001](docs/adr/0001-testnet-mvp-scope-and-authority.md), with machine validation in [planning/security-boundary.json](planning/security-boundary.json). The generated [threat model](docs/THREAT-MODEL.md) records open risks without claiming they are fixed.

The active SUPPLY-001 work is documented in [docs/security/SUPPLY-CHAIN.md](docs/security/SUPPLY-CHAIN.md). Its offline check binds npm packages to the canonical registry and SHA-512 integrity, enforces the reviewed license and GitHub Action allowlists, and keeps the committed SPDX 2.3 SBOM synchronized with the lockfile. Vulnerability reports should follow [SECURITY.md](SECURITY.md).

GOV-001 acceptance evidence is tied to a real Git ancestor and a closed first-transition diff. Its repository validator can reject accidental or uncoordinated drift in the accepted ADR, this README's governance section, roadmap policy fields, the validator/tests and CI workflow while allowing roadmap lifecycle progress. The workflow invokes that validator and its tests directly instead of trusting mutable package-script indirection. Git provenance checks sanitize ambient Git configuration, ignore replace refs, distinguish an absent historical review file from an unreadable one, and reject reviewed commits dated after the verification instant.

This in-repository check is defense in depth, not its own trust root: one hostile commit could otherwise replace the workflow, validator and tests together. GOV-001 is therefore explicitly blocked on the current task, SUPPLY-001, which must establish a protected repository-external required workflow/status check and branch policy before governance can be accepted. In-repository reviewer IDs remain audit labels only; they are not external identity assurance. Both Testnet write planes remain closed.

## Security

Keep private keys, seed phrases, wallets and provider credentials outside the repository. The public server does not hold signing keys. Report vulnerabilities through [SECURITY.md](SECURITY.md).
