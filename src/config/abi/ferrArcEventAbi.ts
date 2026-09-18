import { parseAbi } from "viem";

export const ferrArcEventAbi = parseAbi([
  "function createMarket(string calldata assetSymbol, uint256 strikePrice, uint64 durationSec) external returns (bytes32 windowId)",
  "function placeCall(bytes32 windowId, uint8 direction) external payable",
  "function resolveMarket(bytes32 windowId, uint256 finalPrice) external",
  "function claimPayout(bytes32 windowId) external returns (uint256 payout)",
  "function voidMarket(bytes32 windowId, string calldata reason) external",
  "function getCrowdLean(bytes32 windowId) external view returns (uint256 upProbabilityBps)",
  "function markets(bytes32 windowId) external view returns (bytes32 windowId, string assetSymbol, uint256 strikePrice, uint256 finalPrice, uint64 startTime, uint64 lockTime, uint64 expiryTime, uint256 totalUpStake, uint256 totalDownStake, uint8 state, uint8 winningOutcome)",
  "function positions(bytes32 windowId, address user) external view returns (uint256 upStake, uint256 downStake, bool claimed)",
  "function activeMarketIds(uint256 index) external view returns (bytes32)",
  "event MarketCreated(bytes32 indexed windowId, string assetSymbol, uint256 strikePrice, uint64 expiryTime)",
  "event PositionOpened(bytes32 indexed windowId, address indexed trader, uint8 direction, uint256 stakeAmount)",
  "event MarketResolved(bytes32 indexed windowId, uint8 winningOutcome, uint256 finalPrice)",
  "event PayoutClaimed(bytes32 indexed windowId, address indexed trader, uint256 payoutAmount)",
  "event MarketVoided(bytes32 indexed windowId, string reason)",
]);
