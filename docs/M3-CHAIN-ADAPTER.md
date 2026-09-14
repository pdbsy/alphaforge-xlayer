# M3 Chain Adapter

This document describes the ABI-independent M3 chain foundation implemented by Macbeth03. It is the integration contract for the first owner-authorized Vault/Pass vertical slice on Robinhood Chain Testnet.

The contract-specific slice is not wired yet. Macbeth02 confirmed on 2026-09-14 that the owner-only action ABI, expected event, contract view, deployment manifest, and deployed Testnet contracts are still pending. The current code therefore contains no invented Vault accounting, token, Pass locking, event, or deployment semantics and has not broadcast a Testnet transaction.

## Current boundary

The current local simulator continues to use its existing API and SQLite ledger. The new chain adapter is separate and inactive until an explicit Robinhood Testnet composition supplies all required inputs.

| Area        | Implemented                                                                                                                                             | Pending contract integration                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser     | EIP-1193 account access, chain check, prepared action validation, `eth_sendTransaction`, rejection and response handling                                | Owner-only action encoder and product UI wiring                                                                      |
| Backend     | Bounded read-only JSON-RPC, manifest validation, receipt tracking, sequential log indexing, reconciliation seam, persistent projections, reorg recovery | Reviewed ABI decoder, expected-event rules, contract-view reader, service/API composition                            |
| Persistence | Independent transactions, blocks, events, checkpoints, and wallet-keyed projections                                                                     | Production database location and operational retention policy                                                        |
| Testnet     | Exact Chain ID validation for `46630`                                                                                                                   | Trusted deployed address, deployment block, manifest digest, runtime bytecode hash, RPC configuration, live evidence |

There is no automatic fallback from a failed or incomplete Testnet composition to Local mode. No configuration switch currently enables Testnet writes.

## Authority and data flow

The browser requests the active account and verifies Chain ID immediately before it asks the wallet to submit. It sends only an opaque `PreparedAction` created by the trusted action preparer for the configured contract. The resulting transaction hash means `SUBMITTED` only.

The backend uses its own RPC connection and trusted deployment manifest. It scans the configured contract from its deployment block, records normalized events in canonical order, verifies the receipt and expected event, performs any required contract read through the contract integration, and writes a reconstructable projection. It never receives or stores an owner private key and never signs an owner transaction.

The chain remains the source of truth. Frontend state, local storage, demo cookies, HTTP request bodies, and client-reported transaction status cannot make an operation canonical.

## Public interfaces

The transport-independent package is exported from `packages/chain-adapter/src/index.ts`:

- `validateDeploymentManifest` accepts exactly the trusted environment, Chain ID, digest, and optional expected contract address. The manifest also binds the deployment block, ABI version, and runtime bytecode hash.
- `ReadonlyRpc` exposes only chain ID, block, receipt, logs, and `eth_call`. `JsonRpcClient` provides bounded endpoint rotation, timeout, response-size limits, strict response normalization, and sanitized failures.
- `ChainOperation` and `transitionOperation` define the closed lifecycle and the evidence retained at each transition.
- `ContractIntegration` isolates ABI-specific decoding, projection rebuilding, and transaction reconciliation from generic synchronization.

The backend surface is `ChainSynchronizer` and `ChainStore`:

- `syncTo(head)` verifies the Chain ID, detects checkpoint hash divergence, performs a bounded common-ancestor search, rewinds displaced state, and sequentially replays the canonical fork.
- `trackOperation(operationId)` verifies the receipt owner, target, block hash, expected normalized event, contract reconciliation result, and injected confirmation depth.
- `recordReplacement` and `recordDropped` accept explicit backend evidence decisions; the indexer does not infer either result from elapsed time.

The browser surface is `Eip1193Wallet`, `PreparedActionFactory`, and the discriminated `StrategyAdapter` direction:

- `PreparedActionFactory` is the contract-integration boundary. Product UI supplies a semantic action; the reviewed encoder supplies the target calldata and value. Each factory has an unforgeable in-process authority token.
- `Eip1193Wallet` is composed with the reviewed factory's authority and checks that exact origin, the current account, exact chain, and trusted target before submitting. A different factory cannot submit arbitrary calldata even when it names the same contract.
- `StrategyAdapter` keeps `local` and `robinhood-testnet` modes structurally distinct. It does not replace the current `ProductAdapter`.

## Lifecycle and UI evidence

The canonical lifecycle is:

`AWAITING_SIGNATURE → SUBMITTED → MINED → CONFIRMING → CONFIRMED`

Explicit alternate outcomes are `REJECTED`, `REVERTED`, `REPLACED`, `DROPPED`, `REORGED`, and `RECONCILIATION_FAILED`. A canonical operation can still become `REORGED` after it was confirmed.

`operationEvidence(operation, projection)` exposes separate UI fields:

| Field            | Meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `lifecycle`      | Canonical backend transaction state                                                                |
| `receipt`        | `PENDING`, `SUCCESS`, or `REVERTED`                                                                |
| `confirmations`  | Observed canonical confirmation count                                                              |
| `reconciliation` | `PENDING`, `MATCHED`, or `FAILED`                                                                  |
| `projection`     | `PENDING`, `READY`, or `STALE`, with chain/owner/contract/block context checked                    |
| `productReady`   | True only for canonical `CONFIRMED`, matched reconciliation, and a compatible non-stale projection |

For the Macbeth04 UI, receipt success can drive its receipt milestone, while `MINED`/`CONFIRMING` remain in progress. The UI may enter `READY` only when `productReady` is true. `REORGED`, `RECONCILIATION_FAILED`, a stale projection, wrong wallet, or wrong network must remain non-ready. Wallet account and network checks are repeated at submission time; product reads may still display public canonical state while a wallet is disconnected.

Backend `CONFIRMED` has the stricter meaning required by the M3 specification: successful canonical receipt, expected event, applicable contract-state reconciliation, and the injected confirmation depth. It is not a synonym for receipt success.

## Persistence and deterministic replay

The chain database is physically separate from the Local simulator database. Migration `001-chain-projection.sql` creates:

- `chain_transactions` for operation identity, owner, target, lifecycle, receipt, confirmation, replacement, canonicality, and reconciliation evidence;
- `chain_blocks` for canonical and displaced block history, including parent hash and timestamp;
- `chain_events`, uniquely keyed by `(chain_id, tx_hash, log_index)`, with contract, block, transaction index, topics, decoded name, normalized data, and canonicality;
- `chain_checkpoints`, keyed by chain and contract, containing both block number and block hash;
- `product_projections`, keyed by chain, wallet owner, contract, and projection key.

Events are applied in block number, transaction index, and log index order. Re-reading an identical canonical event is a no-op. Conflicting data for an existing event identity fails closed. A displaced event can reappear on a new canonical block only when its event payload is unchanged.

On a checkpoint mismatch, the synchronizer searches backward within the configured reorg bound. It marks displaced blocks and events non-canonical, changes affected operations to `REORGED`, removes projections at or after the fork, rewinds the checkpoint, and replays the new branch. Projection rebuild failure removes the partially indexed block instead of leaving a canonical checkpoint without a corresponding projection.

A backend restart resumes from the persisted block number and hash. Destroying the chain database loses only the cache: a new database can replay from the trusted deployment block and reconstruct canonical events and projections. Browser local storage and submission history are not recovery dependencies.

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

Strategy execution, risk signing, venues, PnL settlement, mainnet, production keys, and wallet-link authentication remain outside this slice.
