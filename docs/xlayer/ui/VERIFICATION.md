# AF-XLAYER-04-UI verification receipt

Project: AlphaForge-XLayer
Track: X Layer
Repository: pdbsy/alphaforge-xlayer
Manager: XLayerPM (AF_Xlayer task)
Worker: Macbeth04
Task-ID: AF-XLAYER-04-UI
PR: https://github.com/pdbsy/alphaforge-xlayer/pull/3

## Source C and declared dependency

Source C: `5e4f4a77d2d8f0bb598952605aaed6cf1f7d5f77`, tree `3cac70aa093efcfd8d799d7ec7cfd333f03502c9`, base `18f5352070910a867b9729b031aa2e3951785e01`. The worker clone was clean at verification. All three worker commits retain Macbeth04 identity and AF-XLAYER-04-UI trailers.

PR #1 is not merged into this branch. As explicitly authorized by XLayerPM, a separate full clone with separate locked dependencies loaded only `packages/xlayer-chain/src/network.ts` from manager commit `728c3df217f586fb7f7d86f595406dc46372ac1a`, Git blob `27266cf5b188cf22eec22c410573d253275194d4`, SHA-256 `af3ec6f9edce2a1cd0764a6eadb85d6af2d940ba98aa6b05115ed532b1fcd683`.

The verification clone was advanced to C with all tracked files byte-identical (`git diff --exit-code`); its only untracked source dependency was this foundation file. No manager commit or foundation file is included in the worker PR. Results are **C plus the declared dependency overlay**, not standalone branch or integrated-master PASS. The machine-readable receipt R is `verification.json`; integration snapshot S and independent approval remain NOT_RUN.

## Behavior and boundaries

- The runtime accepts only the approved environment/chain pairs and consumes the foundation exports for network name, gas token and explorer. Both Vite variables omitted preserves Robinhood; X Layer requires `VITE_AF_CHAIN=xlayer-testnet` and `VITE_AF_CHAIN_ID=1952`.
- Wallet responses, URL parameters, arbitrary browser metadata and deployment manifests do not select the trusted network. Strategy and Account shells carry the selected context. The inherited X Layer SOFT_READY threshold is explicitly an assumption, with finality unverified.
- X Layer remains NOT_DEPLOYED. Existing Robinhood deployment metadata is rejected in X Layer mode; contract reads, approvals and writes stay closed. The historical DEV fixture explicitly retains Robinhood.
- Pending connect/observe detect account, chain and disconnect events, including away-and-back changes. Repeated observations detect silent drift. Runtime read revisions reject older results; Vault reads receive a final wallet check.
- Wrong chain, disconnection and stale reads clear ownership and disable writes. Switching back requires a new connection. Prior local action/approval reviews are invalidated.
- The prototype, product-ui.ts migration hash, six-decimal accounting, dependencies, backend, shared scripts and CI are unchanged.

## Actual verification

| Check | Result and scope |
| --- | --- |
| Full npm test at C + overlay | PASS: 632/632, zero failures/skips |
| Typecheck, ESLint, Prettier | PASS with overlay |
| Default and explicit X Layer web builds | PASS; existing classic-script/CSS importer warnings retained |
| Built UI in actual local browser | Strategy and Account show X Layer Testnet / 1952 / OKB / NOT_DEPLOYED; all six chain asset actions disabled; warm layout preserved; captured warning/error log empty |
| Bounded secrets/privacy checks | PASS: 505 source files; ignored local/binary data outside coverage |
| Worker identity from base through C | PASS: three worker provenance records |
| Source environment admission | FAIL: repository and ports; eligibleForEvidence=false. With approved fnm activated, tools/manager checks PASS, contracts NOT_RUN. No unrelated process was stopped. |
| Hosted CI at C | FAILURE before project dependencies: exact npm bootstrap BLOCKED at inputs; run 35714437703 is bound to C |
| Standalone branch without PR #1 dependency | BLOCKED |
| Real wallet/RPC, deployment, signing, broadcast, mainnet | NOT_RUN; outside local/mock scope |
| Independent approval, merge and integrated snapshot S | NOT_RUN |

Initial RED runs reproduced 17 wallet-boundary, eight runtime-read, two silent-drift and one reusable-review failures. The first full run was 626/632: four localhost sandbox failures, one fixture reconnection expectation and one protected product-ui migration hash failure. Moving build configuration to the runtime factory preserved product-ui byte-for-byte; the fixture was updated and localhost tests rerun with authorized execution. The final exact-C result is 632/632; prior failures are not relabeled.

To reproduce, check out C in a new full clone, extract only the exact foundation file above, run locked `npm ci --ignore-scripts` under Node 24.21.0/npm 11.19.1, then the existing package checks/builds. No new dependency or script is required. Raw local log names and SHA-256 hashes appear in `verification.json`; they are not public hosted CI artifacts. The local browser used a separate SQLite file and a 127.0.0.1 server; its temporary tab and server were closed.

Robinhood checkpoint remains clean at `bf54f914f02c09bbce22d19f8f57d5c20f3083c1`, branch `macbeth04/m3-phase1-product-race`. Its task ownership and evidence remain unchanged; X Layer results are not Robinhood acceptance.
