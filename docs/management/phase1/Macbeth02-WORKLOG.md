# Macbeth02 Phase One Contracts Worklog

- Task: `M3-02-PHASE1-CONTRACTS`
- Base: `18f5352070910a867b9729b031aa2e3951785e01`
- Branch: `macbeth02/m3-phase1-contracts`
- Draft PR: `https://github.com/pdbsy/quantpass-arbitrum-hackathon/pull/24`
- Public ACK: `https://github.com/pdbsy/quantpass-arbitrum-hackathon/pull/24#issuecomment-5747141328`
- Status: `ACTIVE / LOCAL / NOT_DEPLOYED`
- Verified implementation source C: `e5eff6805d9705745bc0b4483de83466e5693ffa`

## Intake and baseline

The branch was created directly from the fixed base after a fresh fetch. The prior Macbeth02
branch and Draft PR #18 were preserved. Approved versions were verified as Node `24.21.0`, npm
`11.19.1`, Forge `1.5.1`, solc `0.8.31` and Slither `0.11.3`.

The exact-base contract gate passed with 121 Solidity tests, 20 Python dependency/ABI mutation
tests, Slither with no findings, and compiler/published Vault ABI equality. The initial root
`npm run check` passed all 591 Node tests and every preceding check, then stopped at
`management:check` with `RECORDED_GIT_BRANCH_MISMATCH`. Generated management evidence is owned by
Macbeth01 under this assignment, so Macbeth02 did not alter the shared report or snapshot. The
result remains an explicit manager-owned integration item rather than a worker PASS.

## Gap determination

Tree and semantic comparison found that PR #21 already contains the core Strategy Pass, Vault,
PassLocker, frozen ABI and extensive custody/accounting/rescue/invariant tests. This task does not
reimplement those contracts. Remaining work is limited to missing delivery evidence, local
deployment rehearsal, adverse-transfer atomicity regressions and Testnet preparation.

## Added evidence

- deterministic eight-contract ABI/selector/topic/error/constructor/immutable/bytecode manifest;
- clean-environment manifest equality and Phase One contract wrapper;
- isolated Forge EVM deployment and owner lifecycle rehearsal;
- atomic rollback regressions for a short Pass deposit, short AF-USDC withdrawal and failed Pass
  unlock after AF-USDC movement;
- Phase One contract delivery and Testnet deployment-plan documents.

No external RPC, signature, deployment, transaction or broadcast was performed.

## Current verification

- `bash contracts/script/check-phase1-contracts.sh`: PASS; 126 Solidity tests, 20 Python
  dependency/ABI mutation tests, fuzz and invariants, Slither with no findings, frozen Vault ABI
  equality, eight-contract manifest equality and two isolated deployment-rehearsal tests.
- Manifest negative mutation: PASS; a changed status field was rejected with
  `Phase One contract manifest differs from compiler artifacts`.
- Root formatting, privacy and secret checks: PASS.
- Root `npm run check`: 591/591 tests and all checks before management passed; final command remains
  FAIL at manager-owned `management:check` with `RECORDED_GIT_BRANCH_MISMATCH`.
- `npm run build:web`: PASS when run separately after the management-owned stop.
