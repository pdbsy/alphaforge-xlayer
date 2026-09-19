# M3 Partial On-chain Macbeth03 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Macbeth03 portion of M3 partial on-chain integration: configurable 3-block soft readiness, 128-block reorg recovery, persistent receipt identity, evidence-driven degraded/finality states, a real server evidence endpoint, and wallet preflight simulation without broadcasting real transactions.

**Architecture:** Keep the chain indexer and SQLite projection cache fail-closed while preserving the owner’s direct wallet path. The server computes readiness from one canonical database snapshot and exposes only final evidence; the browser reuses the existing EIP-1193 session boundary and simulates the exact prepared transaction immediately before submission. The second batch binds Macbeth02's compiled local review ABI without claiming deployment or final freeze.

**Tech Stack:** TypeScript 6, Node.js 24.21.0, npm 11.19.1, node:sqlite, Fastify, EIP-1193, Node test runner.

**Spec:** User-supplied `M3-01-PARTIAL-ONCHAIN-INTEGRATION` delegation for Macbeth03.

## Global Constraints

- Work on `macbeth03/m3-chain-adapter` with `Agent-ID: Macbeth03` and `Task-ID: M3-03-ADAPTER`.
- `softReadyDepth = 3`; the transaction’s inclusion block counts as confirmation 1.
- `reorgSearchLimit = 128`; this is an automatic recovery budget, not finality.
- L1 posting and finality remain `UNKNOWN` unless explicit provider evidence exists.
- Degraded projection state must fail closed for automated product readiness and must not disable direct owner withdraw/close submission.
- No merge, deployment, real RPC write, transaction broadcast, new secret, required-check change, or branch-protection change.
- Contract calldata, selectors, event topics, and view signatures come only from Macbeth02 compiled artifacts.

---

### Task 1: Configurable soft-readiness and reorg policy

**Files:**

- Create: `packages/chain-adapter/src/policy.ts`
- Modify: `packages/chain-adapter/src/index.ts`
- Modify: `apps/server/src/chain-sync.ts`
- Test: `test/chain-sync.test.ts`

**Interfaces:**

- Produces: `ChainSyncPolicy { softReadyDepth: number; reorgSearchLimit: number }`.
- Produces: `m3ChainSyncPolicy(overrides?: Partial<ChainSyncPolicy>): ChainSyncPolicy` with approved defaults `3` and `128` and bounded integer validation.
- Changes: `ChainSynchronizerOptions.policy: ChainSyncPolicy`; removes separate confirmation/reorg numeric options.

- [x] **Step 1: Write failing policy and confirmation tests**

```ts
assert.deepEqual(m3ChainSyncPolicy(), { softReadyDepth: 3, reorgSearchLimit: 128 });
assert.throws(() => m3ChainSyncPolicy({ softReadyDepth: 0 }), /INVALID_CHAIN_SYNC_POLICY/);
// A receipt in block N is confirmation 1 at head N and becomes CONFIRMED at head N+2.
```

- [x] **Step 2: Run tests and verify RED**

Run: `node --test test/chain-sync.test.ts`

Expected: imports/API assertions fail because the policy module and `policy` option do not exist.

- [x] **Step 3: Implement the policy object and inject it into the synchronizer**

```ts
export interface ChainSyncPolicy {
  readonly softReadyDepth: number;
  readonly reorgSearchLimit: number;
}
export function m3ChainSyncPolicy(overrides: Partial<ChainSyncPolicy> = {}): ChainSyncPolicy;
```

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/chain-sync.test.ts`

- [x] **Step 5: Commit with Macbeth03 provenance after the complete source batch is reviewed**

### Task 2: Persistent receipt identity and evidence-driven degraded status

**Files:**

- Create: `apps/server/chain-migrations/005-transaction-index.sql`
- Modify: `packages/chain-adapter/src/lifecycle.ts`
- Modify: `packages/chain-adapter/src/reconciliation.ts`
- Modify: `apps/server/src/chain-store.ts`
- Modify: `apps/server/src/chain-sync.ts`
- Test: `test/chain-lifecycle.test.ts`
- Test: `test/chain-store.test.ts`
- Test: `test/chain-sync.test.ts`

**Interfaces:**

- Adds: `ChainOperation.transactionIndex: number | null`, set from canonical receipt evidence.
- Extends: `ProductOperationEvidence` with `chainStatus`, `l1Status`, `finalityStatus`, `indexerStatus`, and `degradedReason`.
- Guarantees: deep reorg evidence returns `indexerStatus: 'DEGRADED'`, `projection: 'STALE'`, `productReady: false`; it does not erase blocks/events or claim L1/finality.

- [x] **Step 1: Write failing migration, persistence, status, and deep-reorg tests**

```ts
assert.equal(store.operation(id)?.transactionIndex, receipt.transactionIndex);
assert.equal(evidence.chainStatus, 'SOFT_READY');
assert.equal(evidence.l1Status, 'UNKNOWN');
assert.equal(evidence.finalityStatus, 'UNKNOWN');
assert.equal(degraded.indexerStatus, 'DEGRADED');
assert.equal(degraded.productReady, false);
```

- [x] **Step 2: Run tests and verify RED**

Run: `node --test test/chain-lifecycle.test.ts test/chain-store.test.ts test/chain-sync.test.ts`

Expected: new fields/migration assertions fail.

- [x] **Step 3: Add migration 005 and compute final evidence in one SQLite transaction**

```sql
ALTER TABLE chain_transactions ADD COLUMN transaction_index INTEGER CHECK (transaction_index >= 0);
PRAGMA user_version = 5;
```

Map canonical lifecycle to `PENDING`, `INCLUDED`, `SOFT_READY`, `REORGED`, `FAILED`, or `UNKNOWN`; emit no `POSTED`/`FINALIZED` state without evidence.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/chain-lifecycle.test.ts test/chain-store.test.ts test/chain-sync.test.ts`

- [x] **Step 5: Commit with Macbeth03 provenance after the complete source batch is reviewed**

### Task 3: Server evidence API and exact wallet preflight simulation

**Files:**

- Create: `apps/server/src/chain-routes.ts`
- Modify: `apps/server/src/app.ts`
- Modify: `apps/web/src/chain-wallet.ts`
- Test: `test/http-e2e.test.ts`
- Test: `test/ui-chain-wallet.test.ts`

**Interfaces:**

- Adds optional app composition: `chainRuntime?: M3ChainRuntime`, whose evidence routes share the runtime's store and lifecycle.
- Adds `GET /api/v1/chain/operations/:operationId/evidence?owner=0x...` returning server-computed `ProductOperationEvidence`; owner mismatch and unknown operation return the same 404 envelope.
- Keeps `BrowserWalletPort.submit(prepared)` and the existing EIP-1193 provider/session; immediately before `eth_sendTransaction`, it issues `eth_call` with the exact `{ from, to, data, value }`, then rechecks account and chain.
- Adds deterministic `WALLET_SIMULATION_FAILED`; simulation failure never calls `eth_sendTransaction`.

- [x] **Step 1: Write failing API and wallet simulation tests**

```ts
assert.equal(response.statusCode, 200);
assert.equal(response.json().chainStatus, 'SOFT_READY');
assert.equal(degradedResponse.json().indexerStatus, 'DEGRADED');
assert.deepEqual(provider.methods.slice(0, 5), [
  'eth_accounts',
  'eth_chainId',
  'eth_call',
  'eth_accounts',
  'eth_chainId',
]);
assert.equal(provider.methods.includes('eth_sendTransaction'), false);
```

- [x] **Step 2: Run tests and verify RED**

Run: `node --test test/http-e2e.test.ts test/ui-chain-wallet.test.ts`

Expected: route is 404 and wallet never invokes `eth_call`.

- [x] **Step 3: Register the optional read route and implement preflight simulation**

The API is a public-chain evidence read with an explicit owner identity check, not account authentication. A degraded result remains HTTP 200 so the UI can warn while retaining the direct wallet exit path.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/http-e2e.test.ts test/ui-chain-wallet.test.ts`

- [x] **Step 5: Commit with Macbeth03 provenance after the complete source batch is reviewed**

### Task 4: Documentation, review, evidence chain, and delivery

**Files:**

- Modify: `docs/M3-CHAIN-ADAPTER.md`
- Modify: `.checks/management/latest.json` only in R
- Modify: `docs/management/dashboard/data/build-log.json` only in S
- Modify: `docs/management/dashboard/data/dashboard.json` only in S

**Interfaces:**

- Documents: soft readiness is not finality; 128 is recovery scope; deep reorg preserves evidence and stops projections; direct owner exit remains a wallet/contract path; ABI-dependent work references Macbeth02 exact artifacts.

- [x] **Step 1: Update docs without claiming deployment, broadcast, L1 posting, or finality**
- [x] **Step 2: Run approved-toolchain focused and full checks**

Run: `/opt/homebrew/bin/fnm exec --using=24.21.0 -- npm run check`

- [x] **Step 3: Obtain independent code review and fix all findings**
- [x] **Step 4: Commit source C with Macbeth03 provenance**
- [x] **Step 5: From clean C run `npm run management:checks`, commit manifest-only R, run `npm run management:build`, and commit snapshot-only S**
- [x] **Step 6: Push the existing Macbeth03 branch, verify exact remote head and PR #17, and report the commit to Macbeth01/02/04/05**

### Task 5: Published Vault ABI, concrete runtime, and deposit authorization

**Files:**

- Create: `packages/chain-adapter/src/vault-abi.ts`
- Create: `apps/server/src/m3-vault-integration.ts`
- Create: `apps/server/src/m3-chain-runtime.ts`
- Create: `apps/web/src/m3-vault-actions.ts`
- Create: `apps/web/src/m3-vault-allowance.ts`
- Create: `apps/web/src/m3-vault-client.ts`
- Create: `apps/server/chain-migrations/006-operation-calldata.sql`
- Test: `test/chain-vault-abi.test.ts`
- Test: `test/chain-vault-integration.test.ts`
- Test: `test/chain-runtime.test.ts`
- Test: `test/ui-m3-vault-actions.test.ts`
- Test: `test/ui-m3-vault-allowance.test.ts`
- Test: `test/ui-m3-vault-client.test.ts`

**Interfaces:**

- Binds Macbeth02 handoff `8afb96e4671b2ace5e59c99617c79b4bdca5b627`, implementation source `db620d68a635259f53f48c33defff4273237d372`, all 25 function selectors, and all seven event topics.
- Adds exact owner action calldata and all-event decoding, contract view reconciliation, Strategy Pass identity verification, and same-process runtime ownership.
- Adds public canonical owner projection recovery plus live AF-USDC/Pass allowance reads and exact finite approval factories.

- [x] **Step 1: Add RED tests for the entire selector/topic table, event decoding, action calldata, runtime recovery, and two-token allowance flow**
- [x] **Step 2: Implement the published ABI boundary and concrete Vault integration**
- [x] **Step 3: Compose `M3ChainRuntime` with the server and persist submitted calldata in migration 006**
- [x] **Step 4: Implement live allowance reads and fixed exact approvals without arbitrary spender/target/value**
- [x] **Step 5: Re-run independent review, full checks, C→R→S, push, and report**

### Task 6: Executable startup and wallet-submission registration

**Files:**

- Create: `apps/server/src/m3-startup.ts`
- Create: `apps/server/src/m3-main.ts`
- Modify: `apps/server/src/chain-routes.ts`
- Modify: `apps/server/src/m3-chain-runtime.ts`
- Modify: `apps/web/src/m3-vault-client.ts`
- Test: `test/chain-startup.test.ts`
- Test: `test/chain-api.test.ts`
- Test: `test/ui-m3-vault-client.test.ts`

**Interfaces:**

- Adds an executable `m3:server` path whose checked-in deployment state is inert `NOT_DEPLOYED`.
- Composes runtime → app → bounded initial/periodic sync → one close lifecycle, with injected read-only RPC support for the same composition test.
- Persists an unavailable target across bounded catch-up passes, rotates the pending-operation queue, and isolates a failing receipt from later operation tracking.
- Registers only pending wallet identity/calldata/transaction hash; client-supplied lifecycle, receipt, projection and readiness are rejected.
- Tracks registered operations through independent canonical RPC evidence, including legal earlier operations followed by a same-block close.

- [x] **Step 1: Add RED API/startup/client/same-block tests**
- [x] **Step 2: Implement inert executable startup and bounded runtime synchronization**
- [x] **Step 3: Implement strict same-origin submission registration and client**
- [x] **Step 4: Preserve per-transaction evidence while using block-end views only for final projection**
- [ ] **Step 5: Re-run independent review, full checks, append-only source/evidence commits, push, and report**

## Self-Review

- Spec coverage: policy 3/128, confirmation formula, persistent transaction/log/block identity, rollback/replay/degraded, L1/finality unknown, server evidence composition, wallet preflight, direct-exit independence, docs and delivery are covered. Contract accounting and UI rendering remain owned by Macbeth02 and Macbeth04 and require their exact artifacts.
- Placeholder scan: no TBD/TODO or unspecified implementation step remains.
- Type consistency: `ChainSyncPolicy`, `ProductOperationEvidence`, app `chainRuntime`, and wallet `submit` signatures are used consistently across tasks.

## Execution Handoff

This delegated worker task will use **Inline Execution** with `superpowers:executing-plans`; the existing independent worktree and Macbeth03 branch satisfy isolation, and worker creation is outside the authorized scope.
