# AlphaForge partial on-chain authority boundary

Task: M3-01-PARTIAL-ONCHAIN-INTEGRATION. This document records the user-approved architecture. Implementation and verification are tracked in the task record; this document is not deployment evidence.

## Contract authority

The Strategy Pass contract owns fixed supply, balances and transfers, and the immutable association with a strategy identity. Pass raw units have 18 decimals. Ordinary transfers may use every raw unit; capacity-conversion divisibility does not restrict ERC-20 transfers. One PASS corresponds to one AF-USDC unit of principal capacity, not a price, redemption or platform repurchase promise.

The Vault contract independently enforces explicit immutable owner, AF-USDC custody, tracked principal and capacity, Pass collateral obligations, direct owner deposit/withdraw/close, and owner-only post-close excess rescue. A strategy creator receives no custody permission merely by being the creator. Creator and owner may be equal or different addresses. Account metadata cannot transfer or replace the owner.

Authoritative financial quantities use integers: AF-USDC base units for principal, tracked settlement balance and principal withdrawal; Pass raw units for token holdings and locked/unlocked collateral. Exact conversion uses multiplication by 10^12; inverse capacity conversion rejects nonzero remainder. UI formatting never becomes an authorization or accounting input.

## Off-chain responsibilities

The existing server, Account model and UI may index, cache, search and display contract state. Profiles, eventual multi-wallet associations, forum, recommendations, charts, signals, AI and backtests remain off-chain. None may create or revoke contract rights. A simulated PnL or direct unsolicited token transfer cannot become withdrawable tracked profit or trigger capacity release.

Contract events and block identities feed the canonical projection. Reads need one consistent evidence snapshot, continuous parent ancestry and current canonical endpoint hashes. Three L2 confirmations can support configured soft readiness only. L1 posting/finality stay unknown until observed from verifiable evidence. The configured 128-block recovery bound is an automatic-work limit; it is not chain finality.

## Write and owner-exit boundary

The product entry uses the current wallet session and intended network. Before submitting a supported owner action, it reads or simulates current contract conditions and rechecks the wallet context. Only the contract grants the permission; successful UI validation or SQLite data is insufficient.

When the indexer is degraded, stale projection-dependent automatic actions stop and the UI shows the risk. Owner withdraw/close remains available via current chain reads/simulation if the wallet, RPC and contract conditions permit it. RPC unavailability is a connectivity failure, not an AlphaForge authorization denial. No backend signature, Account login or indexer health check may become a new contract exit condition.

Implementation of transaction preparation and wallet submission does not authorize this agent to send a transaction. Local tests use controlled mocks/provider injection or the approved in-memory contract test runner. Production configuration must not fabricate deployment addresses or enable unreviewed targets.

## Principal, collateral and dust invariants

- Deposit adds tracked principal and settlement assets and locks precisely equal principal capacity.
- Realized tracked profit consumes no new Pass capacity; profit-first withdrawal does not unlock Pass.
- The principal portion of withdrawal releases exactly matching collateral. A realized loss alone releases none.
- Settled full close returns the remaining tracked AF-USDC and all residual collateral, without requiring an owner loss top-up.
- Explicit protocol investment positions block principal withdrawal and close until settled. Locked collateral itself is not an investment position.
- Untracked assets neither change principal/equity/PnL/capacity nor block normal close.
- Normal settlement and collateral-return failure must roll back close. Unknown dust rescue is a separate, post-close transaction whose failure cannot undo the close.
- Each token's excess is measured in that token's own raw units after subtracting all reserved obligations. Rescue cannot take locked collateral, use another token's principal units or redirect the recipient.

## Non-goals and remaining acceptance

No strategy runtime, new exchange/AMM, owner migration, upgradeability, meta-transactions, business signing nonce, full login or mainnet is added. Existing demo trading stays explicitly simulated. A buy/sell flow labelled real must eventually have contract-backed ownership and asset settlement; this scope does not manufacture that by changing a label.

Before reporting implementation complete, the unified exact source must pass contract accounting/access-control/rescue tests, fuzz/invariants, indexer reorg tests, actual API and UI integration, browser/provider checks and independent security review. Hosted security feature failures remain visible merge blockers. Real deployment, chain initialization and broadcasts require separate explicit authorization and are not completion claims of this task.
