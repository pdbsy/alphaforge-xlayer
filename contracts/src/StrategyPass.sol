// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Freely transferable, fixed-supply access token for one AlphaForge strategy.
/// @dev The constructor is the only mint path. Market price is unrelated to Vault capacity.
contract StrategyPass is ERC20 {
    error InvalidStrategyId();

    bytes32 public immutable strategyId;

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 strategyId_,
        uint256 fixedSupply_,
        address recipient_
    ) ERC20(name_, symbol_) {
        if (strategyId_ == bytes32(0)) revert InvalidStrategyId();
        strategyId = strategyId_;
        _mint(recipient_, fixedSupply_);
    }
}
