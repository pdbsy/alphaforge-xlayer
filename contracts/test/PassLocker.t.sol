// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { PassLocker } from "../src/PassLocker.sol";
import { StrategyPass } from "../src/StrategyPass.sol";
import { ReentrantPass } from "./mocks/ReentrantPass.sol";

interface LockerVm {
    function prank(address sender) external;
}

contract PassLockerTest {
    LockerVm private constant VM =
        LockerVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    uint256 private constant SUPPLY = 100 ether;
    bytes32 private constant STRATEGY_ID = keccak256("momentum");

    StrategyPass private pass;
    PassLocker private locker;
    PassLocker private attackLocker;

    function setUp() public {
        pass = new StrategyPass("Alpha Momentum Pass", "AF-MOM", STRATEGY_ID, SUPPLY, ALICE);
        locker = new PassLocker(address(this), ALICE, pass);
    }

    // Catches internal-number-only locking that fails to escrow the real Strategy Pass.
    function test_ControllerLocksExactPassIntoEscrow() public {
        _fundEscrow(10 ether);
        locker.lock(10 ether);
        require(locker.lockedBalance() == 10 ether, "wrong locked accounting");
        require(pass.balanceOf(address(locker)) == 10 ether, "escrow did not receive Pass");
        require(pass.balanceOf(ALICE) == 90 ether, "owner free balance not reduced");
    }

    // Catches unlock paths that change accounting without returning the escrowed Pass.
    function test_ControllerUnlocksExactPassToOwner() public {
        _fundEscrow(10 ether);
        locker.lock(10 ether);
        locker.unlock(4 ether);
        require(locker.lockedBalance() == 6 ether, "wrong remaining lock");
        require(pass.balanceOf(address(locker)) == 6 ether, "wrong escrow balance");
        require(pass.balanceOf(ALICE) == 94 ether, "owner did not receive unlocked Pass");
    }

    // Catches loss-based exits that leave any accounting-backed Pass trapped.
    function test_ControllerCanReleaseAllRemainingPass() public {
        _fundEscrow(37.5 ether);
        locker.lock(37.5 ether);
        uint256 released = locker.releaseAll();
        require(released == 37.5 ether, "wrong released amount");
        require(locker.lockedBalance() == 0, "lock not cleared");
        require(pass.balanceOf(ALICE) == SUPPLY, "owner did not recover all Pass");
        require(pass.balanceOf(address(locker)) == 0, "accounted Pass remained in escrow");
    }

    // Catches any caller other than the immutable Vault/controller moving owner Pass.
    function test_NonControllerCannotLockOrUnlock() public {
        VM.prank(BOB);
        (bool lockSuccess,) = address(locker).call(abi.encodeCall(locker.lock, 1 ether));
        require(!lockSuccess, "non-controller locked Pass");
        _fundEscrow(1 ether);
        locker.lock(1 ether);
        VM.prank(BOB);
        (bool unlockSuccess,) = address(locker).call(abi.encodeCall(locker.unlock, 1 ether));
        require(!unlockSuccess, "non-controller unlocked Pass");
        require(locker.lockedBalance() == 1 ether, "unauthorized call changed accounting");
    }

    // Catches a controller abusing an allowance to lock Pass from anyone other than its immutable owner.
    function test_ControllerCannotLockPassFromDifferentOwner() public {
        VM.prank(ALICE);
        require(pass.transfer(BOB, 1 ether), "BOB funding failed");
        VM.prank(BOB);
        pass.approve(address(locker), 1 ether);
        (bool success,) =
            address(locker).call(abi.encodeWithSignature("lock(address,uint256)", BOB, 1 ether));
        require(!success, "controller locked a different owner's Pass");
        require(pass.balanceOf(BOB) == 1 ether, "different owner lost Pass");
    }

    // Catches release replay or an underflow-based unlock after the lock has been cleared.
    function test_DoubleReleaseAndExcessUnlockRevertWithoutMutation() public {
        _fundEscrow(2 ether);
        locker.lock(2 ether);
        locker.releaseAll();
        (bool releaseSuccess,) = address(locker).call(abi.encodeCall(locker.releaseAll, ()));
        require(!releaseSuccess, "double release accepted");
        (bool unlockSuccess,) = address(locker).call(abi.encodeCall(locker.unlock, 1));
        require(!unlockSuccess, "excess unlock accepted");
        require(locker.lockedBalance() == 0, "failed release mutated lock");
        require(pass.balanceOf(ALICE) == SUPPLY, "failed release moved Pass");
    }

    // Catches accounting updates that exceed the real Pass already received by escrow.
    function test_InsufficientFreePassRevertsWithoutAccounting() public {
        (bool success,) = address(locker).call(abi.encodeCall(locker.lock, SUPPLY + 1));
        require(!success, "over-lock accepted");
        require(locker.lockedBalance() == 0, "failed lock changed accounting");
        require(pass.balanceOf(address(locker)) == 0, "failed lock moved Pass");
    }

    // Catches treating unsolicited escrow transfers as an owner's authorized lock balance.
    function test_DirectTransferDoesNotCreateLockAccounting() public {
        VM.prank(ALICE);
        require(pass.transfer(address(locker), 1), "direct transfer failed");
        require(locker.lockedBalance() == 0, "direct transfer created lock");
        (bool success,) = address(locker).call(abi.encodeCall(locker.releaseAll, ()));
        require(!success, "unaccounted Pass released as owner lock");
        require(pass.balanceOf(address(locker)) == 1, "failed release moved unaccounted Pass");
    }

    // Catches meaningless zero-value events and state transitions.
    function test_ZeroLockAndUnlockAreRejected() public {
        (bool lockSuccess,) = address(locker).call(abi.encodeCall(locker.lock, 0));
        require(!lockSuccess, "zero lock accepted");
        (bool unlockSuccess,) = address(locker).call(abi.encodeCall(locker.unlock, 0));
        require(!unlockSuccess, "zero unlock accepted");
    }

    // Catches an ERC-20 callback that re-enters the immutable controller and tries to release Pass mid-lock.
    function test_MaliciousPassCannotReenterUnlock() public {
        ReentrantPass malicious = new ReentrantPass(SUPPLY, ALICE);
        attackLocker = new PassLocker(address(this), ALICE, malicious);
        VM.prank(ALICE);
        require(malicious.transfer(address(attackLocker), 10 ether), "attack funding failed");
        attackLocker.lock(10 ether);
        malicious.configureCallback(address(this), abi.encodeCall(this.reenterUnlock, ()));
        attackLocker.unlock(1 ether);

        require(malicious.callbackAttempted(), "callback not attempted");
        require(!malicious.callbackSucceeded(), "reentrant unlock succeeded");
        require(attackLocker.lockedBalance() == 9 ether, "reentrancy changed accounting");
        require(malicious.balanceOf(address(attackLocker)) == 9 ether, "reentrancy changed escrow");
    }

    // Catches accounting drift across arbitrary fractional lock and unlock amounts.
    function testFuzz_LockAndUnlockPreserveEscrowAccounting(
        uint256 lockCandidate,
        uint256 unlockCandidate
    ) public {
        uint256 lockAmount = (lockCandidate % SUPPLY) + 1;
        uint256 unlockAmount = (unlockCandidate % lockAmount) + 1;
        _fundEscrow(lockAmount);
        locker.lock(lockAmount);
        locker.unlock(unlockAmount);
        uint256 remaining = lockAmount - unlockAmount;
        require(locker.lockedBalance() == remaining, "fuzz accounting mismatch");
        require(pass.balanceOf(address(locker)) == remaining, "fuzz escrow mismatch");
        require(pass.balanceOf(ALICE) == SUPPLY - remaining, "fuzz owner balance mismatch");
    }

    function reenterUnlock() external {
        attackLocker.unlock(1);
    }

    function _fundEscrow(uint256 amount) private {
        VM.prank(ALICE);
        require(pass.transfer(address(locker), amount), "escrow funding failed");
    }
}
