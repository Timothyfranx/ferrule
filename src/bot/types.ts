import type { SupportedAsset, TradingMode, CallDirection } from "../types/shared.js";

export type StrategyType = "fade_crowd" | "momentum_trend" | "calibration_value" | "custom";

export interface BotConfig {
  id: string;
  name: string;
  strategy: StrategyType;
  mode: TradingMode;
  stakePerTrade: number;
  targetAsset: "ALL" | SupportedAsset;
  maxCadenceSec: number; // e.g. 300 for 5m and below, 0 for all
  
  // Strategy Parameters
  fadeThreshold: number; // e.g., 75% (calls DOWN if lean >= 75%, UP if lean <= 25%)
  trendThreshold: number; // e.g., 65% (calls UP if lean >= 65%, DOWN if lean <= 35%)
  edgeThreshold: number; // e.g., 10% edge vs historical calibration
  minSecondsRemaining: number; // don't enter if closing in < 30s
  
  // Risk Limits
  maxOpenTrades: number;
  maxLossBudget: number;
  active: boolean;
}

export type BotLogLevel = "INFO" | "SIGNAL" | "ORDER" | "SETTLE" | "WARN" | "SUCCESS";

export interface BotLog {
  id: string;
  timestamp: number;
  level: BotLogLevel;
  text: string;
  marketSymbol?: string;
  txHash?: string;
}

export interface BotStats {
  totalTrades: number;
  settledTrades: number;
  wonTrades: number;
  lostTrades: number;
  voidedTrades: number;
  winRate: number;
  totalPnl: number;
  brierScore: number | null;
}
