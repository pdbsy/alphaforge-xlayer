# AlphaForge X Layer Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Create the public X Layer repository, preserve upstream provenance, deliver an offline testnet configuration foundation and dispatch the five existing workers.

**Architecture:** Keep upstream M3 intact while adding a narrow X Layer network package. A local configuration reader composes the existing fail-closed local/mock gate with explicit chain identity. Backend/UI migration consumes that interface through independent PRs.

**Tech Stack:** Node 24.21.0, npm 11.19.1, TypeScript, Node test runner, existing React/Fastify/Solidity stack.

**Spec:** `docs/xlayer/MIGRATION.md`

## Global Constraints

- Canonical repository `pdbsy/alphaforge-xlayer`; full public source history at 18f5352070910a867b9729b031aa2e3951785e01.
- X Layer Testnet 1952; local/mock only; no secrets, signing, deployment, broadcasting or mainnet.
- Preserve source authors, frozen versions, protocol identifiers, existing checks and historical evidence.
- Independent clones, dependencies and SQLite data; task branches and Draft PRs; no merge authorization.

### Task 1: Repository and task intake

**Files:** root README/AGENTS; `docs/xlayer/{MIGRATION,ASSIGNMENTS,UPSTREAM-README}.md`; this plan.

- [x] Verify source master, approved toolchain, existing worker roles and current authorization.
- [x] Create public repository and clone full source into an independent checkout.
- [x] Preserve source branches and tags required by historical evidence validators.
- [ ] Commit intake, create Draft PR and publish exact worker scope.

### Task 2: Offline X Layer foundation

**Files:** create `packages/xlayer-chain/src/network.ts`, `config/xlayer/.env.example`, `tools/check-xlayer-chain.ts`, `test/xlayer-chain.test.ts`; modify root package scripts only.

**Interfaces:** exports `XLAYER_TESTNET`, `readXLayerChainConfig(env)`, `readXLayerLocalConfig(env)` as specified in MIGRATION.md. No dependency changes.

- [ ] Write tests first. A valid fixture must return chain 1952/OKB and frozen local config; override QP_CHAIN_ID with 195, 196 or 46630 and assert rejection; override QP_MODE/QP_ADAPTER with testnet/production/live and assert rejection; malformed/credential/query URLs must fail without reflecting their value.
- [ ] Run `node --test test/xlayer-chain.test.ts`; capture the expected missing-feature failure.
- [ ] Implement the literal constant and strict field reader; reuse `readConfig` instead of adding an enable flag.
- [ ] Add the public example, CLI with try/catch and safe diagnostics, `xlayer:check` npm script, foundation test in `test`, and xlayer:check in `check` alongside existing gates.
- [ ] Run foundation tests, CLI, typecheck/lint and related inherited tests; fix actual failures.
- [ ] Commit and publish the foundation; record exact tested SHA and limitations in the Draft PR.

### Task 3: Worker dispatch and integration gate

**Files:** assignments/status and workers' own scoped PRs.

- [ ] Publish five specific assignments and deliver the intake link to existing Macbeth02–06 tasks. Require independent clones and an actual receipt.
- [ ] Collect acknowledgements without interrupting protected upstream work; distinguish delivered from accepted.
- [ ] Record candidate PRs and request focused engineering review. Keep any unrun checks BLOCKED/NOT_RUN and preserve upstream evidence.
- [ ] End this bootstrap at reviewable foundation; subsequent deployment and default-runtime cutover retain their own acceptance gates.
