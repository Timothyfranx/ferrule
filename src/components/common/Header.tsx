import React from "react";
import { ConnectWalletButton } from "./ConnectWalletButton.js";
import { Layers, Terminal, Home, BarChart3, Clock, Sliders } from "lucide-react";
import type { TradingMode } from "../../types/index.js";

export type AppView = "landing" | "basic" | "terminal";
export type BasicTab = "markets" | "scorecard" | "positions";
export type TerminalTab = "terminal" | "markets" | "strategy" | "scorecard" | "positions";

export interface HeaderProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  basicTab: BasicTab;
  onChangeBasicTab: (tab: BasicTab) => void;
  terminalTab: TerminalTab;
  onChangeTerminalTab: (tab: TerminalTab) => void;
  mode: TradingMode;
  onToggleMode?: () => void;
  bankroll?: number;
  realBalance?: string;
  bufferLineCount?: number;
  activeWatchersCount?: number;
  openWindowsCount: number;
  positionsCount: number;
}

export function Header({
  currentView,
  onChangeView,
  basicTab,
  onChangeBasicTab,
  terminalTab,
  onChangeTerminalTab,
  mode,
  onToggleMode,
  bankroll = 1000,
  realBalance = "0.00",
  openWindowsCount,
  positionsCount,
}: HeaderProps) {
  const isPractice = mode === "practice";

  const isMarketsActive = currentView === "basic" && basicTab === "markets";
  const isTerminalActive = currentView === "terminal" && terminalTab === "terminal";
  const isStrategiesActive = currentView === "terminal" && terminalTab === "strategy";
  const isScorecardActive =
    (currentView === "basic" && basicTab === "scorecard") ||
    (currentView === "terminal" && terminalTab === "scorecard");
  const isPositionsActive =
    (currentView === "basic" && basicTab === "positions") ||
    (currentView === "terminal" && terminalTab === "positions");
  const isOverviewActive = currentView === "landing";

  return (
    <header className="w-full bg-bg-raised border-b border-border-base flex items-center justify-between select-none shrink-0 h-12 px-4 z-30">
      {/* Left: Clean Brand & Primary Navigation Tabs */}
      <div className="flex items-center h-full gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        {/* Brand Mark */}
        <button
          onClick={() => onChangeView("landing")}
          className="flex items-center gap-2 text-text-primary hover:text-white transition-colors cursor-pointer group shrink-0"
          title="Ferrule — Somnia DreamDEX Terminal"
        >
          <div className="w-2.5 h-2.5 bg-up-green group-hover:scale-110 transition-transform"></div>
          <span className="font-mono text-[13px] font-bold tracking-wider">
            FERRULE
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono text-cyan-eval bg-cyan-eval/10 border border-cyan-eval/25 px-1.5 py-0.5 tracking-wider uppercase">
            CLOB
          </span>
        </button>

        {/* Primary Nav Links */}
        <nav className="flex items-center h-full gap-1 sm:gap-2 text-[12px] font-mono">
          {/* 1. Markets */}
          <button
            onClick={() => {
              onChangeView("basic");
              onChangeBasicTab("markets");
            }}
            className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isMarketsActive
                ? "border-up-green text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <Layers size={13} />
            <span>Markets</span>
            {openWindowsCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 bg-bg-base border border-border-base text-text-secondary rounded-none tabular-nums">
                {openWindowsCount}
              </span>
            )}
          </button>

          {/* 2. Terminal */}
          <button
            onClick={() => {
              onChangeView("terminal");
              onChangeTerminalTab("terminal");
            }}
            className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isTerminalActive
                ? "border-cyan-eval text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <Terminal size={13} />
            <span>Terminal</span>
          </button>

          {/* 3. Strategies */}
          <button
            onClick={() => {
              onChangeView("terminal");
              onChangeTerminalTab("strategy");
            }}
            className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isStrategiesActive
                ? "border-cyan-eval text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <Sliders size={13} />
            <span>Strategies</span>
          </button>

          {/* 4. Scorecard */}
          <button
            onClick={() => {
              onChangeView("basic");
              onChangeBasicTab("scorecard");
            }}
            className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isScorecardActive
                ? "border-up-green text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <BarChart3 size={13} />
            <span>Scorecard</span>
          </button>

          {/* 5. Positions */}
          <button
            onClick={() => {
              onChangeView("basic");
              onChangeBasicTab("positions");
            }}
            className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isPositionsActive
                ? "border-up-green text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <Clock size={13} />
            <span>Positions</span>
            {positionsCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 bg-up-green/10 border border-up-green/30 text-up-green font-semibold rounded-none tabular-nums">
                {positionsCount}
              </span>
            )}
          </button>

          {/* 6. Overview */}
          <button
            onClick={() => onChangeView("landing")}
            className={`hidden md:flex h-full px-2.5 sm:px-3 items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              isOverviewActive
                ? "border-text-primary text-text-primary font-bold"
                : "border-transparent text-text-dim hover:text-text-secondary"
            }`}
          >
            <Home size={13} />
            <span>Overview</span>
          </button>
        </nav>
      </div>

      {/* Right: Mode & Balance Capsule + Connect Wallet */}
      <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
        {/* Mode & Balance Switcher Capsule */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            type="button"
            className={`h-8 px-2.5 hidden sm:flex items-center gap-2 border transition-colors cursor-pointer ${
              isPractice
                ? "bg-bg-base border-border-base hover:border-up-green text-text-secondary hover:text-text-primary"
                : "bg-down-red/10 border-down-red/40 hover:border-down-red text-down-red"
            }`}
            title={
              isPractice
                ? "Practice Mode active (simulated capital). Click to switch to Real Mode."
                : "Real Mode active (real capital at risk). Click to switch to Practice Mode."
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPractice ? "bg-up-green" : "bg-down-red animate-pulse"
              }`}
            ></span>
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isPractice ? "Practice" : "Real"}
            </span>
            <span className="text-text-dim">|</span>
            <span
              className={`font-bold tabular-nums ${
                isPractice ? "text-up-green" : "text-down-red"
              }`}
            >
              {isPractice
                ? `$${bankroll.toFixed(2)}`
                : `$${realBalance} USDC`}
            </span>
          </button>
        )}

        {/* Dedicated Web3 Wallet Connection & Network Switcher */}
        <ConnectWalletButton />
      </div>
    </header>
  );
}
