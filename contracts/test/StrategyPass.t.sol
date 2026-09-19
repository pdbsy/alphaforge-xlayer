// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { StrategyPass } from "../src/StrategyPass.sol";

interface Vm {
    function deal(address account, uint256 balance) external;
    function prank(address sender) external;
}

contract StrategyPassSpender {
    function pull(StrategyPass token, address from, address to, uint256 amount) external {
        require(token.transferFrom(from, to, amount), "pull failed");
    }
}

contract StrategyPassTest {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant FIXED_SUPPLY = 100 ether;
    address private constant RECIPIENT = address(0xA11CE);
    address private constant BOB = address(0xB0B);

    StrategyPass private pass;

    function setUp() public {
        pass = new StrategyPass("Alpha Momentum Pass", "AF-MOM", FIXED_SUPPLY, RECIPIENT);
    }

    // Catches minting the wrong literal supply, minting to the deployer, or changing ERC-20 metadata.
    function test_ConstructorMintsCreatorDefinedSupplyToRecipient() public view {
        require(keccak256(bytes(pass.name())) == keccak256("Alpha Momentum Pass"), "wrong name");
        require(keccak256(bytes(pass.symbol())) == keccak256("AF-MOM"), "wrong symbol");
        require(pass.decimals() == 18, "wrong decimals");
        require(pass.totalSupply() == FIXED_SUPPLY, "wrong supply");
        require(pass.balanceOf(RECIPIENT) == FIXED_SUPPLY, "wrong recipient balance");
        require(pass.balanceOf(address(this)) == 0, "deployer received supply");
    }

    // Catches whole-token rounding or transfer gating that would break fractional free trading.
    function test_FractionalPassTransfersFreely() public {
        uint256 fractional = 0.5 ether;
        VM.prank(RECIPIENT);
        require(pass.transfer(BOB, fractional), "fractional transfer failed");
        require(pass.balanceOf(BOB) == fractional, "wrong fractional balance");
        require(pass.balanceOf(RECIPIENT) == FIXED_SUPPLY - fractional, "wrong sender balance");
        require(pass.totalSupply() == FIXED_SUPPLY, "transfer changed supply");
    }

    // Catches a non-standard allowance path that would prevent market/escrow integrations.
    function test_StandardAllowanceCanMoveFractionalPass() public {
        StrategyPassSpender spender = new StrategyPassSpender();
        uint256 fractional = 0.25 ether;
        VM.prank(RECIPIENT);
        require(pass.approve(address(spender), fractional), "approval failed");
        spender.pull(pass, RECIPIENT, BOB, fractional);
        require(pass.balanceOf(BOB) == fractional, "wrong pulled balance");
        require(pass.allowance(RECIPIENT, address(spender)) == 0, "allowance not consumed");
        require(pass.totalSupply() == FIXED_SUPPLY, "transferFrom changed supply");
    }

    // Catches any later addition of a public backdoor mint using the conventional selector.
    function test_PublicMintIsUnavailableAndCannotChangeSupply() public {
        (bool success,) =
            address(pass).call(abi.encodeWithSignature("mint(address,uint256)", BOB, 1 ether));
        require(!success, "public mint accepted");
        require(pass.totalSupply() == FIXED_SUPPLY, "mint selector changed supply");
        require(pass.balanceOf(BOB) == 0, "mint selector changed balance");
    }

    // Catches deployments that strand the immutable supply at the zero address.
    function test_ZeroRecipientDeploymentReverts() public {
        try new StrategyPass("Invalid", "BAD", 1 ether, address(0)) returns (StrategyPass) {
            revert("zero recipient accepted");
        } catch { }
    }

    // Catches accidental native-token custody on the Pass contract.
    function test_OrdinaryEtherTransferIsRejected() public {
        VM.deal(address(this), 1);
        (bool success,) = address(pass).call{ value: 1 }("");
        require(!success, "Pass accepted native value");
        require(address(pass).balance == 0, "Pass retained native value");
    }

    // Catches fractional transfer paths that mint, burn, or lose base units at boundary amounts.
    function testFuzz_TransferPreservesEveryBaseUnit(uint256 candidate) public {
        uint256 amount = candidate % (FIXED_SUPPLY + 1);
        VM.prank(RECIPIENT);
        require(pass.transfer(BOB, amount), "bounded transfer failed");
        require(pass.balanceOf(RECIPIENT) + pass.balanceOf(BOB) == FIXED_SUPPLY, "base unit lost");
        require(pass.totalSupply() == FIXED_SUPPLY, "fuzz transfer changed supply");
    }
}
