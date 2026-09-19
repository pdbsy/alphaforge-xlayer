# AF-M3-05 integration acceptance

Owner: `Macbeth05`

Task: `AF-M3-05-INTEGRATION-ACCEPTANCE`

QA branch: `macbeth05/AF-M3-05-INTEGRATION-ACCEPTANCE`
Status: **FOCUSED RETEST COMPLETE; INTEGRATED OFFLINE ACCEPTANCE BLOCKED; TESTNET NOT RUN**

No common candidate containing the Macbeth02, Macbeth03, and Macbeth04 deliveries has been designated. The records in this directory therefore preserve exact per-PR static review results and must not be read as acceptance of a combined version.

- [Restart intake](RESTART-INTAKE.md)
- [Requirement-to-evidence matrix](ACCEPTANCE-MATRIX.md)
- [Findings and follow-up](FINDINGS.md)
- [Independent execution log](EXECUTION-LOG.md)
- [Interim acceptance report](INTERIM-ACCEPTANCE.md)

The two findings reported against Macbeth03 head `9f87275dc6c328ff0be10c7238a966109372856d` are fixed at replacement head `20347ec22729346d617525d64dc76f58354b5f0d`; the independent focused regression passed 42/42. Macbeth04 head `037c2b55f7eb03b80b60dd11f4b4c400fb9c1215` passed a 71/71 focused regression and produced no new reportable finding in its exact diff. These are slice-bound results: PR #16 hosted admission is still blocked, there is no common 02–04 candidate, and no Testnet work was run. This work is AI-assisted QA, not a third-party contract audit or repository approval.
