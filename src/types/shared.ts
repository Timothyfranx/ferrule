import type { Address, Hex } from "viem";

/** Supported underlying crypto assets */
export type SupportedAsset = "BTC" | "ETH" | "SOL";

/** Supported call direction */
export type CallDirection = "UP" | "DOWN";

/** Segmented operating modes — strictly never mixed */
export type TradingMode = "practice" | "real";

/** Settlement lifecycle status for a call */
export type CallSettlementStatus = "pending" | "won" | "lost" | "voided";

/**
 * OpenWindow represents a verified open binary prediction window.
 * Agent A is the sole producer of this data; Agents B & C are consumers.
 */
export interface OpenWindow {
  /** Unique on-chain bytes32 market identifier (primary key) */
  marketId: Hex;
  /** Human-readable symbol (e.g. BTC-95000-15M#YES) */
  symbol: string;
  /** Underlying asset symbol: BTC, ETH, etc. (read from typed market field, not parsed text) */
  asset: SupportedAsset;
  /** Window duration in seconds (e.g. 60, 300, 900, 3600) */
  intervalSec: number;
  /** Origin venue identifier */
  venueId: Hex;
  /** Pool contract address hosting the order book */
  poolAddress: Address;
  /** Binary market contract address */
  marketAddress: Address;
  /** Oracle question id used for resolution transparency */
  oracleQuestionId: Hex | null;
  /** Unix timestamp (seconds) when trading locks / window settles */
  expiry: number;
  /** Seconds remaining until window expiry */
  secondsRemaining: number;
  /** Best YES (Up) bid price in human scale (0 - 1) */
  bestUpBid: number | null;
  /** Best YES (Up) ask price in human scale (0 - 1) */
  bestUpAsk: number | null;
  /** Best Down (No) bid price in human scale (0 - 1 = 1 - bestUpAsk) */
  bestDownBid: number | null;
  /** Best Down (No) ask price in human scale (0 - 1 = 1 - bestUpBid) */
  bestDownAsk: number | null;
  /** Computed crowd-lean probability for Up (0.0 to 1.0) */
  upLeanProbability: number;
  /** Computed crowd-lean display percentage (0% to 100%) */
  upLeanPercent: number;
  /** Order book depth summary */
  depth: {
    upBidVolume: number;
    upAskVolume: number;
    downBidVolume: number;
    downAskVolume: number;
  };
  /** On-chain status (1 = Trading) */
  onchainStatus: number;
}

/**
 * Call represents a user's position/trade record.
 * Mode is explicit at creation and immutable.
 */
export interface Call {
  /** Unique internal call identifier */
  id: string;
  /** Target market id */
  marketId: Hex;
  /** Associated pool address */
  poolAddress: Address;
  /** Direction chosen by the user */
  direction: CallDirection;
  /** Stake amount in collateral units (e.g. USDC / USDso) */
  stake: number;
  /** Trading mode: practice vs real — never inferred, never merged */
  mode: TradingMode;
  /** Entry price paid (0.0 to 1.0 probability price) */
  entryPrice: number;
  /** Implied number of outcome contracts acquired (stake / entryPrice) */
  contractsCount: number;
  /** Timestamp when the call was executed (ms) */
  timestamp: number;
  /** Target market expiry timestamp (unix seconds) */
  expiry: number;
  /** Current settlement status */
  settlementStatus: CallSettlementStatus;
  /** Payout received upon settlement (0 if lost, stake / entryPrice if won, 0.5 * contracts if voided) */
  payout: number;
  /** Net PnL (payout - stake) */
  netPnl: number;
  /** Whether on-chain redemption transaction has been executed (real mode only) */
  redeemed: boolean;
  /** Transaction hash if real mode order */
  txHash?: Hex;
  /** Redemption transaction hash if claimed */
  redeemTxHash?: Hex;
  /** Deep link to OracleHub resolution proof */
  oracleResolutionUrl?: string;
}

/**
 * Binned calibration item for evaluating probability accuracy
 */
export interface CalibrationBucket {
  /** Bucket range label (e.g. "50-60%", "60-70%") */
  bucketLabel: string;
  /** Bucket range min probability (inclusive) */
  rangeMin: number;
  /** Bucket range max probability (exclusive) */
  rangeMax: number;
  /** Number of calls placed in this confidence bucket */
  count: number;
  /** Average predicted probability of calls in this bucket */
  averageConfidence: number;
  /** Actual empirical win rate of calls in this bucket */
  empiricalWinRate: number;
}

/**
 * Calibration scorecard segmented strictly by mode.
 * Evaluates true probabilistic forecasting skill (Brier score + calibration curve)
 * rather than simple win rate.
 */
export interface CalibrationScorecard {
  /** Mode for this scorecard */
  mode: TradingMode;
  /** Total number of calls recorded */
  totalCalls: number;
  /** Total calls that have completed settlement */
  settledCalls: number;
  /** Won calls count */
  wonCalls: number;
  /** Lost calls count */
  lostCalls: number;
  /** Voided calls count */
  voidedCalls: number;
  /** Win rate among settled non-voided calls (0.0 - 1.0) */
  winRate: number;
  /**
   * Brier score: mean squared error between forecast probability and outcome.
   * Score is in [0, 1]. Lower is better. 0 is perfect foresight; 0.25 is random coin flip.
   */
  brierScore: number | null;
  /** Calibration buckets for plotting predicted confidence vs actual frequency */
  calibrationBuckets: CalibrationBucket[];
  /** Total cumulative profit/loss in collateral units */
  totalPnl: number;
  /** Total capital staked */
  totalStaked: number;
  /** Return on investment percentage */
  roiPercent: number;
}
