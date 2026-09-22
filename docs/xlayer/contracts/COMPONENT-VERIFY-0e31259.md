# X Layer combined-source contract component receipt

[XLayer][AF-XLAYER-02-CONTRACTS-VERIFY]

- Project: AlphaForge-XLayer
- Track: X Layer
- Repository: `pdbsy/alphaforge-xlayer`
- Manager: XLayerPM (AF_Xlayer task)
- Worker: Macbeth02
- Task-ID: AF-XLAYER-02-CONTRACTS-VERIFY
- Parent implementation task: AF-XLAYER-02-CONTRACTS
- Receipt publication: [own Draft PR #2](https://github.com/pdbsy/alphaforge-xlayer/pull/2)
- Requested manager ref: `codex/xlayer-bootstrap`, [PR #1](https://github.com/pdbsy/alphaforge-xlayer/pull/1)

## Executed source and result

This receipt records a new execution of the existing gate against the manager's exact combined
source, in a new independent full clone with detached HEAD:

- Executed source SHA: `0e31259c583fed08375c09018f778a4de8bc7c7d`
- Source tree: `22357dd43da276fbc5f69ee30c9a61ff364f6a50`
- Contracts tree: `63857df59e7f222d0cdcbf4b84369e7adb1a6b0c`
- Started UTC: `2026-09-22T14:35:17.803320+00:00`
- Finished UTC: `2026-09-22T14:35:23.906644+00:00`
- Working tree clean before and after; clone is not shallow; source HEAD unchanged.
- Result: **PASS_LOCAL_COMBINED_CONTRACT_COMPONENT / NOT_DEPLOYED**

```bash
bash contracts/script/check-xlayer-contracts.sh
```

The entrypoint ran from the verification clone root with a cleared caller environment. It selected
the contracts project, invoked the inherited locked gate, and checked the X Layer template.

| Gate component | Actual result at the executed source |
| --- | --- |
| Archive and installed tool/dependency verification | PASS |
| Python dependency/ABI/template mutation tests | 28 passed |
| Offline compilation and dependency-bytecode equivalence | PASS |
| Solidity suites, including fuzz/invariants | 127 passed, 0 failed, 0 skipped across 16 suites |
| Frozen AlphaForgeVault ABI | PASS |
| Strict Slither | Success, 0 detectors |
| X Layer unconfigured template | PASS, 1952/local/mock/NOT_DEPLOYED |
| Overall gate exit code | 0 |

The 127 tests include the six X Layer domain/custody cases. This is newly executed component
evidence at the SHA above, separate from the prior worker-source run at `0c713e0`.

## Locked tools and inputs

Platform: Darwin arm64, macOS 26.6.2; CPython 3.12.9. Actual gate reports Forge
`1.5.1-v1.5.1` / `b0a9dd9ceda36f63e2326ce530c10e6916f4b8a2`, solc
`0.8.31+commit.fd3a2265.Darwin.appleclang`, and Slither `0.11.3`.

The effective Forge config was read and verified before execution: local locked solc path,
`offline=true`, `auto_detect_solc=false`, `evm_version=paris`, optimizer/viaIR/FFI disabled,
filesystem permissions empty. Existing fuzz 256 / seed 0x04 and invariant 64 / depth 32 settings
remain in the exact contracts tree.

| Tracked input | SHA-256 |
| --- | --- |
| `contracts/toolchain.lock.json` | `8d197848d3e0330f8911543564b038273b833e83c683708eaaab68803432d338` |
| `contracts/requirements-slither.lock` | `955418d72e668fcb5cc25766044ef541d9265c2a6ad5cc04b5d59aef5b72522f` |
| `contracts/foundry.toml` | `2efc19c44431dce6c055eadcca39ad09b2fb5047abd172174989106b7b830573` |
| `contracts/openzeppelin-pragma-pins.json` | `c9660d909a8c9fd170a8cb0bb0da939615e47c623ac33a5a855a60b64a70d5b1` |

Installation archives were independently copied from this worker's X Layer download directory,
reverified against the requested source's lock and extracted into the verification clone. A separate
copy of the download cache supported a fresh venv installation with exact wheel hashes. No installed
venv, dependency directory, writable cache, node_modules or SQLite data is shared with the worker
checkout or Robinhood. Tool installation used only the existing approved package sources/versions;
the contract gate itself was offline. No root npm installation was required for this contract run.

An early checkout attempt occurred while the full clone was still running and returned
`fatal: unable to read tree (0e31259c583fed08375c09018f778a4de8bc7c7d)`; dependent inspection
also found no HEAD yet. After clone completion, the exact checkout and source verification succeeded.
That setup failure is retained in the task tool transcript and is not counted as a contract result.

## Template boundary rechecked

Template SHA-256: `5d86baa38427669fbaa0eb44b08d505e121d26c5a5fd801f27575ebcf57e7225`.

- Target is `xlayer-testnet`, chain ID 1952, native currency OKB.
- Eight contract entries retain null addresses, constructor values, creation/runtime/ABI hashes.
- Deployment block, transaction hash, event topics and all source/manifest/snapshot evidence refs
  remain null. Deployment status remains NOT_DEPLOYED.
- Mode is local, adapter is mock, and real-fund/signing/broadcast flags are false.
- RPC identity and live VM compatibility remain NOT_RUN.
- Finality remains UNKNOWN; soft-ready 3 / recovery 128 remain inherited, unverified defaults.
- Intent preview remains DIGEST_ONLY_NOT_AUTHORIZATION; hash separation is not signature
  validation, nonce enforcement or end-to-end transaction replay rejection.

No RPC, wallet operation, signature, broadcast, deployment, mainnet operation or merge occurred.

## Evidence index

| Published artifact | SHA-256 |
| --- | --- |
| `evidence/component-0e31259/bootstrap.log` | `50b37011def1c863cf63a1455c0937ee6b9f232f095312468fb1ebfe6f0a79e8` |
| `evidence/component-0e31259/contract-gate.log` | `ad19d6d5569343941d9a877c059fa49c0bf8133a969eadbe0c35ea2b38687dce` |
| `evidence/component-0e31259/summary.log` | `50057444f786a87b24dc94be6eee7dd0d61aefa6c1925efb6e35156287b404e8` |
| `evidence/component-0e31259/slither.log` | `6075497f3ba5e1b4cbd5302241e78e7ad61e5b81e371a86ed2bdeff356557046` |

Raw gate SHA-256: `af1a008df6308221ca2decea26c91268a50f715c1c1879de6c017af0ab3731b8`.
Raw bootstrap SHA-256: `2cc02dec9adc6f3783198e75edc40da97bcaf5d698e568844e71f31b88c6e90d`.
Original logs remain under the verification clone's `.checks/xlayer02-verify/`; public text copies
redact the verification-root path and normalize trailing whitespace, with both digests disclosed.
The execution summary and Slither JSON are stored byte-for-byte as `.log` artifacts. An empty
Slither JSON alone does not bind an execution; use it with the source-bound gate transcript.

## Future candidate comparison and scope

At verification time, `git diff --exit-code 000063f5b6bc257d63bc3426ee5ec20423aa475c
0e31259c583fed08375c09018f778a4de8bc7c7d -- contracts` returned 0; both have the contracts tree
listed above. Manager commits were never merged or cherry-picked into the own worker branch:
only this receipt and its evidence artifacts are published there.

For a later final candidate, record its complete SHA and `git rev-parse <candidate>:contracts`,
then compare with this executed source using `git diff --exit-code <executed-source> <candidate>
-- contracts`. If the tree is identical, this receipt can support unchanged contract-component
inputs, explicitly as evidence executed at **0e31259**, not as a run at the new candidate SHA.
Review any outer invocation/tool environment changes separately. A changed contracts tree requires
assessment of the delta and appropriate new validation, not automatic evidence inheritance.

This is **not the final all-task C acceptance**. UI race fixes, identity-gate integration, backend/
browser acceptance and hosted CI have separate owners and evidence. No independent approval, fresh
coverage, live VM or finality result is supplied by this receipt. Historical management collector
NOT_RUN states are not converted to PASS. Robinhood task ownership, checkout and evidence stay
independent and unchanged.
