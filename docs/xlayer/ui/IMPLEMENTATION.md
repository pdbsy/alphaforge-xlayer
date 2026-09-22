# AF-XLAYER-04-UI implementation

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM (AF_Xlayer task).

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

## Execution receipt

Implementation and qualified local validation are complete at source C `5e4f4a77d2d8f0bb598952605aaed6cf1f7d5f77`. The foundation dependency was consumed only in a separate validation clone as authorized by XLayerPM. See VERIFICATION.md and verification.json for exact source/overlay references, 632/632 tests, build/browser checks, RED failures and environment/CI/integration blockers. Draft PR #3 carries the actual ACK. No additional worker was started; engineering review was requested through the existing manager/QA assignment.

## AF-XLAYER-04-UI-FIX: pending review invalidation

XLayerPM assigned a narrow P2 correction after Macbeth03 reproduced an old pending review completing after wrong-chain refresh and same-wallet reconnect. Replacing WeakMaps alone does not invalidate in-flight writers. Bind action and allowance review/read/prepare/publish/store/confirm work to a session epoch incremented by every clearSession. Check before wallet submission; if a request has already reached the wallet, preserve any returned hash as a non-retryable ambiguous result without publishing into the new session. Reproduce RED, implement the guard, run focused and full regressions using the declared foundation overlay, and publish a new exact source SHA for existing Macbeth05 QA. No new feature or manager-checkout edits; Robinhood task remains separate.
