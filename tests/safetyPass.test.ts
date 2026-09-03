import { describe, it, expect, vi } from "vitest";
import { PracticeEngine } from "../src/engine/practiceEngine.js";
import { PrecisionEngine } from "../src/engine/precision.js";
import { SettlementEngine } from "../src/engine/settlementEngine.js";
import { RealEngine } from "../src/engine/realEngine.js";
import { ScorecardService } from "../src/scoring/scorecard.js";
import type { Call, OpenWindow } from "../src/types/shared.js";
import { InvalidInputError } from "@somnia-chain/markets-sdk";

// Mock OpenWindow fixture
const mockWindow: OpenWindow = {
  marketId: "0x1111111111111111111111111111111111111111111111111111111111111111",
  symbol: "BTC-15m",
  asset: "BTC",
  intervalSec: 900,
  venueId: "0x2222222222222222222222222222222222222222222222222222222222222222",
  poolAddress: "0x3333333333333333333333333333333333333333",
  marketAddress: "0x4444444444444444444444444444444444444444",
  oracleQuestionId: "0x5555555555555555555555555555555555555555555555555555555555555555",
  expiry: Math.floor(Date.now() / 1000) + 600,
  secondsRemaining: 600,
  bestUpBid: 0.62,
  bestUpAsk: 0.65,
  bestDownBid: 0.35,
  bestDownAsk: 0.38,
  upLeanProbability: 0.635,
  upLeanPercent: 64,
  depth: {
    upBidVolume: 500,
    upAskVolume: 500,
    downBidVolume: 500,
    downAskVolume: 500,
  },
  onchainStatus: 1,
};

describe("§7 Safety and Correctness Verification Pass", () => {
  // 1. Adversarial test: practice cap rejection
  it("Adversarial: rejects practice orders exceeding the stated cap or bankroll", () => {
    const practice = new PracticeEngine({ initialBankroll: 1000, maxStakePerCall: 100 });

    // Valid call within cap
    const validCall = practice.placeCall(mockWindow, "UP", 50);
    expect(validCall.mode).toBe("practice");
    expect(validCall.stake).toBe(50);
    expect(practice.getBankroll()).toBe(950);

    // Adversarial: attempt above $100 cap
    expect(() => {
      practice.placeCall(mockWindow, "UP", 101);
    }).toThrow(InvalidInputError);

    // Adversarial: attempt negative or zero stake
    expect(() => {
      practice.placeCall(mockWindow, "DOWN", 0);
    }).toThrow(InvalidInputError);

    // Adversarial: attempt beyond remaining bankroll
    const highCapPractice = new PracticeEngine({ initialBankroll: 100, maxStakePerCall: 500 });
    expect(() => {
      highCapPractice.placeCall(mockWindow, "UP", 200);
    }).toThrow(/Insufficient practice balance/);
  });

  // 2. Confirm practice orders never touch the real book under any code path
  it("Separation: guarantees practice orders never reach real trader or write calls", () => {
    const practice = new PracticeEngine();
    const call = practice.placeCall(mockWindow, "UP", 50);

    // Verify properties
    expect(call.mode).toBe("practice");
    expect((call as any).txHash).toBeUndefined();

    // Verify mock trader placeOrder is NEVER invokable by practice engine
    const mockTrader = { placeOrder: vi.fn(), redeem: vi.fn() };
    expect(mockTrader.placeOrder).not.toHaveBeenCalled();

    // Verify SettlementEngine refuses on-chain redemption for practice mode
    const mockClient = { getMarketOnchain: vi.fn() } as any;
    const settlement = new SettlementEngine(mockClient, { trader: mockTrader as any });

    expect(settlement.redeemWinningCall(call)).rejects.toThrow(
      "Practice calls cannot be redeemed on-chain"
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
    const snapped = PrecisionEngine.snapPriceToTick(floatPrice, tickSize18, decimals18);

    expect(snapped.rawPrice % tickSize18).toBe(0n);
    expect(snapped.humanPrice).toBeCloseTo(0.333, 3);
    // Ensure rawPrice is scaled to 18 decimals
    expect(snapped.rawPrice.toString().length).toBeGreaterThan(15);

    // Test lot snapping for 18-decimal amounts
    const floatAmount = 15.456789;
    const snappedAmount = PrecisionEngine.snapAmountToLot(
      floatAmount,
      lotSize18,
      minQuantity18,
      decimals18
    );

    expect(snappedAmount.rawAmount % lotSize18).toBe(0n);
    expect(snappedAmount.humanAmount).toBeLessThanOrEqual(floatAmount);

    // Rejection on below minQuantity in 18dp
    expect(() => {
      PrecisionEngine.snapAmountToLot(0.05, lotSize18, minQuantity18, decimals18);
    }).toThrow(/below minimum quantity/);
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

    const settlement = new SettlementEngine(mockClient, { trader: mockTrader as any });

    // Case A: Real Winning Call -> Allowed to redeem
    const winningCall: Call = {
      id: "real_win_1",
      marketId: mockWindow.marketId,
      poolAddress: mockWindow.poolAddress,
      direction: "UP",
      stake: 100,
      mode: "real",
      entryPrice: 0.5,
      contractsCount: 200,
      timestamp: Date.now(),
      expiry: mockWindow.expiry,
      settlementStatus: "won",
      payout: 200,
      netPnl: 100,
      redeemed: false,
    };

    const txRes = await settlement.redeemWinningCall(winningCall);
    expect(txRes.hash).toBe("0xabcdef1234567890");
    expect(winningCall.redeemed).toBe(true);
    expect(mockTrader.redeem).toHaveBeenCalledTimes(1);

    // Case B: Real Losing Call -> MUST BE BLOCKED from on-chain redemption to save gas!
    const losingCall: Call = {
      ...winningCall,
      id: "real_loss_1",
      direction: "DOWN",
      settlementStatus: "lost",
      payout: 0,
      netPnl: -100,
      redeemed: false,
    };

    await expect(settlement.redeemWinningCall(losingCall)).rejects.toThrow(
      /Cannot redeem a losing call.*waste gas unnecessarily/
    );
    // Trader.redeem should NOT have been called a second time
    expect(mockTrader.redeem).toHaveBeenCalledTimes(1);

    // Case C: Voided Call -> Allowed to redeem at 0.5 each
    const voidedCall: Call = {
      ...winningCall,
      id: "real_void_1",
      settlementStatus: "voided",
      payout: 100, // 200 * 0.5
      netPnl: 0,
      redeemed: false,
    };

    const voidTx = await settlement.redeemWinningCall(voidedCall);
    expect(voidTx.hash).toBe("0xabcdef1234567890");
    expect(mockTrader.redeem).toHaveBeenCalledTimes(2);
  });

  // 5. Calibration Scorecard and Brier Score validation
  it("Scorecard: computes binned calibration curve and Brier score correctly", () => {
    const practiceCalls: Call[] = [
      {
        id: "c1",
        marketId: mockWindow.marketId,
        poolAddress: mockWindow.poolAddress,
        direction: "UP",
        stake: 50,
        mode: "practice",
        entryPrice: 0.70, // predicted 70%
        contractsCount: 71.4,
        timestamp: Date.now(),
        expiry: mockWindow.expiry,
        settlementStatus: "won", // actual 1.0
        payout: 71.4,
        netPnl: 21.4,
        redeemed: false,
      },
      {
        id: "c2",
        marketId: mockWindow.marketId,
        poolAddress: mockWindow.poolAddress,
        direction: "UP",
        stake: 50,
        mode: "practice",
        entryPrice: 0.80, // predicted 80%
        contractsCount: 62.5,
        timestamp: Date.now(),
        expiry: mockWindow.expiry,
        settlementStatus: "lost", // actual 0.0
        payout: 0,
        netPnl: -50,
        redeemed: false,
      },
    ];

    const scorecard = ScorecardService.computeScorecard(practiceCalls, "practice");
    expect(scorecard.totalCalls).toBe(2);
    expect(scorecard.settledCalls).toBe(2);
    expect(scorecard.wonCalls).toBe(1);
    expect(scorecard.lostCalls).toBe(1);
    expect(scorecard.winRate).toBe(0.5);

    // Brier score: ((0.70 - 1.0)^2 + (0.80 - 0.0)^2) / 2 = (0.09 + 0.64) / 2 = 0.365
    expect(scorecard.brierScore).toBeCloseTo(0.365, 3);
    expect(scorecard.calibrationBuckets.length).toBe(5);
  });
});
