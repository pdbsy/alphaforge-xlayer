# AlphaForge M3 Partial On-chain Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Repository instructions prohibit additional workers. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the owner-controlled AlphaForge Vault custody, exact Pass capacity accounting,
tracked-position withdrawal gates, close settlement, and post-close dust rescue required by
M3-01-PARTIAL-ONCHAIN-INTEGRATION.

**Architecture:** One non-upgradeable Vault stores an explicit immutable owner and strategy
identity, deploys one immutable PassLocker, and treats only explicit protocol accounting as equity.
AF-USDC principal uses six-decimal base units; Pass capacity uses eighteen-decimal raw units with
an exact `1e12` conversion. Production exposes no strategy execution hook; a test-only derived
harness exercises internal settlement accounting for profit, loss, and tracked positions.

**Tech Stack:** Solidity 0.8.31, Foundry 1.5.1, OpenZeppelin Contracts 5.4.0 derived pinned subset,
Slither 0.11.3, Node 24.21.0, npm 11.19.1.

**Spec:** user-provided M3 partial on-chain integration prompt retained outside the repository.

## Global Constraints

- Work only on `macbeth02/M3-02-PROTOCOL` with `Agent-ID: Macbeth02` and `Task-ID: M3-02-PROTOCOL`.
- Base remains repository master `7ecba357d5a19f387e86f578822af04a6261fed2`; preserve all existing branch history.
- AF-USDC has 6 decimals; Strategy Pass has 18 decimals; `passRaw = usdcRaw * 1e12` exactly.
- Reverse capacity conversion reverts unless `passRaw % 1e12 == 0`; ordinary Pass transfers retain full 18-decimal precision.
- `owner_` is explicit, nonzero, immutable, and never inferred from `msg.sender`; no ownership transfer or renounce interface exists.
- Only owner may call `deposit(uint256)`, `withdraw(uint256)`, and `close()`; settlement recipient is always the immutable owner.
- Profit withdrawal consumes tracked profit before principal; only principal reduction unlocks Pass; loss never unlocks Pass automatically.
- A tracked non-USDC position blocks only the principal portion of partial withdrawal and blocks close until explicitly settled to zero.
- Direct token/native transfers remain untracked: they do not change principal, equity, profit, capacity, withdrawal, or close eligibility.
- Rescue is owner-only, post-close, fixed-recipient, non-reentrant, and limited to `actualBalance - reservedTrackedBalance` in each token's native units.
- Do not add strategy execution, upgradeability, relayers, EIP-712, business nonces, arbitrary recipients, RPC, signing, broadcast, deployment, or secrets.
- Every behavior starts with a focused failing test; use real token balance movement in the test harness for profit, loss, and position settlement.

---

### Task 1: Freeze the reviewable Vault interface

**Files:**
- Create: `contracts/src/interfaces/IAlphaForgeVault.sol`
- Create: `docs/protocol/M3-VAULT-ABI-HANDOFF.md`
- Create: `contracts/test/AlphaForgeVault.interface.t.sol`

**Interfaces:**
- Constructor documentation produces `(address owner_, address strategyCreator_, bytes32 strategyId_, bytes32 strategyRef_, address pass_, address afUsdc_, address afEth_, address afBtc_)`.
- Mutations produce `deposit(uint256)`, `withdraw(uint256)`, `close()`,
  `rescueUntrackedToken(address) returns (uint256)`, and `rescueNative() returns (uint256)`.
- Views produce immutable identity/token/locker getters, `principalBasis()`,
  `trackedUsdcBalance()`, `trackedPosition(address)`, `openTrackedPositionCount()`, `closed()`,
  `realizedProfit()`, `withdrawableUsdc()`, `reservedTrackedBalance(address)`,
  `untrackedExcess(address)`, `usdcToPassRaw(uint256)`, and `passToUsdcRaw(uint256)`.

- [x] **Step 1: Write the RED interface test.** Import `IAlphaForgeVault`, reference every selector,
  event signature, and custom-error selector, and require the documented constructor tuple to match
  the handoff document's literal ABI declaration.
- [x] **Step 2: Run `forge test --match-path test/AlphaForgeVault.interface.t.sol` and observe the
  missing-interface failure.**
- [x] **Step 3: Add the interface declarations and exact handoff document.** Mark addresses,
  bytecode hashes, ABI hash, and deployment evidence as null/NOT_DEPLOYED until a real compiled
  implementation exists.
- [x] **Step 4: Run the focused interface test and the existing PassLocker suite.**
- [x] **Step 5: Commit `[Macbeth02][M3-02-PROTOCOL] Freeze partial Vault interface` and immediately
  send the exact commit and signatures to Macbeth03 and Macbeth04.**

### Task 2: Implement immutable custody and exact deposit capacity

**Files:**
- Create: `contracts/src/AlphaForgeVault.sol`
- Create: `contracts/test/AlphaForgeVault.custody.t.sol`
- Modify: `contracts/test/AlphaForgeVault.interface.t.sol`

**Interfaces:**
- Consumes the Task 1 interface and existing `PassLocker(address,address,IERC20)`.
- Produces exact conversion helpers and owner-only deposit with real AF-USDC and Pass movement.

- [x] **Step 1: Write RED constructor tests.** Reject zero owner, creator, strategy identity, token,
  duplicate token, wrong Pass decimals, and wrong AF-USDC decimals; prove owner differs from
  deployer, creator may equal or differ from owner, and no ownership transfer/renounce/initialize
  selector exists.
- [x] **Step 2: Run the focused custody file and observe failure because `AlphaForgeVault` is absent.**
- [x] **Step 3: Implement immutable constructor state and deploy the PassLocker with
  `(address(this), owner_, pass_)`.** Accept native dust through `receive()` without accounting it.
- [x] **Step 4: Write RED conversion/deposit tests.** Cover 1 AF-USDC base unit to `1e12` Pass raw,
  inexact reverse conversion, full 18-decimal ordinary Pass transfer, owner-only deposit, exact
  100 AF-USDC/100 Pass lock, third-party allowance rejection, closed rejection, zero amount,
  balance-delta mismatch, and overflow.
- [x] **Step 5: Implement conversions and deposit with checks-effects-interactions,
  `SafeERC20`, exact balance deltas, and `nonReentrant`.** Increase `principalBasis` and
  `trackedUsdcBalance` only by the accepted six-decimal amount.
- [x] **Step 6: Run custody, interface, PassLocker, Pass, and asset tests.**
- [x] **Step 7: Commit `[Macbeth02][M3-02-PROTOCOL] Add immutable Vault custody`.**

### Task 3: Implement profit-first withdrawal, tracked positions, and loss-safe close

**Files:**
- Modify: `contracts/src/AlphaForgeVault.sol`
- Create: `contracts/test/harness/AlphaForgeVaultHarness.sol`
- Create: `contracts/test/AlphaForgeVault.accounting.t.sol`
- Create: `contracts/test/AlphaForgeVault.accounting.invariant.t.sol`
- Create: `docs/protocol/M3-PASS-VAULT-ACCOUNTING.md`

**Interfaces:**
- Production internal hooks produce `_increaseTrackedUsdc`, `_decreaseTrackedUsdc`, and
  `_setTrackedPosition`; no external production strategy execution method is added.
- The test harness controller moves real tokens and then calls those internal hooks to simulate
  legitimate settlement; an unsolicited transfer alone never changes accounting.

- [x] **Step 1: Write RED accounting tests.** Cover profit-only withdrawal, mixed profit/principal,
  principal-only withdrawal, loss without unlock, loss withdrawal, loss close without top-up,
  complete Pass release, fixed recipient, and transfer-failure atomicity.
- [x] **Step 2: Write RED tracked-position tests.** Cover allowed AF-ETH/AF-BTC positions, unsupported
  assets, profit-only withdrawal while a position is open, principal withdrawal block, close block,
  position settlement, locked-Pass exception, and unsolicited known/unknown token dust.
- [x] **Step 3: Implement internal tracked accounting plus owner-only `withdraw` and `close`.** Compute
  `profitAmount = min(amount, max(trackedUsdcBalance - principalBasis, 0))`; unlock exactly
  `(amount - profitAmount) * 1e12`; close transfers only tracked AF-USDC, zeros obligations, and
  releases all remaining accounted Pass atomically.
- [x] **Step 4: Run focused accounting tests and all prior Vault tests.**
- [x] **Step 5: Add fuzz/invariant coverage.** Prove `lockedPassRaw == principalBasis * 1e12` while
  active, unsolicited tokens never increase withdrawable value, non-owner mutations fail, and a
  successful close leaves zero tracked AF-USDC/principal/locked Pass obligations.
- [x] **Step 6: Run the pinned 256 fuzz and 64x32 invariant profile.**
- [x] **Step 7: Commit `[Macbeth02][M3-02-PROTOCOL] Enforce Vault principal accounting`.**

### Task 4: Implement post-close dust rescue and failure isolation

**Files:**
- Modify: `contracts/src/AlphaForgeVault.sol`
- Create: `contracts/test/AlphaForgeVault.rescue.t.sol`
- Create: `contracts/test/mocks/ConfigurableAsset.sol`
- Create: `contracts/test/mocks/ReentrantAsset.sol`
- Modify: `contracts/test/AlphaForgeVault.accounting.invariant.t.sol`

**Interfaces:**
- `reservedTrackedBalance(token)` returns tracked AF-USDC, tracked AF-ETH/AF-BTC, or locked Pass
  obligations in that token's own raw units.
- `untrackedExcess(token)` returns `max(actualBalanceAtVault - reservedTrackedBalance, 0)`.

- [x] **Step 1: Write RED rescue tests.** Cover active rejection, non-owner rejection, fixed owner
  recipient, unknown ERC-20/native dust, known-asset excess, zero excess, locked Pass reservation,
  and no principal/profit/capacity mutation.
- [x] **Step 2: Write RED failure/reentrancy tests.** Prove malicious token rescue failure leaves an
  earlier close intact; AF-USDC close transfer failure and Pass release failure revert the entire
  close; callbacks cannot reenter withdraw, close, token rescue, or native rescue.
- [x] **Step 3: Implement reserved/excess views and rescue methods with `SafeERC20`, fixed recipient,
  closed-state checks, effects before interactions where applicable, and `nonReentrant`.**
- [x] **Step 4: Run rescue, accounting, custody, interface, and PassLocker suites.**
- [x] **Step 5: Extend invariants so rescue never reduces a reserved tracked balance and non-owner
  callers never change Vault asset state.**
- [x] **Step 6: Commit `[Macbeth02][M3-02-PROTOCOL] Add isolated Vault dust rescue`.**

### Task 5: Publish compiled ABI evidence and complete local verification

**Files:**
- Modify: `docs/protocol/M3-VAULT-ABI-HANDOFF.md`
- Modify: `docs/protocol/M3-CURRENT-ABI-DRAFT.md`
- Modify: `contracts/deployment/m3-robinhood-testnet.template.json`
- Modify: `tools/check-m3-deployment-template.mjs`
- Modify: `test/m3-deployment-template.test.mjs`
- Create: `docs/protocol/M3-PROTOCOL-WORKLOG.md`

**Interfaces:**
- Produces compiled method/error selectors, event topics, constructor schema, ABI hash, creation
  code hash, runtime code hash, and a `COMPILED_LOCAL_ONLY` Vault manifest entry.
- Keeps every deployed address, deployment block/transaction, finality value, and evidence of
  broadcast null with `deploymentStatus: NOT_DEPLOYED`.

- [x] **Step 1: Generate hashes and selectors only from pinned compiler artifacts and record the
  exact source commit used.**
- [ ] **Step 2: Replace the Vault manifest's blocked interface status with
  `COMPILED_LOCAL_ONLY`; fill local artifact hashes and constructor schema, but leave all onchain
  fields null.**
- [ ] **Step 3: Update the validator tests first so fabricated addresses, RPC, keys, signing,
  broadcast, or deployment evidence still fail closed.**
- [x] **Step 4: Run `bash contracts/script/check-local.sh` and require all format/build/unit/fuzz/
  invariant/dependency-equivalence/Slither gates to pass.**
- [ ] **Step 5: Run exact Node 24.21.0 `npm run check`, inspect `git diff --check`, secrets, tracked
  files, and the absence of RPC/signing/broadcast additions.**
- [ ] **Step 6: Commit source C, regenerate and separately commit management report R and snapshot S,
  then rerun exact-head gates.**
- [ ] **Step 7: Push the existing Draft PR #18 and send exact ABI/hash/SHA evidence to Macbeth01,
  Macbeth03, and Macbeth04. Do not merge or deploy.**

## Self-Review

- Spec coverage: Tasks 1-4 map all 37 minimum contract cases plus the five required invariants;
  Task 5 covers ABI/manifest/documentation/evidence handoff.
- Deliberate exclusions: no strategy runtime, arbitrary call, upgrade, pause, relayer, EIP-712,
  business nonce, custom recipient, RPC, deployment, signing, broadcast, or GitHub protection change.
- Type consistency: principal and tracked AF-USDC use `uint256` six-decimal base units; Pass locks use
  `uint256` eighteen-decimal raw units; tracked positions and rescue use each token's raw units.
- Atomicity: required AF-USDC settlement and Pass release revert close together; an independent
  post-close rescue failure cannot revert the already completed close transaction.
