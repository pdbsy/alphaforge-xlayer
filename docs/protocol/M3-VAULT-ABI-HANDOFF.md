# M3 Vault ABI Handoff

- Status: **COMPILED LOCAL REVIEW DRAFT / NOT DEPLOYED**
- Agent: `Macbeth02`
- Task: `M3-02-PROTOCOL`, contributing to `M3-01-PARTIAL-ONCHAIN-INTEGRATION`
- Branch: `macbeth02/M3-02-PROTOCOL`
- Interface source: `contracts/src/interfaces/IAlphaForgeVault.sol`
- Implementation source: `db620d68a635259f53f48c33defff4273237d372`
- Published ABI: `contracts/deployment/abi/AlphaForgeVault.abi.json`
- Target chain for a separately authorized future deployment: Robinhood Chain Testnet `46630`

This handoff records the compiled partial-onchain Vault interface requested by the user. The
concrete `AlphaForgeVault` is implemented and validated locally with the pinned Solidity `0.8.31`
toolchain. It supplies reviewable calldata and event identities to Macbeth03 and Macbeth04; it
does not claim a deployed address, deployment transaction, block, finality, or broadcast.

## Constructor

The concrete Vault constructor will use this exact ABI order:

```solidity
constructor(
    address owner_,
    address strategyCreator_,
    bytes32 strategyId_,
    bytes32 strategyRef_,
    address pass_,
    address afUsdc_,
    address afEth_,
    address afBtc_
)
```

`owner_` is explicit and immutable; it is never inferred from the deployer or `msg.sender`.
`strategyCreator_` is a separate immutable identity and receives no Vault custody permission.
The four token addresses must be nonzero and distinct. Pass must report 18 decimals and AF-USDC
must report 6 decimals. Pass must also expose an immutable `strategyId()` equal to `strategyId_`;
otherwise construction reverts. The constructor deploys one
`PassLocker(address(this), owner_, pass_)`.

## Owner custody mutations

All recipients are fixed to the immutable owner. No method accepts a recipient, relayer,
authorization signature, business nonce, arbitrary target, or calldata.

For `deposit`, the owner grants both AF-USDC and Pass allowances to the **Vault address**. The
Vault is the allowance spender: it calls `transferFrom(owner, Vault, usdcAmount)` for AF-USDC and
`transferFrom(owner, PassLocker, passRaw)` for Pass. PassLocker records and releases Pass that it
has already received; PassLocker is not the allowance spender.

| Signature | Selector | Rule |
| --- | --- | --- |
| `deposit(uint256)` | `0xb6b55f25` | owner only; amount is AF-USDC 6-decimal base units |
| `withdraw(uint256)` | `0x2e1a7d4d` | owner only; profit first, then principal and Pass unlock |
| `close()` | `0x43d726d6` | owner only; tracked positions must be zero |
| `rescueUntrackedToken(address)` | `0x45f5030f` | owner only after close; returns rescued raw amount |
| `rescueNative()` | `0xfc82f084` | owner only after close; returns rescued native amount |

## Conversion and accounting views

| Signature | Selector |
| --- | --- |
| `usdcToPassRaw(uint256)` | `0x643456f6` |
| `passToUsdcRaw(uint256)` | `0x18ba7fe2` |
| `realizedProfit()` | `0x738b74f0` |
| `withdrawableUsdc()` | `0x442ad6a0` |
| `reservedTrackedBalance(address)` | `0xc0bdb971` |
| `untrackedExcess(address)` | `0x21f38bbd` |
| `trackedPosition(address)` | `0xb31ede63` |

The exact conversion is `passRaw = usdcRaw * 1e12`. Reverse conversion reverts unless
`passRaw % 1e12 == 0`; no truncation or rounding is permitted. Principal and tracked AF-USDC use
six-decimal base units. Pass and other tokens retain their own raw units.

## Identity and state views

| Signature | Selector |
| --- | --- |
| `owner()` | `0x8da5cb5b` |
| `strategyCreator()` | `0x499bb2ab` |
| `strategyId()` | `0x492f4e18` |
| `strategyRef()` | `0xc288f3de` |
| `pass()` | `0xa7a1ed72` |
| `afUsdc()` | `0x8b5a851f` |
| `afEth()` | `0xf20173bc` |
| `afBtc()` | `0xa8d937e9` |
| `passLocker()` | `0xab88dc4b` |
| `principalBasis()` | `0xad587035` |
| `trackedUsdcBalance()` | `0x0510ca51` |
| `openTrackedPositionCount()` | `0x34dda870` |
| `closed()` | `0x597e1fb5` |

## Events

| Signature | Topic 0 |
| --- | --- |
| `Deposited(address,uint256,uint256,uint256,uint256)` | `0xe3b53cd1a44fbf11535e145d80b8ef1ed6d57a73bf5daa7e939b6b01657d6549` |
| `Withdrawn(address,uint256,uint256,uint256,uint256,uint256,uint256)` | `0x6b4651e8f4162f82274a25e57a29f7ed9156d17078e76dd4d05f04ba08831aa4` |
| `Closed(address,uint256,uint256)` | `0x792b1058d55c02122048f16ecbfdaab6be257e8c903a60a01f220960238aefc7` |
| `TrackedUsdcBalanceChanged(uint256,uint256)` | `0x29a4ed269a24b639ce9313072bca1d8d408f35f61108737792b18153b9c5b470` |
| `TrackedPositionChanged(address,uint256,uint256)` | `0xc918adb5da6f1094bf877bef10e664cd7ca5fb1216d89f807c19cdf60e5f1c88` |
| `UntrackedTokenRescued(address,address,uint256)` | `0x204874061edf1b61f01e55eb957ff789bf733451c43d111f54ba6d84122b7160` |
| `NativeRescued(address,uint256)` | `0xe3eb98b7fe2a0c1d490b92af73eeae611e9b00ab3c3f70b20bd7bb43f67a0f43` |

The first address in owner custody events is indexed. `TrackedPositionChanged.token` is indexed.
Both addresses in `UntrackedTokenRescued` are indexed. `NativeRescued.owner` is indexed.

## Custom errors

| Signature | Selector |
| --- | --- |
| `Unauthorized(address)` | `0x8e4a23d6` |
| `ZeroAddress()` | `0xd92e233d` |
| `DuplicateAsset(address)` | `0x437a40b1` |
| `InvalidStrategyIdentity()` | `0xd4ce6f3d` |
| `StrategyPassMismatch(address,bytes32,bytes32)` | `0xf73f4ac6` |
| `UnexpectedDecimals(address,uint8,uint8)` | `0x91dfc113` |
| `ZeroAmount()` | `0x1f2a2005` |
| `VaultClosed()` | `0xdf23397a` |
| `VaultActive()` | `0x0f76440a` |
| `AmountOverflow(uint256)` | `0xff29cf0d` |
| `InexactPassAmount(uint256)` | `0xdab463a7` |
| `InsufficientTrackedUsdc(uint256,uint256)` | `0xf1e240c1` |
| `OpenTrackedPositions(uint256)` | `0x96d995dc` |
| `UnsupportedTrackedAsset(address)` | `0xf32b7061` |
| `TrackedBalanceDeficit(address,uint256,uint256)` | `0x5f12aa59` |
| `TokenTransferAmountMismatch(address,uint256,uint256)` | `0x8259e2f5` |
| `NoUntrackedExcess(address)` | `0xebbcde93` |
| `NativeTransferFailed()` | `0xf4b3b1bc` |

## Frozen behavior boundary

- Only the owner may deposit, withdraw, close, or rescue; normal wallet transactions provide the
  only signing and nonce layer.
- Profit withdrawal does not unlock Pass. Principal withdrawal unlocks exactly the matching Pass
  raw units. Loss does not unlock Pass. Close releases all remaining accounted Pass without a
  principal top-up.
- An explicitly tracked AF-ETH or AF-BTC position blocks the principal portion of withdrawal and
  blocks close. Locked Pass is not such a position.
- Direct token/native transfers do not create principal, equity, profit, capacity, or tracked
  positions and do not block withdraw or close.
- Rescue runs only after close and only transfers untracked excess to the immutable owner. A failed
  rescue transaction cannot reverse the earlier close transaction.
- Required AF-USDC settlement or Pass release failure reverts close atomically.
- Pass unlock and release verify the immutable owner's actual balance increase; a token that
  reports success but delivers less than the exact amount cannot clear the lock or close state.

## Strategy Pass binding

`StrategyPass` binds each fixed supply to one nonzero immutable Strategy ID onchain:

```solidity
constructor(
    string name_,
    string symbol_,
    bytes32 strategyId_,
    uint256 fixedSupply_,
    address recipient_
)
```

Its `strategyId()` selector is `0x492f4e18`. Vault construction proves
`StrategyPass(pass_).strategyId() == strategyId_`; a deployment manifest or database label is not
used as the authority for that relationship.

## Deployment status

All contract addresses, deployment blocks, transaction hashes, ABI/runtime hashes, and finality
evidence remain unset. No RPC, key, signing, deployment, initialization, or broadcast is included.

## Compiled local artifact evidence

The pinned compiler artifact was produced from source commit
`db620d68a635259f53f48c33defff4273237d372`. Hashes use Keccak-256. ABI hashing uses the compiled
ABI serialized as canonical JSON with sorted object keys and compact separators; bytecode hashing
uses decoded creation/runtime bytes.

| Evidence | Value |
| --- | --- |
| ABI Keccak-256 | `0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977` |
| Creation bytecode Keccak-256 | `0x377b3ad4ed5a804d202d3461c2a6dc59045762351ce74086f7870a2def71b190` |
| Runtime bytecode Keccak-256 | `0x84ba496c3b70467dda328768dc78e53820a94db9e19127b7d63f4b167f0c4908` |
| Creation byte length | `18835` |
| Runtime byte length | `11516` |

The strict M3 Vault gate `bash contracts/script/check-m3-vault.sh` recompiles the source, runs the
frozen interface and mutation tests, then validates constructor/functions/errors/events and
compares the published ABI JSON byte-for-structure with the compiler artifact.
