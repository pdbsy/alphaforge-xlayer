// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { AlphaForgeVault } from "../src/AlphaForgeVault.sol";
import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";
import { PassLocker } from "../src/PassLocker.sol";
import { StrategyPass } from "../src/StrategyPass.sol";

interface VaultCustodyVm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

// Test-only factory: administration does not confer control of created Vaults.
contract VaultCustodyFactory {
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function create(address vaultOwner, address creator, address[4] calldata tokens)
        external
        returns (AlphaForgeVault)
    {
        require(msg.sender == owner, "factory owner required");
        return new AlphaForgeVault(
            vaultOwner,
            creator,
            keccak256("trend"),
            keccak256("ipfs://trend-v1"),
            tokens[0],
            tokens[1],
            tokens[2],
            tokens[3]
        );
    }
}

contract AlphaForgeVaultCustodyTest {
    VaultCustodyVm private constant VM =
        VaultCustodyVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant ALICE = address(0xA11CE);
    address private constant BOB = address(0xB0B);
    address private constant CREATOR = address(0xC0FFEE);
    bytes32 private constant STRATEGY_ID = keccak256("trend");
    bytes32 private constant STRATEGY_REF = keccak256("ipfs://trend-v1");
    uint256 private constant USDC_SUPPLY = 1_000_000e6;
    uint256 private constant PASS_SUPPLY = 1_000_000 ether;

    StrategyPass private pass;
    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private eth;
    AlphaForgeTestBTC private btc;
    AlphaForgeVault private vault;

    function setUp() public {
        pass =
            new StrategyPass("AlphaForge Trend Pass", "AF-TREND", STRATEGY_ID, PASS_SUPPLY, ALICE);
        usdc = new AlphaForgeTestUSDC(USDC_SUPPLY, ALICE);
        eth = new AlphaForgeTestETH(10_000 ether, ALICE);
        btc = new AlphaForgeTestBTC(1_000 ether, ALICE);
        vault = _deploy(ALICE, CREATOR, address(pass), address(usdc), address(eth), address(btc));
        _approveOwner(vault);
    }

    // Catches deriving the asset owner from the deployer or strategy creator.
    function test_ConstructorUsesExplicitOwnerAndSeparateCreator() public view {
        require(vault.owner() == ALICE, "explicit owner not stored");
        require(vault.owner() != address(this), "deployer became owner");
        require(vault.strategyCreator() == CREATOR, "creator not stored");
        require(vault.strategyCreator() != vault.owner(), "roles were collapsed");
        require(vault.strategyId() == STRATEGY_ID, "strategy id mismatch");
        require(pass.strategyId() == STRATEGY_ID, "Pass strategy id mismatch");
        require(vault.strategyRef() == STRATEGY_REF, "strategy ref mismatch");
        require(vault.pass() == address(pass), "pass mismatch");
        require(vault.afUsdc() == address(usdc), "usdc mismatch");
        require(vault.afEth() == address(eth), "eth mismatch");
        require(vault.afBtc() == address(btc), "btc mismatch");

        PassLocker locker = PassLocker(vault.passLocker());
        require(locker.owner() == ALICE, "locker owner mismatch");
        require(locker.vault() == address(vault), "locker controller mismatch");
        require(address(locker.pass()) == address(pass), "locker pass mismatch");
    }

    function test_FactoryOwnerDoesNotAcquireVaultCustody() public {
        VaultCustodyFactory factory = new VaultCustodyFactory(BOB);
        VM.prank(BOB);
        AlphaForgeVault created = factory.create(
            ALICE, CREATOR, [address(pass), address(usdc), address(eth), address(btc)]
        );
        require(factory.owner() == BOB, "factory owner mismatch");
        require(created.owner() == ALICE, "factory replaced explicit Vault owner");
        require(created.owner() != address(factory), "factory became Vault owner");
        _approveOwner(created);
        VM.prank(ALICE);
        created.deposit(1e6);
        VM.startPrank(BOB);
        (bool withdrew,) = address(created).call(abi.encodeCall(created.withdraw, (1e6)));
        (bool closed,) = address(created).call(abi.encodeCall(created.close, ()));
        VM.stopPrank();
        require(!withdrew && !closed, "factory admin gained custody");
        require(created.principalBasis() == 1e6, "factory admin changed principal");
        VM.prank(ALICE);
        created.close();
        require(created.closed(), "explicit owner could not exit");
    }

    // Catches an artificial rule that rejects one address holding both valid roles.
    function test_CreatorAndOwnerMayBeTheSameAddress() public {
        AlphaForgeVault sameRole =
            _deploy(ALICE, ALICE, address(pass), address(usdc), address(eth), address(btc));
        require(sameRole.owner() == ALICE, "same-role owner mismatch");
        require(sameRole.strategyCreator() == ALICE, "same-role creator mismatch");
    }

    // Catches unusable or ambiguous immutable identities and token aliases.
    function test_ConstructorRejectsZeroIdentityAndDuplicateAssets() public {
        require(
            !_tryDeploy(
                address(0),
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(pass),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "zero owner accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                address(0),
                STRATEGY_ID,
                STRATEGY_REF,
                address(pass),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "zero creator accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                bytes32(0),
                STRATEGY_REF,
                address(pass),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "zero strategy id accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                bytes32(0),
                address(pass),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "zero strategy ref accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(0),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "zero token accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(pass),
                address(usdc),
                address(eth),
                address(eth)
            ),
            "duplicate token accepted"
        );
    }

    // Catches accepting token metadata that would make the fixed 6/18 conversion false.
    function test_ConstructorRejectsWrongPassOrUsdcDecimals() public {
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(usdc),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "six-decimal Pass accepted"
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(pass),
                address(eth),
                address(usdc),
                address(btc)
            ),
            "eighteen-decimal USDC accepted"
        );
    }

    // Catches a Vault claiming a Strategy ID that differs from its immutable Pass identity.
    function test_ConstructorRejectsMismatchedStrategyPass() public {
        StrategyPass other = new StrategyPass(
            "Other Strategy Pass", "AF-OTHER", keccak256("other"), PASS_SUPPLY, ALICE
        );
        require(
            !_tryDeploy(
                ALICE,
                CREATOR,
                STRATEGY_ID,
                STRATEGY_REF,
                address(other),
                address(usdc),
                address(eth),
                address(btc)
            ),
            "mismatched Strategy Pass accepted"
        );
    }

    // Catches inherited or conventional owner mutation backdoors.
    function test_OwnerCannotTransferRenounceOrReinitialize() public {
        bytes[3] memory calls = [
            abi.encodeWithSignature("transferOwnership(address)", BOB),
            abi.encodeWithSignature("renounceOwnership()"),
            abi.encodeWithSignature("initialize(address)", BOB)
        ];
        for (uint256 i = 0; i < calls.length; ++i) {
            VM.prank(ALICE);
            (bool success,) = address(vault).call(calls[i]);
            require(!success, "owner mutation selector accepted");
            require(vault.owner() == ALICE, "owner changed");
        }
    }

    // Catches decimal truncation or treating whole-token display values as base units.
    function test_ExactCapacityConversionsRejectInexactPassRaw() public view {
        require(vault.usdcToPassRaw(1) == 1e12, "one base unit conversion mismatch");
        require(vault.usdcToPassRaw(1e6) == 1 ether, "one whole token conversion mismatch");
        require(vault.passToUsdcRaw(1 ether) == 1e6, "reverse conversion mismatch");
        (bool success,) = address(vault).staticcall(abi.encodeCall(vault.passToUsdcRaw, (1e12 - 1)));
        require(!success, "inexact reverse conversion accepted");
    }

    // Catches overflow wrapping in the authoritative principal-to-capacity conversion.
    function test_UsdcToPassConversionRejectsOverflow() public view {
        uint256 overflowing = type(uint256).max / 1e12 + 1;
        (bool success,) =
            address(vault).staticcall(abi.encodeCall(vault.usdcToPassRaw, (overflowing)));
        require(!success, "overflowing conversion accepted");
    }

    // Catches capacity rules leaking into ordinary freely transferable Pass balances.
    function test_OrdinaryPassTransferKeepsFullEighteenDecimalPrecision() public {
        VM.prank(ALICE);
        require(pass.transfer(BOB, 1e11), "fractional Pass transfer failed");
        require(pass.balanceOf(BOB) == 1e11, "fractional Pass amount changed");
    }

    // Catches number-only deposit accounting that fails to move both real assets atomically.
    function test_OwnerDepositMovesUsdcAndLocksExactPass() public {
        VM.prank(ALICE);
        vault.deposit(100e6);

        PassLocker locker = PassLocker(vault.passLocker());
        require(vault.principalBasis() == 100e6, "principal mismatch");
        require(vault.trackedUsdcBalance() == 100e6, "tracked usdc mismatch");
        require(usdc.balanceOf(address(vault)) == 100e6, "vault usdc mismatch");
        require(locker.lockedBalance() == 100 ether, "locked Pass mismatch");
        require(pass.balanceOf(address(locker)) == 100 ether, "locker Pass mismatch");
    }

    // Catches a minimum-unit deposit rounding to zero capacity.
    function test_OneUsdcBaseUnitLocksExactlyOneTrillionPassRaw() public {
        VM.prank(ALICE);
        vault.deposit(1);
        require(PassLocker(vault.passLocker()).lockedBalance() == 1e12, "minimum lock mismatch");
        require(vault.principalBasis() == 1, "minimum principal mismatch");
    }

    // Catches strategy creator, deployer, or an allowed third party changing owner principal.
    function test_NonOwnerCannotDepositEvenWithAllowance() public {
        VM.prank(ALICE);
        require(usdc.transfer(CREATOR, 1e6), "creator funding failed");
        VM.prank(ALICE);
        require(pass.transfer(CREATOR, 1 ether), "creator Pass funding failed");
        VM.startPrank(CREATOR);
        usdc.approve(address(vault), type(uint256).max);
        pass.approve(address(vault), type(uint256).max);
        (bool success,) = address(vault).call(abi.encodeCall(vault.deposit, (1e6)));
        VM.stopPrank();
        require(!success, "creator deposited into owner Vault");
        require(vault.principalBasis() == 0, "unauthorized deposit changed principal");
    }

    // Catches direct token transfers being promoted into protocol principal or profit.
    function test_DirectUsdcTransferRemainsUntrackedDust() public {
        VM.prank(ALICE);
        require(usdc.transfer(address(vault), 25e6), "direct transfer failed");
        require(vault.principalBasis() == 0, "dust changed principal");
        require(vault.trackedUsdcBalance() == 0, "dust changed tracked balance");
        require(vault.realizedProfit() == 0, "dust created profit");
        require(vault.withdrawableUsdc() == 0, "dust became withdrawable");
    }

    // Catches zero-value state transitions and native dust altering token accounting.
    function test_ZeroDepositRejectsAndNativeDustDoesNotCreateEquity() public {
        VM.prank(ALICE);
        (bool depositSuccess,) = address(vault).call(abi.encodeCall(vault.deposit, (0)));
        require(!depositSuccess, "zero deposit accepted");

        VM.deal(BOB, 1 ether);
        VM.prank(BOB);
        (bool nativeSuccess,) = address(vault).call{ value: 1 wei }("");
        require(nativeSuccess, "native dust rejected");
        require(vault.principalBasis() == 0, "native dust changed principal");
        require(vault.trackedUsdcBalance() == 0, "native dust changed equity");
    }

    function _approveOwner(AlphaForgeVault target) private {
        VM.startPrank(ALICE);
        usdc.approve(address(target), type(uint256).max);
        pass.approve(address(target), type(uint256).max);
        VM.stopPrank();
    }

    function _deploy(
        address owner_,
        address creator_,
        address pass_,
        address usdc_,
        address eth_,
        address btc_
    ) private returns (AlphaForgeVault) {
        return new AlphaForgeVault(
            owner_, creator_, STRATEGY_ID, STRATEGY_REF, pass_, usdc_, eth_, btc_
        );
    }

    function _tryDeploy(
        address owner_,
        address creator_,
        bytes32 strategyId_,
        bytes32 strategyRef_,
        address pass_,
        address usdc_,
        address eth_,
        address btc_
    ) private returns (bool success) {
        try new AlphaForgeVault(
            owner_, creator_, strategyId_, strategyRef_, pass_, usdc_, eth_, btc_
        ) returns (
            AlphaForgeVault
        ) {
            return true;
        } catch {
            return false;
        }
    }
}
