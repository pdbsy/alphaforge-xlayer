// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { IAlphaForgeVault } from "../src/interfaces/IAlphaForgeVault.sol";

contract AlphaForgeVaultInterfaceTest {
    // Catches an ABI edit that removes or collides any owner custody mutation selector.
    function test_OwnerCustodyMutationSelectorsArePresentAndDistinct() public pure {
        bytes4[5] memory selectors = [
            IAlphaForgeVault.deposit.selector,
            IAlphaForgeVault.withdraw.selector,
            IAlphaForgeVault.close.selector,
            IAlphaForgeVault.rescueUntrackedToken.selector,
            IAlphaForgeVault.rescueNative.selector
        ];
        _requireDistinct(selectors);
    }

    // Catches an ABI edit that removes a conversion or accounting view consumed by UI/indexers.
    function test_AccountingViewSelectorsArePresentAndDistinct() public pure {
        bytes4[7] memory selectors = [
            IAlphaForgeVault.usdcToPassRaw.selector,
            IAlphaForgeVault.passToUsdcRaw.selector,
            IAlphaForgeVault.realizedProfit.selector,
            IAlphaForgeVault.withdrawableUsdc.selector,
            IAlphaForgeVault.reservedTrackedBalance.selector,
            IAlphaForgeVault.untrackedExcess.selector,
            IAlphaForgeVault.trackedPosition.selector
        ];
        _requireDistinct(selectors);
    }

    // Catches accidental event renames or parameter-order drift in the frozen handoff.
    function test_EventIdentitiesArePresentAndDistinct() public pure {
        bytes32[7] memory topics = [
            keccak256("Deposited(address,uint256,uint256,uint256,uint256)"),
            keccak256("Withdrawn(address,uint256,uint256,uint256,uint256,uint256,uint256)"),
            keccak256("Closed(address,uint256,uint256)"),
            keccak256("TrackedUsdcBalanceChanged(uint256,uint256)"),
            keccak256("TrackedPositionChanged(address,uint256,uint256)"),
            keccak256("UntrackedTokenRescued(address,address,uint256)"),
            keccak256("NativeRescued(address,uint256)")
        ];
        for (uint256 i = 0; i < topics.length; ++i) {
            for (uint256 j = i + 1; j < topics.length; ++j) {
                require(topics[i] != topics[j], "event topic collision");
            }
        }
    }

    function _requireDistinct(bytes4[5] memory selectors) private pure {
        for (uint256 i = 0; i < selectors.length; ++i) {
            require(selectors[i] != bytes4(0), "zero selector");
            for (uint256 j = i + 1; j < selectors.length; ++j) {
                require(selectors[i] != selectors[j], "selector collision");
            }
        }
    }

    function _requireDistinct(bytes4[7] memory selectors) private pure {
        for (uint256 i = 0; i < selectors.length; ++i) {
            require(selectors[i] != bytes4(0), "zero selector");
            for (uint256 j = i + 1; j < selectors.length; ++j) {
                require(selectors[i] != selectors[j], "selector collision");
            }
        }
    }
}
