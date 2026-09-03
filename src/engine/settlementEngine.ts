import type { SomniaMarketsClient, Trader, TxResult } from "@somnia-chain/markets-sdk";
import type { Hex } from "viem";
import type { Call } from "../types/shared.js";
import { InvalidInputError } from "@somnia-chain/markets-sdk";

export interface SettlementEngineConfig {
  trader?: Trader;
  oracleGracePeriodSeconds?: number;
}

/**
 * Agent B — Settlement & Redemption Manager
 * 
 * Rules (§6 of Spec / agents.md / plan.md §7):
 * 1. Checks on-chain resolution state (isResolved, isVoided, winningOutcome).
 * 2. Voided markets pay 0.5 per share on BOTH sides — never infer a single winner.
 * 3. SAFETY CHECK: Redeeming a loss on-chain succeeds and pays 0 — NEVER spend gas redeeming a loss!
 * 4. Active backstops: triggers pokeOracle or voidExpired if resolution is delayed.
 */
export class SettlementEngine {
  private client: SomniaMarketsClient;
  private trader?: Trader;
  private oracleGracePeriodSeconds: number;

  constructor(client: SomniaMarketsClient, config: SettlementEngineConfig = {}) {
    this.client = client;
    this.trader = config.trader;
    this.oracleGracePeriodSeconds = config.oracleGracePeriodSeconds ?? 120;
  }

  /**
   * Evaluates settlement status for a call by reading live on-chain truth.
   */
  async evaluateCallSettlement(call: Call): Promise<{
    settled: boolean;
    call: Call;
    backstopTriggered?: "pokeOracle" | "voidExpired";
  }> {
    if (call.settlementStatus !== "pending") {
      return { settled: true, call };
    }

    const onchain = await this.client.getMarketOnchain(call.marketId);
    const nowSec = Math.floor(Date.now() / 1000);

    // 1. Check if Market is Voided
    if (onchain.isVoided) {
      call.settlementStatus = "voided";
      call.payout = call.contractsCount * 0.5;
      call.netPnl = call.payout - call.stake;
      return { settled: true, call };
    }

    // 2. Check if Market is Resolved
    if (onchain.isResolved) {
      const isUpWin = onchain.winningOutcome === 0;
      const userWon = (call.direction === "UP" && isUpWin) || (call.direction === "DOWN" && !isUpWin);

      if (userWon) {
        call.settlementStatus = "won";
        call.payout = call.contractsCount;
        call.netPnl = call.payout - call.stake;
      } else {
        call.settlementStatus = "lost";
        call.payout = 0;
        call.netPnl = -call.stake;
      }
      return { settled: true, call };
    }

    // 3. Permissionless Backstops check: Market past expiry + grace period but not yet resolved
    let backstopTriggered: "pokeOracle" | "voidExpired" | undefined;
    if (this.trader && nowSec > call.expiry + this.oracleGracePeriodSeconds) {
      try {
        // Attempt pokeOracle first if oracleQuestionId exists
        const questionId = call.oracleResolutionUrl?.split("/questions/")[1]?.split("?")[0];
        if (questionId) {
          const qIdBigInt = BigInt(questionId);
          await this.trader.pokeOracle({ oracleQuestionId: qIdBigInt });
          backstopTriggered = "pokeOracle";
        }
      } catch {
        // If pokeOracle fails and settlement window has passed, attempt voidExpired
        try {
          await this.trader.voidExpired({ marketId: call.marketId });
          backstopTriggered = "voidExpired";
        } catch {
          // Both backstops skipped or unavailable
        }
      }
    }

    return { settled: false, call, backstopTriggered };
  }

  /**
   * Explicit on-chain claim / redemption for real positions.
   * STRICT SAFETY GATE: Never spends gas redeeming a zero-payout loss!
   */
  async redeemWinningCall(call: Call): Promise<TxResult> {
    if (call.mode !== "real") {
      throw new InvalidInputError("Practice calls cannot be redeemed on-chain");
    }
    if (!this.trader) {
      throw new InvalidInputError("Signer / Trader required for on-chain redemption");
    }
    if (call.redeemed) {
      throw new InvalidInputError(`Call ${call.id} has already been redeemed`);
    }

    // CRITICAL §7 SAFETY PASS RULE:
    // Redeeming an actual loss succeeds on-chain and pays 0, wasting user gas!
    if (call.settlementStatus === "lost") {
      throw new InvalidInputError(
        "Cannot redeem a losing call: payout is 0 and on-chain redemption would waste gas unnecessarily."
      );
    }

    if (call.settlementStatus === "pending") {
      throw new InvalidInputError("Cannot redeem a pending call. Await on-chain settlement first.");
    }

    const onchain = await this.client.getMarketOnchain(call.marketId);
    if (!onchain.isResolved && !onchain.isVoided) {
      throw new InvalidInputError("Market is not yet settled on-chain.");
    }

    // Determine outcome index to burn: 0 for UP (YES), 1 for DOWN (NO)
    const outcomeIdx: 0 | 1 = call.direction === "UP" ? 0 : 1;
    const decimals = onchain.decimals || 6;
    const amountRaw = BigInt(Math.floor(call.contractsCount * (10 ** decimals)));

    // Execute on-chain redemption via BinarySettlement singleton
    const res = await this.trader.redeem({
      marketId: call.marketId,
      amount: amountRaw,
      outcomeIdx,
    });

    call.redeemed = true;
    call.redeemTxHash = res.hash as Hex;
    return res;
  }
}
