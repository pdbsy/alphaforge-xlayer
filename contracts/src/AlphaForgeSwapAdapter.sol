// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { ProtocolTypes } from "./ProtocolTypes.sol";
import { ISwapAdapter } from "./interfaces/ISwapAdapter.sol";
import { ITestVenue } from "./interfaces/ITestVenue.sol";

/// @notice Fixed typed settlement path from one calling Vault to the AlphaForge test venue.
/// @dev Strategy identity and state version are bound and checked by the calling Vault.
contract AlphaForgeSwapAdapter is ISwapAdapter, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress();
    error DuplicateAsset();
    error ZeroAmount();
    error InvalidPair(address tokenIn, address tokenOut);
    error Expired(uint256 deadlineBlock, uint256 currentBlock);
    error SlippageExceeded(uint256 amountOut, uint256 minimum);
    error UnexpectedBalanceDelta(address token, uint256 expected, uint256 actual);

    event SwapAdapted(
        address indexed vault,
        bytes32 indexed strategyId,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 expectedStateVersion
    );

    ITestVenue public immutable venue;
    address public immutable afUsdc;
    address public immutable afEth;
    address public immutable afBtc;

    constructor(address venue_, address afUsdc_, address afEth_, address afBtc_) {
        if (
            venue_ == address(0) || afUsdc_ == address(0) || afEth_ == address(0)
                || afBtc_ == address(0)
        ) {
            revert ZeroAddress();
        }
        if (afUsdc_ == afEth_ || afUsdc_ == afBtc_ || afEth_ == afBtc_) {
            revert DuplicateAsset();
        }
        venue = ITestVenue(venue_);
        afUsdc = afUsdc_;
        afEth = afEth_;
        afBtc = afBtc_;
    }

    function swap(ProtocolTypes.SwapAction calldata action)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (action.amountIn == 0) revert ZeroAmount();
        if (block.number > action.deadlineBlock) {
            revert Expired(action.deadlineBlock, block.number);
        }
        _requirePair(action.tokenIn, action.tokenOut);

        IERC20 tokenIn = IERC20(action.tokenIn);
        IERC20 tokenOut = IERC20(action.tokenOut);
        uint256 inputBefore = tokenIn.balanceOf(address(this));
        uint256 outputBefore = tokenOut.balanceOf(address(this));
        tokenIn.safeTransferFrom(msg.sender, address(this), action.amountIn);
        _requireIncrease(tokenIn, inputBefore, action.amountIn);

        tokenIn.forceApprove(address(venue), action.amountIn);
        amountOut = venue.swap(
            action.tokenIn,
            action.tokenOut,
            action.amountIn,
            action.minAmountOut,
            address(this),
            action.deadlineBlock
        );
        tokenIn.forceApprove(address(venue), 0);

        _requireDecrease(tokenIn, inputBefore + action.amountIn, action.amountIn);
        _requireIncrease(tokenOut, outputBefore, amountOut);
        if (amountOut < action.minAmountOut) {
            revert SlippageExceeded(amountOut, action.minAmountOut);
        }

        uint256 adapterOutput = tokenOut.balanceOf(address(this));
        tokenOut.safeTransfer(msg.sender, amountOut);
        _requireDecrease(tokenOut, adapterOutput, amountOut);
        emit SwapAdapted(
            msg.sender,
            action.strategyId,
            action.tokenIn,
            action.tokenOut,
            action.amountIn,
            amountOut,
            action.expectedStateVersion
        );
    }

    function _requirePair(address tokenIn, address tokenOut) private view {
        bool valid = tokenIn == afUsdc && (tokenOut == afEth || tokenOut == afBtc)
            || tokenOut == afUsdc && (tokenIn == afEth || tokenIn == afBtc);
        if (!valid) revert InvalidPair(tokenIn, tokenOut);
    }

    function _requireIncrease(IERC20 token, uint256 balanceBefore, uint256 expected) private view {
        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 actual = balanceAfter >= balanceBefore ? balanceAfter - balanceBefore : 0;
        if (actual != expected) revert UnexpectedBalanceDelta(address(token), expected, actual);
    }

    function _requireDecrease(IERC20 token, uint256 balanceBefore, uint256 expected) private view {
        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 actual = balanceBefore >= balanceAfter ? balanceBefore - balanceAfter : 0;
        if (actual != expected) revert UnexpectedBalanceDelta(address(token), expected, actual);
    }
}
