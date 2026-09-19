// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ReentrantPass is ERC20 {
    address public callbackTarget;
    bytes public callbackData;
    bool public callbackAttempted;
    bool public callbackSucceeded;

    constructor(uint256 supply, address recipient) ERC20("Reentrant Pass", "REPASS") {
        _mint(recipient, supply);
    }

    function configureCallback(address target, bytes calldata data) external {
        callbackTarget = target;
        callbackData = data;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        bool result = super.transferFrom(from, to, value);
        _attemptCallback();
        return result;
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        bool result = super.transfer(to, value);
        _attemptCallback();
        return result;
    }

    function _attemptCallback() private {
        if (!callbackAttempted && callbackTarget != address(0)) {
            callbackAttempted = true;
            (callbackSucceeded,) = callbackTarget.call(callbackData);
        }
    }
}
