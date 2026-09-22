# X Layer Local Contract Compatibility Plan

> **For agentic workers:** Use `executing-plans` inline. No additional worker is assigned.

**Goal:** Deliver an additive, offline X Layer Testnet contract compatibility candidate with
unconfigured deployment metadata and explicit chain/domain separation evidence.

**Architecture:** Preserve all production Solidity and reviewed pins. A strict template validator
compares the new X Layer template against the inherited unconfigured M3 schema and exact X Layer
metadata. New Forge tests exercise the real EIP-712 preview and custody contracts in the local VM.

**Tech Stack:** CPython 3.12.9; Forge 1.5.1; solc 0.8.31; OpenZeppelin 5.4.0; Slither 0.11.3.

**Spec:** PR #1 `docs/xlayer/MIGRATION.md` and `ASSIGNMENTS.md` at `5896ff45510b214d45a3469f9536a8434e2493d3`.

## Global constraints

- Base `18f5352070910a867b9729b031aa2e3951785e01`; new repository only; preserve original work.
- Local/mock; target 1952/OKB; no RPC, keys, signing, broadcast, deployment, mainnet or merge.
- No new dependencies or tool versions; no shared writable node_modules, venv or SQLite.
- Own only contracts and this report directory; historical evidence is not X Layer acceptance.

## Task 1: Isolated tools and baseline

- [x] Read public assignment, preserve clean upstream checkpoint, clone fully and branch from master.
- [ ] Publish this actual startup receipt in an own Draft PR with Agent-ID/Task-ID trailers.
- [ ] Verify copies of locked download archives by SHA/SRI, install them into the new task directory
  using the existing bootstrap, and create a fresh Slither venv (never copy an installed venv).
- [ ] Run `bash contracts/script/check-m3-vault.sh` once as the new-clone baseline, retaining output.

## Task 2: Unconfigured template boundary

Files: new `contracts/deployment/m3-xlayer-testnet.template.json`,
`contracts/script/check_xlayer_template.py`, `contracts/script/tests/test_xlayer_template.py`.

Interface: `validate_template(value)` raises `ValueError` on a mismatch and returns `None` on a
valid unconfigured template. The CLI accepts no arguments and validates the committed template.

- [ ] Add failing mutations for wrong chains (46630/195/196), deployed status/addresses,
  constructor values, code/receipt/evidence claims, changed tool pins, decimals, finality, URLs,
  unexpected fields, and boolean/number type confusion. Valid input is the committed JSON fixture.
- [ ] Derive the new template from the inherited Robinhood schema: chain 1952, X Layer Testnet,
  repository pdbsy/alphaforge-xlayer, OKB; reviewed RPC/explorer metadata, all deployment data null,
  explicit local/mock and unverified finality/VM assumptions. Do not modify the historical template.
- [ ] Implement strict recursive type/value comparison against the reviewed unconfigured schema
  with fixed sanitized diagnostics; test failures must never echo user-supplied values.
- [ ] Run `python -m unittest discover -s contracts/script/tests -p test_xlayer_template.py -v`;
  run the no-argument validator; preserve red and green outputs.

## Task 3: Local chain/domain compatibility

Files: new `contracts/test/XLayerCompatibility.t.sol` and `contracts/script/check-xlayer-contracts.sh`.

Interfaces: use existing `VaultIntentPreview.preview(Intent)` and direct immutable-owner
`AlphaForgeVault.deposit/withdraw/close`; no new production interface.

- [ ] Compare identical intent/verifier at chain 46630 versus 1952 using vm.chainId, verify the
  cached EIP-712 separator rebuilds, test roundtrip determinism and distinct verifier addresses.
- [ ] Compare 1952 against 195/196 domains without treating a digest preview as chain authorization.
- [ ] Exercise 1952 local custody: AF-USDC 6 decimals, Pass 18 decimals, exact finite allowance,
  deposit 2e6 -> lock 2e18, withdraw 1e6 -> lock 1e18, close -> release remainder. Prove non-owner
  calls cannot change principal. Simulated balances stay local; no signatures are generated.
- [ ] Add a no-argument shell gate that selects contracts cwd, calls inherited check-m3-vault.sh,
  then runs the new template CLI with a cleared environment.
- [ ] Run the full locked gate once for the new source, including Python, Solidity fuzz/invariant,
  ABI and Slither; preserve raw logs and state actual counts, not inherited counts.

## Task 4: Evidence and handoff

Files: new `docs/xlayer/contracts/COMPATIBILITY.md`, public evidence transcripts, this plan/receipt.

- [ ] Record exact source SHA, tool/pin checks, test counts, source equality and raw log hashes.
- [ ] Document EIP-712 preview-only limits, direct-owner chain isolation assumptions, compiler
  target versus untested live X Layer VM, and inherited 3/128 indexing values as unverified.
- [ ] Run scope/diff/metadata checks; preserve original authors, commit and push only this branch;
  update the own Draft PR with exact results and remaining dependencies. Do not merge.
