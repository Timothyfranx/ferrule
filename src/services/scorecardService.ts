import type { Call, CalibrationBucket, CalibrationScorecard, TradingMode } from "../types/index.js";

export class ScorecardService {
  /**
   * Computes the complete probabilistic calibration scorecard.
   */
  static computeScorecard(calls: Call[], filterMode?: TradingMode): CalibrationScorecard {
    const filtered = filterMode ? calls.filter((c) => c.mode === filterMode) : calls;
    const resolvedCalls = filtered.filter((c) => c.settlementStatus !== "pending");

    let wonCalls = 0;
    let lostCalls = 0;
    let voidedCalls = 0;
    let totalPnl = 0;
    let totalStake = 0;

    let brierSum = 0;
    let brierCount = 0;

    const bucketRanges = [
      { label: "50-60%", min: 0.5, max: 0.6 },
      { label: "60-70%", min: 0.6, max: 0.7 },
      { label: "70-80%", min: 0.7, max: 0.8 },
      { label: "80-90%", min: 0.8, max: 0.9 },
      { label: "90-100%", min: 0.9, max: 1.0 },
    ];

    const bucketData = bucketRanges.map((r) => ({
      bucketLabel: r.label,
      minConf: r.min,
      maxConf: r.max,
      count: 0,
      confidenceSum: 0,
      wins: 0,
    }));

    for (const c of filtered) {
      totalStake += c.stake;
      totalPnl += c.netPnl;

      if (c.settlementStatus === "won") wonCalls++;
      else if (c.settlementStatus === "lost") lostCalls++;
      else if (c.settlementStatus === "voided") voidedCalls++;

      // Compute Brier score and calibration buckets on settled calls
      if (c.settlementStatus !== "pending") {
        // Probability assigned to the chosen direction
        const predictedProb = c.direction === "UP" ? c.entryPrice : (1 - c.entryPrice);
        const actualOutcome = c.settlementStatus === "won" ? 1.0 : c.settlementStatus === "voided" ? 0.5 : 0.0;

        brierSum += (predictedProb - actualOutcome) ** 2;
        brierCount++;

        // Bucket by confidence (clamped 0.5 to 1.0)
        const confidence = Math.max(predictedProb, 1 - predictedProb);
        for (const b of bucketData) {
          if (confidence >= b.minConf && (confidence < b.maxConf || (b.maxConf === 1.0 && confidence <= 1.0))) {
            b.count++;
            b.confidenceSum += confidence;
            if (c.settlementStatus === "won") b.wins++;
            break;
          }
        }
      }
    }

    const decisiveCount = wonCalls + lostCalls;
    const winRate = decisiveCount > 0 ? wonCalls / decisiveCount : 0;
    const brierScore = brierCount > 0 ? brierSum / brierCount : null;
    const roiPercent = totalStake > 0 ? (totalPnl / totalStake) * 100 : 0;

    const calibrationBuckets: CalibrationBucket[] = bucketData.map((b) => ({
      bucketLabel: b.bucketLabel,
      minConf: b.minConf,
      maxConf: b.maxConf,
      count: b.count,
      averageConfidence: b.count > 0 ? b.confidenceSum / b.count : (b.minConf + b.maxConf) / 2,
      empiricalWinRate: b.count > 0 ? b.wins / b.count : 0,
    }));

    return {
      totalCalls: filtered.length,
      wonCalls,
      lostCalls,
      voidedCalls,
      pendingCalls: filtered.length - resolvedCalls.length,
      winRate,
      brierScore,
      calibrationBuckets,
      totalPnl,
      roiPercent,
    };
  }
}
