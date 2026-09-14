// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { AlphaForgeSwapAdapter } from "../src/AlphaForgeSwapAdapter.sol";
import {
    AlphaForgeTestBTC,
    AlphaForgeTestETH,
    AlphaForgeTestUSDC
} from "../src/AlphaForgeTestAsset.sol";
import { AlphaForgeTestVenue } from "../src/AlphaForgeTestVenue.sol";
import { ProtocolTypes } from "../src/ProtocolTypes.sol";
import { MaliciousVenue } from "./mocks/MaliciousVenue.sol";

interface AdapterVm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
}

contract AlphaForgeSwapAdapterTest {
    AdapterVm private constant VM =
        AdapterVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant TRADER = address(0xA11CE);
    bytes32 private constant STRATEGY_ID = keccak256("trend");

    AlphaForgeTestUSDC private usdc;
    AlphaForgeTestETH private afEth;
    AlphaForgeTestBTC private afBtc;
    AlphaForgeTestVenue private venue;
    AlphaForgeSwapAdapter private adapter;

    function setUp() public {
        usdc = new AlphaForgeTestUSDC(10_000_000e6, address(this));
        afEth = new AlphaForgeTestETH(10_000e18, address(this));
        afBtc = new AlphaForgeTestBTC(1_000e18, address(this));
        venue = new AlphaForgeTestVenue(address(usdc), address(afEth), address(afBtc));
        require(usdc.approve(address(venue), type(uint256).max), "USDC approval failed");
        require(afEth.approve(address(venue), type(uint256).max), "ETH approval failed");
        venue.addLiquidity(address(usdc), address(afEth), 1_000_000e6, 500e18);
        adapter = new AlphaForgeSwapAdapter(
            address(venue), address(usdc), address(afEth), address(afBtc)
        );
    }

    function test_TypedSwapSettlesToCallingVaultAndClearsCustody() public {
        uint256 amountIn = 1_000e6;
        require(usdc.transfer(TRADER, amountIn), "trader funding failed");
        VM.prank(TRADER);
        require(usdc.approve(address(adapter), amountIn), "adapter approval failed");
        ProtocolTypes.SwapAction memory action = _action(amountIn);
        uint256 quote = venue.quote(action.tokenIn, action.tokenOut, action.amountIn);

        VM.prank(TRADER);
        uint256 amountOut = adapter.swap(action);

        require(amountOut == quote, "wrong adapter output");
        require(usdc.balanceOf(TRADER) == 0, "adapter did not spend exact input");
        require(afEth.balanceOf(TRADER) == quote, "output not returned to caller");
        require(usdc.balanceOf(address(adapter)) == 0, "adapter retained input");
        require(afEth.balanceOf(address(adapter)) == 0, "adapter retained output");
        require(usdc.allowance(address(adapter), address(venue)) == 0, "venue allowance remained");
    }

    function test_WrongPairAndZeroAmountAreRejectedBeforeFundsMove() public {
        ProtocolTypes.SwapAction memory action = _action(1e6);
        action.tokenIn = address(afEth);
        action.tokenOut = address(afBtc);
        (bool pairSuccess,) = address(adapter).call(abi.encodeCall(adapter.swap, action));
        require(!pairSuccess, "unsupported pair accepted");

        action.tokenIn = address(usdc);
        action.tokenOut = address(afEth);
        action.amountIn = 0;
        (bool amountSuccess,) = address(adapter).call(abi.encodeCall(adapter.swap, action));
        require(!amountSuccess, "zero amount accepted");
        require(usdc.balanceOf(address(adapter)) == 0, "failed validation moved funds");
    }

    function test_ArbitraryExecutionSelectorDoesNotExist() public {
        (bool success,) = address(adapter)
            .call(abi.encodeWithSignature("execute(address,bytes)", address(venue), hex"1234"));
        require(!success, "arbitrary execution selector exists");
    }

    function test_NativeValueIsRejected() public {
        VM.deal(address(this), 1);
        ProtocolTypes.SwapAction memory action = _action(1e6);
        (bool success,) = address(adapter).call{ value: 1 }(abi.encodeCall(adapter.swap, action));
        require(!success, "native value accepted");
        require(address(adapter).balance == 0, "adapter retained native value");
    }

    function test_VenueAllowanceIsExactDuringSwapAndZeroAfter() public {
        uint256 amountIn = 5_000e6;
        uint256 amountOut = 2e18;
        (AlphaForgeSwapAdapter mockAdapter, MaliciousVenue mockVenue) =
            _mockAdapter(MaliciousVenue.Mode.Normal, amountOut);
        _fundAndApprove(mockAdapter, amountIn);
        require(usdc.allowance(address(mockAdapter), address(mockVenue)) == 0, "initial allowance");

        VM.prank(TRADER);
        mockAdapter.swap(_action(amountIn));

        require(mockVenue.allowanceObserved() == amountIn, "venue did not see exact allowance");
        require(
            usdc.allowance(address(mockAdapter), address(mockVenue)) == 0, "allowance not reset"
        );
        require(afEth.balanceOf(TRADER) == amountOut, "mock output not settled");
    }

    function test_AbnormalVenueDeltasRevertAtomically() public {
        uint256 amountIn = 5_000e6;
        (AlphaForgeSwapAdapter underSpendAdapter,) =
            _mockAdapter(MaliciousVenue.Mode.UnderSpend, 2e18);
        _fundAndApprove(underSpendAdapter, amountIn);
        VM.prank(TRADER);
        (bool underSpendSuccess,) = address(underSpendAdapter)
            .call(abi.encodeCall(underSpendAdapter.swap, _action(amountIn)));
        require(!underSpendSuccess, "under-spend accepted");
        require(usdc.balanceOf(TRADER) == amountIn, "under-spend revert lost input");

        (AlphaForgeSwapAdapter shortOutputAdapter,) =
            _mockAdapter(MaliciousVenue.Mode.ShortOutput, 2e18);
        VM.prank(TRADER);
        require(usdc.approve(address(shortOutputAdapter), amountIn), "short-output approval failed");
        VM.prank(TRADER);
        (bool shortOutputSuccess,) = address(shortOutputAdapter)
            .call(abi.encodeCall(shortOutputAdapter.swap, _action(amountIn)));
        require(!shortOutputSuccess, "short output accepted");
        require(usdc.balanceOf(TRADER) == amountIn, "short-output revert lost input");
    }

    function test_VenueRevertLeavesFundsAndAllowanceUntouched() public {
        uint256 amountIn = 1_000e6;
        (AlphaForgeSwapAdapter mockAdapter, MaliciousVenue mockVenue) =
            _mockAdapter(MaliciousVenue.Mode.RevertSwap, 1e18);
        _fundAndApprove(mockAdapter, amountIn);
        VM.prank(TRADER);
        (bool success,) =
            address(mockAdapter).call(abi.encodeCall(mockAdapter.swap, _action(amountIn)));
        require(!success, "venue revert ignored");
        require(usdc.balanceOf(TRADER) == amountIn, "venue revert lost input");
        require(usdc.allowance(address(mockAdapter), address(mockVenue)) == 0, "allowance leaked");
    }

    function test_MaliciousVenueCannotReenterAdapter() public {
        uint256 amountIn = 1_000e6;
        (AlphaForgeSwapAdapter mockAdapter, MaliciousVenue mockVenue) =
            _mockAdapter(MaliciousVenue.Mode.Reenter, 1e18);
        ProtocolTypes.SwapAction memory action = _action(amountIn);
        mockVenue.configureCallback(address(mockAdapter), abi.encodeCall(mockAdapter.swap, action));
        _fundAndApprove(mockAdapter, amountIn);

        VM.prank(TRADER);
        mockAdapter.swap(action);

        require(mockVenue.callbackAttempted(), "callback not attempted");
        require(!mockVenue.callbackSucceeded(), "reentrant swap succeeded");
        require(usdc.balanceOf(TRADER) == 0, "outer input not settled");
        require(afEth.balanceOf(TRADER) == 1e18, "outer output not settled");
    }

    function testFuzz_AdapterNeverSpendsMoreThanAmountIn(uint256 rawAmount) public {
        uint256 amountIn = (rawAmount % 100_000e6) + 1;
        (AlphaForgeSwapAdapter mockAdapter, MaliciousVenue mockVenue) =
            _mockAdapter(MaliciousVenue.Mode.Normal, 1);
        _fundAndApprove(mockAdapter, amountIn);
        uint256 balanceBefore = usdc.balanceOf(TRADER);
        VM.prank(TRADER);
        mockAdapter.swap(_action(amountIn));
        require(balanceBefore - usdc.balanceOf(TRADER) == amountIn, "overspent caller input");
        require(mockVenue.allowanceObserved() == amountIn, "approved more than amountIn");
    }

    function _action(uint256 amountIn)
        private
        view
        returns (ProtocolTypes.SwapAction memory action)
    {
        action = ProtocolTypes.SwapAction({
            strategyId: STRATEGY_ID,
            tokenIn: address(usdc),
            tokenOut: address(afEth),
            amountIn: amountIn,
            minAmountOut: 0,
            deadline: block.timestamp,
            expectedStateVersion: 7
        });
    }

    function _mockAdapter(MaliciousVenue.Mode mode, uint256 amountOut)
        private
        returns (AlphaForgeSwapAdapter mockAdapter, MaliciousVenue mockVenue)
    {
        mockVenue = new MaliciousVenue(usdc, afEth);
        mockVenue.configure(mode, amountOut);
        require(afEth.transfer(address(mockVenue), 100e18), "mock venue funding failed");
        mockAdapter = new AlphaForgeSwapAdapter(
            address(mockVenue), address(usdc), address(afEth), address(afBtc)
        );
    }

    function _fundAndApprove(AlphaForgeSwapAdapter target, uint256 amount) private {
        require(usdc.transfer(TRADER, amount), "trader funding failed");
        VM.prank(TRADER);
        require(usdc.approve(address(target), amount), "mock adapter approval failed");
    }
}
