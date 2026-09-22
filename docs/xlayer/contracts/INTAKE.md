# Macbeth02 X Layer contract intake

- Agent: Macbeth02
- Task: AF-XLAYER-02-CONTRACTS
- Repository: `pdbsy/alphaforge-xlayer`
- Branch: `macbeth02/xlayer-contracts`
- Imported base: `18f5352070910a867b9729b031aa2e3951785e01`
- Base tree: `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba`
- Authority: [X Layer intake PR #1](https://github.com/pdbsy/alphaforge-xlayer/pull/1),
  `docs/xlayer/MIGRATION.md` and `ASSIGNMENTS.md` read at
  `5896ff45510b214d45a3469f9536a8434e2493d3`.

## Actual startup receipt

The new independent full clone started clean at the imported master above, then created the
task branch. It has no shared writable dependencies or SQLite data. The original project remains
clean on `macbeth02/m3-phase1-contracts` at `f91391d8369a931ee58bd0844847f38d99635845`;
that committed checkpoint and a separate local Git bundle preserve its work. No original-project
remote operation is needed or authorized by this new task.

Existing approved host runtimes are Node `24.21.0`, npm `11.19.1`, CPython `3.12.9`, Git and GitHub
CLI. Contract pins remain Forge `1.5.1` / commit `b0a9dd9`, solc `0.8.31`, OpenZeppelin `5.4.0`,
Slither `0.11.3`, EVM `paris`, optimizer/viaIR disabled. Installation and new-source contract
verification are **NOT_RUN at this startup checkpoint**. Pins do not imply successful execution.

## Owned work and dependencies

Changes are limited to `contracts/` and `docs/xlayer/contracts/`: additive X Layer NOT_DEPLOYED
template, an offline template gate with mutation tests, chain/domain digest separation tests,
a local 1952 custody lifecycle and a reproducible contract entrypoint/evidence report.
Existing production Solidity, asset decimals, fixed-supply/pass capacity, storage and protocol
identifiers remain unchanged. Later unmerged upstream Phase One work is not imported.

No dependency on the manager network package is needed to test the existing Solidity in a local
VM. Runtime template consumption belongs to Macbeth03; shared package scripts and planning belong
to XLayerPM. Repository-wide inherited identity/CI bindings await Macbeth06 and are not relaxed
here. Actual X Layer VM/opcode acceptance, live RPC identity/finality, deployment, signatures,
broadcast and independent security approval remain NOT_RUN. No addresses or receipts are invented.

Target is testnet `1952 / OKB`, as confirmed in the
[official network table](https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information).
Metadata is not a network probe. Mainnet 196 and historical testnet 195 are outside scope.
