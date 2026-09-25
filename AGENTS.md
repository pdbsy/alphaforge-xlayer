# Current XLayer assignment — 2026-09-25

The user explicitly assigned XLayerPM to replace the previous adaptation using only base b2ed61311df8d1c97a48f623d1b4872798f5e888, with workers Macbeth02–06 and Temp-A/B. This is the AlphaForge-XLayer repository (pdbsy/alphaforge-xlayer), separate from the parallel Robinhood line. The active implementation plan is docs/superpowers/plans/2026-09-25-xlayer-r2.md. Its current assignment supersedes historical worker restrictions below within this scope. Preserve upstream history and source evidence; do not copy old XLayer changes. Validate and review each small batch before integration. Public website and testnet deployment preparation are assigned; actual deployment, signing, broadcasting and mainnet are not enabled by this instruction.

# Development environment and task authority

Read docs/DEVELOPMENT-TOOLCHAIN.md and docs/DEVELOPMENT-TOOLCHAIN-STATUS.md before modifying code. Verify the actual repository, branch, HEAD, tool versions and current user assignment. Check package.json before assuming a proposed command exists.

The supplied toolchain specification preserves its historical planning state; ENV-01 through ENV-05 are completed within their recorded scope. The current user has assigned Macbeth01 to coordinate Macbeth02–05 for M3; consult docs/management/agents/M3-ASSIGNMENTS.md and the current user task before implementation. The user additionally assigned Macbeth06 to CI/gate verification on 2026-09-20; see docs/management/agents/M3-06-CI-GATES.md. Darwin remains inactive. Do not start additional workers or expand their scope without authorization. Future tasks and sensitive operations require the user's applicable authorization; historical merge authorization is not permanent.

Use an independent checkout and task branch. Do not share writable node_modules or SQLite data. Do not force push, rewrite history, remove required checks, hide changes or edit generated PASS evidence. Preserve existing authors and history. Keep complete Git history and evidence source refs.

Stay local/mock. Bootstrap, doctor, tests and CI must not sign, broadcast or enable mainnet. Do not introduce credentials or use latest/unreviewed tools. Follow the source C, manifest R and snapshot S evidence workflow. Missing prerequisites stay BLOCKED/NOT_RUN; self-review is not independent approval.

The current product name is AlphaForge, and this repository is the Hackathon edition. Use AlphaForge in new prose, UI and checkout names. Preserve historical evidence, the existing GitHub repository identity and stable protocol/storage identifiers unless a compatibility migration is explicitly assigned. The user approved fnm installation, a permanent AlphaForge checkout, adding verify-macos to required checks, and gated PR merge with actual master validation on 2026-09-12.
