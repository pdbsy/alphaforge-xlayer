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

contract AlphaForgeVaultHandler {
    AlphaForgeVaultHarness public immutable VAULT;
    StrategyPass public immutable PASS;
    AlphaForgeTestUSDC public immutable USDC;
    AlphaForgeTestETH public immutable AF_ETH;
    AlphaForgeTestBTC public immutable AF_BTC;
    StrategyPass public immutable DUST;
    bool public initialized;

    constructor(
        StrategyPass pass_,
        AlphaForgeTestUSDC usdc_,
        AlphaForgeTestETH afEth_,
        AlphaForgeTestBTC afBtc_,
        StrategyPass dust_
    ) {
        PASS = pass_;
        USDC = usdc_;
        AF_ETH = afEth_;
        AF_BTC = afBtc_;
        DUST = dust_;
        VAULT = new AlphaForgeVaultHarness(
            address(this),
            address(0xC0FFEE),
            keccak256("invariant-strategy"),
            keccak256("ipfs://invariant-strategy"),
            address(pass_),
            address(usdc_),
            address(afEth_),
            address(afBtc_)
        );
    }

    function initialize() external {
        if (initialized) return;
        if (USDC.balanceOf(address(this)) < 100e6 || PASS.balanceOf(address(this)) < 100 ether) {
            return;
        }
        initialized = true;
        require(USDC.approve(address(VAULT), type(uint256).max), "USDC approval failed");
        require(PASS.approve(address(VAULT), type(uint256).max), "Pass approval failed");
        require(AF_ETH.approve(address(VAULT), type(uint256).max), "ETH approval failed");
        require(AF_BTC.approve(address(VAULT), type(uint256).max), "BTC approval failed");
        VAULT.deposit(100e6);
    }

    function deposit(uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        uint256 usdcCapacity = USDC.balanceOf(address(this));
        uint256 passCapacity = PASS.balanceOf(address(this)) / 1e12;
        uint256 capacity = usdcCapacity < passCapacity ? usdcCapacity : passCapacity;
        uint256 amount = _bounded(rawAmount, capacity);
        if (amount != 0) VAULT.deposit(amount);
    }

    function recordProfit(uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        uint256 amount = _bounded(rawAmount, USDC.balanceOf(address(this)));
        if (amount != 0) VAULT.recordRealizedProfit(amount);
    }

    function recordLoss(uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        uint256 amount = _bounded(rawAmount, VAULT.trackedUsdcBalance());
        if (amount != 0) VAULT.recordRealizedLoss(amount);
    }

    function withdraw(uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        uint256 amount = _bounded(rawAmount, VAULT.withdrawableUsdc());
        if (amount != 0) VAULT.withdraw(amount);
    }

    function openPosition(bool useEth, uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        address token = useEth ? address(AF_ETH) : address(AF_BTC);
        uint256 balance = useEth ? AF_ETH.balanceOf(address(this)) : AF_BTC.balanceOf(address(this));
        uint256 amount = _bounded(rawAmount, balance);
        if (amount != 0) VAULT.openPosition(token, amount);
    }

    function settlePosition(bool useEth, uint256 rawAmount) external {
        if (!initialized || VAULT.closed()) return;
        address token = useEth ? address(AF_ETH) : address(AF_BTC);
        uint256 amount = _bounded(rawAmount, VAULT.trackedPosition(token));
        if (amount != 0) VAULT.settlePosition(token, amount);
    }

    function sendUntrackedDust(bool useUsdc, uint256 rawAmount) external {
        if (!initialized) return;
        if (useUsdc) {
            uint256 amount = _bounded(rawAmount, USDC.balanceOf(address(this)));
            if (amount != 0) require(USDC.transfer(address(VAULT), amount), "USDC dust failed");
        } else {
            uint256 amount = _bounded(rawAmount, DUST.balanceOf(address(this)));
            if (amount != 0) require(DUST.transfer(address(VAULT), amount), "token dust failed");
        }
    }

    function close() external {
        if (!initialized || VAULT.closed() || VAULT.openTrackedPositionCount() != 0) return;
        VAULT.close();
    }

    function rescueDust() external {
        if (!initialized || !VAULT.closed() || DUST.balanceOf(address(VAULT)) == 0) return;
        VAULT.rescueUntrackedToken(address(DUST));
    }

    function _bounded(uint256 rawAmount, uint256 maximum) private pure returns (uint256) {
        if (maximum == 0) return 0;
        return rawAmount % (maximum + 1);
    }
}

contract AlphaForgeVaultAccountingInvariantTest {
    uint256 private constant PASS_SCALE = 1e12;
    bytes32 private constant STRATEGY_ID = keccak256("invariant-strategy");

    StrategyPass private pass;
    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private afEth;
    AlphaForgeTestBTC private afBtc;
    StrategyPass private dust;
    AlphaForgeVaultHandler private handler;
    AlphaForgeVaultHarness private vault;
    PassLocker private locker;
    address[] private targets;

    function setUp() public {
        pass = new StrategyPass(
            "Invariant Pass", "INV-PASS", STRATEGY_ID, 1_000_000 ether, address(this)
        );
        usdc = new AlphaForgeTestUSDC(10_000_000e6, address(this));
        afEth = new AlphaForgeTestETH(10_000 ether, address(this));
        afBtc = new AlphaForgeTestBTC(1_000 ether, address(this));
        dust = new StrategyPass(
            "Invariant Dust",
            "INV-DUST",
            keccak256("invariant-dust"),
            1_000_000 ether,
            address(this)
        );
        handler = new AlphaForgeVaultHandler(pass, usdc, afEth, afBtc, dust);
        vault = handler.VAULT();
        locker = PassLocker(vault.passLocker());

        require(pass.transfer(address(handler), 500_000 ether), "Pass funding failed");
        require(usdc.transfer(address(handler), 5_000_000e6), "USDC funding failed");
        require(afEth.transfer(address(handler), 5_000 ether), "ETH funding failed");
        require(afBtc.transfer(address(handler), 500 ether), "BTC funding failed");
        require(dust.transfer(address(handler), 500_000 ether), "dust funding failed");
        handler.initialize();
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    function invariant_LockedPassExactlyMatchesActivePrincipal() public view {
        if (!vault.closed()) {
            require(
                locker.lockedBalance() == vault.principalBasis() * PASS_SCALE,
                "active capacity diverged"
            );
        }
    }

    function invariant_UntrackedTransfersNeverIncreaseWithdrawableAccounting() public view {
        uint256 expected;
        if (!vault.closed()) {
            expected = vault.openTrackedPositionCount() == 0
                ? vault.trackedUsdcBalance()
                : vault.realizedProfit();
        }
        require(vault.withdrawableUsdc() == expected, "dust changed withdrawable accounting");
        require(
            usdc.balanceOf(address(vault)) >= vault.trackedUsdcBalance(),
            "tracked USDC became unfunded"
        );
    }

    function invariant_NonOwnerMutationsAlwaysFailWithoutStateChanges() public {
        uint256 principalBefore = vault.principalBasis();
        uint256 trackedBefore = vault.trackedUsdcBalance();
        uint256 lockedBefore = locker.lockedBalance();
        uint256 positionCountBefore = vault.openTrackedPositionCount();
        bool closedBefore = vault.closed();

        (bool depositSuccess,) = address(vault).call(abi.encodeCall(vault.deposit, (1)));
        (bool withdrawSuccess,) = address(vault).call(abi.encodeCall(vault.withdraw, (1)));
        (bool closeSuccess,) = address(vault).call(abi.encodeCall(vault.close, ()));
        (bool rescueSuccess,) =
            address(vault).call(abi.encodeCall(vault.rescueUntrackedToken, (address(dust))));

        require(
            !depositSuccess && !withdrawSuccess && !closeSuccess && !rescueSuccess,
            "non-owner mutation succeeded"
        );
        require(vault.principalBasis() == principalBefore, "non-owner changed principal");
        require(vault.trackedUsdcBalance() == trackedBefore, "non-owner changed tracked USDC");
        require(locker.lockedBalance() == lockedBefore, "non-owner changed locked Pass");
        require(
            vault.openTrackedPositionCount() == positionCountBefore, "non-owner changed positions"
        );
        require(vault.closed() == closedBefore, "non-owner changed close state");
    }

    function invariant_CloseClearsAllProtocolObligations() public view {
        if (vault.closed()) {
            require(vault.principalBasis() == 0, "closed principal remained");
            require(vault.trackedUsdcBalance() == 0, "closed tracked USDC remained");
            require(vault.openTrackedPositionCount() == 0, "closed position remained");
            require(locker.lockedBalance() == 0, "closed Pass obligation remained");
        }
    }

    function invariant_RescueCannotReduceReservedBalances() public view {
        require(
            vault.reservedTrackedBalance(address(usdc)) == vault.trackedUsdcBalance(),
            "USDC reservation diverged"
        );
        require(
            vault.reservedTrackedBalance(address(afEth)) == vault.trackedPosition(address(afEth)),
            "ETH reservation diverged"
        );
        require(
            vault.reservedTrackedBalance(address(afBtc)) == vault.trackedPosition(address(afBtc)),
            "BTC reservation diverged"
        );
        require(
            vault.reservedTrackedBalance(address(pass)) == locker.lockedBalance(),
            "Pass reservation diverged"
        );
    }

    function testFuzz_ConversionsRemainExact(uint96 usdcRaw) public view {
        uint256 passRaw = vault.usdcToPassRaw(uint256(usdcRaw));
        require(passRaw == uint256(usdcRaw) * PASS_SCALE, "forward conversion rounded");
        require(vault.passToUsdcRaw(passRaw) == uint256(usdcRaw), "reverse conversion rounded");
    }

    function testFuzz_UnsolicitedUsdcDoesNotChangeAccounting(uint64 rawDust) public {
        uint256 available = usdc.balanceOf(address(this));
        uint256 dustAmount = uint256(rawDust) % available + 1;
        uint256 principalBefore = vault.principalBasis();
        uint256 trackedBefore = vault.trackedUsdcBalance();
        uint256 withdrawableBefore = vault.withdrawableUsdc();
        require(usdc.transfer(address(vault), dustAmount), "dust transfer failed");
        require(vault.principalBasis() == principalBefore, "dust changed principal");
        require(vault.trackedUsdcBalance() == trackedBefore, "dust changed tracked USDC");
        require(vault.withdrawableUsdc() == withdrawableBefore, "dust changed withdrawable");
    }
}
