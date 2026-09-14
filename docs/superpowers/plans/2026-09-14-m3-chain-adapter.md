# M3 Chain Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ABI-independent M3 chain foundation that lets a browser wallet submit an owner-authorized transaction while a read-only backend tracks canonical receipts, events, checkpoints, reorgs, and rebuildable product projections.

**Architecture:** Keep the existing local Fastify/SQLite simulator unchanged. Add a transport-independent chain domain package, a separate SQLite chain projection store, a sequential canonical block indexer, and browser-only EIP-1193 ports. Contract-specific action encoding and event decoding plug into explicit interfaces after Macbeth02 supplies the reviewed ABI and deployment manifest.

**Tech Stack:** Node.js 24.21.0, npm 11.19.1, TypeScript 6, node:test, node:sqlite, native fetch/EIP-1193 interfaces; no new production dependency.

**Spec:** `/Users/ikol/.codex/attachments/05018e29-c810-4c54-a1b3-e81fc73c5a1e/pasted-text.txt`

## Global Constraints

- Base is `7ecba357d5a19f387e86f578822af04a6261fed2`; branch is `macbeth03/m3-chain-adapter` per the user's final D4.
- Robinhood Chain Testnet Chain ID is exactly `46630`; mainnet and real funds remain closed.
- The browser wallet selects the account, verifies the chain, authorizes, and submits; the backend never holds an owner private key or signs owner transactions.
- A transaction hash is only `SUBMITTED`; only backend receipt, expected event, and applicable contract-state reconciliation may produce `CONFIRMED`.
- Demo identities remain local-only and cannot authenticate a Testnet wallet.
- Chain data uses deterministic block/transaction/log ordering and `(chainId, txHash, logIndex)` event identity.
- Confirmation depth stays injected configuration until Macbeth05 and Robinhood-specific evidence freeze it.
- Contract ABI, event semantics, deployment address, runtime hash, and owner-only action remain external Macbeth02 inputs.
- Local mode and its current database remain operational without wallet or RPC configuration.

---

### Task 1: Transaction lifecycle and chain value types

**Files:**
- Create: `packages/chain-adapter/src/types.ts`
- Create: `packages/chain-adapter/src/lifecycle.ts`
- Test: `test/chain-lifecycle.test.ts`

**Interfaces:**
- Produces: `Address`, `TransactionHash`, `BlockHash`, `TransactionState`, `ChainOperation`, `transitionOperation(operation, update)`.
- Consumes: no contract ABI and no browser APIs.

- [ ] **Step 1: Write the failing lifecycle tests**

```ts
test('a hash advances only to SUBMITTED and confirmation requires reconciled canonical evidence', () => {
  const awaiting = operation('AWAITING_SIGNATURE');
  const submitted = transitionOperation(awaiting, { state: 'SUBMITTED', txHash: HASH, submittedAt: NOW });
  assert.equal(submitted.state, 'SUBMITTED');
  assert.throws(() => transitionOperation(submitted, { state: 'CONFIRMED' }));
});

test('rejected, reverted, replaced, dropped and reorged paths preserve explicit evidence', () => {
  // Exercise every allowed terminal/failure transition and reject illegal backward transitions.
});
```

- [ ] **Step 2: Run `node --test test/chain-lifecycle.test.ts` and verify missing-module failure**

- [ ] **Step 3: Implement validated hex/address primitives and the closed transition graph**

```ts
export function transitionOperation(current: ChainOperation, update: OperationTransition): ChainOperation;
```

The function validates evidence required by each destination state, preserves immutable chain/owner/target identity, and rejects direct `SUBMITTED -> CONFIRMED` transitions.

- [ ] **Step 4: Run the lifecycle test and verify PASS**

- [ ] **Step 5: Commit with Macbeth03/M3-03-ADAPTER provenance**

---

### Task 2: Trusted deployment manifest and bounded read-only RPC

**Files:**
- Create: `packages/chain-adapter/src/manifest.ts`
- Create: `packages/chain-adapter/src/rpc.ts`
- Create: `packages/chain-adapter/src/index.ts`
- Test: `test/chain-rpc-manifest.test.ts`

**Interfaces:**
- Consumes: `Address`, `TransactionHash`, and `BlockHash` from Task 1.
- Produces: `validateDeploymentManifest(input, expected)`, `ReadonlyRpc`, `JsonRpcClient`, normalized block/receipt/log records, and injected `RpcTransport`.

- [ ] **Step 1: Write failing manifest tests**

```ts
assert.deepEqual(
  validateDeploymentManifest(validManifest, {
    environment: 'robinhood-chain-testnet',
    chainId: 46630,
    manifestDigest: DIGEST,
  }),
  validManifest,
);
assert.throws(() => validateDeploymentManifest({ ...validManifest, chainId: 1 }, expected));
assert.throws(() => validateDeploymentManifest({ ...validManifest, deploymentBlock: -1 }, expected));
```

- [ ] **Step 2: Run the test and verify missing-module failure**

- [ ] **Step 3: Implement exact manifest validation**

The manifest contains environment, chain ID, contract kind/name/address, deployment block, ABI version, manifest digest, and optional runtime bytecode hash. The trusted digest is supplied by the release boundary rather than selected by an environment variable or HTTP payload.

- [ ] **Step 4: Write failing RPC boundary tests**

```ts
test('RPC verifies chain identity and normalizes receipt, block and logs', async () => {
  const rpc = new JsonRpcClient([ENDPOINT], { transport: fixtureTransport });
  assert.equal(await rpc.chainId(), 46630);
  assert.deepEqual(await rpc.receipt(HASH), EXPECTED_RECEIPT);
});

test('RPC retries only bounded retryable failures without leaking endpoint credentials', async () => {
  // 429/5xx/transport retry within the fixed attempt budget; JSON-RPC and malformed data fail closed.
});
```

- [ ] **Step 5: Run the RPC tests and verify the expected missing behavior**

- [ ] **Step 6: Implement the injected, multi-endpoint-capable read-only RPC client**

```ts
export interface ReadonlyRpc {
  chainId(): Promise<number>;
  block(number: bigint | 'latest'): Promise<ChainBlock | null>;
  receipt(hash: TransactionHash): Promise<ChainReceipt | null>;
  logs(filter: ChainLogFilter): Promise<readonly ChainLog[]>;
  call(request: ChainCall, block: bigint | 'latest'): Promise<HexData>;
}
```

Only the allowlisted read methods are emitted. Each request has an abort timeout, response-size bound, exact JSON-RPC envelope validation, bounded attempts, and sanitized errors.

- [ ] **Step 7: Run Task 2 tests and verify PASS**

- [ ] **Step 8: Commit with Macbeth03/M3-03-ADAPTER provenance**

---

### Task 3: Independent persistent chain projection store

**Files:**
- Create: `apps/server/chain-migrations/001-chain-projection.sql`
- Create: `apps/server/src/chain-store.ts`
- Test: `test/chain-store.test.ts`

**Interfaces:**
- Consumes: normalized operations, blocks, and logs from Tasks 1–2.
- Produces: `ChainStore`, durable transaction/event/block/checkpoint/projection APIs, `rollbackFromBlock`, and deterministic event reads.

- [ ] **Step 1: Write failing tests for schema, event identity, ordering and restart**

```ts
test('duplicate chain event observation is idempotent across restart', () => {
  const first = store.recordCanonicalBlock(BLOCK, [EVENT]);
  const second = store.recordCanonicalBlock(BLOCK, [EVENT]);
  assert.equal(first.insertedEvents, 1);
  assert.equal(second.insertedEvents, 0);
  assert.deepEqual(reopen().canonicalEvents(), [EVENT]);
});
```

- [ ] **Step 2: Run the store test and verify missing-module failure**

- [ ] **Step 3: Add the separate chain database schema**

Tables record operations, canonical block history/checkpoints, chain events keyed by `(chain_id, tx_hash, log_index)`, and wallet-keyed materialized projections. No account table assumes a permanent one-wallet/one-account relationship.

- [ ] **Step 4: Implement transactional persistence and fail-closed decoding**

`recordCanonicalBlock` checks chain/contract/block context, inserts logs in transaction/log order, and never reapplies an existing canonical event. `rollbackFromBlock` marks displaced blocks/events non-canonical, moves affected operations to `REORGED`, and removes projections newer than the surviving checkpoint.

- [ ] **Step 5: Run store tests and verify PASS**

- [ ] **Step 6: Commit with Macbeth03/M3-03-ADAPTER provenance**

---

### Task 4: Transaction tracker, indexer, reconciliation and recovery

**Files:**
- Create: `packages/chain-adapter/src/reconciliation.ts`
- Create: `apps/server/src/chain-sync.ts`
- Test: `test/chain-sync.test.ts`

**Interfaces:**
- Consumes: `ReadonlyRpc`, validated deployment manifest, `ChainStore`, and contract-specific `EventDecoder`/`ContractReconciler` plugins.
- Produces: `ChainSynchronizer.syncTo(head)`, `trackOperation(operationId)`, reorg rewind/replay, and UI-safe operation snapshots.

- [ ] **Step 1: Write failing tracker tests**

```ts
test('successful receipt remains confirming until event and contract state reconcile', async () => {
  await sync.trackOperation(OPERATION_ID);
  assert.equal(store.operation(OPERATION_ID)?.state, 'CONFIRMING');
  assert.equal(store.operation(OPERATION_ID)?.confirmedAt, null);
});
```

Cover revert, unexpected contract, missing expected event, duplicate scan, explicit dropped evidence, replacement linkage, and reconciliation failure.

- [ ] **Step 2: Run tracker tests and verify missing behavior**

- [ ] **Step 3: Implement receipt tracking with injected confirmation policy**

The tracker verifies chain ID independently, target contract, receipt status, block hash, canonical block membership, expected decoded events, and optional contract reads. It calls `CONFIRMED` only when the injected confirmation depth is met and the reconciler returns a canonical projection.

- [ ] **Step 4: Write failing indexer/reorg tests**

Use a deterministic in-memory RPC fixture with branch A and replacement branch B. Assert block-hash mismatch marks branch A events non-canonical, rewinds to a common ancestor, replays branch B, and produces exactly one projection effect.

- [ ] **Step 5: Implement sequential block indexing and bounded common-ancestor search**

Logs are fetched for the trusted contract and exact block range, sorted by block number, transaction index, and log index, then persisted with the block checkpoint. Indexing resumes from persisted canonical history after process restart.

- [ ] **Step 6: Run chain sync and restart tests and verify PASS**

- [ ] **Step 7: Commit with Macbeth03/M3-03-ADAPTER provenance**

---

### Task 5: Browser wallet port and adapter-facing operation model

**Files:**
- Create: `apps/web/src/chain-wallet.ts`
- Create: `apps/web/src/strategy-adapter.ts`
- Test: `test/ui-chain-wallet.test.ts`

**Interfaces:**
- Consumes: lifecycle types and ABI-independent prepared transaction fields.
- Produces: `BrowserWalletPort`, `Eip1193Wallet`, `StrategyAdapter`, `PreparedAction`, `SubmittedOperation`, and wallet/network error codes consumable by Macbeth04.

- [ ] **Step 1: Write failing wallet tests**

```ts
test('wallet verifies account and chain again immediately before submission', async () => {
  const wallet = new Eip1193Wallet(provider, 46630);
  const result = await wallet.submit(PREPARED_TRANSACTION);
  assert.equal(result.state, 'SUBMITTED');
  assert.equal(result.txHash, HASH);
});
```

Cover disconnected wallet, wrong chain, user rejection, malformed hash, changed account, changed chain, and the absence of any demo identity field.

- [ ] **Step 2: Run the wallet tests and verify missing-module failure**

- [ ] **Step 3: Implement a minimal EIP-1193 adapter without ABI encoding**

The adapter requests accounts only on explicit connect, reads `eth_accounts`/`eth_chainId` before submission, calls only `eth_sendTransaction` for an already reviewed typed prepared transaction, and reports `SUBMITTED` without claiming chain success.

- [ ] **Step 4: Define the shared adapter direction without replacing ProductAdapter**

`StrategyAdapter` keeps local and Testnet modes explicit. Contract-specific action preparation remains an injected boundary and cannot accept arbitrary target/data from product UI.

- [ ] **Step 5: Run wallet and web type checks and verify PASS**

- [ ] **Step 6: Commit with Macbeth03/M3-03-ADAPTER provenance**

---

### Task 6: Documentation, integration gates and worker report evidence

**Files:**
- Create: `docs/M3-CHAIN-ADAPTER.md`
- Modify: `README.md`
- Modify: `package.json` only if test registration requires an explicit new script path; the existing wildcard-free test list otherwise receives the new tests.

**Interfaces:**
- Documents the public types from Tasks 1–5 for Macbeth02, Macbeth04, and Macbeth05.
- Records the contract-specific boundary and absence of fabricated Testnet evidence.

- [ ] **Step 1: Document local/Testnet separation, responsibilities, lifecycle, schema, reorg recovery, account/wallet separation, and current limitations**

- [ ] **Step 2: Add new test files to the exact root test script**

- [ ] **Step 3: Run targeted tests, typecheck, lint, format check, secrets/privacy checks, identity validation, and the complete `npm run check`**

- [ ] **Step 4: Inspect the complete diff for ABI invention, arbitrary call surfaces, wallet secrets, mock fallback, generated evidence changes, and local-mode regressions**

- [ ] **Step 5: Commit the documentation/test-registration change with Macbeth03/M3-03-ADAPTER provenance**

- [ ] **Step 6: Push the branch and create a Draft PR only after identity validation succeeds**

- [ ] **Step 7: Report Testnet evidence as unavailable until Macbeth02 provides a reviewed deployment and the applicable chain-write gate is explicitly opened**
