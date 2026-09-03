import type { 
  Call, 
  CalibrationBucket, 
  CalibrationScorecard, 
  TradingMode 
} from "../types/shared.js";

/**
 * Agent C / Shared Scoring — Probabilistic Calibration Scorecard
 * 
 * Rules (§6 of Spec / design.md):
 * 1. Segregated strictly by mode (practice vs real) — never merged.
 * 2. True calibration logic (Brier score + confidence bins), not a raw streak.
 * 3. Handles 3 outcomes: won (1.0), lost (0.0), and voided (0.5).
 */
export class ScorecardService {
  /**
   * Compute the calibration scorecard for a set of calls, filtered by mode.
   */
  static computeScorecard(calls: Call[], mode: TradingMode): CalibrationScorecard {
    const modeCalls = calls.filter((c) => c.mode === mode);

    const totalCalls = modeCalls.length;
    const settledCallsList = modeCalls.filter((c) => c.settlementStatus !== "pending");
    const settledCalls = settledCallsList.length;

    let wonCalls = 0;
    let lostCalls = 0;
    let voidedCalls = 0;
    let totalPnl = 0;
    let totalStaked = 0;
    let squaredErrorSum = 0;

    // Define 5 probability bins: 50-60%, 60-70%, 70-80%, 80-90%, 90-100%
    const binDefinitions = [
      { label: "50-60%", min: 0.5, max: 0.6 },
      { label: "60-70%", min: 0.6, max: 0.7 },
      { label: "70-80%", min: 0.7, max: 0.8 },
      { label: "80-90%", min: 0.8, max: 0.9 },
      { label: "90-100%", min: 0.9, max: 1.01 },
    ];

    const binStats = binDefinitions.map((b) => ({
      bucketLabel: b.label,
      rangeMin: b.min,
      rangeMax: b.max,
      count: 0,
      confidenceSum: 0,
      outcomeScoreSum: 0,
    }));

    for (const call of modeCalls) {
      totalStaked += call.stake;
      totalPnl += call.netPnl;

      if (call.settlementStatus === "pending") {
        continue;
      }

      if (call.settlementStatus === "won") wonCalls++;
      else if (call.settlementStatus === "lost") lostCalls++;
      else if (call.settlementStatus === "voided") voidedCalls++;

      // Evaluate predicted probability of chosen outcome
      // If user called UP at entry price 0.65, they predicted 65% probability of UP
      // If user called DOWN at UP-price 0.35, the entry price for DOWN was 0.65, so prediction was 65%
      const predictedProb = Math.max(0.5, Math.min(0.99, call.entryPrice >= 0.5 ? call.entryPrice : 1 - call.entryPrice));

      // Numerical outcome value: won = 1.0, lost = 0.0, voided = 0.5
      let outcomeValue = 0;
      if (call.settlementStatus === "won") outcomeValue = 1.0;
      else if (call.settlementStatus === "lost") outcomeValue = 0.0;
      else if (call.settlementStatus === "voided") outcomeValue = 0.5;

      // Brier Score component: (predicted - actual)^2
      const sqError = (predictedProb - outcomeValue) ** 2;
      squaredErrorSum += sqError;

      // Assign to calibration bin
      const targetBin = binStats.find(
        (b) => predictedProb >= b.rangeMin && predictedProb < b.rangeMax
      );
      if (targetBin) {
        targetBin.count++;
        targetBin.confidenceSum += predictedProb;
        targetBin.outcomeScoreSum += outcomeValue;
      }
    }

    const decisiveSettled = wonCalls + lostCalls;
    const winRate = decisiveSettled > 0 ? wonCalls / decisiveSettled : 0;
    const brierScore = settledCalls > 0 ? squaredErrorSum / settledCalls : null;
    const roiPercent = totalStaked > 0 ? (totalPnl / totalStaked) * 100 : 0;

    const calibrationBuckets: CalibrationBucket[] = binStats.map((b) => ({
      bucketLabel: b.bucketLabel,
      rangeMin: b.rangeMin,
      rangeMax: b.rangeMax,
      count: b.count,
      averageConfidence: b.count > 0 ? b.confidenceSum / b.count : (b.rangeMin + b.rangeMax) / 2,
      empiricalWinRate: b.count > 0 ? b.outcomeScoreSum / b.count : 0,
    }));

    return {
      mode,
      totalCalls,
      settledCalls,
      wonCalls,
      lostCalls,
      voidedCalls,
      winRate,
      brierScore,
      calibrationBuckets,
      totalPnl,
      totalStaked,
      roiPercent,
    };
  }
}
