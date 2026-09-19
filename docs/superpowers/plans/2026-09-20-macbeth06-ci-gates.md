# Macbeth06 CI and gate ownership

Authority: the user explicitly requested a sixth persistent worker for gates and CI checks on 2026-09-20. Canonical repository remains `pdbsy/quantpass-arbitrum-hackathon`. This adds an engineering verification role, not an independent GitHub reviewer or a replacement for the restricted Macbeth05 review.

- [x] Create a dedicated AlphaForge app task with an isolated worktree and a read-only first assignment against the actual PR #21 head.
- [x] Register Macbeth06 in `docs/management/agents/registry.json`, add its bootstrap and task record, and update current protocol/assignment text. Preserve historical five-worker protocol records.
- [x] Add behavior regressions to `test/agent-management.test.mjs` for six-worker registration, own-task attribution, cross-worker rejection and Forum routing. Run the tests red before implementation.
- [x] Extend `tools/agent-identity.mjs`, `tools/agent-forum.mjs` and `tools/agent-forum-app.js` only for the registered sixth identity; regenerate Forum assets with `npm run forum:build`. Keep manager integration source admission unchanged until a concrete Macbeth06 source is assigned.
- [ ] Run focused identity/lifecycle/integration/provenance tests and full checks using Node 24.21.0/npm 11.19.1. Record source C, generate manifest R and dashboard snapshot S through existing commands, then publish the manager candidate through normal push.
- [x] Obtain Macbeth06's actual repository/SHA/scope receipt; give it the updated exact candidate for ongoing CI evidence checks. Engineering reports must distinguish PASS, FAIL, BLOCKED and NOT_RUN and must not assert independent approval.

Manager retains implementation/integration ownership while Macbeth06 performs the initial read-only audit and prepares concrete contract-CI/replacement-gate proposals. Any later implementation delegation needs an exact base and file boundary; no agent edits another agent's worktree. Existing review requirements and remote protections are unchanged by this registration.
