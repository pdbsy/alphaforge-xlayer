# AF-XLAYER-04-UI implementation

Agent: Macbeth04. Manager: XLayerPM. Assignment: public PR #1 and its frozen migration specification, read at 5896ff45510b214d45a3469f9536a8434e2493d3.

## Intake and boundaries

- Repository: pdbsy/alphaforge-xlayer. Independent full-history clone, task branch macbeth04/xlayer-ui.
- Source base: 18f5352070910a867b9729b031aa2e3951785e01; tree a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba. Clean at intake. Separate locked dependencies and no shared database.
- Verified tools: Node 24.21.0, npm 11.19.1, Git 2.50.1, fnm 1.39.0.
- Original AlphaForge task remains clean at bf54f914f02c09bbce22d19f8f57d5c20f3083c1 on macbeth04/m3-phase1-product-race.
- Owned files: apps/web/src, targeted UI tests, docs/xlayer/ui. Root scripts, foundation package, adapter/server, CI, and shared plans remain with their assigned owners.
- Preserve the warm product design, Robinhood default/regression path, six-decimal TEST_ONLY accounting, storage/protocol identifiers, and original history.
- X Layer is explicitly selected by trusted application configuration: environment xlayer-testnet / chainId 1952. No manifest, URL query, provider response, or arbitrary browser metadata may choose a trusted network. Metadata comes from the manager's foundation exports, not a second production table.
- This stage is local/mock and NOT_DEPLOYED. X Layer wallet connection/observation may run only in response to explicit interaction; no signing, broadcast, chain switching, deployment, mainnet or fabricated address/readiness.

## Execution plan

1. Add deferred-provider regression tests for connect/observe interrupted by account, chain, or disconnect events, including away-and-back changes. Observe RED, fix the real wallet boundary, and verify listener cleanup and provider errors.
2. Consume the published foundation network API after the manager supplies a compatible integration base. Add explicit trusted network selection and presentation metadata. Keep default Robinhood behavior, refuse unsupported/mismatched pairs and deployment/chain mismatch, and keep X Layer writes closed.
3. Add shell/runtime tests for X Layer name, 1952, OKB, correct explorer links, wrong-chain rejection (195/196/46630), NOT_DEPLOYED actions, and stale asynchronous session results. Labels for inherited readiness thresholds are assumptions, not verified X Layer finality.
4. Run targeted tests, typecheck, lint/format, UI build and bounded secrets/privacy scans. Record actual results and exact source SHA. Broader repository/CI gates retain failures and dependencies explicitly. Publish the implementation and formal ACK in the worker Draft PR; report to XLayerPM.

## Dependencies and verification status

- Foundation import/integration: pending published SHA and manager integration instructions. Do not cherry-pick manager history onto the worker branch.
- Real X Layer deployment/adapter path: outside this first wave; NOT_DEPLOYED, writes disabled.
- New repository gate bindings: Macbeth06 owns migration. Historical PASS evidence is not current verification.
- Implementation checks: NOT_RUN at intake. Self-checks are engineering evidence, not independent approval.
