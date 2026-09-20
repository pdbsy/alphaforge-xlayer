# AlphaForge Phase One Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Existing user-assigned Macbeth02–06 tasks execute their own bounded work; no replacement worker or additional identity is created.

**Goal:** Complete every authorized Phase One implementation and validation item, leaving only explicit user/external blockers.

**Architecture:** Keep contract asset authority, off-chain product/index projections, immutable explicit Owner and direct wallet operations. Build from the verified merged master; consume exact worker handoffs and preserve original source history.

**Tech Stack:** Node 24.21.0 / npm 11.19.1, TypeScript/Fastify/SQLite, existing warm HTML product, pinned Solidity/Forge/Slither and fixed CI scanners.

**Spec:** docs/management/specs/PHASE1-CLOSEOUT-2026-09-20.md

## Global Constraints

- BASE_SHA = 18f5352070910a867b9729b031aa2e3951785e01; canonical repository pdbsy/quantpass-arbitrum-hackathon, master.
- AF-USDC 6 decimals; Pass 18 decimals; exact ×10^12 capacity conversion, no ordinary-transfer precision restriction.
- Explicit nonzero immutable Owner; creator separate; owner-only direct deposit/withdraw/close; fixed recipient; no strategy execution.
- softReadyDepth 3 and reorgSearchLimit 128 are configurable application values, not finality guarantees.
- Preserve 7 required CI, source-policy/dependency-delta, review/rules/history and C/R/S. No merge exception reuse, external deployment/signing/broadcast, secrets or privilege expansion.
- Business/permission questions remain blocked only for dependent work. All 22 work items and all 41 legacy roadmap mappings are in docs/management/phase1/REMAINING-TASKS.md.

### Task 1: Register and dispatch exact-base work

**Files:** docs/management/phase1/**; docs/management/agents/registry.json; current bootstrap/assignment notices; this plan.
**Interfaces:** consumes merged PR21/master/CI/rules receipts; produces exact task/base/file boundaries and real worker ACK links.

- [x] Fetch, verify master, clean state, tool versions and prior accepted tree.
- [x] Read current user instructions, protocol, roadmap and historical findings; register all remaining destinations without inventing PASS.
- [x] Run registry/bootstrap validation and formatting, commit registration, open manager Draft PR #22.
- [ ] Send each existing worker its exact task and spec; worker starts at BASE_SHA without inheriting manager commits. Capture actual app intake plus their own public PR/Forum ACK.

Verification commands:
```sh
node --test test/agent-management.test.mjs test/agent-tooling.test.mjs
npm run format:check
```

### Task 2: Parallel bounded implementation and acceptance preparation

**Files:** exact worker boundaries in docs/management/phase1/ASSIGNMENTS.md. Shared package/workflow/policy changes remain with 01.
**Interfaces:** base published ABI and manifest first; changed producer APIs require new exact source SHA and consumer acknowledgment before use.

- [ ] 02 compares existing contract coverage with PH1-02/03, adds only missing regression/implementation and reproducible local VM deployment artifacts.
- [ ] 03 compares PH1-04–07, fixes observed adapter/transaction/index/backup gaps and supplies the UI-facing interface.
- [ ] 04 works on apps/web/index.html's real product path, PH1-08–11, implements supported transfer/Vault/rescue paths and runs real-browser mock acceptance.
- [ ] 05 records service limits, performs permitted ordinary functional verification and real coverage measurement; no retry of restricted security service through another worker/tool.
- [ ] 06 independently reads CI/rules/check-source/step/scanner coverage and proposes exact manager fixes without changing rules.

Each implementation change first adds a behavioral reproducer in the owning test boundary, runs it red, implements the minimal repair, then reruns affected tests. Existing passing behavior is not rewritten. New API or business ambiguity is sent to 01 before dependent edits. Commands are taken from each task's current package/toolchain, including `bash contracts/script/check-m3-vault.sh`, exact existing `node --test` paths, `npm run typecheck`, and `npm run check`. Worker intake plans name the concrete reproducer after inspecting their assigned source; this manager plan does not invent unseen defects.

### Task 3: Reconcile shared records and old PRs

**Files:** README.md; docs/management/CURRENT-STATUS.md, WORK-QUEUE.md, DECISIONS.md, CHANGELOG.md; phase1 reports; approved roadmap lifecycle/current-scope records.
**Interfaces:** source SHA/tree and PR21 ancestry/patch adaptations; no repeated cherry-pick.

- [x] Compare every open PR source to preserved candidate ancestry and final tree, distinguish covered content from remaining unique changes; record exact evidence in phase1/PR-SUPERSESSION.json and .md.
- [ ] Close only verified superseded PRs with source/evidence refs retained; dependency-update PRs receive their own review disposition.
- [ ] Synchronize current product/run/deployment/roadmap status without lowering protected acceptance fields or rewriting historical reports.
- [ ] Resolve collector NOT_RUN applicability honestly; either connect a real collector under an explicit implementation/test plan or preserve external job evidence with its accurate scope.

### Task 4: Freeze, verify and deliver

**Files:** exact integration diff, original provenance refs, task/PR/Forum records, real C/R/S artifacts.
**Interfaces:** same immutable candidate to 05 and 06; separate local/hosted/QA/review/merge/testnet statuses.

- [ ] Integrate accepted source under the existing strict identity rules; if a new constrained integration registration is necessary, prepare it with fixed base/source SHAs and do not relax checks.
- [ ] Run full local check, actual scanners/contracts as affected, fresh C/R/S and browser acceptance; publish normal PR and verify exact-head push/PR CI and every required step.
- [ ] 05 retests fixes; 06 checks same candidate and complete evidence. Preserve failed runs and unrun items.
- [ ] Prepare concrete external governance/reviewer and Testnet parameter/transaction packages; ask only still-missing user decisions/authorization.
- [ ] Merge only with new applicable authorization and real review/check requirements; then verify actual master. Testnet actions only after separate exact approval.
- [ ] Final report keeps PHASE1_STATUS blocked until all applicable criteria are actually satisfied; never relabel 65%finish as 100%.
