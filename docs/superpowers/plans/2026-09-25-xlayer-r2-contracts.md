# XLayer R2 Contract Preparation Implementation Plan

> Execute inline with executing-plans and test-driven-development. Independent review is assigned to Macbeth03; do not create another worker.

**Goal:** Prepare the minimum X Layer Testnet deployment record and verify the existing Phase One lifecycle with a six-decimal USDT settlement asset offline.

**Architecture:** A strict preparation-only validator accepts exactly five direct deployments and one Vault-created Locker. A new fixed-supply USDT contract uses the existing asset base; Vault selectors, internal afUsdc names, six-decimal accounting and historical contracts stay intact.

**Tech Stack:** Node 24.21.0, npm 11.19.1, Solidity 0.8.31, Forge 1.5.1, OpenZeppelin 5.4.0, Paris EVM.

**Spec:** XLayerPM's confirmed R2 contract handoff on 2026-09-25 and `docs/protocol/PHASE1-TESTNET-DEPLOYMENT-PLAN.md` at b2ed61311df8d1c97a48f623d1b4872798f5e888. The new assignment changes the target to 1952 and the settlement display to USDT; historical Robinhood evidence is retained.

## Constraints

- Independent clone, branch `codex/xlayer-r2-contracts`, exact base b2ed613; no old XLayer source reuse.
- English prose, explicit testnet and pre-release status. Stable ABI, protocol/storage names and six-decimal amounts remain compatible.
- No RPC, key use, signing, broadcast, actual deployment or mainnet. Local addresses never populate the preparation record.
- Root scripts, historical manager checks and C/R/S evidence remain manager-owned. Report test registration requirements.

## Task 1: Preparation record and validator

Files: `contracts/deployment/m3-xlayer-testnet.template.json`, `tools/check-xlayer-deployment-template.mjs`, `test/xlayer-deployment-template.test.mjs`.

Interface: `validateXLayerDeploymentTemplate(value)` returns the valid input or throws a sanitized error. `checkXLayerDeploymentTemplate()` reads the repository template. Chain 1952, NOT_DEPLOYED and PRE_RELEASE are mandatory. Exactly afUsdc/afEth/afBtc/strategyPass/vault are direct deployments; passLocker is created only by the Vault. All addresses, argument values, hashes, receipts and source/evidence refs are null.

- [x] Write rejection tests for 195/196/46630/string IDs, missing/extra fields at every depth, wrong constructor shapes, added deployment roles, independent Locker deployment, non-null evidence and malformed thresholds.
- [x] Run `node --test test/xlayer-deployment-template.test.mjs`; retain the expected missing-implementation failure.
- [x] Implement exact recursive shape/value validation with bounded soft-ready/reorg settings, and a JSON-only template with complete constructor descriptors.
- [ ] Run new tests and `test/m3-deployment-template.test.mjs`; commit and send the exact source SHA to XLayerPM.

## Task 2: USDT asset and offline chain/lifecycle checks

Files: `contracts/src/AlphaForgeTestUSDT.sol`, `contracts/test/XLayerPhase1.t.sol`, `docs/xlayer/r2/contracts/DELIVERY.md`.

Interface: `AlphaForgeTestUSDT(uint256 fixedSupply_, address recipient_)`, name `AlphaForge Test USDT`, symbol `USDT`, decimals 6. It inherits the existing fixed-supply ERC20 base and adds no mint, permit or owner capability. Vault receives this address through its unchanged afUsdc_ constructor slot.

- [x] Test the current six-decimal asset against required USDT metadata; capture its failing symbol assertion before adding the asset.
- [x] Add the minimal subclass, then verify metadata, constructor supply/recipient, transfer precision and no extra mint path.
- [x] Rehearse transfer/deposit/withdraw/close/token and native rescue at local chain ID 1952, including finite allowances and direct owner isolation.
- [x] Verify the existing digest preview differs between 1952, 195, 196 and 46630 and between verifying contracts; this adds no business signing or permit authorization.
- [ ] Run both original and new Forge tests, compare historical ABI/bytecode artifacts, run focused JS checks, and request Macbeth03's independent review with exact source SHA and validation limits.
