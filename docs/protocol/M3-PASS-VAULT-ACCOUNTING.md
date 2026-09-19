# M3 Pass and Vault Accounting

- Status: **COMPILED LOCAL REVIEW DRAFT / NOT DEPLOYED**
- Agent: `Macbeth02`
- Task: `M3-02-PROTOCOL`
- Units: AF-USDC base units use 6 decimals; Pass raw units use 18 decimals

## Onchain authority

`StrategyPass` has a fixed constructor supply, ordinary ERC-20 ownership, and one immutable nonzero
`strategyId`. `AlphaForgeVault` stores that same Strategy ID and refuses construction when the
Pass reports a different value. This makes the token-to-strategy relationship observable and
immutable onchain rather than dependent on a deployment label, database row, or UI projection.

The Vault owner is an explicit immutable constructor argument. The deployer and strategy creator
receive no custody authority. There is no owner transfer, renounce, initializer, relayer,
signature authorization, business nonce, recipient parameter, arbitrary call, or upgrade path.

## Capacity and custody

The exact conversion is:

```text
passRaw = usdcRaw * 10^12
```

The reverse conversion is accepted only when `passRaw % 10^12 == 0`. Depositing one AF-USDC base
unit therefore locks exactly `10^12` Pass raw units. The owner grants AF-USDC and Pass allowances
to the Vault. The Vault transfers AF-USDC to itself and Pass directly from the owner to its
dedicated PassLocker; the Locker never spends the owner's allowance.

For every active state reached by the production custody methods and the settlement model:

```text
PassLocker.lockedBalance == principalBasis * 10^12
trackedUsdcBalance <= actual AF-USDC balance held by Vault
realizedProfit = max(trackedUsdcBalance - principalBasis, 0)
```

## Withdrawal and loss

Withdrawals consume realized profit before principal. The profit portion returns AF-USDC without
unlocking Pass. The principal portion reduces `principalBasis` and unlocks exactly the matching
Pass amount. A recorded loss reduces tracked AF-USDC while leaving principal and locked Pass
unchanged. Closing after a loss needs no owner top-up: it returns remaining tracked AF-USDC,
clears principal, and releases all remaining locked Pass atomically.

PassLocker measures the immutable owner's balance before and after every unlock or release. A
reverting token, false-return token, no-op token, or fee-on-transfer token cannot clear accounted
Pass unless the owner actually receives the exact raw amount.

## Positions and untracked balances

Only explicitly recorded AF-ETH and AF-BTC balances are protocol investment positions. An open
position blocks the principal portion of a withdrawal and blocks close; profit-only withdrawal is
still allowed. Locked Pass is a reserved obligation, not an investment position.

Direct ERC-20 or native transfers never change principal, tracked AF-USDC, profit, capacity, or
position count. Close ignores such balances and processes only protocol obligations. After close,
the immutable owner may rescue untracked token or native excess to the same owner address. Rescue
cannot run while active and cannot reduce any reserved tracked balance.

## Runtime boundary

The production Vault intentionally exposes no strategy execution or settlement mutation surface.
`AlphaForgeVaultHarness` exists only under `contracts/test/`; it moves real test tokens while
exercising the internal tracked-position accounting needed to validate profit, loss, and position
states. No harness method appears in the production Vault ABI or bytecode.

The invariant suite uses 64 runs at depth 32 and proves active Pass/principal equality, funding of
tracked AF-USDC, dust independence, non-owner mutation rejection, reserved-balance integrity, and
zero protocol obligations after a successful close. Fuzz conversion and dust tests use 256 runs.
