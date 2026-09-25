# AlphaForge XLayer public startup

Owner: Macbeth03. Repository: `pdbsy/alphaforge-xlayer`.

The public server composes the existing M3 read-only indexer without the local
ledger, simulated sessions or demo account APIs. Its trusted network is XLayer
testnet, chain ID 1952. Public configuration and runtime manifests derive from a
validated public deployment record, including the same Vault address and digest.
Optional Pass supply/recipient metadata is not covered by that core manifest
digest and is not copied into the runtime manifest.

## Implementation batches

1. Add focused failing tests for disabled startup, identity/storage rejection,
   failed-read recovery and resource cleanup. Extract the existing M3 sync queue
   and completion-based timer into one shared helper, then use it in both entries.
2. Add strict operator JSON loading and the executable main. Derive each SQLite
   filename from its validated Vault address, keep configuration private, and
   exercise the actual executable's startup and signal handling.
3. Run affected public/M3/Phase 1 tests, both TypeScript checks, focused lint and
   formatting. Hand source commits to XLayerPM for independent review and root
   script registration. A worker's own checks are not independent approval.

## Lifecycle and storage

- RPC is explicitly `disabled` or `read-only`. Disabled mode constructs no runtime
  and no database, and accepts no runtime deployment inputs.
- Every active runtime must match a public deployment and the trusted network.
  All identities and paths are checked before any RPC factory or store opens.
- SQLite paths are separate per Vault; existing database and sidecar symlinks or
  hardlinks are rejected. Databases cannot reside under the static web root.
  New database files are atomically reserved with private permissions; actual
  device/inode identities are compared before any runtime opens. A failed startup
  may retain empty reserved files, but never deletes existing database contents.
  The operator must keep the data directory private to this server instance.
- Sync calls are serialized, with a default five-second interval measured from
  completion. Library callers can set `syncIntervalMs: null` for manual sync.
- Initial chain-read failure leaves the website available and health unready.
  Health also requires the manager's `caughtUp` check for both owned projections.
- Both handle close and direct Fastify close stop scheduling and drain accepted
  sync work before closing SQLite. Partial construction and failed listen close
  every runtime already constructed. Existing data is retained for restart.
- The listen host defaults in main to `127.0.0.1`; `0.0.0.0` requires explicit
  operator configuration. Strict public Host/Origin checks remain enabled.

## Local verification

Approved Node 24.21.0 / npm 11.19.1, independent dependencies and temporary SQLite
fixtures. All RPCs used by tests are injected offline implementations or disabled.

The startup batch passed the public app/startup, existing M3 startup and XLayer
Phase 1 suites (36 tests before additional operator/socket regressions), both
TypeScript projects and focused ESLint. The sandbox initially denied the existing
loopback socket test; it passed after local socket execution was allowed. The
manager's health correction is preserved with source commit
`85787c9cfbdfad7d94fcc2c7bb6149fad9d59929`.

No deployed contracts, live RPC validation, public hosting or signing/broadcasting
are claimed by these local checks. The root task owns final integration, registered
test commands and independent review.
