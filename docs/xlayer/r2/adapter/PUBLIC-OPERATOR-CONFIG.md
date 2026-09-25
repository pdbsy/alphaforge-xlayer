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

An explicit `AF_XLAYER_CONFIG` points to a UTF-8 JSON file. All eight top-level keys
below are required. Unknown keys at either level are rejected. The file must be
a regular file, not a link, and at most 256 KiB. Relative filesystem paths resolve
against the configuration file's directory.
The configuration file itself and the data directory must remain outside the
served root, including paths reached through filesystem aliases. Startup rejects
these placements before the static server can expose private operator fields.

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
the offline conversion command:

```sh
node tools/create-xlayer-public-deployment.ts --manifest ./reviewed-manifest.json --output ./public-deployment.json
```

The input must be an independently reviewed record from a real deployment:
the existing M3 `DeploymentManifestDocument` plus its `manifestDigest`, with the
fixed XLayer testnet identity 1952 and nonzero Vault/Pass runtime code hashes.
The tool reuses both existing manifest and public-deployment validators, accepts
only bounded regular JSON, and rejects NOT_DEPLOYED, simulation/template markers,
unknown keys and invalid digests. It writes one public-deployment object to a new
file without overwriting anything. Place that object in the operator `deployments`
array; it is not a complete operator configuration. Optional Pass initial supply
and recipient fields are omitted because the core digest does not bind them.

Conversion is entirely offline. It does not verify review provenance or on-chain
facts and does not sign or deploy. Runtime startup still independently checks
the observed chain ID and deployed Vault/Pass code before accepting indexed
evidence. A successful conversion is not evidence that a contract exists.

The array is the only deployment source: there
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

## Website release and rollback

The public website requires the same-origin Node server. Uploading only
`dist/xlayer/web` to static hosting is insufficient: the browser loads its trusted
configuration from `/api/xlayer/config`, and chain reads use the same API origin.
The server must receive both website requests and `/api/*` requests.

Use an independent checkout of the exact reviewed release commit. Activate the
repository-pinned Node 24.21.0 and npm 11.19.1, then run from its root:

```sh
npm ci --ignore-scripts
npm run build:xlayer
```

Keep this complete runtime checkout, its installed dependencies, and the generated
`dist/xlayer/web` together. The Node entry imports the server and shared packages
directly from source. Keep `.git`, source files and `node_modules` outside the
served directory; only `webRoot` is served as static content. A static-only hosting
service cannot run this release without a separately configured same-origin API.

Create the eight-key operator configuration described above outside `webRoot`.
Set `webRoot` to the absolute path of this release's `dist/xlayer/web`, `dataDir`
to private persistent storage outside every release's served directory, and
`origin` to the exact public HTTPS origin. For the initial website-only release,
keep RPC disabled and deployments empty. Set `CONFIG_PATH` to the absolute path
of this configuration file, then start from the release root:

```sh
AF_XLAYER_CONFIG="$CONFIG_PATH" npm run start:xlayer
```

Run this process under the hosting platform's process supervisor. Terminate TLS
at its HTTPS proxy and forward every path, including `/api/*`, to the configured
Node listener. Preserve the public `Host` and browser `Origin` headers; do not
rewrite them to the loopback listener address. For a proxy on the same host, keep
`listen.host` at `127.0.0.1`. Configure writable persistent storage for `dataDir`
and ensure only this server instance owns its SQLite files.

Verify the HTTPS home page, all six navigation routes and
`/api/xlayer/config` through the public proxy. Confirm an untrusted Host/Origin
is rejected. `/api/health` reports chain readiness: it intentionally stays 503
with no deployment or an indexer that is not caught up. Do not treat that initial
503 as proof that the website process failed, or a successful home-page response
as proof that chain indexing is ready. After real deployment evidence is reviewed,
configure read-only RPCs and deployments, then require health 200 and the wallet
flow checks before accepting the live Testnet release.

For rollback, stop the current process with SIGTERM and wait for its listener and
SQLite handles to close. Restart the previously reviewed release with its matching
external configuration and private data snapshot. Never run two releases against
the same writable SQLite files. Retain the previous checkout and configuration
until the new release's public checks pass. A website rollback does not undo any
on-chain transaction.

## Verification

The combined public startup/main/app, M3 startup and XLayer Phase 1 suites passed
47 tests with offline/injected RPCs and temporary sockets. Both TypeScript
projects, focused ESLint and formatting checks passed. Tests exercise the real
CLI and POSIX SIGTERM, strict unknown-key handling, redacted failures, same-record
manifest derivation, independent database paths and the manager's corrected
projection-readiness behavior.
The SIGTERM subprocess assertion is POSIX-only; portable server-handle close and
CLI invalid-input tests also apply on Windows. Windows execution is not claimed
by this macOS run.

The worker's own checks are not independent approval. Root script registration,
integrated release rehearsal and independent review remain with XLayerPM. Real
network access and deployment are not implied by a successful local test run.

The subsequent Macbeth05 review identified static configuration exposure,
case-insensitive SQLite aliases and two Windows-specific test assumptions. The
static exposure and fresh alias regressions failed against the prior source and
passed with the fixes. The updated combined suite passed 51/51 on macOS, with
both TypeScript projects and focused lint/format checks. The corrected source
requires review of the final fix commit before integration approval is claimed.
