# M3 Chain Adapter

This document describes the ABI-independent M3 chain foundation implemented by Macbeth03. It is the integration contract for the first owner-authorized Vault/Pass vertical slice on Robinhood Chain Testnet.

The contract-specific slice is not wired yet. Macbeth02 reconfirmed on 2026-09-19 at PR #18 head `d473f9df9eb5d1be41024b4b58ebc5ec4f5d9fcd` that there is no Vault source or compiled owner-only Vault ABI. Proposed methods, events, errors, selectors, topics, accounting transitions, and deployment values remain drafts. The current code therefore contains no invented Vault calldata, accounting, event, or deployment semantics and has not broadcast a Testnet transaction.

## Current boundary

The current local simulator continues to use its existing API and SQLite ledger. The new chain adapter is separate and inactive until an explicit Robinhood Testnet composition supplies all required inputs.

| Area        | Implemented                                                                                                                                                                  | Pending contract integration                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser     | EIP-1193 account access, chain check, prepared action validation, `eth_sendTransaction`, rejection and response handling                                                     | Owner-only action encoder and product UI wiring                                                                      |
| Backend     | Stream-bounded read-only JSON-RPC, authenticated manifest validation, receipt tracking, sequential log indexing, reconciliation seam, persistent projections, reorg recovery | Reviewed ABI decoder, expected-event rules, contract-view reader, service/API composition                            |
| Persistence | Independent transactions, blocks, events, indexed/projected checkpoints, sync health/ownership, and wallet-keyed projections                                                 | Production database location and operational retention policy                                                        |
| Testnet     | Exact Chain ID validation for `46630`                                                                                                                                        | Trusted deployed address, deployment block, manifest digest, runtime bytecode hash, RPC configuration, live evidence |

There is no automatic fallback from a failed or incomplete Testnet composition to Local mode. No configuration switch currently enables Testnet writes.

## Authority and data flow

The browser requests the active account and verifies Chain ID immediately before it asks the wallet to submit. It sends only an opaque `PreparedAction` created by the trusted action preparer for the configured contract. During wallet confirmation it monitors the required EIP-1193 account, chain, and disconnect events, then rechecks account and chain after the provider responds. A stable response transaction hash means `SUBMITTED` only. A changed or unverifiable session produces a non-retryable `SUBMISSION_AMBIGUOUS` result whose requested owner and chain are not represented as proven transaction identity.

The backend uses its own RPC connection and trusted deployment manifest. It scans the configured contract from its deployment block, records normalized events in canonical order, verifies the receipt and expected event, performs any required contract read through the contract integration, and writes a reconstructable projection. It never receives or stores an owner private key and never signs an owner transaction.

The chain remains the source of truth. Frontend state, local storage, demo cookies, HTTP request bodies, and client-reported transaction status cannot make an operation canonical.

## Public interfaces

The transport-independent package is exported from `packages/chain-adapter/src/index.ts`:

- `validateDeploymentManifest` accepts exactly the trusted environment, Chain ID, digest, and optional expected contract address. The trusted SHA-256 digest is recomputed over the canonical manifest document, so it binds the contract identity, deployment block, ABI version, and runtime bytecode hash. Only validated manifests can be supplied to the synchronizer.
- `ReadonlyRpc` exposes only chain ID, block, receipt, logs, and `eth_call`. `JsonRpcClient` provides bounded endpoint rotation, timeout, streaming response-size enforcement, strict response normalization, and sanitized failures.
- `ChainOperation` and `transitionOperation` define the closed lifecycle and the evidence retained at each transition.
- `ContractIntegration` isolates ABI-specific decoding, projection rebuilding, and transaction reconciliation from generic synchronization.

The backend surface is `ChainSynchronizer` and `ChainStore`:

- `syncTo(head)` verifies the Chain ID, detects checkpoint hash divergence, performs a bounded common-ancestor search, rewinds displaced state, and sequentially replays the canonical fork.
- `trackOperation(operationId)` verifies the receipt owner, target, block hash, expected normalized event, contract reconciliation result, and injected confirmation depth.
- `recordReplacement` and `recordDropped` accept explicit backend evidence decisions; the indexer does not infer either result from elapsed time.
- `operationEvidence(operationId, projectionKey)` reads the operation, current projection, sync checkpoint, and every canonical block from the operation through the checkpoint inside one SQLite read transaction. The backend verifies the full parent-hash ancestry and returns final product evidence. API/UI code receives that result and has no supported path for deriving readiness from independently cached operation or projection objects.

The browser surface is `Eip1193Wallet`, `PreparedActionFactory`, and the discriminated `StrategyAdapter` direction:

- `PreparedActionFactory` is the contract-integration boundary. Product UI supplies a semantic action; the reviewed encoder supplies the target calldata and value. Each factory has an unforgeable in-process authority token.
- `Eip1193Wallet` is composed with the reviewed factory's authority and checks that exact origin, the current account, exact chain, and trusted target before submitting. It requires account/chain/disconnect event support, keeps those listeners active across the provider request, rechecks the session after a response, and removes the listeners after every outcome. A different factory cannot submit arbitrary calldata even when it names the same contract.
- `WalletSubmission` distinguishes proven `SUBMITTED` from `SUBMISSION_AMBIGUOUS`. The latter retains a returned hash when available, labels chain and owner as requested rather than proven, and has `retryable: false` so a transport-uncertain outcome cannot be sent again automatically.
- `StrategyAdapter` keeps `local` and `robinhood-testnet` modes structurally distinct. It does not replace the current `ProductAdapter`.

## Lifecycle and UI evidence

The canonical lifecycle is:

`AWAITING_SIGNATURE → SUBMITTED → MINED → CONFIRMING → CONFIRMED`

Explicit alternate outcomes are `REJECTED`, `REVERTED`, `REPLACED`, `DROPPED`, `REORGED`, and `RECONCILIATION_FAILED`. A canonical operation can still become `REORGED` after it was confirmed.

`ChainStore.operationEvidence(operationId, projectionKey)` exposes separate UI fields:

| Field            | Meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `lifecycle`      | Canonical backend transaction state                                                                |
| `receipt`        | `PENDING`, `SUCCESS`, or `REVERTED`                                                                |
| `confirmations`  | Observed canonical confirmation count                                                              |
| `reconciliation` | `PENDING`, `MATCHED`, or `FAILED`                                                                  |
| `projection`     | `PENDING`, `READY`, or `STALE`, with chain/owner/contract/block context checked                    |
| `productReady`   | True only for canonical `CONFIRMED`, matched reconciliation, and a compatible non-stale projection |

The store computes the result inside one database read transaction. It checks chain, owner, contract, operation and projection block hashes, height bounds, the checkpoint, and every parent link from the operation block through the checkpoint. The ancestry query streams rows and is capped at 2,000 blocks as an engineering resource bound; a larger proof request fails closed as `STALE`. Different-height endpoints that are individually valid but belong to competing forks therefore also fail closed. The browser surface exports only the final evidence type; it does not expose a function that can turn client-composed raw objects into `productReady`.

For the Macbeth04 UI, receipt success can drive its receipt milestone, while `MINED`/`CONFIRMING` remain in progress. The UI may enter `READY` only when `productReady` is true. `REORGED`, `RECONCILIATION_FAILED`, a stale projection, wrong wallet, or wrong network must remain non-ready. Wallet account and network checks are repeated at submission time; product reads may still display public canonical state while a wallet is disconnected.

Backend `CONFIRMED` has the stricter meaning required by the M3 specification: successful canonical receipt, expected event, applicable contract-state reconciliation, and the injected confirmation depth. It is not a synonym for receipt success.

## Persistence and deterministic replay

The chain database is physically separate from the Local simulator database. Migration `001-chain-projection.sql` creates:

- `chain_transactions` for operation identity, owner, target, lifecycle, receipt, confirmation, replacement, canonicality, and reconciliation evidence;
- `chain_blocks` for canonical and displaced block history, including parent hash and timestamp;
- `chain_events`, uniquely keyed by `(chain_id, tx_hash, log_index)`, with contract, block, transaction index, topics, decoded name, normalized data, and canonicality;
- `chain_checkpoints`, keyed by chain and contract, containing both block number and block hash;
- `product_projections`, keyed by chain, wallet owner, contract, and projection key.

Migration `002-projection-checkpoint.sql` adds the independently committed projection block/hash and persisted synchronization health. Migration `003-sync-target.sql` binds an incomplete synchronization to the requested target block so a restart or lower-head request cannot reopen projection reads prematurely. Migration `004-sync-lease.sql` adds a database-level synchronization owner token. A newer equal/higher-head synchronization supersedes the prior owner, and every canonical write, projection commit, rollback, health transition, and lease release verifies that token in the same SQLite write transaction. Existing databases migrate in place; fresh databases apply all migrations in one transaction.

Events are applied in block number, transaction index, and log index order. Re-reading an identical canonical block requires the exact same ordered event identities and payloads. Conflicting data for an existing event identity, or a same-count block replay with different event identities, fails closed. A displaced event can reappear on a new canonical block only when its event payload is unchanged.

On a concrete checkpoint hash mismatch, the synchronizer searches backward within the configured reorg bound. A missing RPC block is treated as provider unavailability and never mutates local canonical evidence. For a bounded reorg, the synchronizer marks displaced blocks and events non-canonical, changes affected operations to `REORGED`, clears projections, rewinds the indexed checkpoint, and deterministically rebuilds the new branch. A reorg deeper than policy persists an unhealthy state and projection reads fail closed until canonical recovery succeeds.

Confirmation depth and maximum reorg depth are required injected inputs. The repository does not assign operational values to either one. `maxBlocksPerSync = 2000` remains an engineering resource bound, with an explicit override, and is not a finality claim. The authoritative deployment/finality owner must still approve confirmation depth, reorg depth, and the response required after a deeper reorg before a Testnet composition can be enabled.

Each projection rebuild atomically replaces the contract's projection set and advances its projected checkpoint. Canonical rebuild is the only path that writes product projections; operation-specific reconciliation updates lifecycle evidence only, so an earlier transaction in the same block cannot overwrite that block's final rebuilt state. Calls on one synchronizer are serialized in process, while the persisted owner token prevents stale synchronizers using another instance, connection, or process from writing or rolling back after another synchronization takes over. Multi-block synchronizations remain persistently `CHAIN_SYNC_INCOMPLETE` from the database claim until the recorded target head completes. A restart or request below that recorded target cannot reopen reads. A later RPC, log, parent, or projection failure therefore leaves the recoverable prefix unreadable instead of presenting it as complete. Projection lookup obtains the lease, health, indexed checkpoint, projected checkpoint, and requested row in one SQLite statement, so another connection cannot change synchronization state between validation and use. Operation reconciliation captures the completed checkpoint before awaiting contract-specific work and persists its lifecycle result only if that exact healthy checkpoint and prior operation are still current and no synchronization lease is active. If a process stops after the indexed checkpoint commits but before projection commit, direct projection reads fail with `CHAIN_SYNC_UNHEALTHY` while its lease remains; after a new synchronizer takes over, an indexed/projected checkpoint gap fails with `CHAIN_PROJECTION_PENDING` until that synchronizer rebuilds it. A rebuild failure for the block currently being indexed removes that partially indexed block only while the caller still owns the lease; stale callers cannot undo newer canonical evidence. Destroying the chain database loses only the cache: a new database can replay from the trusted deployment block and reconstruct canonical events and projections. Browser local storage and submission history are not recovery dependencies.

## Account and wallet separation

Every on-chain projection is keyed by wallet owner. No table links a wallet permanently to one AlphaForge account. Future account authentication and wallet-link challenges can aggregate `0..N` verified wallets without changing on-chain authority. An AlphaForge account, profile, session, or the Local `alice`/`bob` demo identity cannot authorize assets belonging to a wallet.

## Client-stack evaluation

The repository had no EVM client dependency at the start of M3. Three directions were considered:

| Direction                     | Benefit                                                                                | Cost for the current slice                                                      | Decision                                              |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Native JSON-RPC plus EIP-1193 | Small boundary, no supply-chain addition, straightforward fixtures, no ABI assumptions | Contract encoding and decoding must be injected                                 | Used for the ABI-independent foundation               |
| viem                          | Strong typed contract calls, event decoding, EIP-1193 support                          | Adds a production dependency before the ABI and contract surface are frozen     | Re-evaluate when Macbeth02 publishes the reviewed ABI |
| ethers                        | Broad EVM support and established abstractions                                         | Adds another contract/provider abstraction before the required surface is known | Not added                                             |

Only one stack is implemented. A later library decision must replace or implement the existing ports instead of introducing competing wallet paths, and it must be coordinated before changing the Macbeth04 bundle.

## Contract integration checklist

When Macbeth02 publishes an immutable contract input, the integrating change must:

1. validate the first action against the approved owner-only Vault/Pass scope;
2. pin the ABI/version and trusted deployment manifest, including runtime bytecode identity;
3. implement the semantic action encoder through `PreparedActionFactory`;
4. implement `ContractIntegration.decode`, `rebuildProjections`, and `reconcileOperation` with exact owner, amount, and view rules;
5. add wrong-address, wrong-owner, wrong-amount, unexpected-event, and contract-view-mismatch fixtures;
6. add explicit fail-closed Testnet configuration without changing Local mode;
7. obtain a reviewed confirmation/finality policy before setting an operational depth;
8. collect real chain ID, address, transaction hash, receipt, event, block hash, confirmation, and reconciled projection evidence.

The owner source (`owner_` versus deployment caller), AF-USDC-to-Pass base-unit conversion wording, partial withdrawal with non-USDC balances or third-party dust, and direct custody calls versus relayed custody intents are also unresolved contract inputs. They must be resolved in the protocol source before the encoder, decoder, view reader, or expected-event rules can be implemented.

Strategy execution, risk signing, venues, PnL settlement, mainnet, production keys, and wallet-link authentication remain outside this slice.
