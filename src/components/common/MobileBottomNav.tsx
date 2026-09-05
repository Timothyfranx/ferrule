import React from "react";
import { Home, Layers, Terminal, Sliders, BarChart3, Clock } from "lucide-react";
import type { AppView, BasicTab, TerminalTab } from "./Header.js";
import type { TradingMode } from "../../types/index.js";

interface MobileBottomNavProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  basicTab: BasicTab;
  onChangeBasicTab: (tab: BasicTab) => void;
  terminalTab: TerminalTab;
  onChangeTerminalTab: (tab: TerminalTab) => void;
  mode: TradingMode;
  positionsCount: number;
}

export function MobileBottomNav({
  currentView,
  onChangeView,
  basicTab,
  onChangeBasicTab,
  terminalTab,
  onChangeTerminalTab,
  mode,
  positionsCount,
}: MobileBottomNavProps) {
  const isPractice = mode === "practice";

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-bg-raised border-t border-border-base z-50 flex items-center justify-around font-mono text-[10px] select-none">
      {/* 1. Overview / Landing */}
      <button
        onClick={() => onChangeView("landing")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "landing"
            ? "text-text-primary font-bold border-t-2 border-primary bg-bg-base"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Home size={18} />
        <span>Overview</span>
      </button>

      {/* 2. Basic Market */}
      <button
        onClick={() => {
          onChangeView("basic");
          onChangeBasicTab("markets");
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "basic" && basicTab === "markets"
            ? "text-up-green font-bold border-t-2 border-up-green bg-bg-base"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Layers size={18} />
        <span>Basic</span>
      </button>

      {/* 3. Pro Terminal */}
      <button
        onClick={() => {
          onChangeView("terminal");
          onChangeTerminalTab("terminal");
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "terminal" && terminalTab === "terminal"
            ? "text-cyan-eval font-bold border-t-2 border-cyan-eval bg-bg-base"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Terminal size={18} />
        <span>Terminal</span>
      </button>

      {/* 4. Strategy Library */}
      <button
        onClick={() => {
          onChangeView("terminal");
          onChangeTerminalTab("strategy");
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "terminal" && terminalTab === "strategy"
            ? "text-cyan-eval font-bold border-t-2 border-cyan-eval bg-bg-base"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Sliders size={18} />
        <span>Strategies</span>
      </button>

      {/* 5. Scorecard / Positions */}
      <button
        onClick={() => {
          if (currentView === "terminal") {
            onChangeTerminalTab("scorecard");
          } else {
            onChangeView("basic");
            onChangeBasicTab("scorecard");
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          (currentView === "basic" && basicTab === "scorecard") ||
          (currentView === "terminal" && terminalTab === "scorecard")
            ? "text-text-primary font-bold border-t-2 border-primary bg-bg-base"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <BarChart3 size={18} />
        <span>Scorecard</span>
      </button>
    </nav>
  );
}
