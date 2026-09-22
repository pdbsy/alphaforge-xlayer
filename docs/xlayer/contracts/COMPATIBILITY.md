# AlphaForge X Layer local contract compatibility

- Agent / task: Macbeth02 / AF-XLAYER-02-CONTRACTS
- Repository: `pdbsy/alphaforge-xlayer`
- Draft delivery: [PR #2](https://github.com/pdbsy/alphaforge-xlayer/pull/2)
- Branch: `macbeth02/xlayer-contracts`
- Imported master: `18f5352070910a867b9729b031aa2e3951785e01`
- Verified source C: `0c713e089a0ed4dc2dcd9adde9059e369523c532`
- Source tree: `a3cb250aa832c7753274e57a1cfc1026cce904f7`
- Contract tree: `63857df59e7f222d0cdcbf4b84369e7adb1a6b0c`
- Result: **PASS_LOCAL_CONTRACT_COMPATIBILITY / NOT_DEPLOYED**

## Implemented boundary

The new `contracts/deployment/m3-xlayer-testnet.template.json` carries X Layer Testnet
1952 (`0x7a0`), OKB and reviewed public endpoints. Every address, constructor value, code/ABI
deployment hash, receipt, block and evidence ref remains null. `source.commit` is deliberately
unconfigured template data; the executed source is bound above in this report instead.

`check_xlayer_template.py` accepts only the reviewed unconfigured schema. It inherits contract
entries, constructor shapes, precision, pinned tools and direct-owner authority from the unchanged
tracked Robinhood template, with explicit X Layer metadata and closed local/mock flags. It rejects
unknown fields, wrong value types, 195/196/46630, changed endpoints, credentials in URLs, non-null
deployment claims and enabled write flags. Its fixed diagnostics never echo supplied values.
It is a repository template consistency check, not a parser that authorizes an operational manifest.

`XLayerCompatibility.t.sol` adds six tests of existing production contracts:

- Identical intent and verifier produce different digests on 46630 and 1952; changing back restores
  the original digest, exercising the cached EIP-712 domain's chain-change handling.
- 1952 is distinct from 195 and 196; two verifier addresses on 1952 are also distinct.
- An independent eth-account `0.14.0` vector matches the real Solidity preview at a synthetic
  test-only verifier. `xlayer-intent-vector.json` records typed data and digest, with no signature.
- At local VM chain ID 1952, exact finite approvals fund a 2e6 AF-USDC deposit / 2e18 Pass lock,
  1e6 principal withdrawal / 1e18 unlock, and full close with all remaining assets returned.
- The deployer and strategy creator cannot withdraw or close the explicit owner's Vault.

`VaultIntentPreview` hashes input only. It does not verify signatures, consume nonces or execute
commands. The chain-domain tests therefore prove digest separation, not end-to-end transaction or
signature replay rejection. Direct Vault actions continue to rely on their immutable owner and the
selected chain's transaction rules. No bridge, shared cross-chain balance or state replication was
added. Adapter event/idempotency isolation and wallet chain guards belong to workers 03/04/05.

## Actual local verification

The source was committed and the worktree was clean before and after this exact-source run:

```bash
bash contracts/script/check-xlayer-contracts.sh
```

The wrapper resolves its own contracts directory, runs the inherited `check-m3-vault.sh` and then
checks the new template with a cleared environment. It accepts no arguments or network options.

| Check | Observed result |
| --- | --- |
| Locked archives and installed tool/dependency verification | PASS under inherited `check-local.sh` |
| Python mutation/dependency/ABI tests | 28 passed, including 8 new template tests |
| Solidity suites | 127 passed, 0 failed, 0 skipped, including 6 new X Layer cases |
| Existing fuzz and invariant suites | PASS within that 127-test run; frozen 256 fuzz runs and 64 invariant runs/depth 32 |
| Solidity format, offline build, derived dependency equivalence | PASS |
| Frozen AlphaForgeVault ABI | PASS |
| Slither 0.11.3, strict fail-on-finding mode | Success, 0 detectors |
| New JSON formatting and shell syntax | PASS |
| Independent typed-data vector recalculation | PASS, no key/signature |
| Source-stage secrets/privacy scan | PASS, 511 bounded files |

Actual host tools: CPython 3.12.9; Forge 1.5.1-v1.5.1 / commit
`b0a9dd9ceda36f63e2326ce530c10e6916f4b8a2`; solc 0.8.31+commit.fd3a2265; Slither 0.11.3;
root metadata tools use Node 24.21.0/npm 11.19.1. `paris`, optimizer off, viaIR off,
metadata disabled, offline mode and FFI/filesystem restrictions are unchanged.

Primary archive bytes were copied from this worker's existing verified download cache, rechecked
against fixed SHA/SRI and independently extracted. Slither and its exact hashed wheels were
installed in a fresh task-local venv. Root `npm ci --ignore-scripts --no-audit` installed 193 packages
into this clone. No installed dependency directory, database or venv is shared.
The no-audit installation is not a dependency vulnerability-audit result.

Before implementation, the template stub failed 23 mutation subcases across 8 tests. The original
red log is preserved. The first development gate then passed; the later clean-source gate above is
the acceptance evidence. A separate pristine pre-change full baseline was not executed: the first
candidate gate included all unchanged inherited tests alongside the additions. Historical source
counts (including later unmerged Phase One 134-test evidence) are not imported into these results.

## Evidence index

| Public artifact | SHA-256 |
| --- | --- |
| `evidence/template-red.log` | `29e7e9e7253f84965408d0d779e8cd476f7c28b7d918a4c592c0e4b6c44c63de` |
| `evidence/contract-gate.log` | `7fa9765fcf6816a762e5ea91b1f0a1bfcfbc4ec72689660a133804532c722a4f` |
| `evidence/slither.log` | `6075497f3ba5e1b4cbd5302241e78e7ad61e5b81e371a86ed2bdeff356557046` |

The exact-source gate's original raw SHA-256 is
`204facb98342bf03b6998170521a339d982e16aa5b6f5b30635f6d3e7fc50731`.
Public transcripts disclose the original raw paths/hashes and only normalize task-root paths and
trailing whitespace. Local raw files are retained unchanged. The empty Slither JSON result is stored as a raw `.log` transcript
byte-for-byte; its content hash alone does not identify an execution, so use the source-bound gate
transcript with it. These are task-local engineering records, not generated management PASS files.
No shared source C / manifest R / snapshot S evidence is rewritten.

## Source preservation

The production `contracts/src` tree is `393258e9829a76dc2695442c8da8de3e350e0144`, identical to
the imported master. Existing Solidity tests, compiler/dependency locks, pragma derivation manifest,
published Vault ABI and Robinhood template are unchanged. The source commit adds exactly six files
under contracts; later evidence/report commits do not change the contract tree. Pass transfer,
fixed supply, 18/6 capacity conversion, owner custody and all protocol/storage identifiers retain
their existing meanings. The synthetic `TEST_ONLY_USDT_UNIT` identifier is retained as a compatibility
identifier and is not a claim about real USDT; AF-USDC/AF-ETH/AF-BTC remain test assets.

The original project's clean `f91391d` branch and complete-history backup bundle are retained. No
unmerged Phase One source was cherry-picked. No manager or other worker's private checkout was used.

## Remaining acceptance limits and integration

- **Live X Layer VM/opcode compatibility: NOT_RUN.** The existing Paris-target bytecode compiled
  and executed in the pinned local Forge VM. Chain ID substitution is not a live X Layer node or a
  guarantee about its current fork schedule, opcode support, gas policy or precompiles.
- **RPC identity/availability and finality: NOT_RUN.** No RPC call was made. The inherited
  soft-ready 3 / reorg-search 128 values remain unverified indexing defaults; finality is UNKNOWN.
- **Deployment/signing/broadcast: NOT_RUN / NOT_DEPLOYED.** Test fixture addresses are confined
  to local VM tests; they are not deployment addresses. No deployment or broadcast script is added.
- **Fresh coverage measurement, full JS/browser acceptance, hosted CI and independent review:
  NOT_RUN by this worker.** No previous 100% coverage figure is relabelled as X Layer acceptance.
- Manager integration and Macbeth06's repository/identity migration remain separate prerequisites.
  The inherited four management-collector contract entries remain NOT_RUN; this separate gate does
  not manufacture collector PASS. No merge or protection-rule changes are authorized.

Manager integration may register `bash contracts/script/check-xlayer-contracts.sh` only on a runner
with the existing approved Darwin arm64 contract toolchain and its verified artifacts. This worker
does not edit root scripts, shared planning, packages/xlayer-chain or CI. Worker 03 should use the new
template as an unconfigured input specification, never as readiness or runtime trust evidence.

## Official metadata consulted

Checked 2026-09-22: the
[X Layer network information](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information)
and [RPC endpoint table](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/rpc-endpoints/rpc-endpoints)
confirm testnet 1952, OKB and the listed endpoints. Those documents supply metadata only; local
execution, deployment and finality claims require their separate evidence.
