// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

library ProtocolTypes {
    struct SwapAction {
        bytes32 strategyId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadlineBlock;
        uint256 expectedStateVersion;
    }
}
