import type { Call, CallDirection, OpenWindow } from "../types/shared.js";
import { InvalidInputError } from "@somnia-chain/markets-sdk";

export interface PracticeEngineConfig {
  initialBankroll?: number;
  maxStakePerCall?: number;
}

const DEFAULT_CONFIG: PracticeEngineConfig = {
  initialBankroll: 1000, // $1,000 demo USD
  maxStakePerCall: 100,  // Stated practice cap: $100 per call
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Agent B — Practice Trading Engine
 * 
 * Rules (§6 of Spec / agents.md / plan.md §7):
 * 1. Strictly isolated: NEVER calls writeContract, createOrder, or wallet signers.
 * 2. Enforces practice cap in code (adversarial test required).
 * 3. Scored against Agent A's real prices and real on-chain settlements.
 * 4. Mode is permanently set to 'practice'.
 */
export class PracticeEngine {
  private bankroll: number;
  private maxStakePerCall: number;
  private calls: Map<string, Call> = new Map();

  constructor(config: PracticeEngineConfig = {}) {
    this.bankroll = config.initialBankroll ?? DEFAULT_CONFIG.initialBankroll!;
    this.maxStakePerCall = config.maxStakePerCall ?? DEFAULT_CONFIG.maxStakePerCall!;
  }

  getBankroll(): number {
    return this.bankroll;
  }

  getMaxStake(): number {
    return this.maxStakePerCall;
  }

  getCalls(): Call[] {
    return Array.from(this.calls.values());
  }

  getCall(id: string): Call | undefined {
    return this.calls.get(id);
  }

  /**
   * Place a simulated practice call against a verified OpenWindow.
   * Rejects immediately if stake exceeds cap or current bankroll.
   */
  placeCall(window: OpenWindow, direction: CallDirection, stake: number): Call {
    // 1. Adversarial Check: Stated practice cap
    if (stake <= 0) {
      throw new InvalidInputError("Stake must be greater than 0");
    }
    if (stake > this.maxStakePerCall) {
      throw new InvalidInputError(
        `Stake ${stake} exceeds practice mode maximum cap of ${this.maxStakePerCall} USD`
      );
    }
    if (stake > this.bankroll) {
      throw new InvalidInputError(
        `Insufficient practice balance. Available: ${this.bankroll.toFixed(2)}, Requested: ${stake}`
      );
    }

    // 2. Determine realistic entry price from live order book
    // Buying UP pays the ask for YES; Buying DOWN pays the ask for NO (1 - bestUpBid)
    let entryPrice: number;
    if (direction === "UP") {
      entryPrice = window.bestUpAsk ?? window.upLeanProbability;
    } else {
      entryPrice = window.bestDownAsk ?? (1 - window.upLeanProbability);
    }

    // Safety clamp
    entryPrice = Math.max(0.01, Math.min(0.99, entryPrice));
    const contractsCount = stake / entryPrice;

    // Deduct stake from bankroll
    this.bankroll -= stake;

    const call: Call = {
      id: `practice_${generateId()}`,
      marketId: window.marketId,
      poolAddress: window.poolAddress,
      direction,
      stake,
      mode: "practice", // Strictly practice
      entryPrice,
      contractsCount,
      timestamp: Date.now(),
      expiry: window.expiry,
      settlementStatus: "pending",
      payout: 0,
      netPnl: -stake,
      redeemed: false,
      oracleResolutionUrl: window.oracleQuestionId 
        ? `https://prd.oracle.somnia.host/questions/${window.oracleQuestionId}?view=graph`
        : undefined,
    };

    this.calls.set(call.id, call);
    return call;
  }

  /**
   * Settles a practice call based on empirical on-chain settlement result.
   */
  settleCall(
    callId: string, 
    settlement: { isResolved: boolean; isVoided: boolean; winningOutcome: number }
  ): Call {
    const call = this.calls.get(callId);
    if (!call) {
      throw new InvalidInputError(`Call ${callId} not found`);
    }
    if (call.settlementStatus !== "pending") {
      return call; // Already settled
    }

    if (settlement.isVoided) {
      // Protocol rule: Voided markets pay 0.5 per outcome contract to both sides
      call.settlementStatus = "voided";
      call.payout = call.contractsCount * 0.5;
      call.netPnl = call.payout - call.stake;
      this.bankroll += call.payout;
    } else if (settlement.isResolved) {
      const userWon = call.direction === "UP" ? settlement.winningOutcome === 0 : settlement.winningOutcome === 1;
      if (userWon) {
        call.settlementStatus = "won";
        call.payout = call.contractsCount; // Full 1.0 per contract
        call.netPnl = call.payout - call.stake;
        this.bankroll += call.payout;
      } else {
        call.settlementStatus = "lost";
        call.payout = 0;
        call.netPnl = -call.stake;
      }
    }

    this.calls.set(callId, call);
    return call;
  }
}
