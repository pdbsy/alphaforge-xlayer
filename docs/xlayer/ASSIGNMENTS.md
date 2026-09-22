# X Layer first-wave assignments

Manager: XLayerPM. Authorization: user's 2026-09-22 public repository/migration request. Source base: `18f5352070910a867b9729b031aa2e3951785e01`. Canonical repository: `pdbsy/alphaforge-xlayer`.

Assignments become active when the manager publishes the intake PR and the worker reads it. Delivery/ACK is recorded from actual replies only. Each worker must preserve any existing upstream work, create a separate full clone with independent dependencies/data and a `macbeth0N/` branch in this repository, and open an own Draft PR. Do not modify another task's checkout. Existing source repository PRs are references only.

| Worker | Task | Scope / owned files | Acceptance |
| --- | --- | --- | --- |
| Macbeth02 | AF-XLAYER-02-CONTRACTS | `contracts/` and new `docs/xlayer/contracts/`; local contract compatibility and explicit NOT_DEPLOYED X Layer template | Show locked-tool compatibility; test domain/chain replay separation; no deployed addresses/signatures or broadcast scripts; no asset semantics changes |
| Macbeth03 | AF-XLAYER-03-ADAPTER | `packages/chain-adapter/`, `apps/server/src/m3-*`, corresponding chain tests, `docs/xlayer/adapter/` | X Layer 1952 manifest/runtime support with wrong-chain rejection; keep Robinhood path/regressions; no network writes; preserve event/idempotency chain isolation |
| Macbeth04 | AF-XLAYER-04-UI | `apps/web/src/` and targeted UI tests, `docs/xlayer/ui/` | X Layer network/gas/explorer display and wallet chain guards; preserve warm product UI; reject stale account/chain requests; no fabricated deployed state |
| Macbeth05 | AF-XLAYER-05-QA | new `docs/xlayer/qa/`, new X Layer integration tests only | Independent engineering acceptance matrix against exact candidate; reproduce negatives and inspect cross-chain state separation; report NOT_RUN/BLOCKED honestly; no claim of independent GitHub approval |
| Macbeth06 | AF-XLAYER-06-CI | `tools/environment/`, `tools/ci/`, active repository validation in supply/Forum tooling, corresponding tests and CI policies | Migrate active repo binding narrowly to new repo, preserve historical source links/evidence and checks; validate new public-repo CI by exact SHA; no ruleset/merge/visibility/billing changes |

Manager owns root AGENTS/README, `docs/xlayer/MIGRATION.md`, this assignment record, plan, `packages/xlayer-chain/`, `config/xlayer/.env.example`, `tools/check-xlayer-chain.ts`, foundation test, root package scripts/lock metadata, shared planning/ADR and final integration. Workers propose changes to shared files in their PR rather than editing beyond ownership. Dependency generation must follow existing pipelines, never manual PASS JSON edits.

## Shared decisions

- Foundation interface is frozen in MIGRATION.md. Backend/UI can consume it after the manager's bootstrap commit is published; they may begin read-only assessment from imported master now.
- Runtime support is an explicit environment/chain pair, never arbitrary string/number acceptance or manifest self-selection of trust.
- Default configuration cutover waits for compatible UI/backend and CI; first wave must not advertise live X Layer readiness.
- Existing soft-ready 3 / recovery 128 values are inherited implementation defaults, not evidence of X Layer finality. Review them and label their assumptions.
- Worker PRs remain review candidates. Manager cherry-picks only reviewed, in-scope commits with authors preserved. No self-merge.

## Receipt state

All five assignments: DELIVERED through the existing app tasks on 2026-09-22, with the public task definition in https://github.com/pdbsy/alphaforge-xlayer/pull/1. All five tasks were observed active after delivery. Public PR acknowledgements remain pending actual worker replies. Historical upstream registry confirmations do not count as new-repository acknowledgement.

## Scoped ownership update, 2026-09-22

Macbeth06 additionally owns exactly `planning/supply-chain-policy.json.repository`, `planning/supply-chain-policy.json.sbom.documentNamespaceBase`, and regeneration of the active SBOM through `supply:build`. Values become `pdbsy/alphaforge-xlayer` and `https://github.com/pdbsy/alphaforge-xlayer/sbom`; all other admission policy stays unchanged. This makes its repository validator change independently testable. Manager retains root package metadata and the worker registry.

The inherited registry has been archived as UPSTREAM-AGENT-REGISTRY.json. New-repository self-confirmation and Forum communication start UNVERIFIED. Macbeth01 is not assigned a new worker task in this repository; XLayerPM carries manager duties separately. App-level startup receipts have been received from Macbeth04 and Macbeth06; they do not constitute public Forum ACK or security approval.

## Public startup receipts

Verified from the workers' own PRs on 2026-09-22: Macbeth02 https://github.com/pdbsy/alphaforge-xlayer/pull/2 (c4c796e), Macbeth03 https://github.com/pdbsy/alphaforge-xlayer/pull/4 (9457969), Macbeth04 https://github.com/pdbsy/alphaforge-xlayer/pull/3 (0c170d5), Macbeth05 https://github.com/pdbsy/alphaforge-xlayer/pull/5 (0718323). These are startup acknowledgements, not accepted feature delivery or independent approval. Macbeth06 reported implementation progress; its own public PR receipt is pending at this checkpoint.

Migration provenance policy: keep current-file hash checks. For an authorized evolved artifact, append a subsequent_adaptations record with exact prior hash/base/reason and update the current migrated hash to actual bytes. Never erase original source identity or prior adaptation history. Macbeth06 may update only the entries for its assigned Forum tools/tests; manager owns the registry record. Do not weaken the check to validate only an old Git blob while ignoring the current artifact.

## Parallel project ownership

Every dispatch and receipt starts `[XLayer][AF-XLAYER-...]` and names Project `AlphaForge-XLayer`, Track `X Layer`, Repository `pdbsy/alphaforge-xlayer`, and Manager `XLayerPM`. This user instruction applies to all five workers. Robinhood work is a parallel project: never overwrite its assignment, reuse its writable checkout/data, or count its acceptance as X Layer evidence.

All five public PRs now exist; current delivered source heads and outstanding acceptance are tracked in [INTEGRATION.md](INTEGRATION.md). Manager source integration does not merge or approve worker PRs.
