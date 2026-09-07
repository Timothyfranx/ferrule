import React from "react";
import type { TradingMode } from "../../types/index.js";
import { AlertTriangle } from "lucide-react";

interface ModeBannerProps {
  mode: TradingMode;
  onToggleMode: () => void;
  bankroll: number;
  realBalance?: string;
  activeRound?: string;
  currentView?: "landing" | "basic" | "terminal";
  onSwitchView?: (view: "landing" | "basic" | "terminal") => void;
}

export function ModeBanner({
  mode,
  onToggleMode,
}: ModeBannerProps) {
  // In Practice mode, the clean navbar already clearly indicates Practice status and balance.
  if (mode === "practice") {
    return null;
  }

  // In Real mode, display a sleek, institutional-grade risk notice.
  return (
    <div className="w-full bg-down-red/15 border-b border-down-red/30 px-4 py-1.5 flex items-center justify-between font-mono text-[11px] text-down-red z-20 select-none shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-down-red rounded-full animate-pulse inline-block"></span>
        <span className="font-bold tracking-wide flex items-center gap-1">
          <AlertTriangle size={12} />
          REAL CAPITAL MODE ACTIVE
        </span>
        <span className="text-text-secondary hidden md:inline">
          — Live on-chain orders on Somnia Shannon (50312). Capital is at risk.
        </span>
      </div>

      <button
        onClick={onToggleMode}
        className="px-2.5 py-0.5 bg-down-red text-[#0a0a0f] font-bold hover:bg-down-red/90 transition-colors text-[10px] uppercase cursor-pointer"
      >
        ← Return to Practice Simulation
      </button>
    </div>
  );
}
