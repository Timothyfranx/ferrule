import React from "react";
import type { TradingMode } from "../../types/index.js";

interface ModeBannerProps {
  mode: TradingMode;
  onToggleMode: () => void;
  bankroll: number;
  realBalance?: string;
  activeRound?: string;
}

export function ModeBanner({
  mode,
  onToggleMode,
  bankroll,
  realBalance = "0.00",
  activeRound,
}: ModeBannerProps) {
  const isPractice = mode === "practice";

  return (
    <div
      className={`w-full ${
        isPractice ? "bg-up-green text-[#0a0a0f]" : "bg-down-red text-[#0a0a0f]"
      } px-4 py-1.5 flex items-center justify-between font-mono font-bold tracking-tight text-[12px] shrink-0 select-none z-20 border-b border-border-base`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-block px-1.5 py-0.5 bg-[#0a0a0f] text-inherit text-[10px] font-bold">
          STATE
        </span>
        <span className="tracking-wide">
          {isPractice
            ? "MODE: PRACTICE — SIMULATED, ZERO CAPITAL AT RISK"
            : "MODE: REAL — DIRECT WALLET SIGNING, REAL CAPITAL AT RISK"}
        </span>
        {activeRound && (
          <span className="font-normal text-[#0a0a0f]/80 hidden md:inline">
            | ORACLE ROUND: #{activeRound} | CADENCE: MULTI-WINDOW
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <span className="font-normal hidden sm:inline">
          {isPractice ? (
            <>
              VIRTUAL BAL: <span className="font-bold">${bankroll.toFixed(2)} USDso</span>
            </>
          ) : (
            <>
              WALLET BAL: <span className="font-bold">${realBalance} tUSDC</span>
            </>
          )}
        </span>

        <button
          onClick={onToggleMode}
          className="bg-[#0a0a0f] px-2.5 py-0.5 text-[11px] font-mono font-semibold transition-colors border border-[#0a0a0f]"
          style={{ color: isPractice ? "#00e676" : "#ff5252" }}
        >
          {isPractice ? "SWITCH TO REAL →" : "← SWITCH TO PRACTICE"}
        </button>
      </div>
    </div>
  );
}
