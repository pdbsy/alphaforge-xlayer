// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { SimulateXLayerPhase1 } from "../script/SimulateXLayerPhase1.s.sol";
import { AlphaForgeVault } from "../src/AlphaForgeVault.sol";
import { AlphaForgeTestUSDT } from "../src/AlphaForgeTestUSDT.sol";
import { PassLocker } from "../src/PassLocker.sol";

interface XLayerScriptVm {
    function chainId(uint256 id) external;
    function setEnv(string calldata name, string calldata value) external;
    function getNonce(address account) external view returns (uint64);
    function deal(address account, uint256 balance) external;
}

contract XLayerDeploymentScriptTest is SimulateXLayerPhase1 {
    XLayerScriptVm private constant TEST_VM =
        XLayerScriptVm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant DEPLOYER = address(0xD00D);
    address private constant OWNER = address(0xA11CE);

    function setUp() public {
        TEST_VM.chainId(1952);
        TEST_VM.deal(DEPLOYER, 10 ether);
        TEST_VM.setEnv("AF_XLAYER_DEPLOYER", "0x000000000000000000000000000000000000d00d");
        TEST_VM.setEnv("AF_XLAYER_OWNER", "0x00000000000000000000000000000000000a11ce");
        TEST_VM.setEnv("AF_XLAYER_CREATOR", "0x0000000000000000000000000000000000c0ffee");
        TEST_VM.setEnv(
            "AF_XLAYER_STRATEGY_ID",
            "0x1111111111111111111111111111111111111111111111111111111111111111"
        );
        TEST_VM.setEnv(
            "AF_XLAYER_STRATEGY_REF",
            "0x2222222222222222222222222222222222222222222222222222222222222222"
        );
        TEST_VM.setEnv("AF_XLAYER_PASS_NAME", "AlphaForge Pre-release Pass");
        TEST_VM.setEnv("AF_XLAYER_PASS_SYMBOL", "AF-PASS");
        TEST_VM.setEnv("AF_XLAYER_PASS_SUPPLY", "100000000000000000000");
        TEST_VM.setEnv("AF_XLAYER_PASS_RECIPIENT", "0x00000000000000000000000000000000000a11ce");
        TEST_VM.setEnv("AF_XLAYER_USDT_SUPPLY", "100000000");
        TEST_VM.setEnv("AF_XLAYER_USDT_RECIPIENT", "0x00000000000000000000000000000000000a11ce");
        TEST_VM.setEnv("AF_XLAYER_ETH_SUPPLY", "1000000000000000000");
        TEST_VM.setEnv("AF_XLAYER_ETH_RECIPIENT", "0x00000000000000000000000000000000000a11ce");
        TEST_VM.setEnv("AF_XLAYER_BTC_SUPPLY", "1000000000000000000");
        TEST_VM.setEnv("AF_XLAYER_BTC_RECIPIENT", "0x00000000000000000000000000000000000a11ce");
    }

    function test_SimulationRejectsInvalidInputsThenCreatesExactlyFiveContracts() public {
        rejectWrongChain();
        rejectMissingSupplyAndZeroOwner();
        uint64 beforeNonce = TEST_VM.getNonce(DEPLOYER);
        address[6] memory deployed = run();
        require(TEST_VM.getNonce(DEPLOYER) == beforeNonce + 5, "not five direct deployments");
        for (uint256 i; i < deployed.length; i++) {
            require(
                deployed[i] != address(0) && deployed[i].code.length != 0,
                "missing simulated contract"
            );
            for (uint256 j; j < i; j++) {
                require(deployed[i] != deployed[j], "duplicate contract");
            }
        }
        AlphaForgeVault vault = AlphaForgeVault(payable(deployed[4]));
        require(vault.owner() == OWNER && vault.afUsdc() == deployed[0], "constructor mismatch");
        require(vault.passLocker() == deployed[5], "Locker not Vault-created");
        require(PassLocker(deployed[5]).vault() == deployed[4], "Locker controller mismatch");
        require(AlphaForgeTestUSDT(deployed[0]).balanceOf(OWNER) == 100e6, "supply mismatch");
    }

    function rejectWrongChain() private {
        uint64 beforeNonce = TEST_VM.getNonce(DEPLOYER);
        TEST_VM.chainId(196);
        (bool ok,) = address(this).call(abi.encodeCall(this.run, ()));
        require(
            !ok && TEST_VM.getNonce(DEPLOYER) == beforeNonce, "foreign chain prepared deployment"
        );
        TEST_VM.chainId(1952);
    }

    function rejectMissingSupplyAndZeroOwner() private {
        uint64 beforeNonce = TEST_VM.getNonce(DEPLOYER);
        TEST_VM.setEnv("AF_XLAYER_OWNER", "0x0000000000000000000000000000000000000000");
        (bool zeroOwner,) = address(this).call(abi.encodeCall(this.run, ()));
        TEST_VM.setEnv("AF_XLAYER_OWNER", "0x00000000000000000000000000000000000a11ce");
        TEST_VM.setEnv("AF_XLAYER_USDT_SUPPLY", "");
        (bool missingSupply,) = address(this).call(abi.encodeCall(this.run, ()));
        require(
            !zeroOwner && !missingSupply && TEST_VM.getNonce(DEPLOYER) == beforeNonce,
            "guessed constructor input"
        );
        TEST_VM.setEnv("AF_XLAYER_USDT_SUPPLY", "100000000");
    }
}
