export type TradingMode = "practice" | "real";

export type CallDirection = "UP" | "DOWN";

export type CallSettlementStatus = "pending" | "won" | "lost" | "voided";

export interface Call {
  id: string;
  marketId: string;
  asset: string;
  direction: CallDirection;
  mode: TradingMode;
  stake: number;
  entryPrice: number;
  contractsCount: number;
  timestamp: number;
  settlementStatus: CallSettlementStatus;
  payout: number;
  netPnl: number;
  oracleResolutionUrl?: string;
  orderTxHash?: string;
  redeemTxHash?: string;
  redeemed?: boolean;
}

export interface TradeParams {
  window: import("./market.js").OpenWindow;
  direction: CallDirection;
  stakeAmount: number;
}
