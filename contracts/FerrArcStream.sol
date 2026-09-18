// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FerrArcStream
 * @notice Real-Time Continuous USDC Cashflow & Agent Treasury Engine on Arc Mainnet.
 * @dev Continuous money streams powered by Arc native USDC (18 decimals).
 *      Allows employers, DAOs, and investors to stream capital per-second to recipients and AI agent wallets.
 */
contract FerrArcStream {
    error ZeroDeposit();
    error InvalidRecipient();
    error InvalidDuration();
    error StreamNotFound();
    error StreamEnded();
    error Unauthorized();
    error NothingToWithdraw();
    error TransferFailed();

    struct Stream {
        uint256 streamId;
        address sender;
        address recipient;
        uint256 deposit;          // Total native USDC deposited (18 decimals)
        uint256 ratePerSecond;    // Native USDC unlocked every second
        uint64 startTime;         // Stream start timestamp
        uint64 stopTime;          // Stream end timestamp
        uint256 withdrawnAmount;  // Amount already claimed by recipient
        bool isCancelled;         // Cancellation flag
    }

    uint256 public nextStreamId = 1;
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public userStreams; // Tracks streams for an address

    // Reentrancy guard
    uint256 private _guard = 1;
    modifier nonReentrant() {
        require(_guard == 1, "ReentrancyGuard: reentrant call");
        _guard = 2;
        _;
        _guard = 1;
    }

    event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 deposit, uint64 stopTime);
    event WithdrawFromStream(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event StreamCancelled(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 refundedSender, uint256 paidRecipient);

    /**
     * @notice Opens a continuous per-second payment stream using native Arc USDC.
     * @param recipient The wallet address receiving the cashflow.
     * @param durationSec The duration of the stream in seconds (e.g. 30 days = 2,592,000s).
     */
    function createStream(address recipient, uint64 durationSec) external payable nonReentrant returns (uint256 streamId) {
        if (msg.value == 0) revert ZeroDeposit();
        if (recipient == address(0) || recipient == msg.sender) revert InvalidRecipient();
        if (durationSec == 0) revert InvalidDuration();

        uint64 start = uint64(block.timestamp);
        uint64 stop = start + durationSec;

        // Rate per second: deposit / duration (18 decimals maintains micro-cent accuracy)
        uint256 rate = msg.value / durationSec;
        if (rate == 0) revert ZeroDeposit();

        streamId = nextStreamId++;
        streams[streamId] = Stream({
            streamId: streamId,
            sender: msg.sender,
            recipient: recipient,
            deposit: msg.value,
            ratePerSecond: rate,
            startTime: start,
            stopTime: stop,
            withdrawnAmount: 0,
            isCancelled: false
        });

        userStreams[msg.sender].push(streamId);
        userStreams[recipient].push(streamId);

        emit StreamCreated(streamId, msg.sender, recipient, msg.value, stop);
    }

    /**
     * @notice Calculates the total amount earned by the recipient up to the current block timestamp.
     */
    function balanceOf(uint256 streamId) public view returns (uint256 recipientBalance, uint256 senderBalance) {
        Stream storage s = streams[streamId];
        if (s.streamId == 0) revert StreamNotFound();

        if (s.isCancelled) {
            return (0, 0);
        }

        uint64 current = uint64(block.timestamp);
        if (current <= s.startTime) {
            return (0, s.deposit);
        }

        uint64 elapsed = (current >= s.stopTime) ? (s.stopTime - s.startTime) : (current - s.startTime);
        uint256 totalAccrued = elapsed * s.ratePerSecond;

        // Guarantee totalAccrued never exceeds deposit due to rounding
        if (totalAccrued > s.deposit) {
            totalAccrued = s.deposit;
        }

        recipientBalance = totalAccrued - s.withdrawnAmount;
        senderBalance = s.deposit - totalAccrued;
    }

    /**
     * @notice Withdraws accrued native USDC from the stream.
     */
    function withdrawFromStream(uint256 streamId) external nonReentrant returns (uint256 amount) {
        Stream storage s = streams[streamId];
        if (s.streamId == 0) revert StreamNotFound();
        if (msg.sender != s.recipient) revert Unauthorized();

        (uint256 available, ) = balanceOf(streamId);
        if (available == 0) revert NothingToWithdraw();

        s.withdrawnAmount += available;

        (bool success, ) = s.recipient.call{value: available}("");
        if (!success) revert TransferFailed();

        emit WithdrawFromStream(streamId, s.recipient, available);
        return available;
    }

    /**
     * @notice Cancels a stream early, refunding unstreamed funds to sender and accrued funds to recipient.
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        if (s.streamId == 0) revert StreamNotFound();
        if (msg.sender != s.sender && msg.sender != s.recipient) revert Unauthorized();
        if (s.isCancelled) revert StreamEnded();

        (uint256 recipientAmount, uint256 senderRefund) = balanceOf(streamId);
        s.isCancelled = true;

        if (recipientAmount > 0) {
            s.withdrawnAmount += recipientAmount;
            (bool okRec, ) = s.recipient.call{value: recipientAmount}("");
            if (!okRec) revert TransferFailed();
        }

        if (senderRefund > 0) {
            (bool okSend, ) = s.sender.call{value: senderRefund}("");
            if (!okSend) revert TransferFailed();
        }

        emit StreamCancelled(streamId, s.sender, s.recipient, senderRefund, recipientAmount);
    }

    /**
     * @notice Returns all stream IDs associated with an account.
     */
    function getStreamsForUser(address user) external view returns (uint256[] memory) {
        return userStreams[user];
    }
}
