# X Layer integration checker handoff

Project: AlphaForge-XLayer. Track: X Layer. Repository: pdbsy/alphaforge-xlayer. Manager: XLayerPM. Worker: Macbeth06. Task: AF-XLAYER-06-CI.

Reviewed implementation source: `a4a490a82b662be5a4684bbc2da3021dd002013d`.
Initial implementation source: `46efeeaa6a4b1394432b9e00f38de020a5826377`; two defects found by independent review were corrected before integration acceptance.
Previous worker head: `0244de746dd532336a8314ac72ce34d84a75f0bc`.

The separate checker admits only the assigned manager branch and repository, the fixed imported master, five registered worker/task/branch/author pairs, and nine explicitly reviewed legacy manager commits. It reads the manifest from the tested Git head. Every commit from the fixed base to each pinned source head must map exactly once into the candidate, preserving the complete author record and message as raw bytes. Git three-way replay uses the original parent as its fixed merge base and applies the source commit to the imported parent; the result must equal the entire imported tree. Change location, whitespace, modes, paths and all blob bytes are significant while normal upstream line offsets remain valid. Source branches may advance after a frozen source head, but the frozen head must remain in that exact branch's history. Unregistered future imports remain rejected.

New manager records require the assigned author, subject prefix and exactly one matching Manager-ID and Task-ID. Canonical PR repositories, head, fixed master base and manager title are checked. Introducing this integration through an unbound merge queue is rejected even if its manifest is subsequently removed. Ordinary worker validation and both historical manager profiles are preserved.

## Local validation

- RED observed before implementation: the accepted integration fixture failed with the inherited worker-prefix error; the CI-stage assertion identified the old contract entrypoint.
- PASS: 89 tests across the new integration suite and existing CI, integration, lifecycle, bypass and security regressions. Real Git fixtures cover preserved cherry-picks, offset changes, binary and whitespace drift, source advancement, omitted/duplicate mappings, foreign identities, reviewed legacy history, shallow history, forks, source ancestry and merge queues.
- PASS: root suite 596/596, typecheck, lint, formatting, secrets baseline, public metadata, network/governance/supply/threat/planning/Forum checks, and web build. The final regression and complete check ran at the clean reviewed implementation source; they are local engineering results, not independent approval or final manager C/R/S evidence.
- The first full check was blocked by sandbox loopback-listen EPERM. Its output was retained; the authorized local rerun passed the suite.
- The complete `npm run check` remained FAIL at management dashboard replay: the earlier adaptation checkpoint reported `RECORDED_GIT_NOT_CLEAN`, while the final clean implementation source reported `RECORDED_GIT_BRANCH_MISMATCH`. No historical dashboard evidence was edited. The manager owns generating new C/R/S evidence for the combined candidate.

## Independent correction and publication

Macbeth03 reproduced two defects in the initial comparison: moving a change to another function was accepted after hunk offsets were stripped, and different invalid UTF-8 bytes could compare equal after decoding. Three real Git regressions first reproduced those failures, including a corresponding raw-message case. The replacement uses raw author/message bytes and fixed-base Git three-way tree replay. All 30 tests in the new suite pass. Macbeth03 independently reran both original counterexamples plus three controls against the corrected source and closed both findings with a bounded engineering approval. This is not a GitHub approval or external security attestation.

The reviewed source was pushed normally and its exact remote branch head read back as `a4a490a82b662be5a4684bbc2da3021dd002013d`. The manager may pin that source even when this worker later appends documentation. Hosted results are recorded separately in the PR receipt.

## Integration dependencies

The manager owns `docs/xlayer/integration-provenance.json` and adding `test/xlayer-integration-identity.test.mjs` to the root test command. The manifest schema sent to the manager uses `schema_version`, `repository`, `branch`, `task`, `base`, `legacyManagerCommits`, and `sources` entries containing `agent`, `task`, `branch`, `head`, and `commits` pairs of `source` and `imported`.

The contract stage now invokes `contracts/script/check-xlayer-contracts.sh`. Macbeth02's committed script at its delivered source head first executes the complete inherited `check-m3-vault.sh`, then the X Layer template validator. That script belongs to PR2 and is absent from this isolated worker branch until manager integration. A worker-only hosted contract failure due to the missing integration dependency must remain visible. Workflow jobs, permissions, tool pins and scanner policy were not changed.

Only the affected `tools/check-agent-identity.mjs` artifact-provenance row receives an appended adaptation and current hash. Original migration identity and all earlier adaptations remain; the migration-provenance test was not modified.

The earlier hosted run for worker head `0244de7` ended with five jobs passing and four failing: three platform jobs reached 596 passing tests and admitted their environment, then failed management-context replay; Gitleaks current files passed but two historical findings remained FAIL. These are historical results for that head, not results for this new implementation. New hosted execution and manager review are reported separately in PR6. CodeQL and Dependency Review retain their existing manual-only workflow triggers.

Boundary: local/mock only; no deployment, signatures, broadcast, required-check changes, scanner exceptions, history rewrite or merge. Self-checks do not constitute independent approval.
