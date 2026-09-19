// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";
import { PassLocker } from "../src/PassLocker.sol";
import { StrategyPass } from "../src/StrategyPass.sol";
import { AlphaForgeVaultHarness } from "./harness/AlphaForgeVaultHarness.sol";

interface VaultAccountingVm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

contract AlphaForgeVaultAccountingTest {
    VaultAccountingVm private constant VM =
        VaultAccountingVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    address private constant CREATOR = address(0xC0FFEE);
    bytes32 private constant STRATEGY_ID = keccak256("trend");
    bytes32 private constant STRATEGY_REF = keccak256("ipfs://trend-v1");

    StrategyPass private pass;
    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private eth;
    AlphaForgeTestBTC private btc;
    StrategyPass private unknown;
    AlphaForgeVaultHarness private vault;
    PassLocker private locker;

    function setUp() public {
        pass = new StrategyPass(
            "AlphaForge Trend Pass", "AF-TREND", STRATEGY_ID, 1_000_000 ether, ALICE
        );
        usdc = new AlphaForgeTestUSDC(1_000_000e6, address(this));
        eth = new AlphaForgeTestETH(10_000 ether, address(this));
        btc = new AlphaForgeTestBTC(1_000 ether, address(this));
        unknown = new StrategyPass(
            "Unknown Dust", "DUST", keccak256("dust"), 1_000 ether, address(this)
        );
        require(usdc.transfer(ALICE, 1_000e6), "owner funding failed");

        vault = new AlphaForgeVaultHarness(
            ALICE,
            CREATOR,
            STRATEGY_ID,
            STRATEGY_REF,
            address(pass),
            address(usdc),
            address(eth),
            address(btc)
        );
        locker = PassLocker(vault.passLocker());

        VM.startPrank(ALICE);
        usdc.approve(address(vault), type(uint256).max);
        pass.approve(address(vault), type(uint256).max);
        vault.deposit(100e6);
        VM.stopPrank();

        usdc.approve(address(vault), type(uint256).max);
        eth.approve(address(vault), type(uint256).max);
        btc.approve(address(vault), type(uint256).max);
    }

    // Catches profit withdrawal reducing principal or releasing capacity.
    function test_ProfitWithdrawalDoesNotUnlockPass() public {
        vault.recordRealizedProfit(50e6);
        uint256 ownerBefore = usdc.balanceOf(ALICE);

        VM.prank(ALICE);
        vault.withdraw(30e6);

        require(usdc.balanceOf(ALICE) == ownerBefore + 30e6, "owner did not receive profit");
        require(vault.principalBasis() == 100e6, "profit reduced principal");
        require(vault.trackedUsdcBalance() == 120e6, "tracked balance mismatch");
        require(vault.realizedProfit() == 20e6, "remaining profit mismatch");
        require(locker.lockedBalance() == 100 ether, "profit unlocked Pass");
    }

    // Catches mixed withdrawals unlocking Pass for the profit portion.
    function test_MixedWithdrawalConsumesProfitBeforePrincipal() public {
        vault.recordRealizedProfit(50e6);
        VM.prank(ALICE);
        vault.withdraw(70e6);

        require(vault.principalBasis() == 80e6, "wrong remaining principal");
        require(vault.trackedUsdcBalance() == 80e6, "wrong remaining equity");
        require(locker.lockedBalance() == 80 ether, "wrong remaining Pass lock");
    }

    // Catches principal withdrawal leaving excess capacity locked.
    function test_PrincipalWithdrawalUnlocksOneToOneCapacity() public {
        VM.prank(ALICE);
        vault.withdraw(30e6);
        require(vault.principalBasis() == 70e6, "principal not reduced");
        require(vault.trackedUsdcBalance() == 70e6, "tracked balance not reduced");
        require(locker.lockedBalance() == 70 ether, "principal capacity not unlocked");
        require(pass.balanceOf(ALICE) == 1_000_000 ether - 70 ether, "Pass not returned to owner");
    }

    // Catches a recorded loss silently releasing Pass without an owner withdrawal.
    function test_LossDoesNotAutomaticallyUnlockPass() public {
        vault.recordRealizedLoss(30e6);
        require(vault.trackedUsdcBalance() == 70e6, "loss not recorded");
        require(vault.principalBasis() == 100e6, "loss changed principal basis");
        require(locker.lockedBalance() == 100 ether, "loss unlocked Pass");
    }

    // Catches loss withdrawals failing to reduce principal and capacity together.
    function test_WithdrawalAfterLossUnlocksOnlyWithdrawnPrincipal() public {
        vault.recordRealizedLoss(30e6);
        VM.prank(ALICE);
        vault.withdraw(20e6);
        require(vault.trackedUsdcBalance() == 50e6, "loss withdrawal equity mismatch");
        require(vault.principalBasis() == 80e6, "loss withdrawal principal mismatch");
        require(locker.lockedBalance() == 80 ether, "loss withdrawal lock mismatch");
    }

    // Catches requiring an owner top-up before closing a loss-making Vault.
    function test_LossCloseReturnsRemainingUsdcAndAllLockedPassWithoutTopUp() public {
        vault.recordRealizedLoss(30e6);
        uint256 ownerUsdcBefore = usdc.balanceOf(ALICE);
        VM.prank(ALICE);
        vault.close();

        require(vault.closed(), "Vault not closed");
        require(vault.principalBasis() == 0, "principal obligation remained");
        require(vault.trackedUsdcBalance() == 0, "tracked usdc obligation remained");
        require(locker.lockedBalance() == 0, "locked Pass obligation remained");
        require(usdc.balanceOf(ALICE) == ownerUsdcBefore + 70e6, "remaining USDC not returned");
        require(pass.balanceOf(ALICE) == 1_000_000 ether, "remaining Pass not returned");
    }

    // Catches creator or arbitrary callers withdrawing or closing owner assets.
    function test_NonOwnerCannotWithdrawOrClose() public {
        VM.prank(CREATOR);
        (bool withdrawSuccess,) = address(vault).call(abi.encodeCall(vault.withdraw, (1e6)));
        VM.prank(CREATOR);
        (bool closeSuccess,) = address(vault).call(abi.encodeCall(vault.close, ()));
        require(!withdrawSuccess && !closeSuccess, "creator gained custody authority");
        require(vault.principalBasis() == 100e6, "unauthorized call changed principal");
        require(!vault.closed(), "unauthorized call closed Vault");
    }

    // Catches locked capacity being mistaken for an open strategy investment position.
    function test_LockedPassDoesNotBlockWithdrawalOrClose() public {
        require(vault.openTrackedPositionCount() == 0, "Pass created tracked position");
        VM.prank(ALICE);
        vault.withdraw(1e6);
        VM.prank(ALICE);
        vault.close();
        require(vault.closed(), "locked Pass blocked close");
    }

    // Catches a tracked position blocking profit that does not reduce principal.
    function test_OpenPositionAllowsProfitOnlyWithdrawal() public {
        vault.recordRealizedProfit(20e6);
        vault.openPosition(address(eth), 1 ether);
        VM.prank(ALICE);
        vault.withdraw(20e6);
        require(vault.principalBasis() == 100e6, "profit withdrawal reduced principal");
        require(vault.trackedPosition(address(eth)) == 1 ether, "position changed");
    }

    // Catches withdrawing principal or closing while protocol-accounted positions remain open.
    function test_OpenPositionBlocksPrincipalWithdrawalAndClose() public {
        vault.recordRealizedProfit(20e6);
        vault.openPosition(address(eth), 1 ether);
        VM.prank(ALICE);
        (bool withdrawSuccess,) = address(vault).call(abi.encodeCall(vault.withdraw, (20e6 + 1)));
        VM.prank(ALICE);
        (bool closeSuccess,) = address(vault).call(abi.encodeCall(vault.close, ()));
        require(!withdrawSuccess, "principal withdrawal accepted with open position");
        require(!closeSuccess, "close accepted with open position");
        require(vault.principalBasis() == 100e6, "failed calls changed principal");
        require(vault.trackedPosition(address(eth)) == 1 ether, "failed calls changed position");
    }

    // Catches a settled position leaving a stale gate that permanently traps the owner.
    function test_SettledPositionRestoresWithdrawalAndClose() public {
        vault.openPosition(address(btc), 2 ether);
        require(vault.openTrackedPositionCount() == 1, "position count not opened");
        vault.settlePosition(address(btc), 2 ether);
        require(vault.openTrackedPositionCount() == 0, "position count not cleared");
        VM.prank(ALICE);
        vault.withdraw(10e6);
        VM.prank(ALICE);
        vault.close();
        require(vault.closed(), "settled position still blocked close");
    }

    // Catches arbitrary tokens being registered as strategy positions.
    function test_TrackedPositionsAcceptOnlyConfiguredInvestmentAssets() public {
        unknown.approve(address(vault), type(uint256).max);
        (bool success,) =
            address(vault).call(abi.encodeCall(vault.openPosition, (address(unknown), 1 ether)));
        require(!success, "unknown token became tracked position");
        require(vault.openTrackedPositionCount() == 0, "unknown token changed position count");
    }

    // Catches direct known or unknown token balances creating positions or blocking owner exits.
    function test_UntrackedTokenDustDoesNotChangeAccountingOrBlockClose() public {
        require(eth.transfer(address(vault), 1 wei), "known dust transfer failed");
        require(unknown.transfer(address(vault), 2 wei), "unknown dust transfer failed");
        require(vault.trackedPosition(address(eth)) == 0, "known dust became position");
        require(vault.openTrackedPositionCount() == 0, "dust changed position count");
        require(vault.principalBasis() == 100e6, "dust changed principal");
        require(vault.trackedUsdcBalance() == 100e6, "dust changed equity");

        VM.prank(ALICE);
        vault.close();
        require(vault.closed(), "token dust blocked close");
        require(eth.balanceOf(address(vault)) == 1 wei, "close enumerated known dust");
        require(unknown.balanceOf(address(vault)) == 2 wei, "close enumerated unknown dust");
    }

    // Catches native dust being treated as tracked equity or a close obligation.
    function test_NativeDustDoesNotChangeEquityOrBlockClose() public {
        VM.deal(BOB, 1 ether);
        VM.prank(BOB);
        (bool sent,) = address(vault).call{ value: 1 wei }("");
        require(sent, "native dust transfer failed");
        require(vault.trackedUsdcBalance() == 100e6, "native dust changed equity");
        VM.prank(ALICE);
        vault.close();
        require(vault.closed(), "native dust blocked close");
        require(address(vault).balance == 1 wei, "close swept native dust");
    }

    // Catches direct AF-USDC dust being counted as withdrawable profit or swept by close.
    function test_UntrackedUsdcDustDoesNotBecomeProfitOrCloseSettlement() public {
        require(usdc.transfer(address(vault), 25e6), "USDC dust transfer failed");
        require(vault.realizedProfit() == 0, "USDC dust created profit");
        require(vault.withdrawableUsdc() == 100e6, "USDC dust became withdrawable");
        VM.prank(ALICE);
        vault.close();
        require(usdc.balanceOf(address(vault)) == 25e6, "close swept untracked USDC");
    }
}
