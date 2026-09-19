# M3 Chain Adapter

This document describes the M3 chain foundation and the locally compiled Vault review integration implemented by Macbeth03. It is the integration contract for the first owner-authorized Vault/Pass vertical slice on Robinhood Chain Testnet.

Macbeth02's published compiled local ABI handoff is commit `8afb96e4671b2ace5e59c99617c79b4bdca5b627`, implementation source `db620d68a635259f53f48c33defff4273237d372`, and published ABI SHA-256 `7be3e2be3897b634d47d3766f26b088994884a169fb8e39ffbd3b3cf2133669f`. It contains 25 function selectors and seven event topics. The adapter binds every selector/topic from that artifact, encodes the owner `deposit`, `withdraw`, and `close` actions, decodes all seven events, and reconciles custody events against exact contract views. The handoff remains `COMPILED LOCAL REVIEW DRAFT / NOT DEPLOYED`; no trusted deployment address, deployment block, manifest, RPC runtime, Testnet transaction, or broadcast exists.

## Current boundary

The current local simulator continues to use its existing API and SQLite ledger. The new chain adapter is separate and inactive until an explicit Robinhood Testnet composition supplies all required inputs.

| Area        | Implemented                                                                                                                                                                  | Pending contract integration                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser     | EIP-1193 account access, chain check, strict same-origin Vault projection client, exact Vault action encoding, exact preflight `eth_call`, session-safe submission, live AF-USDC/Pass allowance reads, and exact finite approval preparation | Macbeth04 product rendering and explicit approval/deposit sequencing                                                  |
| Backend     | Bounded read-only JSON-RPC, manifest validation, deployment-aware runtime composition, concrete `M3ChainRuntime`, receipt tracking, all seven Vault event decoders, contract-view reconciliation, persistent projections, reorg recovery, and evidence/projection APIs | Operational configuration using a final reviewed manifest and deployed contract                                      |
| Persistence | Independent transactions including immutable submitted calldata, blocks, events, indexed/projected checkpoints, sync health/ownership, and wallet-keyed projections             | Production database location and operational retention policy                                                        |
| Testnet     | Exact Chain ID validation for `46630`                                                                                                                                        | Trusted deployed address, deployment block, manifest digest, runtime bytecode hash, RPC configuration, live evidence |

There is no automatic fallback from a failed or incomplete Testnet composition to Local mode. `composeM3ChainRuntime({ deploymentStatus: 'NOT_DEPLOYED' })` returns `null` without creating a database or RPC client. The `DEPLOYED` branch accepts only HTTPS RPC endpoints and validates the trusted manifest digest, expected address, `AlphaForgeVault`/`vault` identity, and exact reviewed ABI version before constructing the runtime. The current `main.ts` entry remains Local-only. The separately executable `m3:server` entry uses the real M3 startup composition but is checked in with `deploymentStatus: 'NOT_DEPLOYED'`; it starts the loopback product server without creating a chain database, RPC client, synchronizer, or timer. No checked-in entry enables Testnet reads or writes.

## Authority and data flow

The browser requests the active account and verifies Chain ID immediately before it asks the wallet to submit. It sends only an opaque `PreparedAction` created by the trusted action preparer for the configured contract. Before wallet submission, it runs the exact `{ from, to, data, value }` as an `eth_call` at `latest`; a failed or malformed simulation returns `WALLET_SIMULATION_FAILED` and never reaches `eth_sendTransaction`. It then rechecks account, chain, and the monitored EIP-1193 session before asking for submission. During wallet confirmation it keeps the account, chain, and disconnect listeners active, then rechecks account and chain after the provider responds. A stable response transaction hash means `SUBMITTED` only. A changed or unverifiable post-submission session produces a non-retryable `SUBMISSION_AMBIGUOUS` result whose requested owner and chain are not represented as proven transaction identity.

The backend uses its own RPC connection and trusted deployment manifest. `M3ChainRuntime` owns one `ChainStore`, `ChainSynchronizer`, and `M3VaultContractIntegration` lifecycle in the application process. It scans the configured contract from its deployment block, records normalized events in canonical order, verifies the receipt, submitted calldata, expected owner/amount event, resulting contract views, and the equality of `Vault.strategyId()` with `StrategyPass(pass).strategyId()`, then writes a reconstructable projection. Every Vault and StrategyPass view uses the indexed block hash through EIP-1898 with `requireCanonical: true`, so a same-height reorg cannot attach another fork's state to the indexed block. For multiple transactions in one Vault block, each operation is proved by its own receipt, calldata, owner, amount and transaction-filtered event; the EIP-1898 views prove the block's final projection and are not misused as the intermediate state after an earlier transaction. It never receives or stores an owner private key and never signs an owner transaction.

The chain remains the source of truth. Frontend state, local storage, demo cookies, HTTP request bodies, and client-reported transaction status cannot make an operation canonical.

## Public interfaces

The transport-independent package is exported from `packages/chain-adapter/src/index.ts`:

- `validateDeploymentManifest` accepts exactly the trusted environment, Chain ID, digest, and optional expected contract address. The trusted SHA-256 digest is recomputed over the canonical manifest document, so it binds the contract identity, deployment block, ABI version, and runtime bytecode hash. Only validated manifests can be supplied to the synchronizer.
- `ReadonlyRpc` exposes only chain ID, block, receipt, logs, and `eth_call`. `JsonRpcClient` provides bounded endpoint rotation, timeout, streaming response-size enforcement, strict response normalization, and sanitized failures.
- `ChainOperation` and `transitionOperation` define the closed lifecycle and the evidence retained at each transition.
- `ContractIntegration` isolates ABI-specific decoding, projection rebuilding, and transaction reconciliation from generic synchronization.
- `M3_VAULT_REVIEW_ABI`, `encodeM3VaultCall`, `decodeM3VaultCalldata`, and `decodeM3VaultEvent` bind the exact compiled review selectors/topics. Known malformed events fail closed; unrelated topics are ignored.

The backend surface is `ChainSynchronizer` and `ChainStore`:

- `syncTo(head, requiredTarget)` verifies the Chain ID, detects checkpoint hash divergence, performs a bounded common-ancestor search, rewinds displaced state, and sequentially replays one bounded canonical range. When `head` is below `requiredTarget`, it releases the lease while persisting `CHAIN_SYNC_INCOMPLETE`; later passes resume from the checkpoint and reads remain unavailable until the required target is reached.
- `trackOperation(operationId)` verifies the receipt owner, target, block hash, expected normalized event, contract reconciliation result, and injected confirmation depth.
- `recordReplacement` and `recordDropped` accept explicit backend evidence decisions; the indexer does not infer either result from elapsed time.
- `operationEvidence(operationId, projectionKey)` reads the operation, current projection, sync checkpoint, and every canonical block from the operation through the checkpoint inside one SQLite read transaction. The backend verifies the full parent-hash ancestry and returns final product evidence. API/UI code receives that result and has no supported path for deriving readiness from independently cached operation or projection objects.
- `GET /api/v1/chain/operations/:operationId/evidence?owner=0x…` exposes that server-computed evidence when a `ChainStore` and projection key are explicitly composed into the app. Unknown operations and owner mismatches share the same 404 response. The owner query only narrows public chain evidence; it is not account authentication or transaction authority. A degraded indexer returns conservative evidence with HTTP 200 so clients can display the recovery state without using a projection.
- `M3ChainRuntime` supplies that route from the same store used by its synchronizer and exposes `GET /api/v1/chain/vaults/:owner` for browser-refresh recovery of a healthy canonical owner projection. Pending/degraded projections fail closed; the owner path is a public chain read, not demo-account authentication.
- `composeM3ChainRuntime` is the deployment-aware server composition seam. `NOT_DEPLOYED` is inert. A `DEPLOYED` input must supply the expected manifest digest and address, exact ABI identity, an independent chain database path, and one or more bounded HTTPS RPC endpoints.
- `startM3Server` is the complete server lifecycle: compose runtime, build the app with that exact runtime, run an initial bounded sync, optionally listen on loopback only, schedule serialized bounded sync passes, and close the timer/app/runtime together. Each pass scans at most the configured block bound and tracks at most 100 pending operation IDs; later passes continue the rotating bounded queue. A malformed receipt for one operation is counted as a tracking failure and cannot prevent later operation IDs from being checked.
- `POST /api/v1/chain/operations` registers only `operationId`, chain, owner, target, exact calldata and transaction hash. The loopback host/origin/body limits and non-GET marker still apply. Additional client fields such as lifecycle, receipt, confirmations, reconciliation, projection or `productReady` are rejected. Identical retries are idempotent; reuse of either an operation ID or a chain transaction hash with a different identity returns a fixed 409. Registration itself grants no readiness; only backend RPC receipt, canonical block, decoded event and contract reconciliation can advance the evidence returned by the GET route.

The browser surface is `Eip1193Wallet`, `PreparedActionFactory`, and the discriminated `StrategyAdapter` direction:

- `PreparedActionFactory` is the contract-integration boundary. Product UI supplies a semantic action; the reviewed encoder supplies the target calldata and value. Each factory has an unforgeable in-process authority token.
- `Eip1193Wallet` is composed with the reviewed factory's authority and checks that exact origin, the current account, exact chain, and trusted target before submitting. It requires account/chain/disconnect event support, keeps those listeners active across the provider request, rechecks the session after a response, and removes the listeners after every outcome. A different factory cannot submit arbitrary calldata even when it names the same contract.
- `WalletSubmission` distinguishes proven `SUBMITTED` from `SUBMISSION_AMBIGUOUS`. The latter retains a returned hash when available, labels chain and owner as requested rather than proven, and has `retryable: false` so a transport-uncertain outcome cannot be sent again automatically.
- `StrategyAdapter` keeps `local` and `robinhood-testnet` modes structurally distinct. It does not replace the current `ProductAdapter`.
- `createM3VaultActionFactory` prepares exact zero-value `deposit(uint256)`, `withdraw(uint256)`, and `close()` calls for one configured Vault.
- `readM3VaultDepositAuthorization` monitors account, chain, and disconnect events across the complete read, verifies the active owner and chain before and after the calls, reads `afUsdc()` and `pass()` from that Vault, and then reads both `allowance(owner, Vault)` values. Its two approval factories bind the queried owner, fix the target to those returned token addresses, fix the spender to the Vault, and fix the value to the exact finite requirement for this deposit. They do not accept another owner, arbitrary spenders, targets, or unlimited approval amounts. Approval submission uses a correspondingly configured `Eip1193Wallet`, so the same simulation and session checks apply.
- `M3VaultApiClient.readSnapshot(owner)` reads only the same-origin canonical projection route and rejects a foreign owner, wrong chain, malformed block identity, noncanonical unsigned amounts, or a Strategy Pass identity that differs from the Vault strategy identity.
- `M3VaultApiClient.registerSubmission(input)` sends only the exact wallet submission identity to the same-origin registration route and rejects additional authority fields or a response whose chain, owner, target, calldata or transaction hash differs. The client then reads operation evidence; it cannot submit a ready state.

## Lifecycle and UI evidence

The canonical lifecycle is:

`AWAITING_SIGNATURE → SUBMITTED → MINED → CONFIRMING → CONFIRMED`

Explicit alternate outcomes are `REJECTED`, `REVERTED`, `REPLACED`, `DROPPED`, `REORGED`, and `RECONCILIATION_FAILED`. A canonical operation can still become `REORGED` after it was confirmed.

`ChainStore.operationEvidence(operationId, projectionKey)` exposes separate UI fields:

| Field            | Meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `lifecycle`      | Canonical backend transaction state                                                                |
| `receipt`        | `PENDING`, `SUCCESS`, or `REVERTED`                                                                |
| `receiptCanonical` | Whether the observed receipt still belongs to the canonical chain; displaced receipt identity remains available as historical reorg evidence |
| `confirmations`  | Observed canonical confirmation count                                                              |
| `reconciliation` | `PENDING`, `MATCHED`, or `FAILED`                                                                  |
| `projection`     | `PENDING`, `READY`, or `STALE`, with chain/owner/contract/block context checked                    |
| `chainStatus`    | `PENDING`, `INCLUDED`, `SOFT_READY`, `REORGED`, `FAILED`, or `UNKNOWN`                              |
| `l1Status`       | `UNKNOWN` unless explicit L1 posting evidence is later implemented                                 |
| `finalityStatus` | `UNKNOWN` unless explicit finality evidence is later implemented                                  |
| `indexerStatus`  | `HEALTHY`, `SYNCING`, or `DEGRADED`                                                                 |
| `degradedReason` | `CHAIN_REORG_DEPTH_EXCEEDED`, `CHAIN_REORG_NO_COMMON_ANCESTOR`, or `null`                            |
| `productReady`   | True only for canonical `CONFIRMED`, matched reconciliation, a compatible projection, and a healthy indexer |

The store computes the result inside one database read transaction. It checks chain, owner, contract, operation and projection block hashes, height bounds, the checkpoint, and every parent link from the operation block through the checkpoint. The ancestry query streams rows and is capped at 2,000 blocks as an engineering resource bound; a larger proof request fails closed as `STALE`. Different-height endpoints that are individually valid but belong to competing forks therefore also fail closed. The browser surface exports only the final evidence type; it does not expose a function that can turn client-composed raw objects into `productReady`.

For the Macbeth04 UI, receipt success can drive its receipt milestone, while `MINED`/`CONFIRMING` remain in progress. The UI may enter `READY` only when `productReady` is true. `REORGED`, `RECONCILIATION_FAILED`, a stale projection, wrong wallet, or wrong network must remain non-ready. Wallet account and network checks are repeated at submission time; product reads may still display public canonical state while a wallet is disconnected.

Backend `CONFIRMED` has the stricter meaning required by the M3 specification: successful canonical receipt, expected event, applicable contract-state reconciliation, and the configured soft-readiness depth. It is not a synonym for receipt success or L1 finality.

## Persistence and deterministic replay

The chain database is physically separate from the Local simulator database. Migration `001-chain-projection.sql` creates:

- `chain_transactions` for operation identity, owner, target, lifecycle, receipt, confirmation, replacement, canonicality, and reconciliation evidence;
- `chain_blocks` for canonical and displaced block history, including parent hash and timestamp;
- `chain_events`, uniquely keyed by `(chain_id, tx_hash, log_index)`, with contract, block, transaction index, topics, decoded name, normalized data, and canonicality;
- `chain_checkpoints`, keyed by chain and contract, containing both block number and block hash;
- `product_projections`, keyed by chain, wallet owner, contract, and projection key.

Migration `002-projection-checkpoint.sql` adds the independently committed projection block/hash and persisted synchronization health. Migration `003-sync-target.sql` binds an incomplete synchronization to the requested target block so a restart or lower-head request cannot reopen projection reads prematurely. Migration `004-sync-lease.sql` adds a database-level synchronization owner token. Migration `005-transaction-index.sql` persists the receipt transaction index alongside its block number and hash. Migration `006-operation-calldata.sql` persists the immutable submitted Vault calldata used to select and verify the expected custody event. A newer equal/higher-head synchronization supersedes the prior owner, and every canonical write, projection commit, rollback, health transition, and lease release verifies that token in the same SQLite write transaction. Existing databases migrate in place; fresh databases apply all migrations in one transaction.

Events are applied in block number, transaction index, and log index order. Re-reading an identical canonical block requires the exact same ordered event identities and payloads. Conflicting data for an existing event identity, or a same-count block replay with different event identities, fails closed. A displaced event can reappear on a new canonical block only when its event payload is unchanged.

On a concrete checkpoint hash mismatch, the synchronizer searches backward within the configured reorg bound. A missing RPC block is treated as provider unavailability and never mutates local canonical evidence. For a bounded reorg with a verified common ancestor, the synchronizer marks displaced blocks and events non-canonical, changes affected operations to `REORGED`, clears projections, rewinds the indexed checkpoint, and deterministically rebuilds the new branch. A reorg deeper than policy persists `CHAIN_REORG_DEPTH_EXCEEDED`; exhausting indexed history without verifying a common ancestor persists `CHAIN_REORG_NO_COMMON_ANCESTOR`. Both cases preserve recorded blocks, events, operations, and displaced receipt identity, stop automatic projection use, and require manual recovery. Direct projection reads fail closed, while `operationEvidence` remains readable as `indexerStatus: DEGRADED`, `projection: STALE`, and `productReady: false`.

`m3ChainSyncPolicy()` freezes the current implementation policy at `softReadyDepth = 3` and `reorgSearchLimit = 128`. The inclusion block counts as confirmation 1, so a canonical transaction becomes eligible for soft readiness at head `blockNumber + 2` after reconciliation succeeds. The 128-block value is the automatic common-ancestor search budget and does not assert finality. `maxBlocksPerSync = 2000` remains a separate engineering resource bound, with an explicit override. L1 posting and finality stay `UNKNOWN` until a provider supplies explicit evidence for those states.

Each projection rebuild atomically replaces the contract's projection set and advances its projected checkpoint. Canonical rebuild is the only path that writes product projections; operation-specific reconciliation updates lifecycle evidence only, so an earlier transaction in the same block cannot overwrite that block's final rebuilt state. Calls on one synchronizer are serialized in process, while the persisted owner token prevents stale synchronizers using another instance, connection, or process from writing or rolling back after another synchronization takes over. Multi-block synchronizations remain persistently `CHAIN_SYNC_INCOMPLETE` from the database claim until the recorded target head completes. A restart or request below that recorded target cannot reopen reads. A later RPC, log, parent, or projection failure therefore leaves the recoverable prefix unreadable instead of presenting it as complete. Projection lookup obtains the lease, health, indexed checkpoint, projected checkpoint, and requested row in one SQLite statement, so another connection cannot change synchronization state between validation and use. Operation reconciliation captures the completed checkpoint before awaiting contract-specific work and persists its lifecycle result only if that exact healthy checkpoint and prior operation are still current and no synchronization lease is active. If a process stops after the indexed checkpoint commits but before projection commit, direct projection reads fail with `CHAIN_SYNC_UNHEALTHY` while its lease remains; after a new synchronizer takes over, an indexed/projected checkpoint gap fails with `CHAIN_PROJECTION_PENDING` until that synchronizer rebuilds it. A rebuild failure for the block currently being indexed removes that partially indexed block only while the caller still owns the lease; stale callers cannot undo newer canonical evidence. Destroying the chain database loses only the cache: a new database can replay from the trusted deployment block and reconstruct canonical events and projections. Browser local storage and submission history are not recovery dependencies.

## Account and wallet separation

Every on-chain projection is keyed by wallet owner. No table links a wallet permanently to one AlphaForge account. Future account authentication and wallet-link challenges can aggregate `0..N` verified wallets without changing on-chain authority. An AlphaForge account, profile, session, or the Local `alice`/`bob` demo identity cannot authorize assets belonging to a wallet.

Indexer health is not an authorization gate for direct owner custody calls. A degraded indexer disables projection-derived product readiness, but it must not disable the wallet path for owner-authorized `withdraw` or `close` once the reviewed contract action encoder is integrated. The contract and wallet remain the authority for that exit path; the indexer only supplies read evidence.

## Client-stack evaluation

The repository had no EVM client dependency at the start of M3. Three directions were considered:

| Direction                     | Benefit                                                                                | Cost for the current slice                                                      | Decision                                              |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Native JSON-RPC plus EIP-1193 | Small boundary, no supply-chain addition, straightforward fixtures                     | The exact static ABI subset is maintained locally                               | Used for the foundation and compiled review ABI       |
| viem                          | Strong typed contract calls, event decoding, EIP-1193 support                          | Adds a production dependency before the deployment artifact is finalized        | Re-evaluate with the final deployment artifact        |
| ethers                        | Broad EVM support and established abstractions                                         | Adds another contract/provider abstraction before the required surface is known | Not added                                             |

Only one stack is implemented. A later library decision must replace or implement the existing ports instead of introducing competing wallet paths, and it must be coordinated before changing the Macbeth04 bundle.

## Contract integration checklist

Before deployment, the integrating change must:

1. validate the first action against the approved owner-only Vault/Pass scope;
2. pin the ABI/version and trusted deployment manifest, including runtime bytecode identity;
3. compare any later deployment artifact against all 25 published selectors and seven published topics already implemented;
4. keep `ContractIntegration.decode`, `rebuildProjections`, and `reconcileOperation` aligned with exact owner, amount, and view rules;
5. retain the wrong-owner, wrong-amount, malformed-event, unexpected-event, and contract-view-mismatch fixtures;
6. add explicit fail-closed Testnet configuration without changing Local mode;
7. preserve the frozen 3-block soft-readiness policy and 128-block recovery budget without relabeling either as finality;
8. collect real chain ID, address, transaction hash, receipt, event, block hash, confirmation, and reconciled projection evidence.
9. compose `M3ChainRuntime` through the deployment-aware factory and keep the Local-only `main.ts` unchanged until those inputs exist.
10. replace the inert deployment object in a reviewed operational composition without changing the Local `main.ts`, and verify the bounded startup/sync/close path against the deployed manifest before enabling its process.

The compiled review handoff says the Vault is the allowance spender for both AF-USDC and Pass, while PassLocker receives/accounted Pass already transferred by the Vault. The implemented allowance seam follows that rule and reads both token identities from the Vault instead of UI copy. This must still be rechecked against the final published artifact and reviewed deployment manifest before any Testnet use.

Strategy execution, risk signing, venues, PnL settlement, mainnet, production keys, and wallet-link authentication remain outside this slice.

### Product availability when synchronization fails

`startM3Server` validates deployment metadata and constructs independent storage before serving.
Configuration or storage construction errors remain fatal. A later initial/periodic RPC or reorg
synchronization failure leaves the product server available for the direct wallet/live-RPC path.
`GET /api/v1/chain/runtime-status` reports the last sync attempt as `NOT_RUN`, `SUCCEEDED`, or
`FAILED`, with a sanitized error code; a succeeded attempt is not transaction readiness or finality.
After a failed attempt, indexed Vault and operation-evidence reads return unavailable rather than
exposing the last successful projection as current. Direct wallet authorization is unaffected.
Retrying synchronization may restore reads when the existing canonical recovery rules permit it;
unrecoverable reorg history and its persisted fault evidence are not reset by startup.
