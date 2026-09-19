# M3 Current ABI Draft

- Status: **COMPILED LOCAL REVIEW DRAFT / NOT DEPLOYED**
- Agent: `Macbeth02`
- Task: `M3-02-PROTOCOL`
- Repository base: `7ecba357d5a19f387e86f578822af04a6261fed2`
- Implementation source: `db620d68a635259f53f48c33defff4273237d372`
- Target chain for a separately authorized deployment: Robinhood Chain Testnet `46630`

This document records the locally compiled protocol pieces. The concrete Vault ABI is documented
in `M3-VAULT-ABI-HANDOFF.md` and its accounting in `M3-PASS-VAULT-ACCOUNTING.md`. This remains an
integration draft: it defines no Vault address, deployment block, deployment transaction, finality
receipt, owner authorization ABI, risk permit ABI, or finalized deployment manifest. All addresses
remain unset and every onchain operation remains `NOT_RUN`.

## Local toolchain boundary

The branch keeps the locked Forge 1.5.1, solc 0.8.31, OpenZeppelin Contracts 5.4.0, and Slither
0.11.3 inputs. The derived OpenZeppelin subset now contains 21 exact pragma-only transformations
needed by EIP-712, ERC-20, SafeERC20, ReentrancyGuard, and their reviewed transitive imports. The
strict local gate checks all project Forge artifacts against the original and derived compilations,
runs 12 dependency-derivation regression tests, executes the Solidity unit/fuzz/invariant suites,
and runs Slither without detector exclusions.

`contracts/README.md` and `contracts/TOOLCHAIN.md` are historical migrated artifacts protected by
the repository migration manifest. They remain byte-identical to their recorded source versions;
current M3 notes belong in this document and the eventual M3 work log.

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
constructor(
    string name_,
    string symbol_,
    bytes32 strategyId_,
    uint256 fixedSupply_,
    address recipient_
)
```

The Pass uses 18 decimals. The constructor is its only mint path and stores one immutable nonzero
`strategyId`. One whole AF-USDC uses 6 decimals, so the D1 capacity conversion is
`usdcBaseUnits * 1e12` Pass base units. Vault construction checks that its Strategy ID equals this
onchain Pass identity.

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
    uint256 deadlineBlock;
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
before calling the Adapter. `deadlineBlock` is an inclusive Robinhood Chain block height; the
Adapter and Venue reject the action when `block.number > deadlineBlock`. The Adapter has no
`execute(address,bytes)`, raw calldata, arbitrary target, native-value, admin, or upgrade path.

## Implemented Vault boundary

The locally compiled Vault uses an explicit immutable owner, exact Pass capacity, profit-first
withdrawal, tracked AF-ETH/AF-BTC position gates, loss-safe close, and post-close dust rescue.
Locked Pass is reserved but does not count as an open investment position. Unsolicited assets do
not change accounting or block close. Exact signatures, selectors, topics, errors, allowance
spender rules, and constructor order are in `M3-VAULT-ABI-HANDOFF.md`.

No owner authorization or risk permit EIP-712 schema is added in this partial integration. There
is no strategy runtime, pause role, risk signer, state-version transition, deployment address, or
deployment evidence.

## Offline deployment manifest preparation

`contracts/deployment/m3-robinhood-testnet.template.json` is a machine-readable preparation
template, not deployment evidence. It records chain ID `46630`, the locked local toolchain, exact
constructor schemas for the implemented local contracts, and null placeholders for every address,
constructor value, code hash, ABI hash, deployment block, transaction hash, finality value, event
topic, EIP-712 field, and evidence reference.

The deployment preparation template is updated separately by the M3 integrator after consuming
the compiled source commit and artifact hashes. It must retain null addresses and onchain evidence,
reject premature deployment claims and any private-key, mnemonic, RPC, transaction-signing, or
broadcast field, perform no network access, and emit no transaction.
