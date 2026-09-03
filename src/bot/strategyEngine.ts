import type { OpenWindow, Call, CallDirection } from "../types/shared.js";
import type { BotConfig, BotLog, BotStats, StrategyType } from "./types.js";
import { PracticeEngine } from "../engine/practiceEngine.js";
import { RealEngine } from "../engine/realEngine.js";
import { ScorecardService } from "../scoring/scorecard.js";

export const DEFAULT_BOT_CONFIGS: Record<StrategyType, BotConfig> = {
  fade_crowd: {
    id: "bot_fade",
    name: "Contrarian Fade Bot",
    strategy: "fade_crowd",
    mode: "practice",
    stakePerTrade: 15,
    targetAsset: "ALL",
    maxCadenceSec: 300,
    fadeThreshold: 80, // Call DOWN if >=80%, UP if <=20%
    trendThreshold: 65,
    edgeThreshold: 10,
    minSecondsRemaining: 30,
    maxOpenTrades: 5,
    maxLossBudget: 200,
    active: false,
  },
  momentum_trend: {
    id: "bot_trend",
    name: "Momentum Breakout Bot",
    strategy: "momentum_trend",
    mode: "practice",
    stakePerTrade: 20,
    targetAsset: "ALL",
    maxCadenceSec: 900,
    fadeThreshold: 80,
    trendThreshold: 70, // Follow trend if >=70% or <=30%
    edgeThreshold: 10,
    minSecondsRemaining: 45,
    maxOpenTrades: 4,
    maxLossBudget: 250,
    active: false,
  },
  calibration_value: {
    id: "bot_calib",
    name: "Brier Value Arb Bot",
    strategy: "calibration_value",
    mode: "practice",
    stakePerTrade: 25,
    targetAsset: "ALL",
    maxCadenceSec: 3600,
    fadeThreshold: 80,
    trendThreshold: 65,
    edgeThreshold: 12,
    minSecondsRemaining: 60,
    maxOpenTrades: 3,
    maxLossBudget: 300,
    active: false,
  },
  custom: {
    id: "bot_custom",
    name: "Custom Rule Bot",
    strategy: "custom",
    mode: "practice",
    stakePerTrade: 10,
    targetAsset: "ALL",
    maxCadenceSec: 0,
    fadeThreshold: 75,
    trendThreshold: 65,
    edgeThreshold: 10,
    minSecondsRemaining: 30,
    maxOpenTrades: 5,
    maxLossBudget: 150,
    active: false,
  },
};

export class StrategyBotEngine {
  private config: BotConfig;
  private practiceEngine: PracticeEngine;
  private realEngine?: RealEngine;
  private logs: BotLog[] = [];
  private botCalls: Map<string, Call> = new Map();
  private tradedMarketIds: Set<string> = new Set();
  private maxLogs = 200;

  constructor(
    config: BotConfig,
    practiceEngine: PracticeEngine,
    realEngine?: RealEngine
  ) {
    this.config = { ...config };
    this.practiceEngine = practiceEngine;
    this.realEngine = realEngine;
    this.addLog("INFO", `Initialized [${this.config.name}] in ${this.config.mode.toUpperCase()} mode.`);
  }

  getConfig(): BotConfig {
    return this.config;
  }

  updateConfig(updates: Partial<BotConfig>): void {
    const wasActive = this.config.active;
    this.config = { ...this.config, ...updates };
    if (!wasActive && this.config.active) {
      this.addLog("SUCCESS", `Bot activated with ${this.config.strategy} strategy! Stake: $${this.config.stakePerTrade}`);
    } else if (wasActive && !this.config.active) {
      this.addLog("WARN", "Bot deactivated.");
    }
  }

  getLogs(): BotLog[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  private addLog(level: BotLog["level"], text: string, marketSymbol?: string, txHash?: string) {
    const log: BotLog = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      level,
      text,
      marketSymbol,
      txHash,
    };
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  /**
   * Process a tick of live OpenWindows from Agent A.
   */
  async evaluateTick(windows: OpenWindow[]): Promise<Call | null> {
    if (!this.config.active) {
      return null;
    }

    const openCount = Array.from(this.botCalls.values()).filter((c) => c.settlementStatus === "pending").length;
    if (openCount >= this.config.maxOpenTrades) {
      return null;
    }

    // Evaluate each candidate market
    for (const w of windows) {
      // 1. Filter Asset
      if (this.config.targetAsset !== "ALL" && w.asset !== this.config.targetAsset) {
        continue;
      }

      // 2. Filter Cadence
      if (this.config.maxCadenceSec > 0 && w.intervalSec > this.config.maxCadenceSec) {
        continue;
      }

      // 3. Filter minimum seconds remaining
      if (w.secondsRemaining < this.config.minSecondsRemaining) {
        continue;
      }

      // 4. Prevent duplicate entry on same window
      if (this.tradedMarketIds.has(w.marketId)) {
        continue;
      }

      // 5. Strategy Signal Logic
      let signal: CallDirection | null = null;
      let reason = "";

      switch (this.config.strategy) {
        case "fade_crowd": {
          if (w.upLeanPercent >= this.config.fadeThreshold) {
            signal = "DOWN";
            reason = `Crowd Up lean (${w.upLeanPercent}%) >= ${this.config.fadeThreshold}%. Fading overbought sentiment.`;
          } else if (w.upLeanPercent <= (100 - this.config.fadeThreshold)) {
            signal = "UP";
            reason = `Crowd Up lean (${w.upLeanPercent}%) <= ${100 - this.config.fadeThreshold}%. Fading oversold sentiment.`;
          }
          break;
        }

        case "momentum_trend": {
          if (w.upLeanPercent >= this.config.trendThreshold) {
            signal = "UP";
            reason = `Strong Up momentum (${w.upLeanPercent}%) >= ${this.config.trendThreshold}%. Riding trend.`;
          } else if (w.upLeanPercent <= (100 - this.config.trendThreshold)) {
            signal = "DOWN";
            reason = `Strong Down momentum (${100 - w.upLeanPercent}%) >= ${this.config.trendThreshold}%. Riding trend.`;
          }
          break;
        }

        case "calibration_value":
        case "custom": {
          // Brier Value: Exploit 50-60% mispricings when book spread is tight
          if (w.upLeanPercent >= 60 && w.upLeanPercent <= 75) {
            signal = "UP";
            reason = `Statistical calibration edge detected on ${w.symbol} (lean ${w.upLeanPercent}%).`;
          } else if (w.upLeanPercent <= 40 && w.upLeanPercent >= 25) {
            signal = "DOWN";
            reason = `Statistical calibration edge detected on ${w.symbol} (lean ${w.upLeanPercent}%).`;
          }
          break;
        }
      }

      if (signal) {
        // Execute trade
        return await this.executeTrade(w, signal, reason);
      }
    }

    return null;
  }

  private async executeTrade(window: OpenWindow, direction: CallDirection, reason: string): Promise<Call | null> {
    try {
      this.addLog("SIGNAL", `SIGNAL DETECTED on ${window.symbol}: ${reason}`, window.symbol);

      let call: Call;
      if (this.config.mode === "practice") {
        call = this.practiceEngine.placeCall(window, direction, this.config.stakePerTrade);
      } else {
        if (!this.realEngine) {
          this.addLog("WARN", "RealEngine not configured. Skipping real order.", window.symbol);
          return null;
        }
        call = await this.realEngine.placeCall(window, direction, this.config.stakePerTrade);
      }

      this.tradedMarketIds.add(window.marketId);
      this.botCalls.set(call.id, call);

      this.addLog(
        "ORDER",
        `ORDER DISPATCHED: Call ${direction} | Stake: $${call.stake.toFixed(2)} | Entry Ask: ${call.entryPrice.toFixed(3)} | Contracts: ${call.contractsCount.toFixed(1)}`,
        window.symbol,
        call.txHash
      );

      return call;
    } catch (err: any) {
      this.addLog("WARN", `Execution failed: ${err.message}`, window.symbol);
      return null;
    }
  }

  /**
   * Synchronize settlement results with calls placed by the bot.
   */
  updateSettledCall(call: Call) {
    if (this.botCalls.has(call.id)) {
      this.botCalls.set(call.id, call);
      const outcome = call.settlementStatus;
      if (outcome === "won") {
        this.addLog(
          "SUCCESS",
          `TRADE WON! [${call.direction}] Payout: +$${call.payout.toFixed(2)} | Net PnL: +$${call.netPnl.toFixed(2)}`,
          undefined,
          call.txHash
        );
      } else if (outcome === "lost") {
        this.addLog(
          "SETTLE",
          `TRADE LOST: [${call.direction}] Net PnL: -$${call.stake.toFixed(2)}`,
          undefined,
          call.txHash
        );
      } else if (outcome === "voided") {
        this.addLog(
          "SETTLE",
          `TRADE VOIDED: Protocol 0.5 refund applied. Net: $${call.netPnl.toFixed(2)}`
        );
      }
    }
  }

  getStats(): BotStats {
    const calls = Array.from(this.botCalls.values());
    const scorecard = ScorecardService.computeScorecard(calls, this.config.mode);

    return {
      totalTrades: scorecard.totalCalls,
      settledTrades: scorecard.settledCalls,
      wonTrades: scorecard.wonCalls,
      lostTrades: scorecard.lostCalls,
      voidedTrades: scorecard.voidedCalls,
      winRate: scorecard.winRate,
      totalPnl: scorecard.totalPnl,
      brierScore: scorecard.brierScore,
    };
  }
}
