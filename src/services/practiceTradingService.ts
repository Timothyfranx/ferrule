import { PROTOCOL_LIMITS, ORACLE_HUB_URL } from "../config/constants.js";
import type { 
  OpenWindow, 
  Call, 
  CallDirection, 
  SettledMarketInfo 
} from "../types/index.js";

export interface PracticeEngineConfig {
  initialBankroll?: number;
  maxStakePerCall?: number;
}

export class PracticeTradingService {
  private bankroll: number;
  private maxStakePerCall: number;
  private calls: Call[] = [];

  constructor(config?: PracticeEngineConfig) {
    this.bankroll = config?.initialBankroll ?? PROTOCOL_LIMITS.initialPracticeBankroll;
    this.maxStakePerCall = config?.maxStakePerCall ?? PROTOCOL_LIMITS.maxPracticeStake;
    this.loadFromStorage();
  }

  getBankroll(): number {
    return this.bankroll;
  }

  getCalls(): Call[] {
    return [...this.calls];
  }

  /**
   * Places a simulated call against live CLOB prices.
   * NEVER touches any write RPC signer.
   */
  placeCall(window: OpenWindow, direction: CallDirection, stake: number): Call {
    if (stake <= 0) {
      throw new Error("Stake must be greater than zero");
    }
    if (stake > this.maxStakePerCall) {
      throw new Error(`AdversarialCheck: Stake $${stake} exceeds maximum allowed practice limit of $${this.maxStakePerCall}`);
    }
    if (stake > this.bankroll) {
      throw new Error(`Insufficient practice bankroll: Available $${this.bankroll.toFixed(2)}, Requested $${stake}`);
    }

    // Determine entry price based on live order book ask
    let entryPrice: number;
    if (direction === "UP") {
      entryPrice = window.bestUpAsk ?? window.upLeanProbability;
    } else {
      entryPrice = window.bestDownAsk ?? (1 - window.upLeanProbability);
    }

    // Safety clamp (prices must be in range 0.01 - 0.99)
    entryPrice = Math.min(0.99, Math.max(0.01, entryPrice));

    const contractsCount = stake / entryPrice;
    this.bankroll -= stake;

    const oracleUrl = window.oracleQuestionId 
      ? `${ORACLE_HUB_URL}/questions/${window.oracleQuestionId}?view=graph` 
      : undefined;

    const call: Call = {
      id: `practice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      marketId: window.marketId,
      asset: window.asset,
      direction,
      mode: "practice",
      stake,
      entryPrice,
      contractsCount,
      timestamp: Date.now(),
      settlementStatus: "pending",
      payout: 0,
      netPnl: 0,
      oracleResolutionUrl: oracleUrl,
    };

    this.calls.unshift(call);
    this.saveToStorage();
    return call;
  }

  /**
   * Evaluates a pending call against real on-chain settlement outcome.
   */
  settleCall(callId: string, outcome: SettledMarketInfo): Call {
    const call = this.calls.find((c) => c.id === callId);
    if (!call || call.settlementStatus !== "pending") {
      return call!;
    }

    if (outcome.isVoided) {
      // 50% refund per contract on voided markets (LOGICAL_ERRORS.md §7)
      call.settlementStatus = "voided";
      call.payout = call.contractsCount * 0.5;
      call.netPnl = call.payout - call.stake;
    } else if (outcome.isResolved && outcome.winningOutcome !== null) {
      // Winning outcome: 0 = UP, 1 = DOWN
      const won = (call.direction === "UP" && outcome.winningOutcome === 0) ||
                  (call.direction === "DOWN" && outcome.winningOutcome === 1);

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

    this.bankroll += call.payout;
    this.saveToStorage();
    return call;
  }

  private saveToStorage() {
    try {
      localStorage.setItem("ferrule_practice_bankroll", this.bankroll.toString());
      localStorage.setItem("ferrule_practice_calls", JSON.stringify(this.calls));
    } catch {
      // LocalStorage unavailable in test environment
    }
  }

  private loadFromStorage() {
    try {
      const savedBankroll = localStorage.getItem("ferrule_practice_bankroll");
      if (savedBankroll) this.bankroll = parseFloat(savedBankroll);

      const savedCalls = localStorage.getItem("ferrule_practice_calls");
      if (savedCalls) this.calls = JSON.parse(savedCalls);
    } catch {
      // LocalStorage unavailable in test environment
    }
  }
}
