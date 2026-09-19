// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IAlphaForgeVault } from "../src/interfaces/IAlphaForgeVault.sol";

contract AlphaForgeVaultInterfaceTest {
    function test_AllFunctionSelectorsMatchFrozenAbi() public pure {
        require(IAlphaForgeVault.deposit.selector == 0xb6b55f25, "deposit selector drift");
        require(IAlphaForgeVault.withdraw.selector == 0x2e1a7d4d, "withdraw selector drift");
        require(IAlphaForgeVault.close.selector == 0x43d726d6, "close selector drift");
        require(
            IAlphaForgeVault.rescueUntrackedToken.selector == 0x45f5030f,
            "rescue token selector drift"
        );
        require(IAlphaForgeVault.rescueNative.selector == 0xfc82f084, "rescue native drift");
        require(IAlphaForgeVault.usdcToPassRaw.selector == 0x643456f6, "forward conversion drift");
        require(IAlphaForgeVault.passToUsdcRaw.selector == 0x18ba7fe2, "reverse conversion drift");
        require(IAlphaForgeVault.realizedProfit.selector == 0x738b74f0, "profit selector drift");
        require(IAlphaForgeVault.withdrawableUsdc.selector == 0x442ad6a0, "withdrawable drift");
        require(IAlphaForgeVault.reservedTrackedBalance.selector == 0xc0bdb971, "reserved drift");
        require(IAlphaForgeVault.untrackedExcess.selector == 0x21f38bbd, "excess selector drift");
        require(IAlphaForgeVault.owner.selector == 0x8da5cb5b, "owner selector drift");
        require(IAlphaForgeVault.strategyCreator.selector == 0x499bb2ab, "creator drift");
        require(IAlphaForgeVault.strategyId.selector == 0x492f4e18, "strategy id drift");
        require(IAlphaForgeVault.strategyRef.selector == 0xc288f3de, "strategy ref drift");
        require(IAlphaForgeVault.pass.selector == 0xa7a1ed72, "pass selector drift");
        require(IAlphaForgeVault.afUsdc.selector == 0x8b5a851f, "usdc selector drift");
        require(IAlphaForgeVault.afEth.selector == 0xf20173bc, "eth selector drift");
        require(IAlphaForgeVault.afBtc.selector == 0xa8d937e9, "btc selector drift");
        require(IAlphaForgeVault.passLocker.selector == 0xab88dc4b, "locker selector drift");
        require(IAlphaForgeVault.principalBasis.selector == 0xad587035, "principal drift");
        require(IAlphaForgeVault.trackedUsdcBalance.selector == 0x0510ca51, "tracked usdc drift");
        require(IAlphaForgeVault.trackedPosition.selector == 0xb31ede63, "position selector drift");
        require(IAlphaForgeVault.openTrackedPositionCount.selector == 0x34dda870, "count drift");
        require(IAlphaForgeVault.closed.selector == 0x597e1fb5, "closed selector drift");
    }

    function test_AllCustomErrorSelectorsMatchFrozenAbi() public pure {
        require(IAlphaForgeVault.Unauthorized.selector == 0x8e4a23d6, "Unauthorized drift");
        require(IAlphaForgeVault.ZeroAddress.selector == 0xd92e233d, "ZeroAddress drift");
        require(IAlphaForgeVault.DuplicateAsset.selector == 0x437a40b1, "DuplicateAsset drift");
        require(
            IAlphaForgeVault.InvalidStrategyIdentity.selector == 0xd4ce6f3d,
            "InvalidStrategyIdentity drift"
        );
        require(
            IAlphaForgeVault.StrategyPassMismatch.selector == 0xf73f4ac6,
            "StrategyPassMismatch drift"
        );
        require(
            IAlphaForgeVault.UnexpectedDecimals.selector == 0x91dfc113, "UnexpectedDecimals drift"
        );
        require(IAlphaForgeVault.ZeroAmount.selector == 0x1f2a2005, "ZeroAmount drift");
        require(IAlphaForgeVault.VaultClosed.selector == 0xdf23397a, "VaultClosed drift");
        require(IAlphaForgeVault.VaultActive.selector == 0x0f76440a, "VaultActive drift");
        require(IAlphaForgeVault.AmountOverflow.selector == 0xff29cf0d, "AmountOverflow drift");
        require(
            IAlphaForgeVault.InexactPassAmount.selector == 0xdab463a7, "InexactPassAmount drift"
        );
        require(
            IAlphaForgeVault.InsufficientTrackedUsdc.selector == 0xf1e240c1,
            "InsufficientTrackedUsdc drift"
        );
        require(
            IAlphaForgeVault.OpenTrackedPositions.selector == 0x96d995dc,
            "OpenTrackedPositions drift"
        );
        require(
            IAlphaForgeVault.UnsupportedTrackedAsset.selector == 0xf32b7061,
            "UnsupportedTrackedAsset drift"
        );
        require(
            IAlphaForgeVault.TrackedBalanceDeficit.selector == 0x5f12aa59,
            "TrackedBalanceDeficit drift"
        );
        require(
            IAlphaForgeVault.TokenTransferAmountMismatch.selector == 0x8259e2f5,
            "TokenTransferAmountMismatch drift"
        );
        require(
            IAlphaForgeVault.NoUntrackedExcess.selector == 0xebbcde93, "NoUntrackedExcess drift"
        );
        require(
            IAlphaForgeVault.NativeTransferFailed.selector == 0xf4b3b1bc,
            "NativeTransferFailed drift"
        );
    }

    function test_AllEventTopicsMatchFrozenAbi() public pure {
        require(
            IAlphaForgeVault.Deposited.selector
                == 0xe3b53cd1a44fbf11535e145d80b8ef1ed6d57a73bf5daa7e939b6b01657d6549,
            "Deposited topic drift"
        );
        require(
            IAlphaForgeVault.Withdrawn.selector
                == 0x6b4651e8f4162f82274a25e57a29f7ed9156d17078e76dd4d05f04ba08831aa4,
            "Withdrawn topic drift"
        );
        require(
            IAlphaForgeVault.Closed.selector
                == 0x792b1058d55c02122048f16ecbfdaab6be257e8c903a60a01f220960238aefc7,
            "Closed topic drift"
        );
        require(
            IAlphaForgeVault.TrackedUsdcBalanceChanged.selector
                == 0x29a4ed269a24b639ce9313072bca1d8d408f35f61108737792b18153b9c5b470,
            "TrackedUsdcBalanceChanged topic drift"
        );
        require(
            IAlphaForgeVault.TrackedPositionChanged.selector
                == 0xc918adb5da6f1094bf877bef10e664cd7ca5fb1216d89f807c19cdf60e5f1c88,
            "TrackedPositionChanged topic drift"
        );
        require(
            IAlphaForgeVault.UntrackedTokenRescued.selector
                == 0x204874061edf1b61f01e55eb957ff789bf733451c43d111f54ba6d84122b7160,
            "UntrackedTokenRescued topic drift"
        );
        require(
            IAlphaForgeVault.NativeRescued.selector
                == 0xe3eb98b7fe2a0c1d490b92af73eeae611e9b00ab3c3f70b20bd7bb43f67a0f43,
            "NativeRescued topic drift"
        );
    }
}
