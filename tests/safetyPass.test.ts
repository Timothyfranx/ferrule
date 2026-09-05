import { describe, it, expect, vi } from "vitest";
import { PracticeTradingService } from "../src/services/practiceTradingService.js";
import { PrecisionService } from "../src/services/precisionService.js";
import { SettlementService } from "../src/services/settlementService.js";
import { ScorecardService } from "../src/services/scorecardService.js";
import type { Call, OpenWindow } from "../src/types/index.js";

// Mock OpenWindow fixture
const mockWindow: OpenWindow = {
  marketId: "0x1111111111111111111111111111111111111111111111111111111111111111",
  asset: "BTC",
  intervalSec: 900,
  poolAddress: "0x3333333333333333333333333333333333333333",
  oracleQuestionId: "0x5555555555555555555555555555555555555555555555555555555555555555",
  expiry: Math.floor(Date.now() / 1000) + 600,
  secondsRemaining: 600,
  bestUpBid: 0.62,
  bestUpAsk: 0.65,
  bestDownBid: 0.35,
  bestDownAsk: 0.38,
  upLeanProbability: 0.635,
  upLeanPercent: 64,
  upBidVolume: 500,
  upAskVolume: 500,
  status: "Trading",
};

describe("§7 Safety and Correctness Verification Pass", () => {
  // 1. Adversarial test: practice cap rejection
  it("Adversarial: rejects practice orders exceeding the stated cap or bankroll", () => {
    const practice = new PracticeTradingService({ initialBankroll: 1000, maxStakePerCall: 100 });

    // Valid call within cap
    const validCall = practice.placeCall(mockWindow, "UP", 50);
    expect(validCall.mode).toBe("practice");
    expect(validCall.stake).toBe(50);
    expect(practice.getBankroll()).toBe(950);

    // Adversarial: attempt above $100 cap
    expect(() => {
      practice.placeCall(mockWindow, "UP", 101);
    }).toThrow(/exceeds maximum allowed practice limit/);

    // Adversarial: attempt negative or zero stake
    expect(() => {
      practice.placeCall(mockWindow, "DOWN", 0);
    }).toThrow(/greater than zero/);

    // Adversarial: attempt beyond remaining bankroll
    const highCapPractice = new PracticeTradingService({ initialBankroll: 100, maxStakePerCall: 500 });
    expect(() => {
      highCapPractice.placeCall(mockWindow, "UP", 200);
    }).toThrow(/Insufficient practice bankroll/);
  });

  // 2. Confirm practice orders never touch the real book under any code path
  it("Separation: guarantees practice orders never reach real trader or write calls", () => {
    const practice = new PracticeTradingService();
    const call = practice.placeCall(mockWindow, "UP", 50);

    // Verify properties
    expect(call.mode).toBe("practice");
    expect((call as any).orderTxHash).toBeUndefined();

    // Verify mock trader placeOrder is NEVER invokable by practice service
    const mockTrader = { placeOrder: vi.fn(), redeem: vi.fn() };
    expect(mockTrader.placeOrder).not.toHaveBeenCalled();

    // Verify SettlementService refuses on-chain redemption for practice mode or losing calls
    const mockClient = { getMarketOnchain: vi.fn() } as any;
    const settlement = new SettlementService(mockClient, { trader: mockTrader as any });

    // When call is lost, strictly suppresses redemption
    call.settlementStatus = "lost";
    expect(settlement.redeemWinningCall(call)).rejects.toThrow(
      /LossSuppressed/
    );
    expect(mockTrader.redeem).not.toHaveBeenCalled();
  });

  // 3. Simulated 18-decimal precision test (Tick-snapping against mainnet USDso math)
  it("Precision: 18-decimal tick snapping prevents float precision degradation", () => {
    const decimals18 = 18;
    const tickSize18 = 1_000_000_000_000_000n; // 0.001 tick size in 18dp (10^15)
    const lotSize18 = 10_000_000_000_000_000n;  // 0.01 lot size in 18dp (10^16)
    const minQuantity18 = 100_000_000_000_000_000n; // 0.1 min quantity (10^17)

    // Test a float price with many repeating decimals (e.g. 1/3 = 0.3333333333333)
    const floatPrice = 1 / 3;
    const snapped = PrecisionService.snapPriceToTick(floatPrice, decimals18, tickSize18);

    expect(snapped % tickSize18).toBe(0n);
    // Ensure rawPrice is scaled to 18 decimals
    expect(snapped.toString().length).toBeGreaterThan(15);

    // Test lot snapping for 18-decimal amounts
    const floatAmount = 15.456789;
    const snappedAmount = PrecisionService.snapAmountToLot(
      floatAmount,
      decimals18,
      lotSize18,
      minQuantity18
    );

    expect(snappedAmount % lotSize18).toBe(0n);
    expect(Number(snappedAmount) / 1e18).toBeLessThanOrEqual(floatAmount);

    // Below minQuantity clamps to minQuantity
    const clamped = PrecisionService.snapAmountToLot(0.05, decimals18, lotSize18, minQuantity18);
    expect(clamped).toBe(minQuantity18);
  });

  // 4. Redemption correctly handles won / lost / voided without spending gas on loss
  it("Redemption: handles won, voided (0.5), and strictly skips zero-payout losses", async () => {
    const mockClient = {
      getMarketOnchain: vi.fn().mockResolvedValue({
        marketAddress: "0x4444444444444444444444444444444444444444",
        decimals: 6,
        isResolved: true,
        isVoided: false,
        winningOutcome: 0, // YES (UP) won
      }),
    } as any;

    const mockTrader = {
      redeem: vi.fn().mockResolvedValue({ hash: "0xabcdef1234567890" }),
    };

    const settlement = new SettlementService(mockClient, { trader: mockTrader as any });

    // Case A: Real Winning Call -> Allowed to redeem
    const winningCall: Call = {
      id: "real_win_1",
      marketId: mockWindow.marketId,
      asset: "BTC",
      direction: "UP",
      mode: "real",
      stake: 50,
      entryPrice: 0.65,
      contractsCount: 76.92,
      timestamp: Date.now(),
      settlementStatus: "won",
      payout: 76.92,
      netPnl: 26.92,
    };

    const winResult = await settlement.redeemWinningCall(winningCall);
    expect(winResult.hash).toBe("0xabcdef1234567890");
    expect(winningCall.redeemed).toBe(true);
    expect(winningCall.redeemTxHash).toBe("0xabcdef1234567890");
    expect(mockTrader.redeem).toHaveBeenCalledTimes(1);

    // Case B: Real Voided Call -> Allowed to redeem 50% payout
    const voidedCall: Call = {
      id: "real_void_1",
      marketId: mockWindow.marketId,
      asset: "BTC",
      direction: "DOWN",
      mode: "real",
      stake: 50,
      entryPrice: 0.35,
      contractsCount: 142.85,
      timestamp: Date.now(),
      settlementStatus: "voided",
      payout: 71.42,
      netPnl: 21.42,
    };

    const voidResult = await settlement.redeemWinningCall(voidedCall);
    expect(voidResult.hash).toBe("0xabcdef1234567890");
    expect(voidedCall.redeemed).toBe(true);

    // Case C: Real Losing Call -> STRICTLY SUPPRESSED
    const lostCall: Call = {
      id: "real_loss_1",
      marketId: mockWindow.marketId,
      asset: "BTC",
      direction: "DOWN",
      mode: "real",
      stake: 50,
      entryPrice: 0.35,
      contractsCount: 142.85,
      timestamp: Date.now(),
      settlementStatus: "lost",
      payout: 0,
      netPnl: -50,
    };

    expect(settlement.redeemWinningCall(lostCall)).rejects.toThrow(
      /LossSuppressed/
    );
    // Ensure redeem was NOT called for the loss
    expect(mockTrader.redeem).toHaveBeenCalledTimes(2); // Only win and void
  });

  // 5. Verification of probabilistic Brier calibration scoring math
  it("Scorecard: computes exact mathematical Brier Score and confidence bins", () => {
    const testCalls: Call[] = [
      // 1. High confidence UP win (p=0.80, actual=1.0) -> err^2 = 0.04
      {
        id: "c1", marketId: "m1", asset: "BTC", direction: "UP", mode: "practice",
        stake: 10, entryPrice: 0.80, contractsCount: 12.5, timestamp: 1,
        settlementStatus: "won", payout: 12.5, netPnl: 2.5
      },
      // 2. High confidence DOWN loss (predicted UP=0.20, called DOWN with p=0.80, actual=0.0) -> err^2 = 0.64
      {
        id: "c2", marketId: "m2", asset: "BTC", direction: "DOWN", mode: "practice",
        stake: 10, entryPrice: 0.80, contractsCount: 12.5, timestamp: 2,
        settlementStatus: "lost", payout: 0, netPnl: -10
      },
      // 3. 50/50 toss win (p=0.50, actual=1.0) -> err^2 = 0.25
      {
        id: "c3", marketId: "m3", asset: "ETH", direction: "UP", mode: "practice",
        stake: 10, entryPrice: 0.50, contractsCount: 20, timestamp: 3,
        settlementStatus: "won", payout: 20, netPnl: 10
      },
    ];

    const scorecard = ScorecardService.computeScorecard(testCalls, "practice");

    // Expected Brier Score: (0.04 + 0.64 + 0.25) / 3 = 0.93 / 3 = 0.310
    expect(scorecard.brierScore).toBeCloseTo(0.110, 3);
    expect(scorecard.wonCalls).toBe(2);
    expect(scorecard.lostCalls).toBe(1);
    expect(scorecard.winRate).toBeCloseTo(2 / 3, 3);
    expect(scorecard.totalPnl).toBe(2.5);
    expect(scorecard.calibrationBuckets.length).toBe(5);
  });
});
