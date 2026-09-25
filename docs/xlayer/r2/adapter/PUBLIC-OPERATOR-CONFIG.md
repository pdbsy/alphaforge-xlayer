# AlphaForge XLayer public operator configuration

Run the public executable with the approved Node runtime:

```sh
node apps/server/src/xlayer-public-main.ts
```

With no `AF_XLAYER_CONFIG`, main listens on `127.0.0.1:4180`, serves
`dist/xlayer/web`, and exposes an empty deployment set with RPC disabled. Build the
public website first using the root task's registered build command. A website
without deployed/indexed contracts remains available while `/api/health` returns
HTTP 503. Absence of a build directory is a startup error.

An explicit `AF_XLAYER_CONFIG` points to a UTF-8 JSON file. All nine top-level keys
below are required. Unknown keys at either level are rejected. The file must be
a regular file, not a link, and at most 256 KiB. Relative filesystem paths resolve
against the configuration file's directory.

```json
{
  "schemaVersion": 1,
  "origin": "https://alphaforge.example",
  "webRoot": "./dist/xlayer/web",
  "dataDir": "./private-data",
  "rpcAccess": "disabled",
  "rpcEndpoints": [],
  "deployments": [],
  "listen": { "host": "127.0.0.1", "port": 4180 }
}
```

The `origin` is an exact public HTTPS origin; HTTP is allowed only for loopback
rehearsal. The listener accepts `127.0.0.1`, `localhost`, or explicitly selected
`0.0.0.0`. Keep the configured public Host/Origin when using a reverse proxy.
Listener changes do not relax request-origin validation. Port zero is supported
for ephemeral local tests; production should configure a stable port.

RPC stays disabled until the operator explicitly selects `read-only`. Disabled
mode requires `rpcEndpoints: []`. Read-only mode requires one to eight HTTPS
endpoints without credentials, queries or fragments. No environment variable
implicitly unlocks RPC. This entry never signs or broadcasts transactions.

Populate `deployments` only with reviewed `XLayerPublicDeployment` records from
the release conversion workflow. The array is the only deployment source: there
is no independent manifest array or operator-supplied database filename. Main
validates the records and derives runtime pins and manifests from them. Each Vault
uses `<lowercase-vault-address>.sqlite` under `dataDir`. Duplicate Vault addresses
are rejected. The data directory is created only when active runtimes are needed;
it must be private to this server and outside the served website.

The public API returns only the validated public deployment fields. Filesystem
paths, operator data directories and RPC endpoints are not browser configuration.
CLI failures print fixed English codes and exit unsuccessfully without raw input,
paths or stack traces. SIGINT/SIGTERM closes the listener and drains accepted sync
work before releasing SQLite.

## Verification

The combined public startup/main/app, M3 startup and XLayer Phase 1 suites passed
47 tests with offline/injected RPCs and temporary sockets. Both TypeScript
projects, focused ESLint and formatting checks passed. Tests exercise the real
CLI and SIGTERM, strict unknown-key handling, redacted failures, same-record
manifest derivation, independent database paths and the manager's corrected
projection-readiness behavior.

The worker's own checks are not independent approval. Root script registration,
integrated release rehearsal and independent review remain with XLayerPM. Real
network access and deployment are not implied by a successful local test run.
