import { 
  MarketsClient, 
  ORDER_TYPE,
  type Trader,
  type TraderConfig 
} from "@somnia-chain/markets-sdk";
import type { Address } from "viem";
import { CANONICAL_CONTRACTS, PROTOCOL_LIMITS, ORACLE_HUB_URL } from "../config/constants.js";
import { PrecisionService } from "./precisionService.js";
import type { OpenWindow, Call, CallDirection } from "../types/index.js";

export class RealTradingService {
  public readonly client: MarketsClient;
  public readonly trader: Trader;
  public readonly accountAddress: Address;

  constructor(client: MarketsClient, config: TraderConfig) {
    this.client = client;
    this.trader = client.createTrader(config);
    this.accountAddress = (config.account as Address) ?? config.walletClient?.account?.address;
    if (!this.accountAddress) {
      throw new Error("RealTradingService requires an active wallet account address");
    }
  }

  /**
   * Pre-flight collateral check (LOGICAL_ERRORS.md §10).
   */
  async checkPreflightBalance(requiredUsdc: number): Promise<boolean> {
    try {
      const balances = await this.client.getBalances(
        [{ token: CANONICAL_CONTRACTS.testUsdc }],
        this.accountAddress
      );
      if (balances && balances.length > 0) {
        const available = Number(balances[0].balance) / 1e6;
        return available >= requiredUsdc;
      }
      return true;
    } catch {
      return true; // Proceed to wallet prompt if balance check fails
    }
  }

  /**
   * Places an Immediate-or-Cancel order directly via user's connected wallet.
   */
  async placeCall(window: OpenWindow, direction: CallDirection, stake: number): Promise<Call> {
    if (stake < PROTOCOL_LIMITS.minTradeStake) {
      throw new Error(`Minimum stake is $${PROTOCOL_LIMITS.minTradeStake}`);
    }

    const hasBalance = await this.checkPreflightBalance(stake);
    if (!hasBalance) {
      throw new Error(`Insufficient TestUSDC collateral in connected wallet for stake $${stake}`);
    }

    // Determine target price
    const entryPrice = direction === "UP"
      ? (window.bestUpAsk ?? window.upLeanProbability)
      : (window.bestDownAsk ?? (1 - window.upLeanProbability));

    const decimals = 6;
    const tickSize = 1000n; // Standard DreamDEX tick size (0.001)
    const lotSize = 1000n;
    const minQuantity = 1000n;

    // Snapped BigInt quantities
    const snappedPrice = PrecisionService.snapPriceToTick(entryPrice, decimals, tickSize);
    const contractsDesired = stake / entryPrice;
    const snappedQuantity = PrecisionService.snapAmountToLot(contractsDesired, decimals, lotSize, minQuantity);

    // Dead-man's switch expiry (LOGICAL_ERRORS.md §5)
    const nowSec = Math.floor(Date.now() / 1000);
    const expireTimestampNs = BigInt(nowSec + PROTOCOL_LIMITS.deadmanSwitchSeconds) * 1_000_000_000n;

    // Direct wallet signing call
    const outcome = direction === "UP" ? 0 : 1;
    const orderRes = await this.trader.placeOrder({
      pool: window.poolAddress,
      outcome,
      price: snappedPrice,
      quantity: snappedQuantity,
      orderType: ORDER_TYPE.MARKET, // IOC
      expireTimestampNs,
    });

    const oracleUrl = window.oracleQuestionId 
      ? `${ORACLE_HUB_URL}/questions/${window.oracleQuestionId}?view=graph` 
      : undefined;

    return {
      id: `real_${Date.now()}_${orderRes.hash.slice(2, 8)}`,
      marketId: window.marketId,
      asset: window.asset,
      direction,
      mode: "real",
      stake,
      entryPrice,
      contractsCount: Number(snappedQuantity) / (10 ** decimals),
      timestamp: Date.now(),
      settlementStatus: "pending",
      payout: 0,
      netPnl: 0,
      oracleResolutionUrl: oracleUrl,
      orderTxHash: orderRes.hash,
    };
  }
}
