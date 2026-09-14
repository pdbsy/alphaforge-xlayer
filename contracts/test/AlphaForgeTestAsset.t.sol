// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";

interface AssetVm {
    function prank(address sender) external;
}

contract AlphaForgeTestAssetTest {
    AssetVm private constant VM = AssetVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant RECIPIENT = address(0xA11CE);
    address private constant BOB = address(0xB0B);

    AlphaForgeTestUSDC private usdc;

    function setUp() public {
        usdc = new AlphaForgeTestUSDC(1_000_000e6, RECIPIENT);
    }

    // Catches accidental use of 18 decimals or mutable supply for the M3 settlement asset.
    function test_AfUsdcHasSixDecimalsAndFixedConstructorSupply() public view {
        require(keccak256(bytes(usdc.name())) == keccak256("AlphaForge Test USDC"), "wrong name");
        require(keccak256(bytes(usdc.symbol())) == keccak256("AF-USDC"), "wrong symbol");
        require(usdc.decimals() == 6, "wrong decimals");
        require(usdc.totalSupply() == 1_000_000e6, "wrong supply");
        require(usdc.balanceOf(RECIPIENT) == 1_000_000e6, "wrong recipient");
    }

    // Catches metadata coupling that would force every test asset to use AF-USDC precision.
    function test_AfEthAndAfBtcUseExplicitEighteenDecimals() public {
        AlphaForgeTestETH eth = new AlphaForgeTestETH(10_000 ether, RECIPIENT);
        AlphaForgeTestBTC btc = new AlphaForgeTestBTC(1_000 ether, RECIPIENT);
        require(eth.decimals() == 18, "wrong AF-ETH decimals");
        require(btc.decimals() == 18, "wrong AF-BTC decimals");
        require(eth.totalSupply() == 10_000 ether, "wrong AF-ETH supply");
        require(btc.totalSupply() == 1_000 ether, "wrong AF-BTC supply");
    }

    // Catches a fake test token that changes internal numbers without ERC-20 movement.
    function test_UsesRealErc20BalanceMovement() public {
        VM.prank(RECIPIENT);
        require(usdc.transfer(BOB, 25_000_001), "transfer failed");
        require(usdc.balanceOf(BOB) == 25_000_001, "recipient did not receive base units");
        require(usdc.balanceOf(RECIPIENT) == 999_974_999_999, "sender balance mismatch");
        require(usdc.totalSupply() == 1_000_000e6, "transfer changed supply");
    }

    // Catches any conventional post-deployment mint backdoor.
    function test_PublicMintIsUnavailable() public {
        (bool success,) =
            address(usdc).call(abi.encodeWithSignature("mint(address,uint256)", BOB, 1e6));
        require(!success, "public mint accepted");
        require(usdc.balanceOf(BOB) == 0, "mint selector changed balance");
        require(usdc.totalSupply() == 1_000_000e6, "mint selector changed supply");
    }

    // Catches a conventional post-deployment metadata mutation path.
    function test_PublicDecimalsSetterIsUnavailable() public {
        (bool success,) = address(usdc).call(abi.encodeWithSignature("setDecimals(uint8)", 18));
        require(!success, "decimals setter accepted");
        require(usdc.decimals() == 6, "decimals changed");
    }

    // Catches loss or creation of units at arbitrary 6-decimal transfer boundaries.
    function testFuzz_TransferPreservesFixedSupply(uint256 candidate) public {
        uint256 amount = candidate % (1_000_000e6 + 1);
        VM.prank(RECIPIENT);
        require(usdc.transfer(BOB, amount), "bounded transfer failed");
        require(usdc.balanceOf(RECIPIENT) + usdc.balanceOf(BOB) == 1_000_000e6, "unit lost");
        require(usdc.totalSupply() == 1_000_000e6, "fuzz transfer changed supply");
    }

    // Catches deployment that irrecoverably assigns the fixed supply to the zero address.
    function test_ZeroRecipientDeploymentReverts() public {
        try new AlphaForgeTestUSDC(1e6, address(0)) returns (AlphaForgeTestUSDC) {
            revert("zero recipient accepted");
        } catch { }
    }
}
