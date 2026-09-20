# Phase One Product Wallet Flows

## Evidence boundary

- Task: `M3-04-PHASE1-PRODUCT`
- Product source candidate: `86f2f9036657eeda3a7357943b6fcac6de3e5dbe`
- Candidate tree: `ae90be8d3411d921bdaf37cf15d3fdea01ce22b3`
- Fixed base: `18f5352070910a867b9729b031aa2e3951785e01`
- Contract handoff consumed read-only: `e5eff6805d9705745bc0b4483de83466e5693ffa`
- Contract handoff evidence head: `f703209a0ba409818f75ed6074242b3395f7938e`
- Runtime boundary: `LOCAL / MOCK / NOT_DEPLOYED`

The contract handoff confirms that `StrategyPass`, `AlphaForgeVault`, and `PassLocker` retain the
base ABI. It also confirms that initial Pass allocation is performed only by the Strategy Pass
constructor and that ordinary transfers retain all 18 decimal places. No Macbeth02 commit is part
of this worker branch; integration remains a Macbeth01 responsibility.

## User-visible behavior

The active `apps/web/index.html` entry continues to load the protected warm English prototype and
`apps/web/src/product-ui.ts`. The unused React entry remains outside this delivery.

The Phase One panel now presents:

- the connected wallet and Robinhood Chain Testnet identity;
- the selected immutable Vault address;
- reviewed initial Pass supply and recipient when both constructor values exist in deployment
  metadata;
- the fixed Pass address and the connected wallet's full 18-decimal balance;
- exact finite AF-USDC and Pass deposit approvals to the selected Vault;
- deposit, withdraw, close, post-close token rescue, and post-close native rescue states;
- transaction review, simulation, wallet confirmation, submission, and canonical evidence states.

Ordinary Pass transfer accepts a nonzero recipient and a positive canonical 18-decimal amount. The
review binds the wallet owner, fixed Pass contract, recipient, raw amount, and operation ID. Review
and confirmation each recheck the wallet session and simulate the exact transaction. A review is
single-use, so a repeated confirmation cannot send another transaction.

The `10^12` conversion is used only for AF-USDC principal capacity and deposit approval. It is not
applied to ordinary Pass transfer. A transfer of `0.000000000000000001` Pass therefore prepares one
raw unit.

Initial allocation is display-only deployment evidence. It does not mint, sell, or redistribute a
Pass. If the reviewed deployment metadata omits either supply or recipient, both are rejected or
shown as unavailable rather than inferred.

## Closed and degraded states

An open Vault exposes deposit, withdraw, and close according to ownership, chain health, allowance,
and simulation state. Rescue is rejected while the Vault is open.

A closed Vault disables deposit, withdraw, close, and deposit approval. Its immutable owner retains
the two independent rescue actions. Both canonical projection reads and live-RPC fallback reads
support these actions. A non-owner, disconnected wallet, account change, or wrong network disables
them.

When the index API is degraded, deposit stays disabled. A verified owner can still withdraw, close,
or use post-close rescue through live reads and simulation. This does not turn degraded evidence
into `READY`.

## Explicit exclusions

- Paid issuance, Buy Pass, Sell Pass, pricing, fees, AMM, matching, and platform liquidity are
  `OUT OF PHASE ONE`.
- No real wallet signature, external RPC write, deployment, or broadcast was performed.
- No arbitrary token target is accepted for Pass transfer; the target comes from the current Vault
  state and reviewed deployment context.
- No Vault factory or multi-Vault discovery interface was invented. The current product selects the
  single reviewed Vault in deployment metadata. Additional creation/discovery remains dependent on
  an exact integrated interface.

