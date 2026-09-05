import React from "react";
import { Award, ArrowRight, ShieldCheck, TrendingUp, TrendingDown, HelpCircle, Terminal } from "lucide-react";
import type { CalibrationScorecard, TradingMode } from "../../types/index.js";

interface BasicScorecardProps {
  scorecard: CalibrationScorecard;
  mode: TradingMode;
  onSwitchToPro?: () => void;
}

export function BasicScorecard({ scorecard, mode, onSwitchToPro }: BasicScorecardProps) {
  const settledCalls = scorecard.wonCalls + scorecard.lostCalls + scorecard.voidedCalls;
  const winRatePercent = (scorecard.winRate * 100).toFixed(1);
  const lossRatePercent = (
    settledCalls > 0 
      ? ((scorecard.lostCalls / settledCalls) * 100).toFixed(1)
      : "0.0"
  );
  const voidRatePercent = (
    settledCalls > 0 
      ? ((scorecard.voidedCalls / settledCalls) * 100).toFixed(1)
      : "0.0"
  );

  const brierFormatted = scorecard.brierScore !== null ? scorecard.brierScore.toFixed(3) : "—";
  const brierGrade = scorecard.brierScore === null 
    ? "UNCALIBRATED" 
    : scorecard.brierScore <= 0.15 
      ? "EXCELLENT" 
      : scorecard.brierScore <= 0.25 
        ? "FAIR" 
        : "UNCALIBRATED";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-5xl mx-auto w-full select-text text-text-primary pb-20 sm:pb-8">
      {/* 1. Header Banner & Calibration Assessment */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-cyan-eval px-2 py-0.5 border border-border-flat bg-bg-raised">
            [CALIBRATION EVALUATION // {settledCalls} ROUNDS]
          </span>
          <span className="text-text-dim">
            MODE: {mode.toUpperCase()}
          </span>
        </div>

        <h1 className="font-sans text-2xl sm:text-4xl text-text-primary font-semibold tracking-tight leading-snug">
          {settledCalls === 0 ? (
            "No calls settled yet. Place calls to build your calibration scorecard."
          ) : (
            `Overall win rate: ${winRatePercent}% across ${settledCalls} settled predictions.`
          )}
        </h1>

        <p className="font-sans text-sm sm:text-base text-text-secondary max-w-3xl leading-relaxed">
          Unlike vanity win streaks, honest forecasting evaluates probabilistic calibration. A lower Brier score indicates that your subjective conviction matches real empirical frequencies.
        </p>
      </div>

      {/* 2. Won / Lost / Voided Cards (Exact Stitch ferrule_scorecard_basic layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* WON CARD */}
        <div className="bg-bg-raised border border-border-flat p-5 flex flex-col justify-between rounded-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs text-text-secondary uppercase tracking-wider font-semibold">
              WON
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-up-green text-up-green">
              SETTLED POSITIVE
            </span>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-3xl font-bold text-text-primary">{scorecard.wonCalls}</span>
            <span className="font-mono text-xl text-up-green font-semibold">{winRatePercent}%</span>
          </div>
          <div className="pt-2 border-t border-border-flat font-mono text-[11px] text-text-secondary">
            Full payout collected
          </div>
        </div>

        {/* LOST CARD */}
        <div className="bg-bg-raised border border-border-flat p-5 flex flex-col justify-between rounded-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs text-text-secondary uppercase tracking-wider font-semibold">
              LOST
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-down-red text-down-red">
              SETTLED NEGATIVE
            </span>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-3xl font-bold text-text-primary">{scorecard.lostCalls}</span>
            <span className="font-mono text-xl text-down-red font-semibold">{lossRatePercent}%</span>
          </div>
          <div className="pt-2 border-t border-border-flat font-mono text-[11px] text-text-secondary">
            Loss suppressed (gas saved)
          </div>
        </div>

        {/* VOIDED CARD */}
        <div className="bg-bg-raised border border-border-flat p-5 flex flex-col justify-between rounded-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-sans text-xs text-text-secondary uppercase tracking-wider font-semibold">
              VOIDED
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-neutral-gray text-neutral-gray">
              NEUTRAL PUSH
            </span>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-3xl font-bold text-text-primary">{scorecard.voidedCalls}</span>
            <span className="font-mono text-xl text-neutral-gray font-semibold">{voidRatePercent}%</span>
          </div>
          <div className="pt-2 border-t border-border-flat font-mono text-[11px] text-text-secondary">
            Symmetric 50% split refund
          </div>
        </div>
      </div>

      {/* 3. Empirical Calibration Index Panel */}
      <div className="bg-bg-raised border border-border-flat p-6 rounded-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-flat mb-6">
          <div>
            <h2 className="font-sans text-base font-bold text-text-primary uppercase tracking-wide">
              Empirical Calibration Index
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-sans">
              Calculated over trailing settled Somnia DreamDEX binary contracts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-up-green inline-block"></span>
            <span className="font-mono text-[11px] text-text-secondary">VALIDITY: ON-CHAIN VERIFIED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
          <div>
            <span className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">
              Brier Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">
                {brierFormatted}
              </span>
              <span className={`text-[11px] font-semibold ${scorecard.brierScore !== null && scorecard.brierScore <= 0.20 ? "text-up-green" : "text-text-secondary"}`}>
                {brierGrade}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1 font-sans">
              Strict mathematical penalty $(p - o)^2$. Standard professional threshold is &lt;0.200.
            </p>
          </div>

          <div>
            <span className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">
              Total Calls
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">
                {scorecard.totalCalls}
              </span>
              <span className="text-[11px] text-text-dim">ROUNDS</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1 font-sans">
              {settledCalls} resolved with directional outcome, {scorecard.pendingCalls} currently pending.
            </p>
          </div>

          <div>
            <span className="text-[10px] text-text-dim uppercase tracking-wider block mb-1">
              Net Realized PnL
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${scorecard.totalPnl >= 0 ? "text-up-green" : "text-down-red"}`}>
                {scorecard.totalPnl >= 0 ? `+${scorecard.totalPnl.toFixed(2)}` : scorecard.totalPnl.toFixed(2)}
              </span>
              <span className="text-[11px] text-text-dim">USDso</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1 font-sans">
              Cumulative return on settled predictions in {mode} mode.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Confidence Bucket Table */}
      <div className="bg-bg-raised border border-border-flat rounded-md overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-border-flat font-mono text-xs text-text-secondary font-semibold">
          CONFIDENCE BUCKET CALIBRATION CURVE
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-bg-base text-text-dim border-b border-border-flat text-[11px]">
              <tr>
                <th className="py-2.5 px-4">CONFIDENCE TIER</th>
                <th className="py-2.5 px-4">CALL COUNT</th>
                <th className="py-2.5 px-4">AVG CONFIDENCE</th>
                <th className="py-2.5 px-4">ACTUAL WIN RATE</th>
                <th className="py-2.5 px-4 text-right">CALIBRATION DELTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {scorecard.calibrationBuckets.map((bucket) => {
                const delta = bucket.count > 0 ? bucket.empiricalWinRate - bucket.averageConfidence : 0;
                const deltaFormatted = (delta * 100).toFixed(1);
                return (
                  <tr key={bucket.bucketLabel} className="hover:bg-bg-base/50">
                    <td className="py-2.5 px-4 font-semibold text-text-primary">{bucket.bucketLabel}</td>
                    <td className="py-2.5 px-4 text-text-secondary">{bucket.count}</td>
                    <td className="py-2.5 px-4 text-text-secondary">{(bucket.averageConfidence * 100).toFixed(0)}%</td>
                    <td className="py-2.5 px-4 font-bold text-text-primary">
                      {bucket.count > 0 ? `${(bucket.empiricalWinRate * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {bucket.count === 0 ? (
                        <span className="text-text-dim">—</span>
                      ) : Math.abs(delta) <= 0.05 ? (
                        <span className="text-up-green">Well Calibrated ({deltaFormatted}%)</span>
                      ) : delta > 0 ? (
                        <span className="text-cyan-eval">Underconfident (+{deltaFormatted}%)</span>
                      ) : (
                        <span className="text-down-red">Overconfident ({deltaFormatted}%)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pro Terminal Navigation Link */}
      {onSwitchToPro && (
        <div className="flex items-center justify-between p-4 bg-bg-raised border border-border-flat rounded-md font-mono text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <Terminal size={16} className="text-cyan-eval" />
            <span>Want automated strategy execution &amp; command-line calibration?</span>
          </div>
          <button
            onClick={onSwitchToPro}
            className="text-cyan-eval hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Launch Pro Terminal</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
