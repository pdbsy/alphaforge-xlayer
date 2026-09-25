// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

import { AlphaForgeTestUSDT } from "../src/AlphaForgeTestUSDT.sol";
import { AlphaForgeTestETH, AlphaForgeTestBTC } from "../src/AlphaForgeTestAsset.sol";
import { StrategyPass } from "../src/StrategyPass.sol";
import { AlphaForgeVault } from "../src/AlphaForgeVault.sol";

interface XLayerSimulationVm {
    function envAddress(string calldata name) external view returns (address);
    function envUint(string calldata name) external view returns (uint256);
    function envBytes32(string calldata name) external view returns (bytes32);
    function envString(string calldata name) external view returns (string memory);
    function startPrank(address sender) external;
    function stopPrank() external;
}

/// @notice In-memory simulation only. Does not collect transactions for broadcast.
contract SimulateXLayerPhase1 {
    XLayerSimulationVm private constant VM =
        XLayerSimulationVm(address(uint160(uint256(keccak256("hevm cheat code")))));

    struct Parameters {
        address deployer;
        address owner;
        address creator;
        bytes32 strategyId;
        bytes32 strategyRef;
        string passName;
        string passSymbol;
        uint256 passSupply;
        address passRecipient;
        uint256 usdtSupply;
        address usdtRecipient;
        uint256 ethSupply;
        address ethRecipient;
        uint256 btcSupply;
        address btcRecipient;
    }

    function parameters() private view returns (Parameters memory p) {
        p.deployer = VM.envAddress("AF_XLAYER_DEPLOYER");
        p.owner = VM.envAddress("AF_XLAYER_OWNER");
        p.creator = VM.envAddress("AF_XLAYER_CREATOR");
        p.strategyId = VM.envBytes32("AF_XLAYER_STRATEGY_ID");
        p.strategyRef = VM.envBytes32("AF_XLAYER_STRATEGY_REF");
        p.passName = VM.envString("AF_XLAYER_PASS_NAME");
        p.passSymbol = VM.envString("AF_XLAYER_PASS_SYMBOL");
        p.passSupply = VM.envUint("AF_XLAYER_PASS_SUPPLY");
        p.passRecipient = VM.envAddress("AF_XLAYER_PASS_RECIPIENT");
        p.usdtSupply = VM.envUint("AF_XLAYER_USDT_SUPPLY");
        p.usdtRecipient = VM.envAddress("AF_XLAYER_USDT_RECIPIENT");
        p.ethSupply = VM.envUint("AF_XLAYER_ETH_SUPPLY");
        p.ethRecipient = VM.envAddress("AF_XLAYER_ETH_RECIPIENT");
        p.btcSupply = VM.envUint("AF_XLAYER_BTC_SUPPLY");
        p.btcRecipient = VM.envAddress("AF_XLAYER_BTC_RECIPIENT");
        require(
            p.deployer != address(0) && p.owner != address(0) && p.creator != address(0),
            "INVALID_OPERATOR_IDENTITY"
        );
        require(
            p.strategyId != bytes32(0) && p.strategyRef != bytes32(0), "INVALID_STRATEGY_IDENTITY"
        );
        require(
            bytes(p.passName).length > 0 && bytes(p.passName).length <= 64
                && bytes(p.passSymbol).length > 0 && bytes(p.passSymbol).length <= 16,
            "INVALID_PASS_METADATA"
        );
        require(
            p.passSupply > 0 && p.usdtSupply > 0 && p.ethSupply > 0 && p.btcSupply > 0,
            "INVALID_FIXED_SUPPLY"
        );
        require(
            p.passRecipient != address(0) && p.usdtRecipient != address(0)
                && p.ethRecipient != address(0) && p.btcRecipient != address(0),
            "INVALID_RECIPIENT"
        );
    }

    function run() public returns (address[6] memory simulated) {
        require(block.chainid == 1952, "XLAYER_TESTNET_REQUIRED");
        Parameters memory p = parameters();
        // Prank only changes the in-memory caller. It does not prepare signed transactions.
        VM.startPrank(p.deployer);
        simulated[0] = address(new AlphaForgeTestUSDT(p.usdtSupply, p.usdtRecipient));
        simulated[1] = address(new AlphaForgeTestETH(p.ethSupply, p.ethRecipient));
        simulated[2] = address(new AlphaForgeTestBTC(p.btcSupply, p.btcRecipient));
        simulated[3] = address(
            new StrategyPass(p.passName, p.passSymbol, p.strategyId, p.passSupply, p.passRecipient)
        );
        AlphaForgeVault vault = new AlphaForgeVault(
            p.owner,
            p.creator,
            p.strategyId,
            p.strategyRef,
            simulated[3],
            simulated[0],
            simulated[1],
            simulated[2]
        );
        simulated[4] = address(vault);
        VM.stopPrank();
        simulated[5] = vault.passLocker();
    }
}
