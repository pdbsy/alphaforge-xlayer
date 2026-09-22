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

## Local development

Use the exact toolchain and isolated dependencies described in [development instructions](docs/DEVELOPMENT-TOOLCHAIN.md). Run environment admission before `npm ci --ignore-scripts`. `npm run check` retains the full inherited checks; unresolved repository or chain assumptions must fail visibly until migrated.

No credentials, deployment addresses or live asset addresses are supplied. Missing deployment inputs remain NOT_DEPLOYED. Existing protocol identifiers and accounting semantics stay stable unless separately assigned.
