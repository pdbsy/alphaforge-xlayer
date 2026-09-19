// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ITestVenue } from "../../src/interfaces/ITestVenue.sol";

contract MaliciousVenue is ITestVenue {
    using SafeERC20 for IERC20;

    enum Mode {
        Normal,
        UnderSpend,
        ShortOutput,
        Reenter,
        RevertSwap
    }

    IERC20 public immutable tokenIn;
    IERC20 public immutable tokenOut;
    Mode public mode;
    uint256 public configuredOutput;
    uint256 public allowanceObserved;
    address public callbackTarget;
    bytes public callbackData;
    bool public callbackAttempted;
    bool public callbackSucceeded;

    constructor(IERC20 tokenIn_, IERC20 tokenOut_) {
        tokenIn = tokenIn_;
        tokenOut = tokenOut_;
    }

    function configure(Mode mode_, uint256 output_) external {
        mode = mode_;
        configuredOutput = output_;
    }

    function configureCallback(address target, bytes calldata data) external {
        callbackTarget = target;
        callbackData = data;
    }

    function addLiquidity(address, address, uint256, uint256) external pure {
        revert("not supported");
    }

    function quote(address, address, uint256) external view returns (uint256 amountOut) {
        return configuredOutput;
    }

    function swap(address, address, uint256 amountIn, uint256, address recipient, uint256)
        external
        returns (uint256 amountOut)
    {
        if (mode == Mode.RevertSwap) revert("mock venue revert");
        allowanceObserved = tokenIn.allowance(msg.sender, address(this));
        if (mode == Mode.Reenter) {
            callbackAttempted = true;
            (callbackSucceeded,) = callbackTarget.call(callbackData);
        }
        uint256 spend = mode == Mode.UnderSpend ? amountIn - 1 : amountIn;
        tokenIn.safeTransferFrom(msg.sender, address(this), spend);
        uint256 output = mode == Mode.ShortOutput ? configuredOutput - 1 : configuredOutput;
        tokenOut.safeTransfer(recipient, output);
        return configuredOutput;
    }

    function getReserves(address, address)
        external
        pure
        returns (uint256 reserveA, uint256 reserveB)
    {
        return (0, 0);
    }
}
