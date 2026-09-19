// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

import { ITestVenue } from "./interfaces/ITestVenue.sol";

/// @notice TESTNET_ONLY spot venue for the fixed AF-USDC/AF-ETH and AF-USDC/AF-BTC pairs.
/// @dev Liquidity is permanent and has no ownership or withdrawal privilege.
contract AlphaForgeTestVenue is ITestVenue, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Reserves {
        uint256 usdc;
        uint256 asset;
    }

    error ZeroAddress();
    error DuplicateAsset();
    error ZeroAmount();
    error InvalidPair(address tokenA, address tokenB);
    error Expired(uint256 deadlineBlock, uint256 currentBlock);
    error InsufficientLiquidity();
    error SlippageExceeded(uint256 amountOut, uint256 minimum);
    error UnexpectedBalanceDelta(address token, uint256 expected, uint256 actual);

    event LiquidityAdded(
        address indexed provider, address indexed asset, uint256 usdcAmount, uint256 assetAmount
    );
    event SwapSettled(
        address indexed sender,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    address public immutable afUsdc;
    address public immutable afEth;
    address public immutable afBtc;

    mapping(address asset => Reserves reserves) private pairReserves;

    constructor(address afUsdc_, address afEth_, address afBtc_) {
        if (afUsdc_ == address(0) || afEth_ == address(0) || afBtc_ == address(0)) {
            revert ZeroAddress();
        }
        if (afUsdc_ == afEth_ || afUsdc_ == afBtc_ || afEth_ == afBtc_) {
            revert DuplicateAsset();
        }
        afUsdc = afUsdc_;
        afEth = afEth_;
        afBtc = afBtc_;
    }

    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB)
        external
        nonReentrant
    {
        if (amountA == 0 || amountB == 0) revert ZeroAmount();
        (address asset, bool aIsUsdc) = _resolvePair(tokenA, tokenB);

        uint256 balanceABefore = IERC20(tokenA).balanceOf(address(this));
        uint256 balanceBBefore = IERC20(tokenB).balanceOf(address(this));
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);
        _requireIncrease(tokenA, balanceABefore, amountA);
        _requireIncrease(tokenB, balanceBBefore, amountB);

        Reserves storage reserves = pairReserves[asset];
        uint256 usdcAmount = aIsUsdc ? amountA : amountB;
        uint256 assetAmount = aIsUsdc ? amountB : amountA;
        reserves.usdc += usdcAmount;
        reserves.asset += assetAmount;
        emit LiquidityAdded(msg.sender, asset, usdcAmount, assetAmount);
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        (address asset, bool inputIsUsdc) = _resolvePair(tokenIn, tokenOut);
        Reserves storage reserves = pairReserves[asset];
        (uint256 reserveIn, uint256 reserveOut) =
            inputIsUsdc ? (reserves.usdc, reserves.asset) : (reserves.asset, reserves.usdc);
        return _quote(reserveIn, reserveOut, amountIn);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadlineBlock
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();
        if (recipient == address(0)) revert ZeroAddress();
        if (block.number > deadlineBlock) revert Expired(deadlineBlock, block.number);
        (address asset, bool inputIsUsdc) = _resolvePair(tokenIn, tokenOut);
        Reserves storage reserves = pairReserves[asset];
        (uint256 reserveIn, uint256 reserveOut) =
            inputIsUsdc ? (reserves.usdc, reserves.asset) : (reserves.asset, reserves.usdc);
        amountOut = _quote(reserveIn, reserveOut, amountIn);
        if (amountOut < minAmountOut) revert SlippageExceeded(amountOut, minAmountOut);

        _transferInExact(tokenIn, amountIn);

        if (inputIsUsdc) {
            reserves.usdc = reserveIn + amountIn;
            reserves.asset = reserveOut - amountOut;
        } else {
            reserves.asset = reserveIn + amountIn;
            reserves.usdc = reserveOut - amountOut;
        }

        _transferOutExact(tokenOut, recipient, amountOut);
        emit SwapSettled(msg.sender, recipient, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address asset, bool aIsUsdc) = _resolvePair(tokenA, tokenB);
        Reserves storage reserves = pairReserves[asset];
        return aIsUsdc ? (reserves.usdc, reserves.asset) : (reserves.asset, reserves.usdc);
    }

    function _resolvePair(address tokenA, address tokenB)
        private
        view
        returns (address asset, bool aIsUsdc)
    {
        if (tokenA == afUsdc && (tokenB == afEth || tokenB == afBtc)) {
            return (tokenB, true);
        }
        if (tokenB == afUsdc && (tokenA == afEth || tokenA == afBtc)) {
            return (tokenA, false);
        }
        revert InvalidPair(tokenA, tokenB);
    }

    function _quote(uint256 reserveIn, uint256 reserveOut, uint256 amountIn)
        private
        pure
        returns (uint256 amountOut)
    {
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        amountOut = Math.mulDiv(reserveOut, amountIn, reserveIn + amountIn);
        if (amountOut == 0 || amountOut >= reserveOut) revert InsufficientLiquidity();
    }

    function _requireIncrease(address token, uint256 balanceBefore, uint256 expected) private view {
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 actual = balanceAfter >= balanceBefore ? balanceAfter - balanceBefore : 0;
        if (actual != expected) revert UnexpectedBalanceDelta(token, expected, actual);
    }

    function _transferInExact(address token, uint256 amount) private {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _requireIncrease(token, balanceBefore, amount);
    }

    function _transferOutExact(address token, address recipient, uint256 amount) private {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(recipient, amount);
        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        uint256 actual = balanceBefore >= balanceAfter ? balanceBefore - balanceAfter : 0;
        if (actual != amount) revert UnexpectedBalanceDelta(token, amount, actual);
    }
}
