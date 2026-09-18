// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FerrArcEventEngine
 * @notice Institutional Binary Prediction & Event Derivatives Engine on Arc Mainnet.
 * @dev Powered natively by Arc's 18-decimal Layer-1 USDC gas token (msg.value).
 *      Eliminates ERC-20 approve() overhead for zero-friction 1-click execution.
 */
contract FerrArcEventEngine {
    // --- ERRORS ---
    error ZeroStake();
    error WindowNotOpen();
    error WindowLocked();
    error WindowNotExpired();
    error AlreadyResolved();
    error InvalidOutcome();
    error NoWinningStake();
    error AlreadyClaimed();
    error TransferFailed();
    error Unauthorized();
    error CutoffViolation();

    // --- ENUMS & STRUCTS ---
    enum MarketState { OPEN, LOCKED, RESOLVED, VOIDED }
    enum Outcome { PENDING, UP, DOWN, VOID }

    struct MarketWindow {
        bytes32 windowId;          // Unique market identifier
        string assetSymbol;        // "BTC", "ETH", "EURC"
        uint256 strikePrice;       // Benchmark strike level (8 decimals e.g. 6425000000000)
        uint256 finalPrice;        // Settlement price at resolution (8 decimals)
        uint64 startTime;          // Timestamp when bidding opens
        uint64 lockTime;           // Timestamp when bidding locks (expiry - 45s cutoff)
        uint64 expiryTime;         // Expiration timestamp
        uint256 totalUpStake;      // Total native USDC staked on UP (18 decimals)
        uint256 totalDownStake;    // Total native USDC staked on DOWN (18 decimals)
        MarketState state;         // Current lifecycle state
        Outcome winningOutcome;    // Resolved winning side (UP or DOWN)
    }

    struct Position {
        uint256 upStake;           // User's native USDC staked on UP
        uint256 downStake;         // User's native USDC staked on DOWN
        bool claimed;              // Has winning payout been collected
    }

    // --- STATE VARIABLES ---
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1.00% fee on winning pool
    uint256 public constant SAFETY_CUTOFF_SEC = 45; // 45s anti-MEV lock cutoff

    address public owner;
    address public oracleResolver;
    uint256 public accumulatedFees; // Protocol fees retained in native USDC

    bytes32[] public activeMarketIds;
    mapping(bytes32 => MarketWindow) public markets;
    mapping(bytes32 => mapping(address => Position)) public positions;

    // --- REENTRANCY GUARD ---
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != oracleResolver && msg.sender != owner) revert Unauthorized();
        _;
    }

    // --- EVENTS ---
    event MarketCreated(bytes32 indexed windowId, string assetSymbol, uint256 strikePrice, uint64 expiryTime);
    event PositionOpened(bytes32 indexed windowId, address indexed trader, Outcome direction, uint256 stakeAmount);
    event MarketResolved(bytes32 indexed windowId, Outcome winningOutcome, uint256 finalPrice);
    event PayoutClaimed(bytes32 indexed windowId, address indexed trader, uint256 payoutAmount);
    event MarketVoided(bytes32 indexed windowId, string reason);

    constructor(address _oracleResolver) {
        owner = msg.sender;
        oracleResolver = _oracleResolver;
    }

    // --- RESOLVER CONFIGURATION ---
    function setResolver(address _newResolver) external onlyOwner {
        oracleResolver = _newResolver;
    }

    /**
     * @notice Creates a new binary prediction window on Arc Mainnet.
     */
    function createMarket(
        string calldata assetSymbol,
        uint256 strikePrice,
        uint64 durationSec
    ) external onlyResolver returns (bytes32 windowId) {
        uint64 start = uint64(block.timestamp);
        uint64 expiry = start + durationSec;
        uint64 lock = expiry > SAFETY_CUTOFF_SEC ? expiry - uint64(SAFETY_CUTOFF_SEC) : start;

        windowId = keccak256(abi.encodePacked(assetSymbol, start, durationSec));

        MarketWindow storage w = markets[windowId];
        w.windowId = windowId;
        w.assetSymbol = assetSymbol;
        w.strikePrice = strikePrice;
        w.startTime = start;
        w.lockTime = lock;
        w.expiryTime = expiry;
        w.state = MarketState.OPEN;
        w.winningOutcome = Outcome.PENDING;

        activeMarketIds.push(windowId);
        emit MarketCreated(windowId, assetSymbol, strikePrice, expiry);
    }

    /**
     * @notice Places a directional trade using native Arc USDC (msg.value).
     * @dev Zero token approvals. Native USDC is deposited directly.
     */
    function placeCall(bytes32 windowId, Outcome direction) external payable nonReentrant {
        if (msg.value == 0) revert ZeroStake();
        if (direction != Outcome.UP && direction != Outcome.DOWN) revert InvalidOutcome();

        MarketWindow storage w = markets[windowId];
        if (w.state != MarketState.OPEN) revert WindowNotOpen();
        if (block.timestamp >= w.lockTime) revert WindowLocked();

        Position storage pos = positions[windowId][msg.sender];

        if (direction == Outcome.UP) {
            w.totalUpStake += msg.value;
            pos.upStake += msg.value;
        } else {
            w.totalDownStake += msg.value;
            pos.downStake += msg.value;
        }

        emit PositionOpened(windowId, msg.sender, direction, msg.value);
    }

    /**
     * @notice Resolves an expired window based on Pyth/Chainlink benchmark price.
     */
    function resolveMarket(bytes32 windowId, uint256 finalPrice) external onlyResolver {
        MarketWindow storage w = markets[windowId];
        if (w.state == MarketState.RESOLVED || w.state == MarketState.VOIDED) revert AlreadyResolved();
        if (block.timestamp < w.expiryTime) revert WindowNotExpired();

        w.finalPrice = finalPrice;
        w.state = MarketState.RESOLVED;

        // Binary condition: if final price >= strike price, UP wins; otherwise DOWN wins
        if (finalPrice >= w.strikePrice) {
            w.winningOutcome = Outcome.UP;
        } else {
            w.winningOutcome = Outcome.DOWN;
        }

        emit MarketResolved(windowId, w.winningOutcome, finalPrice);
    }

    /**
     * @notice Claims winnings for a resolved market. Pull-over-push security pattern.
     */
    function claimPayout(bytes32 windowId) external nonReentrant returns (uint256 payout) {
        MarketWindow storage w = markets[windowId];
        if (w.state != MarketState.RESOLVED && w.state != MarketState.VOIDED) revert WindowNotOpen();

        Position storage pos = positions[windowId][msg.sender];
        if (pos.claimed) revert AlreadyClaimed();

        // 1. VOIDED REFUND
        if (w.state == MarketState.VOIDED) {
            payout = pos.upStake + pos.downStake;
            if (payout == 0) revert ZeroStake();
            pos.claimed = true;
            (bool s, ) = msg.sender.call{value: payout}("");
            if (!s) revert TransferFailed();
            emit PayoutClaimed(windowId, msg.sender, payout);
            return payout;
        }

        // 2. PARI-MUTUEL WINNING RESOLUTION
        uint256 totalPool = w.totalUpStake + w.totalDownStake;
        uint256 winningStakeTotal = (w.winningOutcome == Outcome.UP) ? w.totalUpStake : w.totalDownStake;
        uint256 userWinningStake = (w.winningOutcome == Outcome.UP) ? pos.upStake : pos.downStake;

        if (userWinningStake == 0) revert NoWinningStake();

        // Protocol fee calculation
        uint256 fee = (totalPool * PROTOCOL_FEE_BPS) / 10000;
        uint256 netPool = totalPool - fee;
        accumulatedFees += fee;

        // Pro-rata mathematical distribution: (userStake / totalWinningStake) * netPool
        payout = (userWinningStake * netPool) / winningStakeTotal;
        pos.claimed = true;

        // Direct native USDC transfer on Arc
        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit PayoutClaimed(windowId, msg.sender, payout);
    }

    /**
     * @notice Voids an anomalous market and unlocks 100% full refunds.
     */
    function voidMarket(bytes32 windowId, string calldata reason) external onlyResolver {
        MarketWindow storage w = markets[windowId];
        if (w.state == MarketState.RESOLVED) revert AlreadyResolved();
        w.state = MarketState.VOIDED;
        w.winningOutcome = Outcome.VOID;
        emit MarketVoided(windowId, reason);
    }

    /**
     * @notice View function returning current crowd lean probability in basis points (0 - 10000).
     */
    function getCrowdLean(bytes32 windowId) external view returns (uint256 upProbabilityBps) {
        MarketWindow storage w = markets[windowId];
        uint256 total = w.totalUpStake + w.totalDownStake;
        if (total == 0) return 5000; // 50-50 neutral
        return (w.totalUpStake * 10000) / total;
    }

    /**
     * @notice Withdraw accumulated protocol fees.
     */
    function withdrawFees(address recipient) external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool s, ) = recipient.call{value: amount}("");
        if (!s) revert TransferFailed();
    }
}
