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
      {/* 1. Pro Terminal */}
      <button
        onClick={() => {
          onChangeView("terminal");
          onChangeTerminalTab("terminal");
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "terminal" && terminalTab === "terminal"
            ? "text-cyan-eval font-bold bg-bg-base border-t-2 border-cyan-eval"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Terminal size={17} />
        <span>Terminal</span>
      </button>

      {/* 2. Markets */}
      <button
        onClick={() => {
          if (currentView === "basic") {
            onChangeBasicTab("markets");
          } else {
            onChangeView("terminal");
            onChangeTerminalTab("markets");
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          (currentView === "terminal" && terminalTab === "markets") ||
          (currentView === "basic" && basicTab === "markets")
            ? "text-cyan-eval font-bold bg-bg-base border-t-2 border-cyan-eval"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Layers size={17} />
        <span>Markets</span>
      </button>

      {/* 3. Strategy Library */}
      <button
        onClick={() => {
          onChangeView("terminal");
          onChangeTerminalTab("strategy");
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "terminal" && terminalTab === "strategy"
            ? "text-cyan-eval font-bold bg-bg-base border-t-2 border-cyan-eval"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Sliders size={17} />
        <span>Strategies</span>
      </button>

      {/* 4. Positions */}
      <button
        onClick={() => {
          if (currentView === "basic") {
            onChangeBasicTab("positions");
          } else {
            onChangeView("terminal");
            onChangeTerminalTab("positions");
          }
        }}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative ${
          (currentView === "basic" && basicTab === "positions") ||
          (currentView === "terminal" && terminalTab === "positions")
            ? "text-cyan-eval font-bold bg-bg-base border-t-2 border-cyan-eval"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <div className="relative">
          <Clock size={17} />
          {positionsCount > 0 && (
            <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-cyan-eval text-[#0a0a0f] text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {positionsCount}
            </span>
          )}
        </div>
        <span>Positions</span>
      </button>

      {/* 5. Overview / Landing */}
      <button
        onClick={() => onChangeView("landing")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          currentView === "landing"
            ? "text-text-primary font-bold bg-bg-base border-t-2 border-border-interactive"
            : "text-text-dim hover:text-text-secondary"
        }`}
      >
        <Home size={17} />
        <span>Overview</span>
      </button>
    </nav>
  );
}
