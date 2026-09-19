// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice TESTNET_ONLY fixed-supply ERC-20 base for the AlphaForge B2 environment.
/// @dev Concrete asset identity and decimals are compile-time fixed. The constructor is the only mint path.
abstract contract AlphaForgeTestAsset is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 fixedSupply_,
        address recipient_
    ) ERC20(name_, symbol_) {
        _mint(recipient_, fixedSupply_);
    }
}

/// @notice Six-decimal settlement asset for local and Robinhood Chain Testnet M3 validation only.
contract AlphaForgeTestUSDC is AlphaForgeTestAsset {
    constructor(uint256 fixedSupply_, address recipient_)
        AlphaForgeTestAsset("AlphaForge Test USDC", "AF-USDC", fixedSupply_, recipient_)
    { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @notice Eighteen-decimal test ETH representation; this is not the native chain token.
contract AlphaForgeTestETH is AlphaForgeTestAsset {
    constructor(uint256 fixedSupply_, address recipient_)
        AlphaForgeTestAsset("AlphaForge Test ETH", "AF-ETH", fixedSupply_, recipient_)
    { }
}

/// @notice Eighteen-decimal test BTC representation; this is not Bitcoin or a production asset.
contract AlphaForgeTestBTC is AlphaForgeTestAsset {
    constructor(uint256 fixedSupply_, address recipient_)
        AlphaForgeTestAsset("AlphaForge Test BTC", "AF-BTC", fixedSupply_, recipient_)
    { }
}
