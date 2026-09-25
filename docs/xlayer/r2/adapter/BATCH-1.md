# XLayer R2 — manifest/runtime batch

Base: b2ed61311df8d1c97a48f623d1b4872798f5e888; implementation identity Macbeth03 / AF-XLAYER-R2-03-ADAPTER. Independent clone, original Robinhood history preserved. No old XLayer source reused.

`DeploymentNetworkExpectation` is the exact union of Robinhood Testnet/46630 and XLayer Testnet/1952. `composeM3ChainRuntime` accepts `expectedNetwork` on DEPLOYED inputs; omission preserves Robinhood. Manifest document fields never select this expectation. Validation rejects unsupported/mismatched pairs, checks unchanged digest/contract/ABI identity, and runs before RPC or database creation. Existing runtime uses the accepted chain for Vault and Pass evidence and rejects wrong RPC identity before code reads.

Local Node 24.21.0/npm 11.19.1, independent lockfile install, mock RPC only:

- New tests RED on original production: 2 passed, 3 failed for expected missing behavior.
- New tests + chain-runtime + chain-rpc-manifest: 30/30 passed.
- chain-startup + chain-api: 33/33 passed with loopback permission. Initial sandbox run had 57/58 passing with one EPERM socket bind; that failure remains in `.checks/xlayer-r2-03/baseline.log`, not classified as a product failure.
- `npm run typecheck`: passed; changed TypeScript lint: passed.

New test registration is manager-owned: add `test/xlayer-adapter-runtime.test.ts` to the normal offline suite. API cross-chain read selection and local configuration integration are subsequent batches. No testnet endpoint was contacted; deployment, signatures, broadcasts and hosted verification remain NOT_RUN. These local results are self-verification, not independent approval.
