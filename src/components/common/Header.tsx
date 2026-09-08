import React from "react";
import { ConnectWalletButton } from "./ConnectWalletButton.js";
import { Layers, Terminal, Home, BarChart3, Clock, Sliders, HelpCircle } from "lucide-react";
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
  onOpenHowItWorks?: () => void;
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
  onOpenHowItWorks,
}: HeaderProps) {
  const isPractice = mode === "practice";

  const isTerminalActive = currentView === "terminal" && terminalTab === "terminal";
  const isMarketsActive =
    (currentView === "terminal" && terminalTab === "markets") ||
    (currentView === "basic" && basicTab === "markets");
  const isStrategiesActive = currentView === "terminal" && terminalTab === "strategy";
  const isPositionsActive =
    (currentView === "terminal" && terminalTab === "positions") ||
    (currentView === "basic" && basicTab === "positions");
  const isScorecardActive =
    (currentView === "terminal" && terminalTab === "scorecard") ||
    (currentView === "basic" && basicTab === "scorecard");
  const isOverviewActive = currentView === "landing";

  return (
    <header className="w-full bg-bg-raised border-b border-border-base flex items-center justify-between select-none shrink-0 h-12 px-3 sm:px-4 z-30">
      {/* Left: Clean Brand & Primary Navigation Tabs */}
      <div className="flex items-center h-full gap-3 sm:gap-5 overflow-x-auto no-scrollbar">
        {/* Brand Mark */}
        <button
          onClick={() => onChangeView("landing")}
          className="flex items-center gap-2 text-text-primary hover:text-white transition-colors cursor-pointer group shrink-0"
          title="Ferrule — Somnia DreamDEX Pro Terminal"
        >
          <div className="w-2.5 h-2.5 bg-cyan-eval group-hover:scale-110 transition-transform"></div>
          <span className="font-mono text-[13px] font-bold tracking-wider">
            FERRULE
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono text-cyan-eval bg-cyan-eval/10 border border-cyan-eval/30 px-1.5 py-0.5 tracking-wider uppercase rounded-[2px]">
            PRO TERMINAL
          </span>
        </button>

        {/* Primary Nav Links */}
        <nav className="flex items-center h-full gap-1 text-[11px] font-mono">
          {/* 1. Terminal (Hero Default) */}
          <button
            onClick={() => {
              onChangeView("terminal");
              onChangeTerminalTab("terminal");
            }}
            className={`h-7 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isTerminalActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <Terminal size={12} className={isTerminalActive ? "text-cyan-eval" : "text-text-dim"} />
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
            className={`h-7 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isMarketsActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <Layers size={12} className={isMarketsActive ? "text-cyan-eval" : "text-text-dim"} />
            <span>Markets</span>
            {openWindowsCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 bg-bg-surface border border-border-base text-text-secondary rounded-[2px] tabular-nums leading-none">
                {openWindowsCount}
              </span>
            )}
          </button>

          {/* 3. Strategies */}
          <button
            onClick={() => {
              onChangeView("terminal");
              onChangeTerminalTab("strategy");
            }}
            className={`h-7 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isStrategiesActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <Sliders size={12} className={isStrategiesActive ? "text-cyan-eval" : "text-text-dim"} />
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
            className={`h-7 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isPositionsActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <Clock size={12} className={isPositionsActive ? "text-cyan-eval" : "text-text-dim"} />
            <span>Positions</span>
            {positionsCount > 0 && (
              <span className="text-[10px] px-1 py-0.2 bg-cyan-eval/10 border border-cyan-eval/30 text-cyan-eval font-semibold rounded-[2px] tabular-nums leading-none">
                {positionsCount}
              </span>
            )}
          </button>

          {/* 5. Scorecard */}
          <button
            onClick={() => {
              if (currentView === "basic") {
                onChangeBasicTab("scorecard");
              } else {
                onChangeView("terminal");
                onChangeTerminalTab("scorecard");
              }
            }}
            className={`h-7 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isScorecardActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <BarChart3 size={12} className={isScorecardActive ? "text-cyan-eval" : "text-text-dim"} />
            <span>Scorecard</span>
          </button>

          {/* 6. Overview */}
          <button
            onClick={() => onChangeView("landing")}
            className={`hidden md:flex h-7 px-2.5 rounded-[3px] items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isOverviewActive
                ? "bg-bg-base text-text-primary font-bold border border-border-interactive shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-text-dim hover:text-text-secondary hover:bg-bg-base/50 border border-transparent"
            }`}
          >
            <Home size={12} className={isOverviewActive ? "text-cyan-eval" : "text-text-dim"} />
            <span>Overview</span>
          </button>
        </nav>
      </div>

      {/* Right: How It Works + Layout Switcher + Mode & Balance Capsule + Connect Wallet */}
      <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px] shrink-0">
        {/* How It Works Guide Trigger */}
        {onOpenHowItWorks && (
          <button
            onClick={onOpenHowItWorks}
            className="h-7 px-2 sm:px-2.5 rounded-[3px] flex items-center gap-1.5 text-[11px] font-mono text-text-secondary hover:text-cyan-eval bg-bg-base border border-border-base hover:border-cyan-eval/50 transition-all cursor-pointer shadow-xs shrink-0"
            title="Open Ferrule Protocol & System Architecture Guide"
          >
            <HelpCircle size={12} className="text-cyan-eval" />
            <span className="hidden sm:inline">How It Works</span>
          </button>
        )}

        {/* Layout Switcher Pill */}
        <div className="hidden lg:flex items-center bg-bg-base border border-border-base rounded-[3px] p-0.5 text-[10px] font-mono">
          <button
            onClick={() => {
              onChangeView("terminal");
              onChangeTerminalTab("terminal");
            }}
            className={`px-2 py-0.5 rounded-[2px] transition-all cursor-pointer ${
              currentView === "terminal"
                ? "bg-bg-raised text-cyan-eval font-semibold border border-cyan-eval/30 shadow-xs"
                : "text-text-dim hover:text-text-secondary"
            }`}
            title="Switch to Pro Terminal Shell"
          >
            PRO SHELL
          </button>
          <button
            onClick={() => {
              onChangeView("basic");
              onChangeBasicTab("markets");
            }}
            className={`px-2 py-0.5 rounded-[2px] transition-all cursor-pointer ${
              currentView === "basic"
                ? "bg-bg-raised text-up-green font-semibold border border-up-green/30 shadow-xs"
                : "text-text-dim hover:text-text-secondary"
            }`}
            title="Switch to Basic Markets View"
          >
            BASIC
          </button>
        </div>

        {/* Mode & Balance Switcher Capsule */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            type="button"
            className={`h-7 px-2.5 hidden sm:flex items-center gap-2 border rounded-[3px] transition-all cursor-pointer ${
              isPractice
                ? "bg-bg-base border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary"
                : "bg-down-red/10 border-down-red/40 hover:border-down-red text-down-red"
            }`}
            title={
              isPractice
                ? "Practice Simulation Mode ($1,000 balance). Click to switch to Real on-chain trading."
                : "Real Mode Active. Live capital at risk. Click to return to Practice simulation."
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPractice ? "bg-up-green" : "bg-down-red animate-pulse"
              }`}
            ></span>
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              {isPractice ? "SIM" : "REAL"}
            </span>
            <span
              className={`font-bold tabular-nums ${
                isPractice ? "text-text-primary" : "text-down-red"
              }`}
            >
              {isPractice
                ? `$${bankroll.toFixed(0)}`
                : `$${realBalance}`}
            </span>
          </button>
        )}

        {/* Dedicated Web3 Wallet Connection & Network Switcher */}
        <ConnectWalletButton />
      </div>
    </header>
  );
}
