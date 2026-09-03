import { describe, it, expect } from "vitest";
import { PracticeEngine } from "../src/engine/practiceEngine.js";
import { StrategyBotEngine, DEFAULT_BOT_CONFIGS } from "../src/bot/strategyEngine.js";
import type { OpenWindow } from "../src/types/shared.js";

const mockOverboughtWindow: OpenWindow = {
  marketId: "0xaaaa111122223333444455556666777788889999aaaabbbbccccddddeeeeffff",
  symbol: "BTC-300s",
  asset: "BTC",
  intervalSec: 300,
  venueId: "0x1111111111111111111111111111111111111111111111111111111111111111",
  poolAddress: "0x2222222222222222222222222222222222222222",
  marketAddress: "0x3333333333333333333333333333333333333333",
  oracleQuestionId: "0x4444444444444444444444444444444444444444444444444444444444444444",
  expiry: Math.floor(Date.now() / 1000) + 200,
  secondsRemaining: 200,
  bestUpBid: 0.84,
  bestUpAsk: 0.86,
  bestDownBid: 0.14,
  bestDownAsk: 0.16,
  upLeanProbability: 0.85,
  upLeanPercent: 85, // Extreme overbought: >80%
  depth: { upBidVolume: 500, upAskVolume: 500, downBidVolume: 500, downAskVolume: 500 },
  onchainStatus: 1,
};

describe("Strategy Bot Terminal Engine", () => {
  it("triggers Contrarian Fade signal when Up Lean exceeds threshold", async () => {
    const practice = new PracticeEngine({ initialBankroll: 1000, maxStakePerCall: 100 });
    const bot = new StrategyBotEngine(
      { ...DEFAULT_BOT_CONFIGS.fade_crowd, active: true },
      practice
    );

    // Initial state
    expect(bot.getStats().totalTrades).toBe(0);

    // Evaluate tick with overbought window (85% Up lean)
    const placedCall = await bot.evaluateTick([mockOverboughtWindow]);

    expect(placedCall).not.toBeNull();
    // Contrarian bot fades Up lean by calling DOWN
    expect(placedCall?.direction).toBe("DOWN");
    expect(placedCall?.mode).toBe("practice");
    expect(placedCall?.stake).toBe(15);
    expect(bot.getStats().totalTrades).toBe(1);

    // Verify terminal logs were produced
    const logs = bot.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs.some((l) => l.level === "SIGNAL")).toBe(true);
    expect(logs.some((l) => l.level === "ORDER")).toBe(true);
  });

  it("updates bot scorecard and PnL when simulated trades settle", async () => {
    const practice = new PracticeEngine({ initialBankroll: 1000, maxStakePerCall: 100 });
    const bot = new StrategyBotEngine(
      { ...DEFAULT_BOT_CONFIGS.fade_crowd, active: true },
      practice
    );

    const call = await bot.evaluateTick([mockOverboughtWindow]);
    expect(call).not.toBeNull();

    // Settle as WON
    const settled = practice.settleCall(call!.id, {
      isResolved: true,
      isVoided: false,
      winningOutcome: 1, // DOWN won
    });

    bot.updateSettledCall(settled);

    const stats = bot.getStats();
    expect(stats.settledTrades).toBe(1);
    expect(stats.wonTrades).toBe(1);
    expect(stats.winRate).toBe(1.0);
    expect(stats.totalPnl).toBeGreaterThan(0);
  });
});
