import React, { useMemo } from "react";
import type { OpenWindow, CallDirection } from "../../types/index.js";
import { type FairValueResult, generateDistributionCurve } from "../../services/quantService.js";
import { Activity, Zap, Percent, ShieldAlert } from "lucide-react";

interface EdgeRadarCardProps {
  window: OpenWindow;
  fairValue: FairValueResult;
  bankroll: number;
  selectedStake: number;
  onStakeChange: (stake: number) => void;
  onSelectCall: (window: OpenWindow, direction: CallDirection, stake: number) => void;
}

export function EdgeRadarCard({
  window: w,
  fairValue,
  bankroll,
  selectedStake,
  onStakeChange,
  onSelectCall,
}: EdgeRadarCardProps) {
  // Parse strike price or default
  const strikeNum = useMemo(() => {
    if (!w.strikeFormatted) return w.asset === "BTC" ? 95000 : 2700;
    const cleaned = w.strikeFormatted.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || (w.asset === "BTC" ? 95000 : 2700);
  }, [w.strikeFormatted, w.asset]);

  // Derived synthetic spot from upLean or strike
  const spotNum = useMemo(() => {
    // If upLean is 60%, spot is slightly above strike
    const shift = (w.upLeanPercent - 50) * (strikeNum * 0.0003);
    return strikeNum + shift;
  }, [strikeNum, w.upLeanPercent]);

  // Generate SVG bell curve distribution
  const curvePoints = useMemo(() => {
    return generateDistributionCurve(spotNum, strikeNum, w.secondsRemaining, fairValue.volatility, 40);
  }, [spotNum, strikeNum, w.secondsRemaining, fairValue.volatility]);

  // Construct SVG polygon path
  const svgWidth = 260;
  const svgHeight = 60;
  const maxDensity = Math.max(...curvePoints.map((p) => p.density), 0.4);

  const strikeX = useMemo(() => {
    const minP = curvePoints[0]?.price ?? strikeNum;
    const maxP = curvePoints[curvePoints.length - 1]?.price ?? strikeNum;
    if (maxP === minP) return svgWidth / 2;
    return ((strikeNum - minP) / (maxP - minP)) * svgWidth;
  }, [curvePoints, strikeNum]);

  const spotX = useMemo(() => {
    const minP = curvePoints[0]?.price ?? strikeNum;
    const maxP = curvePoints[curvePoints.length - 1]?.price ?? strikeNum;
    if (maxP === minP) return svgWidth / 2;
    return Math.max(0, Math.min(svgWidth, ((spotNum - minP) / (maxP - minP)) * svgWidth));
  }, [curvePoints, spotNum, strikeNum]);

  // Calculate Kelly Recommended dollar amount
  const kellyRecDollars = useMemo(() => {
    const kellyFraction = fairValue.recommendation === "BUY_UP" 
      ? fairValue.quarterKellyUp 
      : fairValue.quarterKellyDown;
    const rec = Math.round(bankroll * kellyFraction);
    return Math.max(10, Math.min(Math.round(bankroll * 0.25), rec || 25));
  }, [fairValue, bankroll]);

  // Edge Badge Styling
  const hasEdge = fairValue.bestEdgeBps >= 50;
  const edgeColor = fairValue.recommendation === "BUY_UP" 
    ? "text-up-green bg-up-green/10 border-up-green/40" 
    : fairValue.recommendation === "BUY_DOWN" 
    ? "text-down-red bg-down-red/10 border-down-red/40" 
    : "text-text-dim bg-bg-base border-border-subtle";

  return (
    <div className="bg-bg-raised border border-border-base flex flex-col font-mono text-[11px] p-2.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-text-primary font-bold">
          <Activity size={13} className="text-cyan-eval" />
          <span>BLACK-SCHOLES Φ(d₂) RADAR</span>
        </div>
        <div className="text-[10px] text-text-dim">
          σ: <strong className="text-text-secondary">{(fairValue.volatility * 100).toFixed(0)}% EWMA</strong>
        </div>
      </div>

      {/* Fair Value vs Market Odds */}
      <div className="grid grid-cols-2 gap-2 mb-2 bg-bg-base/70 p-2 border border-border-subtle">
        <div>
          <div className="text-[10px] text-text-dim">THEORETICAL FAIR PROB</div>
          <div className="text-[14px] font-bold text-cyan-eval tabular-nums">
            {(fairValue.fairProbUp * 100).toFixed(1)}% UP
          </div>
          <div className="text-[10px] text-text-dim tabular-nums">
            d₂ = {fairValue.d2.toFixed(3)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-text-dim">CLOB IMPLIED PROB</div>
          <div className="text-[14px] font-bold text-text-primary tabular-nums">
            {w.upLeanPercent.toFixed(1)}% UP
          </div>
          <div className="text-[10px] text-text-dim tabular-nums">
            Ask: ${(w.bestUpAsk ?? 0.50).toFixed(3)}
          </div>
        </div>
      </div>

      {/* Mispricing Edge Banner */}
      <div className={`p-1.5 border mb-2 flex items-center justify-between ${edgeColor}`}>
        <div className="flex items-center gap-1.5">
          <Zap size={13} />
          <span className="font-bold text-[11px]">
            {hasEdge 
              ? `${fairValue.recommendation === "BUY_UP" ? "UP" : "DOWN"} UNDERPRICED (+${fairValue.bestEdgeBps} bps Edge)`
              : "FAIRLY PRICED (< 50 bps spread)"}
          </span>
        </div>
        <span className="text-[10px] opacity-80">
          {hasEdge ? "Positive EV Signal" : "No Arbitrage"}
        </span>
      </div>

      {/* Deep Quant Visualizer: Normal Probability Density Curve */}
      <div className="border border-border-subtle bg-bg-base/90 p-1.5 mb-2 relative">
        <div className="flex justify-between text-[9px] text-text-dim mb-1">
          <span>PROBABILITY DENSITY CONE</span>
          <span>Strike: ${strikeNum.toLocaleString()} | Spot: ${spotNum.toFixed(0)}</span>
        </div>

        <div className="w-full flex justify-center overflow-hidden py-1">
          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Shaded Area Below Strike (DOWN - Red) */}
            <path
              d={`M 0,${svgHeight} ` +
                curvePoints
                  .filter((p) => !p.isAboveStrike)
                  .map((p, idx) => {
                    const x = (idx / (curvePoints.length - 1)) * svgWidth;
                    const y = svgHeight - (p.density / maxDensity) * (svgHeight - 10);
                    return `L ${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") +
                ` L ${strikeX.toFixed(1)},${svgHeight} Z`}
              fill="#ff5252"
              fillOpacity={0.25}
            />

            {/* Shaded Area Above Strike (UP - Green) */}
            <path
              d={`M ${strikeX.toFixed(1)},${svgHeight} ` +
                curvePoints
                  .filter((p) => p.isAboveStrike)
                  .map((p, idx, arr) => {
                    const overallIdx = curvePoints.length - arr.length + idx;
                    const x = (overallIdx / (curvePoints.length - 1)) * svgWidth;
                    const y = svgHeight - (p.density / maxDensity) * (svgHeight - 10);
                    return `L ${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ") +
                ` L ${svgWidth},${svgHeight} Z`}
              fill="#00e676"
              fillOpacity={0.25}
            />

            {/* Bell Curve Line */}
            <path
              d={curvePoints
                .map((p, idx) => {
                  const x = (idx / (curvePoints.length - 1)) * svgWidth;
                  const y = svgHeight - (p.density / maxDensity) * (svgHeight - 10);
                  return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke="#00ffff"
              strokeWidth={1.5}
            />

            {/* Strike Line */}
            <line
              x1={strikeX}
              y1={0}
              x2={strikeX}
              y2={svgHeight}
              stroke="#ffeb3b"
              strokeWidth={1.5}
            />

            {/* Current Spot Indicator */}
            <circle
              cx={spotX}
              cy={svgHeight - 12}
              r={3.5}
              fill="#ffffff"
            />
          </svg>
        </div>

        <div className="flex justify-between text-[9px] text-text-dim mt-0.5">
          <span className="text-down-red">DOWN: {(fairValue.fairProbDown * 100).toFixed(0)}%</span>
          <span className="text-[#ffeb3b]">▲ Strike</span>
          <span className="text-up-green">UP: {(fairValue.fairProbUp * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Auto-Kelly Sizer Chips & 1-Click Sizing */}
      <div className="border border-border-subtle bg-bg-base/60 p-2">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <div className="flex items-center gap-1 text-text-secondary">
            <Percent size={11} className="text-accent-primary" />
            <span>QUARTER-KELLY SIZER (f*)</span>
          </div>
          <span className="text-text-dim">
            Bankroll: <strong className="text-text-primary">${bankroll.toLocaleString()}</strong>
          </span>
        </div>

        {/* Sizing Chips */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { label: "$10", val: 10 },
            { label: "$25", val: 25 },
            { label: "$50", val: 50 },
            { label: `Kelly $${kellyRecDollars}`, val: kellyRecDollars },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => onStakeChange(chip.val)}
              className={`py-1 text-[10px] font-bold border transition-colors ${
                selectedStake === chip.val
                  ? "bg-accent-primary/20 border-accent-primary text-text-primary"
                  : "bg-bg-raised border-border-base text-text-secondary hover:border-border-interactive hover:text-text-primary"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Kelly Trade Trigger */}
        {hasEdge && (
          <button
            type="button"
            onClick={() => onSelectCall(w, fairValue.recommendation === "BUY_UP" ? "UP" : "DOWN", selectedStake)}
            className={`w-full py-1.5 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
              fairValue.recommendation === "BUY_UP"
                ? "bg-up-green text-black hover:bg-up-green/90"
                : "bg-down-red text-white hover:bg-down-red/90"
            }`}
          >
            <Zap size={12} />
            <span>
              EXPLOIT EDGE: BUY {fairValue.recommendation === "BUY_UP" ? "UP" : "DOWN"} (${selectedStake})
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
