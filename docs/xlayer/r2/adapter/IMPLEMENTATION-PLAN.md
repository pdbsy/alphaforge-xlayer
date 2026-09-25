# XLayer R2 adapter implementation plan

Goal: support an explicit trusted XLayer Testnet identity (1952) from baseline b2ed61311df8d1c97a48f623d1b4872798f5e888 while retaining Robinhood defaults and phase-one reconciliation.
Architecture: keep the existing manifest digest, runtime and per-chain store identities. Accept only the two known environment/chain pairs; caller configuration supplies the expected network before the document is validated. Add explicit chain selection to ambiguous evidence reads without changing legacy single-network requests.
Tools: Node 24.21.0, npm 11.19.1, TypeScript 6.0.3; existing locked dependencies and node:test. Execute inline, without additional workers.
Authority: AF-XLAYER-R2-03-ADAPTER delegation from XLayerPM; isolated clone and branch, no old XLayer implementation, no deploy/sign/broadcast/mainnet. Shared scripts remain manager-owned.

## Batch 1 — manifest and runtime

- [x] Add test/xlayer-adapter-runtime.test.ts. A real XLayer document with a separately pinned digest must compose only with expectedNetwork { environment: 'xlayer-testnet', chainId: 1952 }. Missing expectation retains Robinhood and rejects that document before RPC construction/storage. Wrong name/id pair and mainnet expectations must fail even when the document and digest agree. Runtime must reject a wrong RPC chain before code reads.
- [x] Run new focused tests on unchanged production and preserve RED output.
- [x] Update packages/chain-adapter/src/manifest.ts with DeploymentNetworkExpectation, two validated pairs and unchanged document canonicalization. Add optional expectedNetwork to deployed compose input in apps/server/src/m3-chain-runtime.ts; use caller expectation or fixed Robinhood default, never manifest fields.
- [x] Run new and existing manifest/runtime/startup/API tests plus npm run typecheck; correct defects in this batch, commit with task identity and report exact SHA.

## Batch 2 — API isolation and phase-one behavior

- [x] Add real runtime/store/Fastify tests with identical addresses and operation ids on 1952 and 46630. Explicit chainId query must select the requested chain for status, Vault, Pass and operation evidence. Unknown/invalid chain must reject; no selector must fail closed if ambiguous; single-chain legacy queries remain valid.
- [x] Run RED tests, then narrow chain-routes.ts lookup/schema changes; preserve submission chain+target matching and stale projection refusal.
- [x] Exercise XLayer shared Pass owner selection, one-wei transfer and rescue, multi-Vault storage and reconciliation; reuse real existing integration behavior with offline RPC doubles only at the network boundary. Add restore/backup checks with real SQLite fixtures if existing coverage is chain-specific.
- [x] Verify focused tests and typecheck immediately; commit and report exact SHA. Document any manager-owned catalog/config/recovery integration dependencies before claiming end-to-end readiness.

## Delivery

- [ ] Review diff for trusted identity, cross-chain reads, resource closure and retained phase-one behavior. Run changed-file lint/format and only relevant regression suites.
- [ ] Publish authorized new branch/Draft PR to pdbsy/alphaforge-xlayer; retain inherited history/authors. Record local mock results separately from testnet evidence (NOT_RUN).
