// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { AlphaForgeTestAsset } from "./AlphaForgeTestAsset.sol";

/// @notice Fixed-supply six-decimal USDT test asset for AlphaForge pre-release validation.
/// @dev Not issuer-backed USDT. The Vault consumes its address through the stable afUsdc slot.
contract AlphaForgeTestUSDT is AlphaForgeTestAsset {
    constructor(uint256 fixedSupply_, address recipient_)
        AlphaForgeTestAsset("AlphaForge Test USDT", "USDT", fixedSupply_, recipient_)
    { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
