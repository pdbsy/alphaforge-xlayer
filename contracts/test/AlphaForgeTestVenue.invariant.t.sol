// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";
import { AlphaForgeTestVenue } from "../src/AlphaForgeTestVenue.sol";

contract TestVenueHandler {
    AlphaForgeTestVenue public immutable VENUE;
    AlphaForgeTestUSDC public immutable USDC;
    AlphaForgeTestETH public immutable AF_ETH;
    AlphaForgeTestBTC public immutable AF_BTC;

    constructor(
        AlphaForgeTestVenue venue_,
        AlphaForgeTestUSDC usdc_,
        AlphaForgeTestETH afEth_,
        AlphaForgeTestBTC afBtc_
    ) {
        VENUE = venue_;
        USDC = usdc_;
        AF_ETH = afEth_;
        AF_BTC = afBtc_;
        require(usdc_.approve(address(venue_), type(uint256).max), "USDC approval failed");
        require(afEth_.approve(address(venue_), type(uint256).max), "ETH approval failed");
        require(afBtc_.approve(address(venue_), type(uint256).max), "BTC approval failed");
    }

    function swapUsdcForEth(uint256 rawAmount) external {
        _trySwap(address(USDC), address(AF_ETH), rawAmount);
    }

    function swapEthForUsdc(uint256 rawAmount) external {
        _trySwap(address(AF_ETH), address(USDC), rawAmount);
    }

    function swapUsdcForBtc(uint256 rawAmount) external {
        _trySwap(address(USDC), address(AF_BTC), rawAmount);
    }

    function swapBtcForUsdc(uint256 rawAmount) external {
        _trySwap(address(AF_BTC), address(USDC), rawAmount);
    }

    function _trySwap(address tokenIn, address tokenOut, uint256 rawAmount) private {
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        uint256 amount = rawAmount % (balance + 1);
        if (amount == 0) return;
        try VENUE.quote(tokenIn, tokenOut, amount) returns (uint256) {
            VENUE.swap(tokenIn, tokenOut, amount, 0, address(this), block.number);
        } catch { }
    }
}

contract AlphaForgeTestVenueInvariantTest {
    uint256 private constant ETH_INITIAL_USDC = 1_000_000e6;
    uint256 private constant ETH_INITIAL_ASSET = 500e18;
    uint256 private constant BTC_INITIAL_USDC = 500_000e6;
    uint256 private constant BTC_INITIAL_ASSET = 10e18;

    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private afEth;
    AlphaForgeTestBTC private afBtc;
    AlphaForgeTestVenue private venue;
    TestVenueHandler private handler;
    address[] private targets;

    function setUp() public {
        usdc = new AlphaForgeTestUSDC(10_000_000e6, address(this));
        afEth = new AlphaForgeTestETH(10_000e18, address(this));
        afBtc = new AlphaForgeTestBTC(1_000e18, address(this));
        venue = new AlphaForgeTestVenue(address(usdc), address(afEth), address(afBtc));
        require(usdc.approve(address(venue), type(uint256).max), "USDC approval failed");
        require(afEth.approve(address(venue), type(uint256).max), "ETH approval failed");
        require(afBtc.approve(address(venue), type(uint256).max), "BTC approval failed");
        venue.addLiquidity(address(usdc), address(afEth), ETH_INITIAL_USDC, ETH_INITIAL_ASSET);
        venue.addLiquidity(address(usdc), address(afBtc), BTC_INITIAL_USDC, BTC_INITIAL_ASSET);

        handler = new TestVenueHandler(venue, usdc, afEth, afBtc);
        require(usdc.transfer(address(handler), 1_000_000e6), "handler USDC funding failed");
        require(afEth.transfer(address(handler), 500e18), "handler ETH funding failed");
        require(afBtc.transfer(address(handler), 10e18), "handler BTC funding failed");
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    function invariant_PairProductsNeverDecreaseAndReservesRemainFunded() public view {
        (uint256 ethUsdc, uint256 ethReserve) = venue.getReserves(address(usdc), address(afEth));
        (uint256 btcUsdc, uint256 btcReserve) = venue.getReserves(address(usdc), address(afBtc));
        require(
            ethUsdc * ethReserve >= ETH_INITIAL_USDC * ETH_INITIAL_ASSET,
            "ETH pair product decreased"
        );
        require(
            btcUsdc * btcReserve >= BTC_INITIAL_USDC * BTC_INITIAL_ASSET,
            "BTC pair product decreased"
        );
        require(
            usdc.balanceOf(address(venue)) == ethUsdc + btcUsdc,
            "USDC reserves are not fully funded"
        );
        require(afEth.balanceOf(address(venue)) == ethReserve, "ETH reserve is not funded");
        require(afBtc.balanceOf(address(venue)) == btcReserve, "BTC reserve is not funded");
    }
}
