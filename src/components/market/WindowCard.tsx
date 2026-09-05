import React from "react";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import type { OpenWindow, CallDirection } from "../../types/index.js";

interface WindowCardProps {
  window: OpenWindow;
  onSelectCall: (window: OpenWindow, direction: CallDirection) => void;
}

export function WindowCard({ window: w, onSelectCall }: WindowCardProps) {
  const mins = Math.floor(w.secondsRemaining / 60);
  const secs = (w.secondsRemaining % 60).toString().padStart(2, "0");
  const timeLabel = `${mins}m ${secs}s`;

  return (
    <div className="bg-bg-raised border border-border-base p-4 flex flex-col justify-between hover:border-border-interactive transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[14px] text-text-primary">
            {w.asset}/USDC
          </span>
          <span className="px-1.5 py-0.5 bg-bg-base border border-border-base text-text-secondary font-mono text-[11px]">
            {w.intervalSec}s Window
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[12px] text-text-dim tabular-nums">
          <Clock size={12} />
          <span>{timeLabel}</span>
        </div>
      </div>

      {/* Crowd Lean Gauge */}
      <div className="my-2">
        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
          <span className="text-text-secondary">CROWD LEAN (CLOB)</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: w.upLeanPercent >= 50 ? "#00e676" : "#ff5252" }}
          >
            {w.upLeanPercent}% UP
          </span>
        </div>

        {/* Dual-color Bar */}
        <div className="w-full h-2 bg-[#ff5252] overflow-hidden flex">
          <div
            className="h-full bg-up-green transition-all duration-500"
            style={{ width: `${w.upLeanPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-text-dim mt-1">
          <span>YES / UP ({w.upLeanPercent}%)</span>
          <span>NO / DOWN ({100 - w.upLeanPercent}%)</span>
        </div>
      </div>

      {/* Book Depth Snapshot */}
      <div className="grid grid-cols-2 gap-2 my-2 text-[11px] font-mono bg-bg-base/60 p-2 border border-border-subtle">
        <div>
          <div className="text-up-green font-semibold mb-0.5">YES / UP</div>
          <div className="flex justify-between text-text-dim">
            <span>Bid:</span>
            <span className="text-text-primary tabular-nums">{w.bestUpBid?.toFixed(3) ?? "-"}</span>
          </div>
          <div className="flex justify-between text-text-dim">
            <span>Ask:</span>
            <span className="text-text-primary tabular-nums">{w.bestUpAsk?.toFixed(3) ?? "-"}</span>
          </div>
        </div>

        <div>
          <div className="text-down-red font-semibold mb-0.5">NO / DOWN</div>
          <div className="flex justify-between text-text-dim">
            <span>Bid:</span>
            <span className="text-text-primary tabular-nums">{w.bestDownBid?.toFixed(3) ?? "-"}</span>
          </div>
          <div className="flex justify-between text-text-dim">
            <span>Ask:</span>
            <span className="text-text-primary tabular-nums">{w.bestDownAsk?.toFixed(3) ?? "-"}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border-subtle">
        <button
          onClick={() => onSelectCall(w, "UP")}
          className="border border-up-green bg-transparent hover:bg-up-green hover:text-[#0a0a0f] text-up-green py-1.5 px-2 font-mono text-[12px] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <TrendingUp size={13} /> CALL UP
          </div>
          <span className="text-[10px] font-normal opacity-80 tabular-nums">
            Ask: {w.bestUpAsk ? `$${w.bestUpAsk.toFixed(3)}` : "Market"}
          </span>
        </button>

        <button
          onClick={() => onSelectCall(w, "DOWN")}
          className="border border-down-red bg-transparent hover:bg-down-red hover:text-[#0a0a0f] text-down-red py-1.5 px-2 font-mono text-[12px] font-bold flex flex-col items-center justify-center transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <TrendingDown size={13} /> CALL DOWN
          </div>
          <span className="text-[10px] font-normal opacity-80 tabular-nums">
            Ask: {w.bestDownAsk ? `$${w.bestDownAsk.toFixed(3)}` : "Market"}
          </span>
        </button>
      </div>
    </div>
  );
}
