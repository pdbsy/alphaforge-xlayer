// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.31;

/// @notice Frozen M3 partial-onchain custody and accounting boundary for one owner Vault.
interface IAlphaForgeVault {
    error Unauthorized(address caller);
    error ZeroAddress();
    error DuplicateAsset(address token);
    error InvalidStrategyIdentity();
    error StrategyPassMismatch(address pass, bytes32 expected, bytes32 actual);
    error UnexpectedDecimals(address token, uint8 expected, uint8 actual);
    error ZeroAmount();
    error VaultClosed();
    error VaultActive();
    error AmountOverflow(uint256 amount);
    error InexactPassAmount(uint256 passRaw);
    error InsufficientTrackedUsdc(uint256 available, uint256 requested);
    error OpenTrackedPositions(uint256 count);
    error UnsupportedTrackedAsset(address token);
    error TrackedBalanceDeficit(address token, uint256 actual, uint256 reserved);
    error TokenTransferAmountMismatch(address token, uint256 expected, uint256 actual);
    error NoUntrackedExcess(address token);
    error NativeTransferFailed();

    event Deposited(
        address indexed owner,
        uint256 usdcAmount,
        uint256 passRaw,
        uint256 principalBasis,
        uint256 trackedUsdcBalance
    );
    event Withdrawn(
        address indexed owner,
        uint256 usdcAmount,
        uint256 profitAmount,
        uint256 principalAmount,
        uint256 passRawUnlocked,
        uint256 principalBasis,
        uint256 trackedUsdcBalance
    );
    event Closed(address indexed owner, uint256 usdcReturned, uint256 passRawReleased);
    event TrackedUsdcBalanceChanged(uint256 previousBalance, uint256 newBalance);
    event TrackedPositionChanged(address indexed token, uint256 previousAmount, uint256 newAmount);
    event UntrackedTokenRescued(address indexed token, address indexed owner, uint256 amount);
    event NativeRescued(address indexed owner, uint256 amount);

    function deposit(uint256 usdcAmount) external;
    function withdraw(uint256 usdcAmount) external;
    function close() external;
    function rescueUntrackedToken(address token) external returns (uint256 amount);
    function rescueNative() external returns (uint256 amount);

    function usdcToPassRaw(uint256 usdcRaw) external pure returns (uint256 passRaw);
    function passToUsdcRaw(uint256 passRaw) external pure returns (uint256 usdcRaw);
    function realizedProfit() external view returns (uint256 amount);
    function withdrawableUsdc() external view returns (uint256 amount);
    function reservedTrackedBalance(address token) external view returns (uint256 amount);
    function untrackedExcess(address token) external view returns (uint256 amount);

    function owner() external view returns (address);
    function strategyCreator() external view returns (address);
    function strategyId() external view returns (bytes32);
    function strategyRef() external view returns (bytes32);
    function pass() external view returns (address);
    function afUsdc() external view returns (address);
    function afEth() external view returns (address);
    function afBtc() external view returns (address);
    function passLocker() external view returns (address);
    function principalBasis() external view returns (uint256);
    function trackedUsdcBalance() external view returns (uint256);
    function trackedPosition(address token) external view returns (uint256);
    function openTrackedPositionCount() external view returns (uint256);
    function closed() external view returns (bool);
}
