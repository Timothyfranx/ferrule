import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Layers, Terminal, Home, BarChart3, Clock, ShieldCheck, Zap } from "lucide-react";
import type { TradingMode } from "../../types/index.js";

export type AppView = "landing" | "basic" | "terminal";
export type BasicTab = "markets" | "scorecard" | "positions";
export type TerminalTab = "terminal" | "markets" | "strategy" | "scorecard" | "positions";

interface HeaderProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  basicTab: BasicTab;
  onChangeBasicTab: (tab: BasicTab) => void;
  terminalTab: TerminalTab;
  onChangeTerminalTab: (tab: TerminalTab) => void;
  mode: TradingMode;
  bufferLineCount: number;
  activeWatchersCount: number;
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
  bufferLineCount,
  activeWatchersCount,
  openWindowsCount,
  positionsCount,
}: HeaderProps) {
  const isPractice = mode === "practice";

  return (
    <header className="w-full bg-bg-raised border-b border-border-base flex items-center justify-between select-none shrink-0 h-11 px-3">
      {/* Left: Brand & Primary Experience Switcher */}
      <div className="flex items-center h-full gap-2 overflow-x-auto text-[12px]">
        {/* Brand Mark */}
        <button 
          onClick={() => onChangeView("landing")}
          className="flex items-center px-2 py-1 mr-1 text-text-primary hover:text-white border-r border-border-base gap-2 cursor-pointer"
          title="Return to Landing Page"
        >
          <span className="w-2.5 h-2.5 bg-up-green block"></span>
          <span className="font-mono text-[12px] font-bold tracking-wider">
            FERRULE
          </span>
          <span className="text-[10px] font-mono text-text-dim hidden sm:inline">DREAMDEX</span>
        </button>

        {/* View Switcher Capsule (Landing | Basic | Pro Terminal) */}
        <div className="flex items-center bg-bg-base border border-border-base p-0.5 mr-2">
          <button
            onClick={() => onChangeView("landing")}
            className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              currentView === "landing"
                ? "bg-bg-raised text-text-primary font-semibold"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            <Home size={12} />
            <span className="hidden md:inline">Overview</span>
          </button>

          <button
            onClick={() => onChangeView("basic")}
            className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              currentView === "basic"
                ? "bg-up-green text-[#0a0a0f] font-bold"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            <Layers size={12} />
            <span>Basic</span>
          </button>

          <button
            onClick={() => onChangeView("terminal")}
            className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              currentView === "terminal"
                ? "bg-cyan-eval text-[#0a0a0f] font-bold"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            <Terminal size={12} />
            <span>Pro Terminal</span>
          </button>
        </div>

        {/* Secondary Contextual Tabs based on active view */}
        {currentView === "basic" && (
          <div className="flex items-center h-full gap-1 border-l border-border-base pl-2">
            <button
              onClick={() => onChangeBasicTab("markets")}
              className={`px-3 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                basicTab === "markets"
                  ? "border-up-green text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span>Live Markets</span>
              <span className="text-[10px] px-1 bg-border-base text-text-secondary">
                {openWindowsCount}
              </span>
            </button>

            <button
              onClick={() => onChangeBasicTab("scorecard")}
              className={`px-3 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                basicTab === "scorecard"
                  ? "border-up-green text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span>Scorecard</span>
            </button>

            <button
              onClick={() => onChangeBasicTab("positions")}
              className={`px-3 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                basicTab === "positions"
                  ? "border-up-green text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span>Positions</span>
              {positionsCount > 0 && (
                <span className="text-[10px] px-1 bg-border-base text-text-secondary">
                  {positionsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {currentView === "terminal" && (
          <div className="flex items-center h-full gap-1 border-l border-border-base pl-2">
            <button
              onClick={() => onChangeTerminalTab("terminal")}
              className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                terminalTab === "terminal"
                  ? "border-cyan-eval text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span className="text-cyan-eval">1:</span>
              <span>sh ({mode}:0)</span>
            </button>

            <button
              onClick={() => onChangeTerminalTab("markets")}
              className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                terminalTab === "markets"
                  ? "border-cyan-eval text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span className="text-text-dim">2:</span>
              <span>eval (depth)</span>
              <span className="text-[10px] text-text-dim">[{openWindowsCount}]</span>
            </button>

            <button
              onClick={() => onChangeTerminalTab("strategy")}
              className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                terminalTab === "strategy"
                  ? "border-cyan-eval text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span className="text-cyan-eval">3:</span>
              <span>Strategy Library</span>
              <span className="hidden sm:inline ml-1 px-1 py-0.2 bg-bg-base text-text-dim text-[9px] border border-border-base">
                PERSISTED
              </span>
            </button>

            <button
              onClick={() => onChangeTerminalTab("scorecard")}
              className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                terminalTab === "scorecard"
                  ? "border-cyan-eval text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span className="text-text-dim">4:</span>
              <span>scorecard</span>
            </button>

            <button
              onClick={() => onChangeTerminalTab("positions")}
              className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 border-b-2 transition-colors ${
                terminalTab === "positions"
                  ? "border-cyan-eval text-text-primary font-medium"
                  : "border-transparent text-text-dim hover:text-text-secondary"
              }`}
            >
              <span className="text-text-dim">5:</span>
              <span>positions</span>
              {positionsCount > 0 && (
                <span className="text-[10px] px-1 bg-border-base text-text-secondary">
                  {positionsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right: Network status & RainbowKit Connect */}
      <div className="flex items-center gap-3 text-[11px] font-mono text-text-dim pr-1">
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-text-secondary">RPC:</span>
          <span className="text-text-dim">somnia-shannon</span>
        </div>

        <div className="hidden sm:block h-3 w-[1px] bg-border-base"></div>

        {/* Live Pulse */}
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="w-2 h-2 bg-up-green inline-block"></span>
          <span className="text-text-primary text-[10px]">LIVE // 14ms</span>
        </div>

        {/* RainbowKit Wallet Button */}
        <div className="ml-2 scale-90 origin-right">
          <ConnectButton
            chainStatus="none"
            showBalance={false}
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
          />
        </div>
      </div>
    </header>
  );
}
