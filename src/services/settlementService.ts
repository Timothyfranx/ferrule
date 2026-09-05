import { 
  MarketsClient, 
  type Trader, 
  type TraderConfig 
} from "@somnia-chain/markets-sdk";
import type { Call, SettledMarketInfo } from "../types/index.js";

export class SettlementService {
  public readonly client: MarketsClient;
  public readonly trader?: Trader;

  constructor(client: MarketsClient, config?: TraderConfig & { trader?: Trader }) {
    this.client = client;
    this.trader = config?.trader ?? (config?.walletClient ? client.createTrader(config) : undefined);
  }

  /**
   * Evaluates call settlement based on on-chain truth.
   */
  async evaluateCallSettlement(call: Call): Promise<Call> {
    const onchain = await this.client.getMarketOnchain(call.marketId as `0x${string}`);

    if (onchain.isVoided) {
      call.settlementStatus = "voided";
      call.payout = call.contractsCount * 0.5;
      call.netPnl = call.payout - call.stake;
    } else if (onchain.isResolved && onchain.winningOutcome !== null) {
      const won = (call.direction === "UP" && onchain.winningOutcome === 0) ||
                  (call.direction === "DOWN" && onchain.winningOutcome === 1);

      if (won) {
        call.settlementStatus = "won";
        call.payout = call.contractsCount * 1.0;
        call.netPnl = call.payout - call.stake;
      } else {
        call.settlementStatus = "lost";
        call.payout = 0;
        call.netPnl = -call.stake;
      }
    }
    return call;
  }

  /**
   * Explicit user-triggered winning claim (LOGICAL_ERRORS.md §6).
   * Strictly suppresses redemption on lost calls.
   */
  async redeemWinningCall(call: Call): Promise<{ hash: string }> {
    if (call.settlementStatus === "lost") {
      throw new Error("LossSuppressed: Position has zero payout. Skipping on-chain redemption to save gas.");
    }
    if (call.settlementStatus === "pending") {
      throw new Error("Market is not settled yet. Cannot claim.");
    }
    if (!this.trader) {
      throw new Error("Trader instance required to submit on-chain redemption transaction.");
    }

    const outcome = call.direction === "UP" ? 0 : 1;
    const res = await this.trader.redeem({
      marketId: call.marketId as `0x${string}`,
      outcome,
    });

    call.redeemed = true;
    call.redeemTxHash = res.hash;
    return { hash: res.hash };
  }

  /**
   * Permissionless backstop: poke oracle if stalled (LOGICAL_ERRORS.md §11).
   */
  async pokeOracle(oracleQuestionId: `0x${string}`): Promise<{ hash: string }> {
    if (!this.trader) throw new Error("Trader required to poke oracle");
    const res = await this.trader.pokeOracle({ questionId: oracleQuestionId });
    return { hash: res.hash };
  }

  /**
   * Permissionless backstop: void expired market if past timeout (LOGICAL_ERRORS.md §11).
   */
  async voidExpired(marketId: `0x${string}`): Promise<{ hash: string }> {
    if (!this.trader) throw new Error("Trader required to void expired market");
    const res = await this.trader.voidExpired({ marketId });
    return { hash: res.hash };
  }
}
