# Macbeth05 integration acceptance assignment

Registered by Macbeth01 on 2026-09-19 from the user's Macbeth05 restart instructions (SHA-256 `7d75c2eb19c29aba683efeaba28f370fb7e714ca16c9b07ce2381d31e773cb3c`). This supersedes Macbeth05's historical `M3-05-AUDIT` task only.

## Identity and baseline

- Agent: `Macbeth05`
- Task-ID: `AF-M3-05-INTEGRATION-ACCEPTANCE`
- Repository: `pdbsy/quantpass-arbitrum-hackathon`
- Branch prefix: `macbeth05/`
- QA branch: `macbeth05/AF-M3-05-INTEGRATION-ACCEPTANCE`
- Registration base: `7ecba357d5a19f387e86f578822af04a6261fed2`
- Combined acceptance candidate: **NOT ASSIGNED / BLOCKED**

The existing validator accepts this identity; no exception is needed. The immutable registration commit in this PR is the manager's task record. Registration does not require importing unmerged product code or claiming that master contains this record. Preserve old branches and their history.

After verifying this registration and the approved environment, Macbeth05 may create the named independent QA branch from the registration base for intake documentation and static review records only. That base is not the combined acceptance version. Do not independently merge or cherry-pick worker branches. Candidate-dependent test changes, dynamic integration acceptance and final conclusions wait for the manager's separately designated exact candidate SHA and confirmed scope. Once a candidate is available, specify any necessary branch transition without resetting or rewriting prior records.

## Current delivery references

These are intake anchors, not independently verified PASS evidence or automatically advancing refs:

| Worker | PR | Intake head | Boundary |
| --- | --- | --- | --- |
| Macbeth02 | #18 | `5d1a26d0dff967940dcf452ba9745d80ca9be12d` | Protocol foundations; Vault/accounting/authorization incomplete |
| Macbeth03 | #17 | `9f87275dc6c328ff0be10c7238a966109372856d` | ABI-independent chain adapter; final owner-only ABI and deployment absent |
| Macbeth04 | #16 | `4e15cefcd707d5c7d0e3f6614b44b3524926a114` | Product UI consumes 03; stacked on 03, does not include 02 |

No common candidate containing all three is designated here. Macbeth01 coordinates source review and candidate assembly, with 04 dependent on 03 and 02 integrated explicitly. This is not authorization to merge any PR or waive review. Refresh delivery facts before testing; revisions require new evidence.

## Scope and decision gates

The product objective remains a usable Robinhood Chain Testnet edition. Present deliveries are partial foundations, not a completed Pass/Vault loop. Do not lower the milestone to match the implementation.

The 03/04 implementation slice defers strategy execution. Preserve the user's protocol decisions for Strategy Pass capacity/accounting, typed Spot Swap and bounded strategy authorization with per-execution Risk Permits. Deferred runtime is not a failure of the narrower UI/adapter slice, nor proof of full M3 completion. The final integration acceptance scope remains pending explicit resolution of the user's A/B scope question; separate foundation review, Pass/Vault loop requirements and deferred execution rather than applying one undifferentiated verdict. Review exposed execution code even when UI actions are disabled.

Multi-asset partial withdrawal/dust semantics remain undecided. Do not choose an oracle, dust threshold or accounting model. Final owner action ABI/events/errors, owner identity rules and deployment metadata require authoritative protocol inputs. Injected confirmation depth is an implementation capability, not an approved policy value; distinguish indexer implementation facts from approved finality/rebuild requirements. Missing required inputs stay BLOCKED/NOT_RUN, not NOT_APPLICABLE.

## Authorized work and evidence

Continue the user's read-only intake and static negative-path review. On the registered QA branch, maintain intake and finding documents. Offline QA, tests and fixtures are authorized only when the relevant identity, candidate, scope, environment and decision prerequisites are satisfied. Use the approved Node 24.21.0/npm 11.19.1 and independently installed locked dependencies/data. Read the development toolchain and current status documents before changes.

Do not copy worker PASS claims as independent results. Record requirement, immutable source SHA, command, actual result and evidence; distinguish offline, hosted CI and Testnet coverage. Preserve failed runs and use the existing source C → manifest-only R → generated snapshot-only S workflow for changes affecting management evidence. Report business-code findings to their responsible worker; no business implementation repair is granted to 05.

No new RPC access, dependency installation beyond approved locked setup, credential access, governance change, signature, deployment, broadcast, asset action or merge authority is granted. Existing GOV-001/SUPPLY-001 boundaries remain. AI QA is not third-party audit or repository approval.

Commit subjects include `[Macbeth05]`, with `Agent-ID: Macbeth05` and `Task-ID: AF-M3-05-INTEGRATION-ACCEPTANCE` trailers. PR titles use `[Macbeth05][AF-M3-05-INTEGRATION-ACCEPTANCE] ...`; publishing requires applicable user authorization. The PR #14 one-time exception is closed.
