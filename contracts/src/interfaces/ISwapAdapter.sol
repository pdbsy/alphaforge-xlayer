// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { ProtocolTypes } from "../ProtocolTypes.sol";

interface ISwapAdapter {
    function swap(ProtocolTypes.SwapAction calldata action) external returns (uint256 amountOut);
}
