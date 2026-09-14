> Migration note: original AF-CHAIN01 local-only foundation. Target ADR 0001, planning/security-boundary.json and DEVELOPMENT-TOOLCHAIN-STATUS.md take precedence. Historical verification is not current target acceptance; ENV-06 remains NOT_RUN.

# AlphaForge local contract foundation

AF-CHAIN01 / Macbeth04 · `TEST_ONLY` · **Testnet Writes = CLOSED**

This is a deterministic local toolchain and EIP-712 digest preview, not a Vault implementation. There is no asset handling, signature generation/verification, signer, RPC configuration, transaction submission, or network deployment script. Forge creates test instances only inside its in-memory EVM.

## Install and run

Supported reproducible environment for this lock: **macOS arm64, CPython 3.12** (tested host 3.12.9). Other platforms require their own reviewed binary/wheel hashes; do not bypass a hash or platform failure.

From `contracts/`:

```sh
python3.12 script/bootstrap.py
export PATH="$PWD/../.checks/af-chain01/toolchain/bin:$PWD/../.checks/af-chain01/toolchain/slither-venv/bin:$PATH"
forge build
forge test
forge fmt --check
bash script/check-local.sh
```

Bootstrap downloads only the fixed tool/dependency artifacts and installs into ignored project-local directories. It does not run remote installer scripts or modify root Node dependencies. A failed/incomplete download cannot be installed; a bad existing archive fails visibly and must be investigated. Re-running a verified archive installation is supported. Network is needed only to obtain build tools/dependencies, not for compilation/tests. `foundry.toml` points directly to the local compiler with auto-detection disabled and offline enabled.

`check-local.sh` validates archives/tool versions and the complete installed Slither dependency versions, then runs formatting, build, tests, and Slither with a clean child environment. Slither reports go to `../.checks/af-chain01/evidence/slither.json`; any finding produces a nonzero result for review. It does not offer RPC, broadcast, private-key, custom target, or other passthrough arguments. This is a constrained project check entry point, not a sandbox for arbitrary tools or code supplied by someone else.

## Project map

- `src/VaultIntentPreview.sol`: only `preview(Intent)` plus OpenZeppelin's EIP-712 domain inspection. Digest calculation does not validate or authorize an intent.
- `src/StrategyPass.sol`: M3 fixed-supply, freely transferable 18-decimal ERC-20 for one strategy. Its constructor is the only mint path; it has no admin, freeze, blacklist, transfer gate, proxy or upgrade path. It is locally validated and not deployed.
- `src/AlphaForgeTestAsset.sol`: TESTNET_ONLY fixed-supply ERC-20 primitive with constructor-fixed decimals for AF-USDC (6), AF-ETH (18) and AF-BTC (18). It has no owner, post-deployment mint, freeze or blacklist path.
- `src/PassLocker.sol`: escrow for one Strategy Pass with an immutable Vault/controller, per-owner lock accounting, real ERC-20 movement, full release and reentrancy protection. Direct token transfers do not create lock accounting.
- `src/AlphaForgeTestVenue.sol`, `src/interfaces/ITestVenue.sol`: TESTNET_ONLY no-fee constant-product venue for only AF-USDC/AF-ETH and AF-USDC/AF-BTC. It has pair-specific finite reserves, real ERC-20 settlement, slippage/deadline checks, no liquidity withdrawal privilege and no arbitrary target or calldata path.
- `src/AlphaForgeSwapAdapter.sol`, `src/ProtocolTypes.sol`, `src/interfaces/ISwapAdapter.sol`: fixed typed SwapAction path to one immutable Venue. It validates the pair and exact input/output deltas, grants only the current `amountIn`, resets the Venue allowance to zero, returns output to the calling Vault, and exposes no arbitrary execution entry point.
- `test/VaultIntentPreview.t.sol`: field and domain binding checks in the local EVM, plus an independent fixed EIP-712 reference vector; no keys/signatures.
- `test/StrategyPass.t.sol`, `test/StrategyPass.invariant.t.sol`: constructor supply, fractional transfer, allowance, native-value rejection, no public mint, 256-run fuzz and 64x32 supply/accounting invariants.
- `test/AlphaForgeTestAsset.t.sol`: explicit test-asset decimals/supply, real ERC-20 movement, no public mint, zero-recipient rejection and 256-run supply-preservation fuzz coverage.
- `test/PassLocker.t.sol`: exact escrow balances, controller isolation, replay/excess rejection, unsolicited-transfer handling, 256-run accounting fuzz and a malicious-token callback attack.
- `test/AlphaForgeTestVenue.t.sol`, `test/AlphaForgeTestVenue.invariant.t.sol`: non-1:1 quotes, price impact, pair isolation, order reversal, finite liquidity, settlement, slippage/deadline/native-value rejection, 256-run quote bounds and 64x32 reserve/product invariants.
- `test/AlphaForgeSwapAdapter.t.sol`, `test/mocks/MaliciousVenue.sol`: real typed settlement plus exact allowance lifecycle, abnormal-delta rollback, Venue failure, callback reentrancy, arbitrary-selector/native-value rejection and a 256-run maximum-spend bound.
- `test/intent-vector.json`: typed data and literal digest computed independently with the locked eth-account 0.14.0 package, using local chain ID 31337 and test-only address 0x1001.
- `script/bootstrap.py`, `script/check-local.sh`: local tool setup and deterministic checks; **no deployment script**.
- `toolchain.lock.json`, `requirements-slither.lock`, [TOOLCHAIN.md](TOOLCHAIN.md): exact inputs, official sources, digests, licenses and platform limits.
- [Vault v1 specification](../docs/migration/legacy-quantpass/tree/docs/contracts/VAULT-V1-SPEC.md), [Adapter boundary](../docs/migration/legacy-quantpass/tree/docs/contracts/ADAPTER-BOUNDARY.md), [verification](../docs/migration/legacy-quantpass/tree/docs/contracts/AF-CHAIN01-VERIFICATION.md).

## Canonical boundary

The [frozen Wave 1 contract v1](https://github.com/pdbsy/quantpass/blob/73230c43e464cd1b579fa16a6425756291ef9e8e/docs/management/wave1/WAVE1-INTERFACE-CONTRACT.md) controls public JSON names/types. Keep string `ownerId -> strategyId -> vaultId`, MoneyString/SignedMoneyString, `TEST_ONLY_USDT_UNIT` with six decimals, and the existing statuses. The ABI preview hashes strings using EIP-712's UTF-8 string hashing; it does not map them to addresses, registry IDs, or custody ownership.

`Intent.commandId` represents `Command.id`; `commandType` represents `Command.type`. ABI `amount` and `expectedRevision` are uint256 representations for local hash tests, not changes to JSON's MoneyString and safe-integer Revision. nonce/deadline/authorizationEpoch/policyHash are preview protocol fields, not new Wave 1 DTO properties. Asset ID/decimals are hash inputs; the preview does not approve assets or validate identifiers, commands, balances, deadlines, signatures, or replay state. No component should sign or execute its outputs.

Compilation targets **Paris** as a conservative deterministic local EVM baseline, not as a claim about Robinhood's current hardfork or contract compatibility. Robinhood Chain Testnet / 46630 remains target metadata only. Full Vault custody, EOA/ERC-1271 validation, grant revocation, nonce consumption, owner exit, adapter execution and chain finality are unimplemented and require separate review/frozen decisions.

## PR 11 verification extension

The preview remains TEST_ONLY EIP-712 digest computation; it is not an authorization, custody or execution contract and is not audited. Tests now include malformed ABI, integer endpoints, independent vector, current chain/address domain binding, 13 fuzz properties (256 runs each) and a dedicated invariant handler (64 runs × 32 depth = 2048 calls, zero reverts).

Historical closeout at 0a765d0: Slither 0.11.3 was installed from the existing 47-package hash lock and actually executed. Its JSON analysis succeeds but the unmodified `--fail-pedantic` gate exits 255 with one Informational `pragma` result: application exact 0.8.31 and upstream >=0.4.16 / ^0.8.20 ranges coexist under the locked compiler. This is FAIL, not NOT_RUN or PASS. No detector or upstream integrity check was disabled. The strict gate was unresolved and PR 11 remained Draft at that checkpoint. No deployments, signatures, broadcasts or funds. The management registry's portable ENV-06 checks remain NOT_RUN; the separate macOS local execution evidence must not overwrite those historical entries.

## Current strict-gate remediation

The locked OpenZeppelin 5.4.0 archive and original installation remain byte-identical to upstream. `openzeppelin-pragma-pins.json` records twenty-one exact before/after file hashes for the EIP-712, ERC-20, SafeERC20 and ReentrancyGuard dependency closure. `script/pinned_dependency.py` derives `node_modules/@alphaforge/openzeppelin-pinned` by narrowing only those pragma lines to `0.8.31`, preserving all other source bytes and the upstream license. Foundry remaps the original import namespace to this explicit subset for both compilation and analysis. Existing derived drift, extra files or symlinks are rejected rather than overwritten.

The same check entry point verifies the upstream artifacts, derives/verifies the subset, compares original/derived ABI and creation/runtime bytecode under locked solc, runs twelve Python regression tests, and compares every project contract's actual Forge artifact to the same compilation before executing all Solidity tests and the unchanged strict Slither command. Slither now actually exits 0 with zero reported findings; the historical exit 255 is retained. This local subset is an AlphaForge derivation, not an unchanged upstream package or independently approved fork. Final-head evidence and external review are still required. No deployment or broadcast.

The currently implemented local interface boundary is recorded in [M3-CURRENT-ABI-DRAFT.md](../docs/protocol/M3-CURRENT-ABI-DRAFT.md). It is explicitly not the final Vault ABI or a deployment manifest.
