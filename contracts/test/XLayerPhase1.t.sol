// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { AlphaForgeTestUSDT as SettlementAsset } from "../src/AlphaForgeTestUSDT.sol";
import { AlphaForgeTestETH, AlphaForgeTestBTC } from "../src/AlphaForgeTestAsset.sol";
import { AlphaForgeVault } from "../src/AlphaForgeVault.sol";
import { StrategyPass } from "../src/StrategyPass.sol";
import { PassLocker } from "../src/PassLocker.sol";
import { VaultIntentPreview } from "../src/VaultIntentPreview.sol";

interface XLayerVm {
    function chainId(uint256 id) external;
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

/// @notice Offline X Layer Testnet rehearsal. Addresses belong only to this in-memory EVM.
contract XLayerPhase1Test {
    XLayerVm private constant VM =
        XLayerVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant OWNER = address(0xA11CE);
    address private constant CREATOR = address(0xC0FFEE);
    address private constant RECIPIENT = address(0xB0B);
    bytes32 private constant STRATEGY = keccak256("xlayer-phase-one");
    SettlementAsset private usdt;
    AlphaForgeTestETH private afEth;
    AlphaForgeTestBTC private afBtc;
    StrategyPass private pass;
    AlphaForgeVault private vault;

    function setUp() public {
        VM.chainId(1952);
        usdt = new SettlementAsset(100e6, OWNER);
        afEth = new AlphaForgeTestETH(1 ether, address(this));
        afBtc = new AlphaForgeTestBTC(1 ether, address(this));
        pass =
            new StrategyPass("AlphaForge Pre-release Pass", "AF-PASS", STRATEGY, 100 ether, OWNER);
        vault = new AlphaForgeVault(
            OWNER,
            CREATOR,
            STRATEGY,
            keccak256("v1"),
            address(pass),
            address(usdt),
            address(afEth),
            address(afBtc)
        );
    }

    function test_USDTMetadataAndFixedSixDecimalSupply() public {
        require(
            keccak256(bytes(usdt.name())) == keccak256("AlphaForge Test USDT"), "wrong USDT name"
        );
        require(keccak256(bytes(usdt.symbol())) == keccak256("USDT"), "wrong USDT symbol");
        require(usdt.decimals() == 6, "wrong settlement decimals");
        require(
            usdt.totalSupply() == 100e6 && usdt.balanceOf(OWNER) == 100e6, "wrong initial supply"
        );
        require(vault.afUsdc() == address(usdt), "stable settlement selector changed");
        VM.prank(OWNER);
        require(usdt.transfer(RECIPIENT, 1), "one raw unit transfer failed");
        require(
            usdt.balanceOf(RECIPIENT) == 1 && usdt.balanceOf(OWNER) == 100e6 - 1, "transfer rounded"
        );
        (bool minted,) =
            address(usdt).call(abi.encodeWithSignature("mint(address,uint256)", RECIPIENT, 1));
        require(!minted && usdt.totalSupply() == 100e6, "unexpected mint path");
    }

    function test_PhaseOneOwnerLifecycleOn1952UsesFiniteAllowances() public {
        require(block.chainid == 1952, "wrong rehearsal chain");
        PassLocker locker = PassLocker(vault.passLocker());
        require(
            address(locker).code.length != 0 && locker.vault() == address(vault),
            "Locker not Vault-created"
        );
        require(locker.owner() == OWNER && vault.owner() == OWNER, "owner mismatch");
        require(pass.strategyId() == vault.strategyId(), "strategy mismatch");
        VM.prank(OWNER);
        require(pass.transfer(RECIPIENT, 1), "one-wei Pass transfer failed");
        VM.prank(RECIPIENT);
        require(pass.transfer(OWNER, 1), "Pass return failed");
        VM.startPrank(OWNER);
        require(usdt.approve(address(vault), 10e6), "USDT approval failed");
        require(pass.approve(address(vault), 10 ether), "Pass approval failed");
        vault.deposit(10e6);
        VM.stopPrank();
        require(
            usdt.allowance(OWNER, address(vault)) == 0
                && pass.allowance(OWNER, address(vault)) == 0,
            "allowance not finite"
        );
        require(
            vault.principalBasis() == 10e6 && vault.trackedUsdcBalance() == 10e6,
            "principal mismatch"
        );
        require(locker.lockedBalance() == 10 ether, "capacity mismatch");
        require(afEth.transfer(address(vault), 1), "dust transfer failed");
        VM.deal(address(vault), 1);
        VM.prank(OWNER);
        vault.withdraw(4e6);
        require(
            vault.principalBasis() == 6e6 && locker.lockedBalance() == 6 ether, "withdraw mismatch"
        );
        VM.prank(OWNER);
        vault.close();
        require(
            vault.closed() && vault.principalBasis() == 0 && vault.trackedUsdcBalance() == 0,
            "close accounting mismatch"
        );
        require(
            usdt.balanceOf(OWNER) == 100e6 && pass.balanceOf(OWNER) == 100 ether,
            "owner assets not returned"
        );
        require(locker.lockedBalance() == 0, "close retained Pass");
        VM.prank(OWNER);
        require(vault.rescueUntrackedToken(address(afEth)) == 1, "token rescue mismatch");
        uint256 beforeBalance = OWNER.balance;
        VM.prank(OWNER);
        require(vault.rescueNative() == 1, "native rescue mismatch");
        require(
            afEth.balanceOf(OWNER) == 1 && OWNER.balance == beforeBalance + 1,
            "rescue recipient mismatch"
        );
    }

    function test_DeployerAndCreatorDoNotGainOwnerAuthority() public {
        (bool deployerClose,) = address(vault).call(abi.encodeCall(vault.close, ()));
        VM.prank(CREATOR);
        (bool creatorDeposit,) = address(vault).call(abi.encodeCall(vault.deposit, (1)));
        require(!deployerClose && !creatorDeposit && !vault.closed(), "owner isolation failed");
    }

    // Preview-only regression: Phase One has no permit or business-signature authorization.
    function test_PreviewDomainSeparates1952FromOtherChainsAndContracts() public {
        VaultIntentPreview previewer = new VaultIntentPreview();
        VaultIntentPreview.Intent memory intent;
        bytes32 xlayerDigest = previewer.preview(intent);
        uint256[3] memory otherChains = [uint256(195), uint256(196), uint256(46630)];
        for (uint256 i; i < otherChains.length; i++) {
            VM.chainId(otherChains[i]);
            require(previewer.preview(intent) != xlayerDigest, "unbound chain domain");
        }
        VM.chainId(1952);
        require(previewer.preview(intent) == xlayerDigest, "restored domain changed");
        VaultIntentPreview other = new VaultIntentPreview();
        require(other.preview(intent) != xlayerDigest, "unbound verifying contract");
    }
}
