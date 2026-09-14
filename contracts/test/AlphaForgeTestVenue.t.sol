// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";
import { AlphaForgeTestVenue } from "../src/AlphaForgeTestVenue.sol";

interface VenueVm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
    function warp(uint256 timestamp) external;
}

contract AlphaForgeTestVenueTest {
    VenueVm private constant VM = VenueVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant TRADER = address(0xA11CE);
    address private constant RECIPIENT = address(0xB0B);

    uint256 private constant USDC_SUPPLY = 10_000_000e6;
    uint256 private constant ETH_SUPPLY = 10_000e18;
    uint256 private constant BTC_SUPPLY = 1_000e18;
    uint256 private constant ETH_USDC_LIQUIDITY = 1_000_000e6;
    uint256 private constant ETH_LIQUIDITY = 500e18;
    uint256 private constant BTC_USDC_LIQUIDITY = 500_000e6;
    uint256 private constant BTC_LIQUIDITY = 10e18;

    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private afEth;
    AlphaForgeTestBTC private afBtc;
    AlphaForgeTestVenue private venue;

    function setUp() public {
        usdc = new AlphaForgeTestUSDC(USDC_SUPPLY, address(this));
        afEth = new AlphaForgeTestETH(ETH_SUPPLY, address(this));
        afBtc = new AlphaForgeTestBTC(BTC_SUPPLY, address(this));
        venue = new AlphaForgeTestVenue(address(usdc), address(afEth), address(afBtc));

        require(usdc.approve(address(venue), type(uint256).max), "USDC approval failed");
        require(afEth.approve(address(venue), type(uint256).max), "ETH approval failed");
        require(afBtc.approve(address(venue), type(uint256).max), "BTC approval failed");
        venue.addLiquidity(address(usdc), address(afEth), ETH_USDC_LIQUIDITY, ETH_LIQUIDITY);
        venue.addLiquidity(address(usdc), address(afBtc), BTC_USDC_LIQUIDITY, BTC_LIQUIDITY);
    }

    function test_QuoteUsesFiniteConstantProductLiquidity() public view {
        uint256 amountIn = 1_000e6;
        uint256 expected = ETH_LIQUIDITY * amountIn / (ETH_USDC_LIQUIDITY + amountIn);
        uint256 amountOut = venue.quote(address(usdc), address(afEth), amountIn);
        require(amountOut == expected, "wrong constant-product quote");
        require(amountOut != amountIn, "quote collapsed to one-to-one units");
        require(amountOut < ETH_LIQUIDITY, "quote exceeded finite liquidity");
    }

    function test_LargerSwapHasPriceImpact() public view {
        uint256 first = venue.quote(address(usdc), address(afEth), 1_000e6);
        uint256 doubled = venue.quote(address(usdc), address(afEth), 2_000e6);
        require(doubled < first * 2, "larger swap had no price impact");
    }

    function testFuzz_QuoteStaysInsideFiniteReserve(uint256 rawAmount) public view {
        uint256 amountIn = (rawAmount % 100_000e6) + 1;
        uint256 amountOut = venue.quote(address(usdc), address(afEth), amountIn);
        require(amountOut > 0, "positive input returned zero");
        require(amountOut < ETH_LIQUIDITY, "quote exhausted reserve");
    }

    function test_SwapMovesRealErc20BalancesAndReserves() public {
        uint256 amountIn = 2_000e6;
        uint256 amountOut = venue.quote(address(usdc), address(afEth), amountIn);
        require(usdc.transfer(TRADER, amountIn), "trader funding failed");
        VM.prank(TRADER);
        require(usdc.approve(address(venue), amountIn), "trader approval failed");

        VM.prank(TRADER);
        uint256 returned = venue.swap(
            address(usdc), address(afEth), amountIn, amountOut, RECIPIENT, block.timestamp
        );

        require(returned == amountOut, "wrong returned amount");
        require(usdc.balanceOf(TRADER) == 0, "input not settled");
        require(afEth.balanceOf(RECIPIENT) == amountOut, "output not settled");
        (uint256 usdcReserve, uint256 ethReserve) = venue.getReserves(address(usdc), address(afEth));
        require(usdcReserve == ETH_USDC_LIQUIDITY + amountIn, "wrong input reserve");
        require(ethReserve == ETH_LIQUIDITY - amountOut, "wrong output reserve");
        require(
            usdc.balanceOf(address(venue)) == usdcReserve + BTC_USDC_LIQUIDITY,
            "real USDC balance differs from pair reserves"
        );
    }

    function test_ReverseDirectionAndTokenOrderUseSamePool() public {
        uint256 extraEth = 2e18;
        uint256 extraUsdc = 4_000e6;
        venue.addLiquidity(address(afEth), address(usdc), extraEth, extraUsdc);

        (uint256 ethReserve, uint256 usdcReserve) = venue.getReserves(address(afEth), address(usdc));
        require(ethReserve == ETH_LIQUIDITY + extraEth, "wrong reversed ETH reserve");
        require(usdcReserve == ETH_USDC_LIQUIDITY + extraUsdc, "wrong reversed USDC reserve");
        uint256 expected = usdcReserve * 1e18 / (ethReserve + 1e18);
        require(
            venue.quote(address(afEth), address(usdc), 1e18) == expected,
            "reverse quote used another pool"
        );
    }

    function test_UnsupportedPairIsRejected() public {
        (bool quoteSuccess,) =
            address(venue).call(abi.encodeCall(venue.quote, (address(afEth), address(afBtc), 1e18)));
        require(!quoteSuccess, "unsupported quote accepted");
        (bool swapSuccess,) = address(venue)
            .call(
                abi.encodeCall(
                    venue.swap,
                    (address(afEth), address(afBtc), 1e18, 0, RECIPIENT, block.timestamp)
                )
            );
        require(!swapSuccess, "unsupported swap accepted");
    }

    function test_SlippageAndDeadlineRevertWithoutMovingFunds() public {
        uint256 amountIn = 1_000e6;
        require(usdc.transfer(TRADER, amountIn), "trader funding failed");
        VM.prank(TRADER);
        require(usdc.approve(address(venue), amountIn), "trader approval failed");
        uint256 quote = venue.quote(address(usdc), address(afEth), amountIn);

        VM.prank(TRADER);
        (bool slippageSuccess,) = address(venue)
            .call(
                abi.encodeCall(
                    venue.swap,
                    (address(usdc), address(afEth), amountIn, quote + 1, RECIPIENT, block.timestamp)
                )
            );
        require(!slippageSuccess, "slippage limit ignored");

        VM.warp(100);
        VM.prank(TRADER);
        (bool deadlineSuccess,) = address(venue)
            .call(
                abi.encodeCall(
                    venue.swap, (address(usdc), address(afEth), amountIn, 0, RECIPIENT, 99)
                )
            );
        require(!deadlineSuccess, "expired swap accepted");
        require(usdc.balanceOf(TRADER) == amountIn, "failed swap moved input");
        require(afEth.balanceOf(RECIPIENT) == 0, "failed swap moved output");
    }

    function test_ZeroAmountsAndRecipientAreRejected() public {
        (bool quoteSuccess,) =
            address(venue).call(abi.encodeCall(venue.quote, (address(usdc), address(afEth), 0)));
        require(!quoteSuccess, "zero quote accepted");
        (bool recipientSuccess,) = address(venue)
            .call(
                abi.encodeCall(
                    venue.swap, (address(usdc), address(afEth), 1, 0, address(0), block.timestamp)
                )
            );
        require(!recipientSuccess, "zero recipient accepted");
        (bool liquiditySuccess,) = address(venue)
            .call(
                abi.encodeCall(
                    venue.addLiquidity, (address(usdc), address(afEth), uint256(0), uint256(1))
                )
            );
        require(!liquiditySuccess, "zero liquidity accepted");
    }

    function test_NativeValueIsRejected() public {
        VM.deal(address(this), 1);
        (bool success,) = address(venue).call{ value: 1 }(
            abi.encodeCall(
                venue.swap,
                (address(usdc), address(afEth), uint256(1), uint256(0), RECIPIENT, block.timestamp)
            )
        );
        require(!success, "native value accepted");
        require(address(venue).balance == 0, "venue retained native value");
    }
}
