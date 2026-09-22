# AlphaForge X Layer CI binding plan and intake

Owner: Macbeth06. Task: AF-XLAYER-06-CI. Date: 2026-09-22.

Goal: admit only `pdbsy/alphaforge-xlayer` at active environment, supply-chain and Forum boundaries while retaining upstream evidence and every existing gate.

Architecture: retain the current exact repository checks and replace their active repository value; keep historical integration manifests and source references bound to upstream. Forum ingestion rejects upstream records; rendering may show explicitly historical upstream links. Shared planning and registry changes remain manager-owned.

Tech stack: existing Node ESM tools, Node test runner, pinned npm dependencies. Specification: public migration PR https://github.com/pdbsy/alphaforge-xlayer/pull/1 at `5896ff45510b214d45a3469f9536a8434e2493d3`.

## Intake

- Repository: `pdbsy/alphaforge-xlayer`; full independent clone, not shallow; origin HTTPS; branch `macbeth06/xlayer-ci-bindings`.
- Initial clean base/head: `18f5352070910a867b9729b031aa2e3951785e01`; tree `a4b1cf782f6e5f2aaa90c955cfffb629ee5231ba`.
- Tools: Node 24.21.0, npm 11.19.1, fnm 1.39.0, Apple Git 2.50.1, native macOS arm64. Separate dependency directory, no shared SQLite data.
- Original work is preserved: worker `553fbc3` and separate AUDIT-001 verification at `b9283da`; both tracked workspaces were clean before starting.
- Baseline environment observation: tools, configuration, history and isolation pass; repository binding fails as expected; local port probe also failed in the sandbox. This is not eligible environment evidence.
- No deployment, RPC probe, signature, broadcast, credentials, protection/visibility/billing change or merge is part of this task.

## Implementation checklist

- [ ] Add failing behavior tests for new repository acceptance, upstream/foreign rejection, exact PR Git parents and supply namespace binding.
- [ ] Migrate `tools/environment/policy.mjs`, `tools/environment/observe.mjs`, `tools/check-supply-chain.mjs` and associated environment/supply tests without relaxing any other condition.
- [ ] Migrate `tools/sync-agent-forum.mjs`, `tools/agent-forum.mjs` and associated Forum tests; retain untrusted URL/branch/author rejection.
- [ ] Preserve historical Forum links in `tools/agent-forum-app.js` and regenerate only its generated asset; do not edit historical PASS evidence or fabricate ACKs.
- [ ] Coordinate manager-owned supply policy, active SBOM generation and registry source. Proposed supply changes: `repository=pdbsy/alphaforge-xlayer`, `sbom.documentNamespaceBase=https://github.com/pdbsy/alphaforge-xlayer/sbom`.
- [ ] Run targeted regressions, lint/format/typecheck and appropriate complete checks; retain raw failures and state missing prerequisites as BLOCKED/NOT_RUN.
- [ ] Publish own Draft PR with real intake/ACK and exact SHA results. Observe hosted checks for that source; do not inherit upstream results or claim independent approval.

Tests must verify behavior before implementation. Existing workflow names, event policies, tool pins, permission ceilings and historical manager integration profiles remain unchanged. The original nine Engineering jobs and optional CodeQL/Dependency Review policy are retained.
