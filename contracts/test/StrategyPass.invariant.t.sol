// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { StrategyPass } from "../src/StrategyPass.sol";

contract StrategyPassHolder {
    address public immutable HANDLER;

    constructor(address handler_) {
        HANDLER = handler_;
    }

    function move(StrategyPass pass, address recipient, uint256 amount) external {
        require(msg.sender == HANDLER, "only handler");
        require(pass.transfer(recipient, amount), "move failed");
    }
}

contract StrategyPassHandler {
    StrategyPass public immutable PASS;
    StrategyPassHolder[] private holders;

    constructor(StrategyPass pass_) {
        PASS = pass_;
        for (uint256 index; index < 4; index++) {
            holders.push(new StrategyPassHolder(address(this)));
        }
    }

    function distribute(uint256 rawAmount, uint8 rawRecipient) external {
        uint256 balance = PASS.balanceOf(address(this));
        uint256 amount = balance == type(uint256).max ? rawAmount : rawAmount % (balance + 1);
        require(
            PASS.transfer(address(holders[rawRecipient % uint8(holders.length)]), amount),
            "distribute failed"
        );
    }

    function moveBetweenHolders(uint8 rawSender, uint8 rawRecipient, uint256 rawAmount) external {
        StrategyPassHolder sender = holders[rawSender % uint8(holders.length)];
        StrategyPassHolder recipient = holders[rawRecipient % uint8(holders.length)];
        uint256 balance = PASS.balanceOf(address(sender));
        uint256 amount = balance == type(uint256).max ? rawAmount : rawAmount % (balance + 1);
        sender.move(PASS, address(recipient), amount);
    }

    function trackedBalance() external view returns (uint256 total) {
        total = PASS.balanceOf(address(this));
        for (uint256 index; index < holders.length; index++) {
            total += PASS.balanceOf(address(holders[index]));
        }
    }
}

contract StrategyPassInvariantTest {
    uint256 private constant FIXED_SUPPLY = 1_000_000 ether;

    StrategyPass private pass;
    StrategyPassHandler private handler;
    address[] private targets;

    function setUp() public {
        pass = new StrategyPass("Alpha Momentum Pass", "AF-MOM", FIXED_SUPPLY, address(this));
        handler = new StrategyPassHandler(pass);
        require(pass.transfer(address(handler), FIXED_SUPPLY), "handler funding failed");
        targets.push(address(handler));
    }

    function targetContracts() public view returns (address[] memory) {
        return targets;
    }

    // Catches any transfer implementation that changes supply or loses balances across holders.
    function invariant_FixedSupplyAndTrackedBalancesNeverDiverge() public view {
        require(pass.totalSupply() == FIXED_SUPPLY, "fixed supply changed");
        require(handler.trackedBalance() == FIXED_SUPPLY, "tracked balances diverged");
        require(pass.decimals() == 18, "Pass decimals changed");
    }
}
