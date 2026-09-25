# XLayer R2 contract preparation

Base: b2ed61311df8d1c97a48f623d1b4872798f5e888. Implementation: Temp-A, AF-XLAYER-R2-CONTRACTS. Independent clone and branch codex/xlayer-r2-contracts. This assignment replaces the unavailable 02 handoff; no previous XLayer implementation was reused.

The strict NOT_DEPLOYED / PRE_RELEASE preparation record is `contracts/deployment/m3-xlayer-testnet.template.json`. `validateXLayerDeploymentTemplate(value)` in `tools/check-xlayer-deployment-template.mjs` accepts exactly that preparation schema (with bounded configurable readiness/reorg thresholds) and rejects unknown/missing fields, foreign chains, filled evidence, constructor drift, additional deployments and standalone Locker creation. It is intentionally not a validator for an actual deployed record.

Five direct deployments are ordered afUsdc, afEth, afBtc, strategyPass and vault. PassLocker is recorded separately as VAULT_CONSTRUCTOR and never appears in the direct deployment order. No Venue or SwapAdapter is required. Every address, constructor value, receipt/hash and source/evidence ref remains null. PM owns conversion into a separately validated deployed record; local rehearsal addresses must never populate the template.

`AlphaForgeTestUSDT` is a new fixed-supply asset with name AlphaForge Test USDT, symbol USDT and six decimals. It is a test asset, not issuer-backed USDT. It occupies the existing afUsdc role. The original AlphaForgeTestUSDC, Vault ABI/selectors, afUsdc constructor/getter, accounting scale, storage and authorization remain unchanged. No permit, mint function or additional owner authority is added. All new prose is English.

## Local verification

Approved Node 24.21.0/npm 11.19.1; independent npm ci --ignore-scripts --offline. Pinned Forge 1.5.1, commit b0a9dd9ceda36f63e2326ce530c10e6916f4b8a2; solc 0.8.31+commit.fd3a2265. Tool and OpenZeppelin archives were copied from the existing local cache only after verifying the repository lock digests; binaries and dependency directories were independently materialized in this checkout. The pinned pragma derivation check passed.

- Baseline legacy template: 10/10. Baseline original Phase One rehearsal: 2/2.
- Template RED: six expected missing-implementation failures retained. New plus legacy template GREEN: 16/16.
- USDT RED: existing settlement asset compiled and failed the required USDT-name assertion; the other three new tests passed. No compiler-error RED was substituted for this behavior.
- Full Forge suite after the new asset: 164/164, including XLayer lifecycle and preview-domain regressions. Chain ID changes exist only in the in-memory Forge VM.
- Changed JavaScript ESLint passed; Prettier and Forge formatting applied to new files only.

Offline lifecycle coverage: one-wei Pass transfer, exact finite USDT/Pass allowances, deposit/withdraw/close accounting and returned assets, Vault-created Locker identity, owner isolation, token/native rescue. Digest-preview domains are separated across 1952, 195, 196, 46630 and verifying contracts. The preview is not business-signature authorization.

Raw RED/GREEN logs remain in ignored `.checks/xlayer-r2-contracts/`. Local test results are self-verification; Macbeth03's independent review is pending. Root test/management registration for `test/xlayer-deployment-template.test.mjs` is manager-owned. Forge discovers `contracts/test/XLayerPhase1.t.sol` through the existing all-tests gate.

No RPC, key use, signing, broadcast, chain deployment or mainnet. Hosted verification and actual deployment remain NOT_RUN. No historical manager checks or generated PASS evidence were edited.
