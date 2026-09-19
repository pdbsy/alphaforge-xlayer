# M3 Protocol Work Log

- Agent: `Macbeth02`
- Task: `M3-02-PROTOCOL`
- Branch: `macbeth02/M3-02-PROTOCOL`
- Repository base: `7ecba357d5a19f387e86f578822af04a6261fed2`
- Interface commit: `135be1e1074436e2092487099f8376cc963b714f`
- Implementation source commit C: `db620d68a635259f53f48c33defff4273237d372`
- ABI evidence commit: `ee54fe8f9d5eb469338b81629a3dd1c4fb879f18`
- Deployment status: `NOT_DEPLOYED`

The source commit was a metadata-only repair of the unpushed local object
`5270a6eb5ec5a9b061285fa2a56d2ef98de500d9`: tree, parent, author identity, author date, and source
bytes are unchanged; only the required `Agent-ID` and `Task-ID` trailers were added. Macbeth01
will publish the original object at tag `evidence/macbeth02-m3-02-pre-trailer-5270a6e` so both
objects remain independently inspectable.

## Delivered contract boundary

The source commit implements the immutable-owner Vault, exact 6-to-18-decimal capacity conversion,
real AF-USDC/Pass custody, profit-first withdrawal, tracked-position gates, loss-safe close, and
post-close fixed-recipient rescue. It adds no strategy execution method, arbitrary call, upgrade,
relayer, EIP-712 authorization, business nonce, RPC, signing, or broadcast path.

`StrategyPass` now stores one nonzero immutable Strategy ID. The Vault constructor checks the Pass
identity against its own immutable `strategyId`, so the binding is authoritative onchain. Both
AF-USDC and Pass allowances name the Vault as spender. PassLocker receives Pass directly from the
Vault's `transferFrom` and verifies exact owner receipt on unlock and release.

## Compiled ABI and bytecode

Pinned inputs: Forge `1.5.1`, solc `0.8.31`, OpenZeppelin Contracts `5.4.0`, EVM `paris`, optimizer
off, via-IR off, CBOR metadata off, bytecode metadata hash disabled.

The tracked ABI export is `contracts/deployment/abi/AlphaForgeVault.abi.json`. The M3 Vault gate
`bash contracts/script/check-m3-vault.sh` first runs the repository's immutable historical
`check-local.sh`, then requires the artifact checker to compare this export with
`.checks/af-chain01/out/AlphaForgeVault.sol/AlphaForgeVault.json` in a clean Python environment.
Hashes use Keccak-256; ABI hashes use canonical compact JSON with sorted object keys.

| Contract | ABI | Creation bytecode | Runtime bytecode |
| --- | --- | --- | --- |
| AlphaForgeVault | `0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977` | `0x377b3ad4ed5a804d202d3461c2a6dc59045762351ce74086f7870a2def71b190` | `0x84ba496c3b70467dda328768dc78e53820a94db9e19127b7d63f4b167f0c4908` |
| StrategyPass | `0xdd989644feeb7798baca69f7391ba75b6f9d09f47fb05bd90184f6072912923f` | `0x0fe405ceaf14c653995f488031f5e5efd3e9e11ecb946792ddb4f24d5d365541` | `0x1ecd66286e0c94cb5f8d98308f59f086103b5c95f2b07dc524bc5e2919b1435e` |
| PassLocker | `0x3cd4ab8da2123200b3e4b931cb94a5cc11b5662360c4ed70d6643f173ff53b21` | `0xacc5aca165af774f0292aa7249567376e434e09712983be29dcfa33b0b9d2d68` | `0x3a23133c185856bb68e825ae1ecac929de131bdcbaf2154c3c7e4e24098bc494` |

Exact constructor tuples:

```text
AlphaForgeVault(address,address,bytes32,bytes32,address,address,address,address)
StrategyPass(string,string,bytes32,uint256,address)
PassLocker(address,address,address)
```

## Verification

`bash contracts/script/check-m3-vault.sh` passed on the source tree with:

- 20 Python dependency and ABI mutation tests;
- 120 Solidity unit, fuzz, and invariant tests;
- Vault interface selector/topic/error checks;
- constructor/event/indexed-field compiler artifact checks;
- mandatory published ABI/compiler artifact equality after the compiler build;
- verified original/derived OpenZeppelin equivalence across 23 pragma-only files;
- Slither `--fail-pedantic` with no detector exclusion and zero findings.

A mutation run removed one entry from the published ABI, invoked the complete
`check-m3-vault.sh` wrapper, and observed exit `1` with the explicit compiler-artifact mismatch;
the original ABI bytes were restored before the working tree was inspected.

The Vault-specific set contains 53 cases, including 256-run fuzz tests and five invariants at
64 runs × 32 calls. Mutation evidence rejects a `uint256`→`uint128` parameter change, removed
custom error, renamed or re-indexed event, and reordered or renamed constructor argument.

Independent QA completion is not claimed here. The manager recorded the separate QA worker as
blocked by its service environment; this source remains a Draft PR for review.

## Onchain evidence

Address, deployment transaction, deployment block, confirmations/finality, initializer call,
runtime code at an address, and event receipts remain null/`NOT_RUN`. No wallet, private key,
mnemonic, RPC endpoint, signing operation, or broadcast was used.
