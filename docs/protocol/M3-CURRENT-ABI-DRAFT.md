# M3 Current ABI Draft

- Status: **DRAFT / NOT FROZEN / NOT DEPLOYED**
- Agent: `Macbeth02`
- Task: `M3-02-PROTOCOL`
- Repository base: `7ecba357d5a19f387e86f578822af04a6261fed2`
- Implementation through: `80ca592`
- Target chain for a separately authorized deployment: Robinhood Chain Testnet `46630`

This document records only the locally implemented ABI-independent protocol pieces. It is an
integration draft for review. It does not define a Vault address, deployment block, final ABI
version, runtime bytecode hash, owner authorization ABI, risk permit ABI, or deployment manifest.
All addresses remain unset and every onchain operation remains `NOT_RUN`.

## Strategy identifier encoding draft

The onchain type is `bytes32`. The proposed deterministic encoding is:

```text
strategyId = keccak256(UTF8(lowercase canonical strategy logic ID))
```

The stable product strategy logic ID `trend` therefore maps to:

```text
0x1bd61c9519af8bbda79ba4a7448ca3a66dd0549a3c0309cd49d04d8ff1248ed6
```

Local demo identifiers remain local and must not be substituted for `trend`. This encoding is a
draft until the Vault ABI handoff is reviewed and frozen.

## Strategy Pass and test assets

`StrategyPass` constructor:

```solidity
constructor(string name_, string symbol_, uint256 fixedSupply_, address recipient_)
```

The Pass uses 18 decimals. The constructor is its only mint path. One whole AF-USDC uses 6
decimals, so the D1 capacity conversion is `usdcBaseUnits * 1e12` Pass base units.

The test asset constructors are:

```solidity
AlphaForgeTestUSDC(uint256 fixedSupply_, address recipient_)
AlphaForgeTestETH(uint256 fixedSupply_, address recipient_)
AlphaForgeTestBTC(uint256 fixedSupply_, address recipient_)
```

AF-USDC uses 6 decimals. AF-ETH and AF-BTC use 18 decimals. All four tokens are fixed-supply
ERC-20 contracts without an owner, admin, post-deployment mint, freeze, blacklist, proxy, or
upgrade entry point.

## PassLocker

Constructor:

```solidity
constructor(address vault_, address owner_, IERC20 pass_)
```

Methods and selectors:

| Method | Selector | Rule |
| --- | --- | --- |
| `lock(uint256)` | `0xdd467064` | Vault only; accounts Pass already transferred to the Locker |
| `unlock(uint256)` | `0x6198e339` | Vault only; returns exactly the unlocked Pass to the immutable owner |
| `releaseAll()` | `0x5be7fde8` | Vault only; clears all accounted Pass and returns it to the immutable owner |
| `lockedBalance()` | `0x7b80889b` | Accounted Pass for this one owner |
| `vault()` | `0xfbfa77cf` | Immutable controller |
| `owner()` | `0x8da5cb5b` | Immutable Pass owner |
| `pass()` | `0xa7a1ed72` | Immutable Strategy Pass |

The Vault-side deposit sequence must transfer the exact owner Pass amount to the Locker and call
`lock(amount)` atomically. Direct token transfers never change `lockedBalance`. No function can
pull Pass from a caller-selected address.

Events:

```solidity
PassLocked(address indexed owner, uint256 amount)
PassUnlocked(address indexed owner, uint256 amount)
```

## B2 test venue

Constructor:

```solidity
constructor(address afUsdc_, address afEth_, address afBtc_)
```

Methods and selectors:

| Method | Selector |
| --- | --- |
| `addLiquidity(address,address,uint256,uint256)` | `0xcf6c62ea` |
| `quote(address,address,uint256)` | `0xb6466384` |
| `swap(address,address,uint256,uint256,address,uint256)` | `0x9908fc8b` |
| `getReserves(address,address)` | `0xd52bb6f4` |
| `afUsdc()` | `0x8b5a851f` |
| `afEth()` | `0xf20173bc` |
| `afBtc()` | `0xa8d937e9` |

Only AF-USDC/AF-ETH and AF-USDC/AF-BTC are valid. The no-fee quote is:

```text
amountOut = reserveOut * amountIn / (reserveIn + amountIn)
```

The Venue settles real ERC-20 balances, rejects expired or under-slippage swaps, isolates pair
reserves, and has no liquidity withdrawal privilege. It exposes no arbitrary target or calldata.

## Fixed swap adapter

Constructor:

```solidity
constructor(address venue_, address afUsdc_, address afEth_, address afBtc_)
```

`ProtocolTypes.SwapAction` has this exact ABI order:

```solidity
struct SwapAction {
    bytes32 strategyId;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 minAmountOut;
    uint256 deadline;
    uint256 expectedStateVersion;
}
```

The only mutation entry point is:

```text
swap((bytes32,address,address,uint256,uint256,uint256,uint256)) -> uint256
selector: 0xb359e721
```

The Adapter pulls exactly `amountIn` from its caller, approves only the immutable Venue for that
amount, verifies the Venue's actual input/output deltas, resets the allowance to zero, and sends
the output to the caller. The eventual Vault must verify `strategyId` and `expectedStateVersion`
before calling the Adapter. The Adapter has no `execute(address,bytes)`, raw calldata, arbitrary
target, native-value, admin, or upgrade path.

## Pending Vault boundary

The following remain deliberately undefined:

- partial withdrawal while AF-ETH or AF-BTC is present;
- whether any non-USDC balance, including third-party dust, blocks partial withdrawal;
- final owner authorization and risk permit EIP-712 schemas;
- Vault methods, events, errors, state commitment, nonce domains, and state-version transitions;
- deployed addresses and deployment evidence.

The owner full in-kind exit must remain available while paused and must not depend on the risk
signer. No dust threshold, price source, quote-based valuation, or ignored balance is assumed by
this draft.
