# XLayer R2 — local configuration and phase-one regression

Dependency mapping: manager commit 37077cfcae221352b4b3c7e9d1bb3810e98aa6be was consumed by `cherry-pick -x` as 352e4e28fc84086e7de201da8a95447e3e2d8a8f, with original author retained. The manager must import only Macbeth03's adapter commits, not re-import this shared network commit.

The existing local app now calls `readXLayerLocalConfig` when any XLAYER_* configuration is supplied. Missing or inconsistent testnet identity and unsafe endpoints reject before app/storage construction. With no XLayer inputs, the existing `readConfig` path remains. Both retain explicit QP_MODE=local, QP_ADAPTER=mock and reject production. This is metadata validation, not a network connection or public/testnet startup path. The unchanged local strategy catalog remains two TEST_ONLY fixtures and never claims a deployment.

Local checks:

- Local app RED reproduced accepting a wrong explicit XLayer chain; corrected test session setup before implementation. Both original fixture and valid RED logs retained.
- Local app + shared XLayer network + original server/chain API: 36/36 passed.
- New phase-one regression: 2/2 passed. Actual server/runtime/synchronizers/store with injected offline RPC exercise two XLayer Vaults sharing a deterministic Pass projection owner, distinct Vault holders, one-wei transfer confirmation and holder balance, rescue reconciliation failure and retry to confirmation. A real CLI backup/restore round trip preserves both 1952 and 46630 records and leaves submitted evidence unconfirmed.
- Both TypeScript projects and changed-file ESLint passed.

`strategy-catalog.ts` and `tools/chain-recovery.ts` required no algorithm changes: the former is deliberately a local fixture catalog; the latter validates/copies all chain rows without network-specific rewriting. Network-specific public/testnet launch and deployment catalog are manager/frontend integration boundaries. No fabricated deployment, actor addresses, or external chain evidence is introduced; all test addresses are synthetic offline fixtures.

Register `test/xlayer-local-app.test.ts` and `test/xlayer-phase1.test.ts` in manager-owned normal tests, along with the preceding two adapter test files. Deployment/sign/broadcast/mainnet/hosted results remain NOT_RUN. Local tests are self-verification, not independent approval.
