# XLayer pre-release contract preparation

This entry rehearses the five-contract sequence in Forge's isolated in-memory EVM at chain ID 1952. It makes no RPC calls, reads no keystore, creates no broadcast transactions and rejects every CLI option except `--output`. Broadcast-capable deployment remains outside this delivery and awaits authorization.

Use the reviewed source commit in a clean independent checkout with the pinned Forge 1.5.1, solc 0.8.31 and OpenZeppelin 5.4.0 installed through the existing contract toolchain workflow. Keep `contracts/foundry.toml` unchanged: Paris, offline compiler, FFI disabled, empty filesystem permissions. Activate Node 24.21.0/npm 11.19.1. Do not introduce local Foundry overrides or RPC settings into the checkout.

## Explicit operator inputs

Provide the following environment values. There are no default addresses, identities or supplies. Use a private parameter file outside the repository with Node's `--env-file` option; it must contain public constructor parameters only, never keys, seed phrases or keystore passwords.

| Variable | Required value |
| --- | --- |
| `AF_XLAYER_DEPLOYER` | Nonzero address to impersonate inside the simulation; no authority is inferred from it |
| `AF_XLAYER_OWNER` | Explicit nonzero immutable Vault owner |
| `AF_XLAYER_CREATOR` | Explicit nonzero strategy creator |
| `AF_XLAYER_STRATEGY_ID` | Nonzero 32-byte hexadecimal strategy ID |
| `AF_XLAYER_STRATEGY_REF` | Nonzero 32-byte hexadecimal version reference |
| `AF_XLAYER_PASS_NAME` | Printable English/ASCII name, 1–64 bytes, no surrounding whitespace |
| `AF_XLAYER_PASS_SYMBOL` | Printable ASCII symbol, 1–16 bytes, no surrounding whitespace |
| `AF_XLAYER_PASS_SUPPLY` | Positive decimal integer in 18-decimal raw units, below 2^256 |
| `AF_XLAYER_PASS_RECIPIENT` | Explicit nonzero initial Pass recipient |
| `AF_XLAYER_USDT_SUPPLY` | Positive decimal integer in 6-decimal raw units, below 2^256 |
| `AF_XLAYER_USDT_RECIPIENT` | Explicit nonzero initial USDT test-asset recipient |
| `AF_XLAYER_ETH_SUPPLY`, `AF_XLAYER_BTC_SUPPLY` | Positive decimal integers in 18-decimal raw units, below 2^256 |
| `AF_XLAYER_ETH_RECIPIENT`, `AF_XLAYER_BTC_RECIPIENT` | Explicit nonzero asset recipients |

USDT is the symbol of `AlphaForgeTestUSDT`, a fixed-supply test asset, not issuer-backed USDT. The existing `afUsdc` role and six-decimal accounting remain stable. AF-ETH and AF-BTC are distinct test assets; native XLayer currency is not renamed by them.

## Run the offline preparation

From the repository root, set `OPERATOR_PARAMETERS` to the reviewed public-parameter file and `SIMULATION_RECORD` to a new output JSON path with an existing parent directory:

```sh
node --env-file="$OPERATOR_PARAMETERS" tools/prepare-xlayer-deployment.mjs --output "$SIMULATION_RECORD"
```

The wrapper forwards only validated constructor variables to the pinned local Forge binary. It supplies the repository configuration and chain 1952 explicitly. Ambient wallet/RPC variables and arbitrary Foundry overrides are excluded. Existing output files are never overwritten. Failure prints a fixed error rather than raw input or tool output.

The Solidity script validates all identities and supplies before creating USDT, AF-ETH, AF-BTC, StrategyPass and Vault. It uses local VM impersonation, not broadcast cheatcodes. It reads the internally created Locker from `vault.passLocker()`. Venue and SwapAdapter are excluded.

## Interpret the record

The exported JSON remains `NOT_DEPLOYED`, `PRE_RELEASE`, `executionMode: SIMULATION_ONLY` and `addressScope: LOCAL_SIMULATION_ONLY`. Its six addresses are local simulation results. It preserves exact constructor values as strings and the stable Vault input names. Block numbers, transaction hashes, creation/runtime hashes and source/evidence refs remain null.

This populated simulation record is intentionally rejected by the strict empty preparation-template validator. It is also **not** a frontend/backend deployed configuration. Never copy simulated addresses into a deployed record or promote compiler runtime templates into deployed code hashes.

A later separately authorized deployment must independently establish network 1952, successful receipts, canonical block identities, actual addresses, immutable/token readback, Vault-created Locker identity and hashes of actual deployed runtime bytes. Only then may the manager's deployed-record validator/converter produce frontend/backend configuration. Ambiguous transactions must be reconciled by identity, never automatically retried. This entry provides no broadcast or resume option.

## Local checks

```sh
node --test test/xlayer-deployment-template.test.mjs test/xlayer-deployment-command.test.mjs
node --test test/xlayer-simulation-native.qualified.test.mjs
cd contracts
../.checks/af-chain01/toolchain/bin/forge test --offline
```

The native qualification requires the pinned local toolchain and runs the real script, validates its record and confirms overwrite refusal. Root test registration remains manager-owned; no npm or CI task is added here. No command above signs or broadcasts.
