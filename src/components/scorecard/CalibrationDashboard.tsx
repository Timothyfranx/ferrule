import React from "react";
import type { CalibrationScorecard, TradingMode } from "../../types/index.js";

interface CalibrationDashboardProps {
  scorecard: CalibrationScorecard;
  mode: TradingMode;
}

export function CalibrationDashboard({ scorecard, mode }: CalibrationDashboardProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-bg-base font-mono space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-bg-raised border border-border-base p-4">
          <div className="text-text-dim text-[11px]">BRIER CALIBRATION SCORE</div>
          <div className="text-text-primary text-[28px] font-bold tabular-nums my-1">
            {scorecard.brierScore !== null ? scorecard.brierScore.toFixed(3) : "N/A"}
          </div>
          <div className="text-text-secondary text-[11px]">
            Lower is better (0.00 = perfect, 0.25 = random)
          </div>
        </div>

        <div className="bg-bg-raised border border-border-base p-4">
          <div className="text-text-dim text-[11px]">DECISIVE WIN RATE</div>
          <div className="text-text-primary text-[28px] font-bold tabular-nums my-1">
            {(scorecard.winRate * 100).toFixed(1)}%
          </div>
          <div className="text-text-secondary text-[11px]">
            {scorecard.wonCalls} Won / {scorecard.lostCalls} Lost / {scorecard.voidedCalls} Voided
          </div>
        </div>

        <div className="bg-bg-raised border border-border-base p-4">
          <div className="text-text-dim text-[11px]">CUMULATIVE PNL ({mode.toUpperCase()})</div>
          <div
            className="text-[28px] font-bold tabular-nums my-1"
            style={{ color: scorecard.totalPnl >= 0 ? "#00e676" : "#ff5252" }}
          >
            {scorecard.totalPnl >= 0 ? "+" : ""}${scorecard.totalPnl.toFixed(2)}
          </div>
          <div className="text-text-secondary text-[11px]">
            ROI: {scorecard.roiPercent.toFixed(1)}% across {scorecard.totalCalls} calls
          </div>
        </div>
      </div>

      {/* Binned Calibration Breakdown */}
      <div className="bg-bg-raised border border-border-base p-4">
        <div className="pb-2 mb-3 border-b border-border-subtle">
          <h3 className="text-text-primary text-[14px] font-bold">
            PROBABILISTIC CALIBRATION ANALYSIS ({mode.toUpperCase()} MODE)
          </h3>
          <p className="text-text-dim text-[12px] mt-0.5">
            Compares forecast confidence level against empirical win frequency.
          </p>
        </div>

        <div className="space-y-3">
          {scorecard.calibrationBuckets.map((b) => (
            <div key={b.bucketLabel} className="bg-bg-base/50 p-2.5 border border-border-subtle">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-text-secondary">
                  {b.bucketLabel} Confidence Bucket ({b.count} calls)
                </span>
                <span className="text-text-dim tabular-nums">
                  Forecast: {(b.averageConfidence * 100).toFixed(0)}% | Actual:{" "}
                  <span className="text-text-primary font-bold">
                    {(b.empiricalWinRate * 100).toFixed(0)}%
                  </span>
                </span>
              </div>

              {/* Comparison Bars */}
              <div className="space-y-1">
                {/* Predicted Confidence Bar */}
                <div className="w-full h-1.5 bg-bg-raised overflow-hidden">
                  <div
                    className="h-full bg-cyan-eval"
                    style={{ width: `${b.averageConfidence * 100}%` }}
                    title={`Forecast: ${(b.averageConfidence * 100).toFixed(1)}%`}
                  />
                </div>
                {/* Empirical Win Rate Bar */}
                <div className="w-full h-1.5 bg-bg-raised overflow-hidden">
                  <div
                    className="h-full bg-up-green"
                    style={{ width: `${b.empiricalWinRate * 100}%` }}
                    title={`Actual Win: ${(b.empiricalWinRate * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
