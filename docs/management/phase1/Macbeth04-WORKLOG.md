# Macbeth04 Phase One Worklog

## Sources

- Task: `M3-04-PHASE1-PRODUCT`
- Fixed base: `18f5352070910a867b9729b031aa2e3951785e01`
- Intake/plan commit: `9c3a16eb2bfe9c3c3ad2af72d4aae09c5aa69485`
- Product source candidate: `86f2f9036657eeda3a7357943b6fcac6de3e5dbe`
- Product candidate tree: `ae90be8d3411d921bdaf37cf15d3fdea01ce22b3`
- Macbeth02 contract implementation source consumed read-only:
  `2ad816200e7edfbfad96d765b4a696bc8b838c2d`
- Macbeth02 evidence head: `a13052993b6f408b7be835ecd6f4b13ef6df367d`

The branch contains no Macbeth02 commit. PR #24 was fetched to a read-only remote reference only to
verify the exact manifest and delivery document. The corrected handoff retains the production
Solidity, Vault ABI, selectors, topics, and constructor parameters consumed by the product; no UI
consumer migration was required. Its changes are limited to reproducible immutable compiler-reference
offsets, deployment-boundary documentation, and business-boundary tests. `TestVenue` and
`SwapAdapter` are outside the default minimal deployment candidate.

## Completed

- Added exact 18-decimal Pass transfer preparation and runtime review/confirmation.
- Added live Pass balance read and honest initial constructor allocation presentation.
- Added owner-only token/native rescue after close through canonical and degraded live reads.
- Kept open-Vault rescue rejected and closed-Vault deposit/withdraw/close disabled.
- Added session, network, simulation, fixed-target, single-use review, and duplicate-submit guards.
- Added production-page dialogs for Pass transfer and both rescue paths.
- Marked paid Buy/Sell explicitly outside Phase One.
- Extended the deterministic mock runtime and completed browser acceptance on loopback port `5194`.
- Preserved the protected prototype and active six-page warm English UI.

## Verification summary

- Typecheck: PASS
- Lint: PASS
- Format: PASS
- Focused tests: `84/84` PASS
- Web build: PASS
- Agent identity: PASS for both worker commits
- Browser acceptance: PASS within local mock scope
- Full test suite: `601/602` PASS; shared migration provenance hash update required

The first full test run inside the default sandbox also produced only `EPERM` failures when tests
attempted to create `.checks` directories. The same command was rerun with the required worktree
write permission; those environmental failures disappeared. The remaining single failure is the
intentional shared provenance mismatch described above.

## Integration requests and blockers

1. Macbeth01 must update the shared migration provenance entry for `apps/web/src/product-ui.ts` to
   SHA-256 `335dd498b1b70a4b52ec1029e59b2efda7f9f750f47f4d7b1459e80c4a75c0db` when integrating the
   candidate. Macbeth04 did not edit the out-of-scope shared evidence.
2. Multi-Vault creation/discovery remains blocked on an exact integrated factory/discovery
   interface. The current product safely selects the one reviewed Vault address.
3. Real Testnet browser acceptance remains blocked on a separately authorized deployment and real
   manifest addresses.
4. Push, Draft PR creation, and the worker's original PR/Forum ACK remain blocked because automatic
   approval rejected both the exact branch push and cross-task status message. No workaround was
   attempted.

## Retrospective

The base already contained most of the difficult wallet and canonical-evidence boundary. Extending
that boundary with small typed requests kept ordinary Pass transfer separate from Vault capacity
accounting and made rescue behavior auditable. The most useful browser check was the one-raw-unit
transfer because it exposed any accidental `10^12` capacity conversion immediately.

The remaining integration friction is evidence ownership rather than product behavior: changing the
real entry file necessarily changes the historical migrated-artifact hash. Keeping that update with
the integration owner avoids a worker silently rewriting shared provenance.
