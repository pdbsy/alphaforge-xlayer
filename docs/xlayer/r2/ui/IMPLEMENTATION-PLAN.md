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

- [x] Add parameterized 1952/46630 success and 195/196/opposite-chain rejection cases at actual client/live-reader/runtime boundaries, including no wallet send after network change.
- [x] Capture RED, implement the minimal parameter flow, then run affected focused tests and typecheck.
- [x] Verify multi-Vault selection, Pass transfer, approvals, post-close rescue and persisted pending submissions remain scoped to selected chain/deployment/account.
- [x] Commit and report immediately. Native OKB display must not rename stable afEth token/storage protocol identifiers.

## Batch 3: Build entry and native browser

Files: product-ui.ts, m3-injected-runtime-fixture.ts, vite-env.d.ts and related browser tests under test/.

- [x] Resolve the trusted Vite build pair once at product entry; pass it to shell, runtime set and mock fixture. Preserve the local ProductAdapter.
- [x] Parameterize the fixture provider/deployments to selected testnet and retain all real UI interactions; do not use chain labels as behavioral evidence.
- [x] Verify the built XLayer product, wrong-chain rejection, explorer/OKB display, multi-Vault and chart interactions with mock wallet in a real local browser. No external chain requests.
- [x] Run focused tests/typecheck at this batch, create normal commits, push only the new task branch and open a new Draft PR with explicit dependency and validation boundaries.

Permit domains: inspect the actual frontend signing surface before changing it. If no permit signing exists, preserve that fact and test chain-bound action authorization rather than introducing a new signing feature.

Batch 1 validation: 37/37 focused tests and both typecheck projects passed. Display APIs are ready; trusted build entry and real runtime propagation remain Batch 2/3 and are not yet enabled. The original baseline shell fails two new behavioral assertions; its retained result is a regression-sensitivity check, separate from the initial missing-module RED.

Batch 2a completed: API projections/runtime identity/submission input and response now bind to the selected chain; live reads assert that chain before and after canonical snapshot collection. Journal keys retain their existing format and reject foreign-chain mutations before writing. New behavioral tests failed on the baseline (1952 client/live reads and journal mutation); all 33 affected tests and both typecheck projects now pass. Runtime reader signature accepts the shared chain type; runtime construction is still Batch 2b. Public website contract received: explicit testnet build reads same-origin /api/xlayer/config and excludes local account/demo APIs; implement after network runtime integration.

Batch 2b completed: selected network reaches deployment validation, wallet connection, live reads, API client, runtime sets and the development fixture. Shared testnet adapter types preserve narrow Robinhood compatibility types. Behavioral RED showed an XLayer selection incorrectly accepting 46630; the implementation now rejects 195/196/opposite-chain wallets and invalidates confirmation after network change. All 87 runtime/flow/fixture tests and both typecheck projects pass, including selected-network finite approvals, deposit, Pass transfer, multi-Vault stale review rejection and closed rescue. Fixture parameters were moved forward from Batch 3 to validate the real runtime end to end without broadcasts.

Public UI constraints received: all visible text in English; USDT display labels with stable afUsdc protocol fields retained; production must exclude local identities, claims and synthetic funding actions. Preserve the existing warm UI and charts, with one concise illustrative-data disclosure.

Batch 2c independent review fix: all four evidence GETs now carry the trusted selected chainId. Consumed Macbeth03 dependency commits 56d8567 and cd61b91 with original authors and -x provenance (local copies 40f4011 and 7e6ff0f); integration must not duplicate those dependencies. The real client-to-Fastify/SQLite test covers equal contract addresses, equal operation IDs and a foreign-only operation. Client plus app/route tests: 22 passed; both TypeScript projects passed. Independent issue source: TempA via XLayerPM. Original missing-query regression is captured in batch2c-red.log.

Batch 3a public configuration boundary: strict testnet build selection; same-origin no-store config fetch; exact top-level/deployment field allowlists; rejected foreign chain, ABI/address mismatch, duplicate Vault and inconsistent deployment status. Valid configuration creates an inert runtime without querying the wallet. Five configuration tests and both TypeScript projects pass. Public UI composition and original prototype gating are the next commit.

Batch 3b first runnable public UI: product entry validates build mode and lazily loads either public UI or the retained local adapter. Public build tree-shakes the local UI module. Extracted one shared wallet controller preserves review/confirmation and dialog staleness guards. Public config ignores window.AF deployments/runtime injections. The original prototype now uses the manager's AF_PUBLIC_MODE flag to disable both local financial ledgers before storage access and defer rendering until public composition is installed. Existing warm pages/charts remain; account uses chain evidence only. Visible amounts and candle inspection use English/USDT; stable protocol fields remain unchanged.

Validation at first build: 53 focused tests, both TypeScript projects and changed-file lint passed; build:xlayer succeeds using manager dependency 50a6fce (local copy 1ddfe75, not worker-owned). Native browser route checks passed up to a test locator ambiguity; full browser verification and subsequent fixes remain in progress. Current prototype bytes require manager provenance binding after independent review; no historical artifact assertions were changed by this worker.

Batch 3c independent P2 fix: native browser reproduced DEMO reappearing after market search. Fixed the original card/ranking value/results and methodology/compare render sources for public mode, retaining local rendering behavior. Public composition covers home and dialogs, removes the obsolete topline and empty toast, and keeps the original strategy chart above the wallet panel. Browser regression now executes search, name sort, category, compare, ranking mode/range/search and methodology dialog, plus all six routes, config failure and chart inspection. It passes in Chrome 153.0.8010.54 with only the config API requested and injected deployment authority ignored. Original full mock-wallet browser CLI also passes all 29 checks with no page/CSP errors; its retained report is .checks/M3-04-PHASE1-PRODUCT/browser-rh2OMX/result.json. Updated USDT assertions in existing browser tests; historical provenance remains manager-owned.

Batch 3d native-fetch regression and final public-wallet verification: the deployed-config browser scenario exposed an Illegal invocation before any API request because the client called native fetch with a class receiver. A focused RED test captures the receiver contract; the client now invokes fetch through a neutral closure. Client and actual Fastify integration regressions pass (20 tests). A real Chrome test now exercises the built public bundle using a same-origin mocked config/API and an injected mock wallet: 195/196/46630 rejection, 1952 connection, finite USDT and Pass approvals, a 1.000001 deposit, confirmation rejection after switching away from 1952, a one-raw-unit Pass transfer, and connecting the second configured Vault. It observes four mock sends and two chain-scoped registrations; external requests and page errors must remain empty. There is no actual wallet signing or broadcast. The separate qualified candle browser regression also passes.

Delivery status: Draft PR 8 in pdbsy/alphaforge-xlayer targets codex/xlayer-r2-base. Public source and focused/browser evidence are ready for XLayerPM independent review. Manager-owned provenance binding, complete integration gates, approval and merge remain outside this worker's completion claim. No deployment was performed.
