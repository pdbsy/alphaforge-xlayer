# XLayer R2 UI Implementation Plan

> Execute inline with the executing-plans and test-driven-development skills. No new workers.

**Goal:** Adapt the b2ed613 product UI to the explicitly selected X Layer Testnet (1952), retaining Robinhood regression behavior and all phase-one capabilities.

**Architecture:** A pure build-network selector normalizes the manager-owned XLAYER_TESTNET and existing Robinhood constants. The selected immutable network is passed through presentation, client, deployment validation, live reads, runtime sets and submission persistence. Browser input cannot override the trusted build choice.

**Spec:** XLayerPM task AF-XLAYER-R2-04-UI; base b2ed61311df8d1c97a48f623d1b4872798f5e888, tree 0c113a58f9d8d739ca9f4cae4c0b6c87794ed241.

## Constraints

- Node 24.21.0/npm 11.19.1, independent dependencies and database; local/mock tests only.
- Own apps/web/src and related tests/docs/xlayer/r2/ui. Shared package/Vite configuration remains manager-owned.
- Read only the new manager network.ts interface; do not reuse old XLayer implementation.
- Missing build selector retains Robinhood. Explicit xlayer-testnet requires exact string 1952; 195/196/46630 are rejected for that choice.
- No deployment, actual signing/broadcast, mainnet, invented deployment roles or chain evidence.

## Batch 1: Strict network selection and presentation

Files: new apps/web/src/m3-network.ts; apps/web/src/m3-product-shell.ts; test/ui-xlayer-network.test.ts; existing test/m3-product-ui.test.ts.

Interface: readM3BuildNetwork(env: Readonly<Record<string, unknown>>): M3Network. M3Network contains key, name, chainId, nativeCurrency, rpcUrl and explorerUrl. Shell inputs/page extension accept an optional networkConfig; omission preserves current Robinhood behavior.

- [x] Add tests for no selector, explicit Robinhood, exact XLayer pair, missing/mismatched/unsupported IDs; test shell name/currency/explorer and allowlisted Vault selection against the chosen network.
- [x] Capture failing focused tests before adding implementation.
- [x] Implement normalized constants using manager XLAYER_TESTNET; no window/localStorage/query-string network override.
- [x] Run new tests plus m3-product-ui and ui-kline-hover; run both registered typecheck projects. Commit and report exact SHA/results immediately.

## Batch 2: Runtime, client and journal network boundaries

Files: m3-browser-runtime.ts, m3-browser-runtime-set.ts, m3-vault-client.ts, m3-vault-live-reader.ts, m3-submission-journal.ts, strategy-adapter.ts, m3-chain-action-flow.ts and related existing tests.

Interfaces: optional networkConfig on runtime/client construction; propagate exact supported chain ID through snapshots/submissions/deployment validation. Preserve existing checks for manifest, ABI, bytecode, token bindings and stale review generations. Keep existing journal storage keys with their chain ID component.

- [ ] Add parameterized 1952/46630 success and 195/196/opposite-chain rejection cases at actual client/live-reader/runtime boundaries, including no wallet send after network change.
- [ ] Capture RED, implement the minimal parameter flow, then run affected focused tests and typecheck.
- [ ] Verify multi-Vault selection, Pass transfer, approvals, post-close rescue and persisted pending submissions remain scoped to selected chain/deployment/account.
- [ ] Commit and report immediately. Native OKB display must not rename stable afEth token/storage protocol identifiers.

## Batch 3: Build entry and native browser

Files: product-ui.ts, m3-injected-runtime-fixture.ts, vite-env.d.ts and related browser tests under test/.

- [ ] Resolve the trusted Vite build pair once at product entry; pass it to shell, runtime set and mock fixture. Preserve the local ProductAdapter.
- [ ] Parameterize the fixture provider/deployments to selected testnet and retain all real UI interactions; do not use chain labels as behavioral evidence.
- [ ] Verify the built XLayer product, wrong-chain rejection, explorer/OKB display, multi-Vault and chart interactions with mock wallet in a real local browser. No external chain requests.
- [ ] Run focused tests/typecheck at this batch, create normal commits, push only the new task branch and open a new Draft PR with explicit dependency and validation boundaries.

Permit domains: inspect the actual frontend signing surface before changing it. If no permit signing exists, preserve that fact and test chain-bound action authorization rather than introducing a new signing feature.

Batch 1 validation: 37/37 focused tests and both typecheck projects passed. Display APIs are ready; trusted build entry and real runtime propagation remain Batch 2/3 and are not yet enabled. The original baseline shell fails two new behavioral assertions; its retained result is a regression-sensitivity check, separate from the initial missing-module RED.

Batch 2a completed: API projections/runtime identity/submission input and response now bind to the selected chain; live reads assert that chain before and after canonical snapshot collection. Journal keys retain their existing format and reject foreign-chain mutations before writing. New behavioral tests failed on the baseline (1952 client/live reads and journal mutation); all 33 affected tests and both typecheck projects now pass. Runtime reader signature accepts the shared chain type; runtime construction is still Batch 2b. Public website contract received: explicit testnet build reads same-origin /api/xlayer/config and excludes local account/demo APIs; implement after network runtime integration.

Batch 2b completed: selected network reaches deployment validation, wallet connection, live reads, API client, runtime sets and the development fixture. Shared testnet adapter types preserve narrow Robinhood compatibility types. Behavioral RED showed an XLayer selection incorrectly accepting 46630; the implementation now rejects 195/196/opposite-chain wallets and invalidates confirmation after network change. All 87 runtime/flow/fixture tests and both typecheck projects pass, including selected-network finite approvals, deposit, Pass transfer, multi-Vault stale review rejection and closed rescue. Fixture parameters were moved forward from Batch 3 to validate the real runtime end to end without broadcasts.

Public UI constraints received: all visible text in English; USDT display labels with stable afUsdc protocol fields retained; production must exclude local identities, claims and synthetic funding actions. Preserve the existing warm UI and charts, with one concise illustrative-data disclosure.

Batch 2c independent review fix: all four evidence GETs now carry the trusted selected chainId. Consumed Macbeth03 dependency commits 56d8567 and cd61b91 with original authors and -x provenance (local copies 40f4011 and 7e6ff0f); integration must not duplicate those dependencies. The real client-to-Fastify/SQLite test covers equal contract addresses, equal operation IDs and a foreign-only operation. Client plus app/route tests: 22 passed; both TypeScript projects passed. Independent issue source: TempA via XLayerPM. Original missing-query regression is captured in batch2c-red.log.
