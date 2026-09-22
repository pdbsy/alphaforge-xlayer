# AlphaForge X Layer adapter

Agent-ID: Macbeth03
Task-ID: AF-XLAYER-03-ADAPTER
Project: AlphaForge-XLayer
Track: X Layer
Repository: pdbsy/alphaforge-xlayer
Manager: XLayerPM (AF_Xlayer)

This is a local/mock review candidate. The executable default stays NOT_DEPLOYED.
No deployment addresses or live-chain evidence are supplied.

## Trusted network selection

`DeploymentNetwork` permits only these environment/chain ID pairs:

| Environment | Chain ID |
| --- | --- |
| robinhood-chain-testnet | 46630 |
| xlayer-testnet | 1952 |

`validateDeploymentNetwork` checks the allowlist at runtime, including callers
using JavaScript or bypassing TypeScript. `validateDeploymentManifest` validates
the trusted expected pair first, then strictly compares both input fields to it.
Matching input and expected values cannot authorize 195, 196, crossed pairs or
an unreviewed environment. Canonical digest field order is unchanged. The digest
and optional address must still match independently trusted expectations.

For deployed composition, `M3ChainRuntimeDeployment.expectedNetwork` accepts the
same pair union. Omission keeps the historical Robinhood default. X Layer requires
explicit trusted selection; its manifest cannot select that expectation itself.
Explicit null or malformed pairs fail before constructing the RPC client or store.
`NOT_DEPLOYED` still returns null before constructing either.

The manager-owned foundation at `728c3df` exports `readXLayerLocalConfig` and
`XLAYER_TESTNET`. Once integrated, a caller can pass its reviewed config as follows:

```ts
const config = readXLayerLocalConfig(env);
const deployment = {
  deploymentStatus: 'DEPLOYED' as const,
  dbPath,
  rpcEndpoints: [config.rpcUrl],
  expectedNetwork: {
    environment: config.network.key,
    chainId: config.network.chainId,
  },
  manifestDocument: reviewedManifest,
  expectedManifestDigest: independentlyReviewedDigest,
  expectedContractAddress: independentlyReviewedAddress,
};
```

This illustrates the composition interface, not available deployment evidence.
The adapter does not import unpublished foundation files or duplicate endpoint,
explorer or gas-currency metadata. No foundation overlay was used for worker tests.
Endpoint allowlisting and local/mock configuration admission belong to the trusted
caller/foundation; the inherited generic RPC client does not enforce the X Layer
endpoint list. Tests inject transports and never contact the configured URLs.

## Chain separation

The existing synchronizer checks `eth_chainId` before reading the head or indexing.
X Layer tests reject 195, 196 and 46630 with no block reads or evidence persisted.
Only existing read-only RPC methods are available.

SQLite schemas are unchanged. Same addresses, transaction hashes and log indices
on the two chains retain separate events, checkpoints and projections. Replaying,
reopening the store and rolling back X Layer do not alter Robinhood evidence.
Transaction lookup remains keyed by chain. Operation IDs remain globally unique:
reusing one across chains fails closed instead of changing historical identity.

The operation evidence API now checks the selected chain and Vault as well as
owner. Foreign-chain and foreign-Vault operations produce the existing 404
`CHAIN_OPERATION_NOT_FOUND` response; selected-chain evidence remains readable.
XLayerPM explicitly approved this narrow `chain-routes.ts` scope addition after
the cross-chain read was reproduced with a shared database.

## Limits and verification

- Six-decimal TEST_ONLY accounting and stable storage/protocol identifiers remain.
- Soft readiness 3 / reorg search 128 are inherited defaults, not validated X Layer
  finality parameters. L1 and finality status remain UNKNOWN.
- The inherited manifest runtimeBytecodeHash is digest-bound metadata. This baseline
  does not fetch and verify deployed bytecode; no on-chain code attestation is claimed.
- Contract compatibility, real deployment/asset evidence and default configuration
  cutover require the other assigned tasks and manager integration.
- Local test results do not certify repository admission, CI, C/R/S generated PASS
  evidence or independent review. See the PR for exact source SHA and check results.

Focused regression command (existing registered tests):

```sh
node --test test/chain-rpc-manifest.test.ts test/chain-runtime.test.ts test/chain-store.test.ts test/chain-sync.test.ts test/chain-startup.test.ts test/chain-api.test.ts
```

Use the repository-pinned Node and npm versions. No dependency changes are needed.
