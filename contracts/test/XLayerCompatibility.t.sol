// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { VaultIntentPreview } from "../src/VaultIntentPreview.sol";
import { AlphaForgeVault } from "../src/AlphaForgeVault.sol";
import { StrategyPass } from "../src/StrategyPass.sol";
import { PassLocker } from "../src/PassLocker.sol";
import {
    AlphaForgeTestUSDC,
    AlphaForgeTestETH,
    AlphaForgeTestBTC
} from "../src/AlphaForgeTestAsset.sol";

interface XLayerVm {
    function chainId(uint256 newChainId) external;
    function etch(address account, bytes calldata code) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

/// @dev Local VM compatibility only. No RPC, signature, bridge or live chain is involved.
contract XLayerDomainTest {
    XLayerVm private constant VM =
        XLayerVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    // Catches using a deployment-time cached chain domain after the chain changes.
    function test_SameVerifierSeparatesRobinhoodAndXLayerAndRestoresDomain() public {
        VM.chainId(46630);
        VaultIntentPreview previewer = new VaultIntentPreview();
        VaultIntentPreview.Intent memory intent = _intent();
        bytes32 robinhood = previewer.preview(intent);
        VM.chainId(1952);
        bytes32 xlayer = previewer.preview(intent);
        require(xlayer != robinhood, "cross-chain digest reused");
        require(previewer.preview(intent) == xlayer, "X Layer digest not deterministic");
        VM.chainId(46630);
        require(previewer.preview(intent) == robinhood, "original domain not restored");
    }

    // A preview accepts arbitrary domains; this proves distinction, not network authorization.
    function test_1952DoesNotReuseHistoricalTestnetOrMainnetDigest() public {
        VM.chainId(1952);
        VaultIntentPreview previewer = new VaultIntentPreview();
        VaultIntentPreview.Intent memory intent = _intent();
        bytes32 xlayer = previewer.preview(intent);
        VM.chainId(195);
        bytes32 historical = previewer.preview(intent);
        VM.chainId(196);
        bytes32 mainnet = previewer.preview(intent);
        require(xlayer != historical && xlayer != mainnet, "X Layer domain collision");
        require(historical != mainnet, "other chain domains collided");
    }

    function test_XLayerBindsVerifyingContract() public {
        VM.chainId(1952);
        VaultIntentPreview first = new VaultIntentPreview();
        VaultIntentPreview second = new VaultIntentPreview();
        VaultIntentPreview.Intent memory intent = _intent();
        require(first.preview(intent) != second.preview(intent), "verifier address unbound");
    }

    // Independent eth-account 0.14.0 vector, checked in as test/xlayer-intent-vector.json.
    function test_MatchesIndependentXLayerDigestVector() public {
        VM.chainId(1952);
        VaultIntentPreview previewer = new VaultIntentPreview();
        VM.etch(address(0x1001), address(previewer).code);
        require(
            VaultIntentPreview(address(0x1001)).preview(_intent())
                == 0x0ee52e975d64d207d22975ba257dd3fcf0b7bc4363aaecc1421517d545f77ce6,
            "X Layer independent digest mismatch"
        );
    }

    function _intent() private pure returns (VaultIntentPreview.Intent memory) {
        return VaultIntentPreview.Intent({
            ownerId: "owner-a",
            strategyId: "strategy-a",
            vaultId: "vault-a",
            commandId: "cmd-a",
            commandType: "requestWithdrawal",
            assetId: "TEST_ONLY_USDT_UNIT",
            decimals: 6,
            amount: 100000000,
            expectedRevision: 3,
            nonce: 7,
            deadline: 2000000000,
            authorizationEpoch: 2,
            policyHash: 0x1111111111111111111111111111111111111111111111111111111111111111
        });
    }
}

contract XLayerCustodyTest {
    XLayerVm private constant VM =
        XLayerVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant OWNER = address(0xA11CE);
    address private constant CREATOR = address(0xC0FFEE);
    StrategyPass private pass;
    AlphaForgeTestUSDC private usdc;
    AlphaForgeVault private vault;

    function setUp() public {
        VM.chainId(1952);
        bytes32 strategyId = keccak256("xlayer-local-strategy");
        pass = new StrategyPass("AlphaForge Local Pass", "AF-LOCAL", strategyId, 3 ether, OWNER);
        usdc = new AlphaForgeTestUSDC(3e6, OWNER);
        AlphaForgeTestETH eth = new AlphaForgeTestETH(1 ether, OWNER);
        AlphaForgeTestBTC btc = new AlphaForgeTestBTC(1 ether, OWNER);
        vault = new AlphaForgeVault(
            OWNER,
            CREATOR,
            strategyId,
            keccak256("local-ref"),
            address(pass),
            address(usdc),
            address(eth),
            address(btc)
        );
        VM.startPrank(OWNER);
        pass.approve(address(vault), 2 ether);
        usdc.approve(address(vault), 2e6);
        VM.stopPrank();
    }

    function test_1952PreservesExactCustodyLifecycle() public {
        require(block.chainid == 1952, "unexpected chain");
        require(usdc.decimals() == 6 && pass.decimals() == 18, "asset precision changed");
        PassLocker locker = PassLocker(vault.passLocker());
        VM.prank(OWNER);
        vault.deposit(2e6);
        require(vault.principalBasis() == 2e6, "principal mismatch");
        require(locker.lockedBalance() == 2 ether, "deposit capacity mismatch");
        require(usdc.allowance(OWNER, address(vault)) == 0, "USDC allowance not exhausted");
        require(pass.allowance(OWNER, address(vault)) == 0, "Pass allowance not exhausted");
        VM.prank(OWNER);
        vault.withdraw(1e6);
        require(vault.principalBasis() == 1e6, "withdraw principal mismatch");
        require(locker.lockedBalance() == 1 ether, "withdraw capacity mismatch");
        VM.prank(OWNER);
        vault.close();
        require(vault.closed() && vault.principalBasis() == 0, "close accounting mismatch");
        require(locker.lockedBalance() == 0, "close did not release Pass");
        require(usdc.balanceOf(OWNER) == 3e6, "owner USDC return mismatch");
        require(pass.balanceOf(OWNER) == 3 ether, "owner Pass return mismatch");
    }

    function test_1952DoesNotGiveDeployerOrCreatorCustody() public {
        VM.prank(OWNER);
        vault.deposit(2e6);
        (bool deployerClosed,) = address(vault).call(abi.encodeCall(vault.close, ()));
        VM.prank(CREATOR);
        (bool creatorWithdrew,) = address(vault).call(abi.encodeCall(vault.withdraw, (1e6)));
        require(!deployerClosed && !creatorWithdrew, "non-owner custody accepted");
        require(vault.principalBasis() == 2e6 && !vault.closed(), "non-owner changed state");
    }
}
