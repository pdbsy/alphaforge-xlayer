# Phase One Product Coverage Evidence

## Sources and scope

- Task: `M3-04-PHASE1-PRODUCT`
- Macbeth05 coverage-gap source: `49432db158bdee6f4130bcb5c8c9d9fd6cd65a1f`
- Macbeth05 report: `docs/management/agents/qa/M3-05-PHASE1-ACCEPTANCE/COVERAGE-GAPS.md`
- Contract source consumed read-only: `2ad816200e7edfbfad96d765b4a696bc8b838c2d`
- Contract evidence head: `a13052993b6f408b7be835ecd6f4b13ef6df367d`

This follow-up changes tests and evidence only. It does not remove a product guard, weaken an
authorization or accounting assertion, or change production behavior.

The measured source set is exactly:

- `apps/web/src/chain-wallet.ts`
- `apps/web/src/m3-browser-runtime.ts`
- `apps/web/src/m3-chain-action-flow.ts`
- `apps/web/src/m3-vault-allowance.ts`
- `apps/web/src/m3-vault-client.ts`
- `apps/web/src/m3-vault-live-reader.ts`

The run uses Node `24.21.0`, Node's experimental test coverage, those six explicit include paths,
and the six matching test files. It executes `77` tests and does not treat test count as coverage.

## Result

| File | Lines | Branches | Functions |
| --- | ---: | ---: | ---: |
| `chain-wallet.ts` | 100.00% | 100.00% | 100.00% |
| `m3-browser-runtime.ts` | 99.88% | 97.87% | 96.77% |
| `m3-chain-action-flow.ts` | 100.00% | 100.00% | 100.00% |
| `m3-vault-allowance.ts` | 100.00% | 98.41% | 100.00% |
| `m3-vault-client.ts` | 100.00% | 100.00% | 100.00% |
| `m3-vault-live-reader.ts` | 100.00% | 100.00% | 100.00% |
| **Combined** | **99.95%** | **98.97%** | **99.07%** |

Every high-priority front-end semantic branch listed by Macbeth05 is now executed: trusted action
authority, account and chain changes at each wallet checkpoint, Owner mismatch, exact finite
allowance and amount boundaries, live simulation failure, canonical operation evidence, both
permitted reorg degradation reasons, and post-submission ambiguity with and without a transaction
hash.

The remaining zero-count records are defensive invariant branches in `m3-browser-runtime.ts` lines
229, 317, 330, 401, and 605, plus Node's synthetic `finally` edge at
`m3-vault-allowance.ts:240`. The runtime branches require an impossible state after its public
constructor and wallet parsing preconditions; line 605 is superseded by the earlier wrong-network
fail-closed return. Both successful and failed allowance cleanup, including a provider whose
`removeListener` throws, are tested. These records are retained rather than deleting guards or
adding a test-only production bypass.

## Evidence artifacts

- Spec and coverage log: `/tmp/macbeth04-phase1-coverage.log`
- Log SHA-256: `f379a777a8b467dced8b0b8f7bf6bee9048b38e04804aefb4d4f9c5e6af64f62`
- LCOV: `/tmp/macbeth04-phase1-coverage.lcov`
- LCOV SHA-256: `1eade2139607e3eab57145ce17f510ad9c20ba88efd017bdac3eb072a2f265dc`

The broader ten-file product-focused run passes `118/118`. The full repository suite executes
`633` tests: `632` pass and the existing shared migration-provenance test fails because Macbeth01
must update the integrated `product-ui.ts` hash. This follow-up introduces no additional full-suite
failure.
