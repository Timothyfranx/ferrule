import { parseAbi } from "viem";

export const ferrArcStreamAbi = parseAbi([
  "function createStream(address recipient, uint64 durationSec) external payable returns (uint256 streamId)",
  "function balanceOf(uint256 streamId) external view returns (uint256 recipientBalance, uint256 senderBalance)",
  "function withdrawFromStream(uint256 streamId) external returns (uint256 amount)",
  "function cancelStream(uint256 streamId) external",
  "function getStreamsForUser(address user) external view returns (uint256[] memory)",
  "function streams(uint256 streamId) external view returns (uint256 streamId, address sender, address recipient, uint256 deposit, uint256 ratePerSecond, uint64 startTime, uint64 stopTime, uint256 withdrawnAmount, bool isCancelled)",
  "event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 deposit, uint64 stopTime)",
  "event WithdrawFromStream(uint256 indexed streamId, address indexed recipient, uint256 amount)",
  "event StreamCancelled(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 refundedSender, uint256 paidRecipient)",
]);
