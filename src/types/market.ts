import type { Address } from "viem";

export type AssetSymbol = "BTC" | "ETH" | "SOL";

export type CadenceInterval = 60 | 300 | 900 | 3600 | 14400 | 86400;

export interface BookLevel {
  price: number;
  quantity: number;
}

export interface BinaryOrderBook {
  yesBids: BookLevel[];
  yesAsks: BookLevel[];
  noBids: BookLevel[];
  noAsks: BookLevel[];
}

export interface OpenWindow {
  marketId: `0x${string}`;
  poolAddress: Address;
  oracleQuestionId?: `0x${string}`;
  asset: AssetSymbol;
  intervalSec: number;
  expiry: number;
  secondsRemaining: number;
  upLeanPercent: number; // 0 - 100
  upLeanProbability: number; // 0.00 - 1.00
  bestUpBid: number | null;
  bestUpAsk: number | null;
  bestDownBid: number | null;
  bestDownAsk: number | null;
  upBidVolume: number;
  upAskVolume: number;
  status: "Listed" | "Trading" | "Locked" | "Settling" | "Resolved" | "Voided" | "Finalized";
  question?: string;
  rawQuestion?: string;
  strike?: string;
  strikeFormatted?: string;
  backingUsdc?: string;
  creator?: string | null;
  marketAddress?: string | null;
}

export interface SettledMarketInfo {
  marketId: string;
  isResolved: boolean;
  isVoided: boolean;
  winningOutcome: number | null; // 0 = UP, 1 = DOWN
  settlementTimestamp?: number;
}
