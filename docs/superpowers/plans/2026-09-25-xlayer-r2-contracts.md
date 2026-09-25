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
- [x] Run new tests and `test/m3-deployment-template.test.mjs`; commit and send the exact source SHA to XLayerPM.

## Task 2: USDT asset and offline chain/lifecycle checks

Files: `contracts/src/AlphaForgeTestUSDT.sol`, `contracts/test/XLayerPhase1.t.sol`, `docs/xlayer/r2/contracts/DELIVERY.md`.

Interface: `AlphaForgeTestUSDT(uint256 fixedSupply_, address recipient_)`, name `AlphaForge Test USDT`, symbol `USDT`, decimals 6. It inherits the existing fixed-supply ERC20 base and adds no mint, permit or owner capability. Vault receives this address through its unchanged afUsdc_ constructor slot.

- [x] Test the current six-decimal asset against required USDT metadata; capture its failing symbol assertion before adding the asset.
- [x] Add the minimal subclass, then verify metadata, constructor supply/recipient, transfer precision and no extra mint path.
- [x] Rehearse transfer/deposit/withdraw/close/token and native rescue at local chain ID 1952, including finite allowances and direct owner isolation.
- [x] Verify the existing digest preview differs between 1952, 195, 196 and 46630 and between verifying contracts; this adds no business signing or permit authorization.
- [x] Run both original and new Forge tests, compare historical ABI/bytecode artifacts, run focused JS checks, and request independent review with exact source SHA and validation limits. Manager reassigned the review to Macbeth05; the reported native-path P2 is fixed by cde0587.

## Task 3: Simulation-only operator preparation

Assignment updated 2026-09-26: finish an entry that rejects `--broadcast`; broadcast-capable source remains blocked pending specific authorization. No alternate broadcast path is included.

Files: `contracts/script/SimulateXLayerPhase1.s.sol`, `contracts/test/XLayerDeploymentScript.t.sol`, `tools/prepare-xlayer-deployment.mjs`, `test/xlayer-deployment-command.test.mjs`, `test/xlayer-simulation-native.qualified.test.mjs`, `docs/xlayer/r2/contracts/RUNBOOK.md`.

Interface: `prepareXLayerDeployment(args, env)` only accepts `--output <new path>` and explicit public constructor variables. `runXLayerPreparation(args, env)` invokes the pinned local Forge script with chain 1952, validates its returned addresses and writes a new simulation record. `buildXLayerDeploymentRecord(command, addresses)` preserves exact argument strings and labels all addresses LOCAL_SIMULATION_ONLY; receipts and runtime hashes remain null.

- [x] Capture failing tests for missing operator entry and no-op script behavior.
- [x] Implement local VM impersonation and mandatory parameter/chain checks before any creation; no broadcast cheatcodes or RPC settings.
- [x] Reject all additional CLI flags and strip ambient wallet/RPC/Foundry environment settings from the child process.
- [x] Run the real CLI, check constructor/address mapping, null evidence and overwrite refusal, then run all Solidity tests and focused Node tests.
- [ ] Commit the batch, report its exact SHA and ask the manager to obtain an independent review.
