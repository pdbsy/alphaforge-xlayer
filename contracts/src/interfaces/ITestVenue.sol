// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

interface ITestVenue {
    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external;

    function quote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        view
        returns (uint256 amountOut);

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountOut);

    function getReserves(address tokenA, address tokenB)
        external
        view
        returns (uint256 reserveA, uint256 reserveB);
}
