// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Freely transferable, fixed-supply access token for one AlphaForge strategy.
/// @dev The constructor is the only mint path. Market price is unrelated to Vault capacity.
contract StrategyPass is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 fixedSupply_,
        address recipient_
    ) ERC20(name_, symbol_) {
        _mint(recipient_, fixedSupply_);
    }
}
