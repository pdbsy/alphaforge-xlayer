# X Layer adapter verification receipt

Agent-ID: Macbeth03
Task-ID: AF-XLAYER-03-ADAPTER
Project: AlphaForge-XLayer
Track: X Layer
Repository: pdbsy/alphaforge-xlayer
Manager: XLayerPM (AF_Xlayer)

This receipt covers only the X Layer worker candidate, not the parallel Robinhood
track, a deployed network, or manager integration.

## Source

- Imported base: `18f5352070910a867b9729b031aa2e3951785e01`.
- Intake: `9457969fb6aaed7993ab4af6cae13942ea49a948`.
- Implementation C: `6a2350f50852731c8a6433bcce0aa4e53c4f772c`.
- C tree: `474149061771f915673819d32456ef5611edaa1e`.
- Candidate: [Draft PR 4](https://github.com/pdbsy/alphaforge-xlayer/pull/4).

The subsequent receipt commit changes only adapter documentation and task-track
labels. No manager/other worker commits or test overlays were used.

## Actual local results

Pinned Node 24.21.0 / npm 11.19.1, separate dependencies and fixture data.

| Check | Result |
| --- | --- |
| Initial five-file chain baseline | 58 passed |
| New pair/composition regressions before implementation | 4 failed as expected |
| New evidence-route isolation cases before fix | 2 failed, foreign-chain reads returned 200 |
| Final six-file chain/API regression | 72 passed, 0 failed |
| Final npm test | 600 passed, 0 failed, 0 skipped |
| npm run typecheck | Passed |
| npm run lint | Passed |
| npm run format:check | Passed |
| npm run secrets:check | Passed, bounded current tree only |
| npm run privacy:check | Passed, bounded current tree only |
| git diff --check | Passed |

The focused command is recorded in README.md. Existing npm scripts were used
unchanged. Fixtures reject X Layer 195/196/46630, crossed Robinhood/1952,
unreviewed environments and nonnumeric chain IDs even when input and expected
match and the manifest digest is recomputed. Positive controls preserve both
approved pairs. RPC mismatch tests observe only eth_chainId. Full local startup,
receipt reconciliation, replay/restart, data isolation and 404 evidence filtering
are exercised without live network requests.

## Admission and remote CI limits

On clean C, environment admission returned exit 1 and eligibleForEvidence=false:
repository FAIL (inherited binding), ports FAIL (a reserved local port is already
occupied), contracts NOT_RUN. Tools, history, workspace, index, identity, files,
isolation, manager and local/mock checks passed. The pre-existing listener was
not stopped or modified.

[CI run 35713932462](https://github.com/pdbsy/alphaforge-xlayer/actions/runs/35713932462)
for C failed all nine jobs before project dependencies were installed, at
`Exact npm bootstrap BLOCKED at inputs`. This is not a passing CI result.
AF-XLAYER-06-CI owns the repository/bootstrap migration; this worker did not relax
gates or modify their inputs. Actual integrated CI must be rerun after that work.

Generated manifest R / snapshot S: NOT_RUN; no generated PASS evidence was edited.
Independent engineering QA: requested from the assigned QA worker through XLayerPM
against exact C; pending at this receipt. GitHub independent approval: NOT_RUN.
Contracts, deployment, signing, broadcasting, live RPC and mainnet: NOT_RUN.
