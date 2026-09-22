# AlphaForge X Layer migration specification

Date: 2026-09-22. Manager: XLayerPM (this task), with the same planning, assignment, integration and evidence responsibilities as Macbeth01. This is a separate manager identity, not an ACK or statement on behalf of Macbeth01.

## User assignment

The user explicitly requested a new public GitHub repository, migration of AlphaForge to X Layer, immediate adaptation work, and authorized this manager to assign Macbeth02 through Macbeth06. This supersedes older no-new-task/Robinhood-only repository defaults only within the new X Layer work. Existing upstream tasks and author history remain intact.

Canonical repository: `pdbsy/alphaforge-xlayer`; default branch: `master`; public source: `pdbsy/quantpass-arbitrum-hackathon`; fixed imported master: `18f5352070910a867b9729b031aa2e3951785e01`.

## Scope and boundaries

1. Reuse the latest merged M3 implementation, not the older AF-MIGRATION checkout. Preserve full history, source branch refs and tags. Keep the upstream remote read-only.
2. First deliverable: explicit X Layer Testnet metadata and local/mock configuration validation; repository and task setup; independently assigned contract, adapter, UI, QA and CI migration work.
3. Testnet identity is key `xlayer-testnet`, chain ID `1952`, native currency `OKB`, primary RPC `https://testrpc.xlayer.tech/terigon`, alternate RPC `https://xlayertestrpc.okx.com/terigon`, explorer `https://www.okx.com/web3/explorer/xlayer-test`. Mainnet 196 and historical testnet 195 are rejected in this milestone.
4. No live RPC probe is required for offline checks. Public metadata alone is not proof of RPC identity or availability. Future read-only integration must verify eth_chainId.
5. Local/mock, no signing, broadcasting, deployment, mainnet, credentials or real funds. The existing write boundaries remain closed. Network metadata does not unlock transactions.
6. Preserve money strings, six-decimal TEST_ONLY units, protocol/storage identifiers, source authors, UI design and existing security requirements. Do not relabel simulated assets as real USDT/USDC. No automatic bridge/cross-chain balance sharing.
7. Keep Node 24.21.0 / npm 11.19.1 and all reviewed dependency/tool pins. No new npm dependency is needed for the foundation.
8. Retain existing checks and source C -> manifest R -> snapshot S semantics. Old reports remain historical. Record new checks against actual X Layer source SHA. Self-review and worker receipts are not independent approval.
9. No merge or ruleset bypass is authorized. Work on task branches and Draft PRs. Public repository creation and publication of the requested source/task branches are authorized.

## Foundation interface

`packages/xlayer-chain/src/network.ts` exports frozen `XLAYER_TESTNET`, `readXLayerChainConfig(env)` and `readXLayerLocalConfig(env)`. The network constant has `key`, `name`, `chainId`, `nativeCurrency`, `rpcUrl`, `explorerUrl`, mirroring the existing Robinhood shape. `readXLayerChainConfig` returns frozen `{network, rpcUrl, explorerUrl}`; `readXLayerLocalConfig` first enforces existing `readConfig` and returns frozen `{...localConfig, ...chainConfig}`. Values remain literal 1952 for downstream typing.

The reader requires explicit QP_CHAIN/QP_CHAIN_ID, exact reviewed HTTPS RPC/explorer URLs, and rejects URL credentials/query/fragment or other endpoints with fixed field diagnostics that never echo the input. `config/xlayer/.env.example` contains only public metadata and local/mock flags. `tools/check-xlayer-chain.ts` validates offline and prints safe network fields plus mode/adapter/realFundsEnabled. It accepts no RPC, signing or broadcast options.

## Acceptance

- Full source history exists in new public remote; imported master tree remains identical to upstream.
- Foundation tests prove valid explicit testnet config and refusal of missing/wrong chains, 195/196/46630, malformed endpoints, credential-bearing URLs, and testnet/production/non-mock modes.
- CLI passes for the checked-in X Layer fixture without network I/O, and fails with sanitized errors.
- Foundation is wired into npm test/check without replacing the Robinhood regression check. Package name/active default conversion is serialized with CI and UI migration.
- Current task intake, assignments, actual public PR links and worker acknowledgement states are recorded. No manufactured receipt or completion status.

## Sources checked 2026-09-22

- https://web3.okx.com/onchainos/dev-docs/xlayer/developer/build-on-xlayer/network-information
- https://web3.okx.com/onchainos/dev-docs/xlayer/developer/rpc-endpoints/rpc-endpoints
- https://www.okx.com/zh-hans-eu/learn/from-geth-to-reth

Official documentation describes the current EVM-compatible OP Stack network; old Polygon-CDK-era assumptions are not automatically imported. Compiler/hardfork compatibility and confirmation/recovery policy still require their own tests and evidence.
