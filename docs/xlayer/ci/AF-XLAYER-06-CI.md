# AlphaForge X Layer CI binding plan and intake

Owner: Macbeth06. Task: AF-XLAYER-06-CI. Date: 2026-09-22.

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM.

Goal: admit only `pdbsy/alphaforge-xlayer` at active environment, supply-chain and Forum boundaries while retaining upstream evidence and every existing gate.

Architecture: retain the current exact repository checks and replace their active repository value; keep historical integration manifests and source references bound to upstream. Forum ingestion rejects upstream records; rendering may show explicitly historical upstream links. The manager delegated the two supply policy repository fields and generated active SBOM to Macbeth06; registry changes remain manager-owned.

Tech stack: existing Node ESM tools, Node test runner, pinned npm dependencies. Specification: public migration PR https://github.com/pdbsy/alphaforge-xlayer/pull/1 at `5896ff45510b214d45a3469f9536a8434e2493d3`.

## Intake

- Repository: `pdbsy/alphaforge-xlayer`; full independent clone, not shallow; origin HTTPS; branch `macbeth06/xlayer-ci-bindings`.
- Initial clean base/head: `18f5352070910a867b9729b031aa2e3951785e01`; tree `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba`.
- Tools: Node 24.21.0, npm 11.19.1, fnm 1.39.0, Apple Git 2.50.1, native macOS arm64. Separate dependency directory, no shared SQLite data.
- Original work is preserved: worker `553fbc3` and separate AUDIT-001 verification at `b9283da`; both tracked workspaces were clean before starting.
- Baseline environment observation: tools, configuration, history and isolation pass; repository binding fails as expected; local port probe also failed in the sandbox. This is not eligible environment evidence.
- Execution scope: local/mock development and public Draft PR collaboration only; NOT_DEPLOYED.

## Implementation checklist

- [x] Add failing behavior tests for new repository acceptance, upstream/foreign rejection, exact PR Git parents and supply namespace binding.
- [x] Migrate `tools/environment/policy.mjs`, `tools/environment/observe.mjs`, `tools/check-supply-chain.mjs` and associated environment/supply tests without relaxing any other condition.
- [x] Migrate `tools/sync-agent-forum.mjs`, `tools/agent-forum.mjs` and associated Forum tests; retain untrusted URL/branch/author rejection.
- [x] Preserve historical Forum links in `tools/agent-forum-app.js` and regenerate only its generated asset; do not edit historical PASS evidence or fabricate ACKs.
- [x] Apply the manager-authorized two supply policy fields and generate the active SBOM: `repository=pdbsy/alphaforge-xlayer`, `sbom.documentNamespaceBase=https://github.com/pdbsy/alphaforge-xlayer/sbom`. Coordinate registry source separately with the manager.
- [x] Run targeted regressions, lint/format/typecheck and appropriate complete checks; retain raw failures and state missing prerequisites as BLOCKED/NOT_RUN.
- [x] Publish own Draft PR with real intake/ACK and exact SHA results. Observe hosted checks for that source; do not inherit upstream results or claim independent approval.

Tests must verify behavior before implementation. Existing workflow names, event policies, tool pins, permission ceilings and historical manager integration profiles remain unchanged. The original nine Engineering jobs and optional CodeQL/Dependency Review policy are retained.

## Verification notes

The targeted RED run failed 13/85 tests against the unchanged implementation. The separate Forum UI RED run failed the historical-count behavior. After implementation the combined targeted suite passed 86/86. Raw logs are retained locally under ignored `.checks/xlayer-ci/`.

The complete sandbox check reached tests after typecheck, lint and formatting, then reported loopback `listen EPERM` and a migration provenance mismatch. Native execution passed 596/596 tests, then reached management validation while source changes were still in progress. Clean source `7089beabddcd138e39950e7711bac8d70a92ed23` passed 596/596 and every check through Forum, then correctly failed management replay with `RECORDED_GIT_BRANCH_MISMATCH` against the inherited evidence. Build after that failure was NOT_RUN by the composite command.

The manager explicitly approved the existing `subsequent_adaptations` workflow for only the six changed, registered Forum tools/tests. Those rows preserve original source identities and prior adaptations, append AF-XLAYER-06-CI with the imported base, previous hash, reason and implementation source commit, and update their current migrated hash. `test/migration-provenance.test.mjs` retains its original current-byte comparison. The temporary old-blob test approach was withdrawn in a follow-up commit; registry and other workers' rows are untouched.

Actual environment observation admits the new repository, tools, history and dependency/data isolation; local port 4180 is occupied by an existing process, so developer admission remains FAIL and ineligible. No other task's process is stopped. Hosted CI must establish its own environment on the exact submitted source. The independently installed lock remains SHA-256 `67f717aaad4f0f7f0a24fb658095ce1953fcd323c63a9a9fc052e46edc33a26b`.

The registry at this branch's imported base is historical. XLayerPM separately owns its migration; no legacy registry confirmation is treated as an X Layer ACK. No manager implementation or registry overlay was used for these worker tests.

## Exact hosted checkpoint and remaining integration dependencies

Draft PR: https://github.com/pdbsy/alphaforge-xlayer/pull/6 . Actual worker ACK: https://github.com/pdbsy/alphaforge-xlayer/pull/6#issuecomment-5774575682 . The inherited Forum recipient schema has no XLayerPM identity; the ACK explicitly addresses the separate manager in its body and uses To=ALL without impersonating Macbeth01 or claiming automatic ACK matching.

PR run https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35713482935 tested source `7089beabddcd138e39950e7711bac8d70a92ed23`, base `18f5352070910a867b9729b031aa2e3951785e01`, actual merge checkout `32389beec0db3248ad567f72c587a9f59f03597c` and tree `4697326af77d418b51201a348755a659a5e6cba5`. Five jobs passed: contracts-m3-macos, source-policy-js, dependency-delta-audit, semgrep-ce and osv-scanner. All three native verification jobs passed 596/596 tests and admitted the environment but failed management replay at `RECORDED_GIT_CI_CONTEXT_INVALID`. Gitleaks failed. Overall: 5/9 jobs pass, 4 fail; not ready for merge.

Management replay is a separate boundary from environment repository admission. `tools/management-dashboard/sources.mjs` requires `GITHUB_HEAD_REF` to equal the recorded source branch at lines 327-335; local replay checks that branch at line 694. The imported snapshot records an upstream branch. Final integration requires a newly collected source C, manifest R and snapshot S; this PR does not edit generated evidence or relax the comparison.

Pinned Gitleaks 8.30.1 default detectors reported `generic-api-key` on this intake's original line 18 in source `a270b36d7cde2fd87e283580d20b107249d072bf` and the PR merge, plus inherited `69330dfffeceb86cf793fa0163ff4f72a466f3eb:docs/product/PHASE1-PRODUCT-WALLET-FLOWS.md:12`. Canary and redaction checks passed. A bounded local reproduction established that the intake match equals an ordinary public scope phrase, not a Git SHA; no matched value is reproduced here. The inherited match is a real Git tree object ID, as checked with `git cat-file -t` by the manager. These are classifications, not scanner PASS or risk acceptance. This follow-up clarifies the current prose; previously published history and its failing scan are retained. No detector, allowlist, required check or history rewrite changed.

The documentation follow-up must receive its own hosted result; the preceding checkpoint is never inherited by a new head. CodeQL and Dependency Review retain their inherited manual trigger policy and are NOT_RUN in this Engineering run.
