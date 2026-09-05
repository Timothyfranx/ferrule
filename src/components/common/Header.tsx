import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { TradingMode } from "../../types/index.js";

interface HeaderProps {
  activeTab: "terminal" | "markets" | "scorecard" | "positions";
  onSelectTab: (tab: "terminal" | "markets" | "scorecard" | "positions") => void;
  mode: TradingMode;
  bufferLineCount: number;
  activeWatchersCount: number;
  openWindowsCount: number;
}

export function Header({
  activeTab,
  onSelectTab,
  mode,
  bufferLineCount,
  activeWatchersCount,
  openWindowsCount,
}: HeaderProps) {
  const isPractice = mode === "practice";

  return (
    <header className="w-full bg-bg-raised border-b border-border-base flex items-center justify-between select-none shrink-0 h-10 px-2">
      {/* Left: VS Code / iTerm Style Tabs */}
      <div className="flex items-stretch h-full gap-0.5 overflow-x-auto text-[12px]">
        {/* Brand Mark */}
        <div className="flex items-center px-2 mr-1 text-text-dim border-r border-border-base gap-2">
          <span className="w-2.5 h-2.5 bg-border-base block"></span>
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-secondary">
            FERRULE // PRO
          </span>
        </div>

        {/* Tab 1: Terminal Shell */}
        <button
          onClick={() => onSelectTab("terminal")}
          className={`${
            activeTab === "terminal"
              ? isPractice ? "tab-active" : "tab-active-real"
              : "tab-inactive"
          } px-3 py-1.5 flex items-center gap-2 border-r border-border-base cursor-pointer transition-colors`}
        >
          <span className={isPractice ? "text-up-green text-[11px]" : "text-down-red text-[11px]"}>
            1:
          </span>
          <span className="font-mono font-medium">sh ({mode}:0)</span>
          {activeWatchersCount > 0 && (
            <span className="px-1 bg-border-base text-text-secondary text-[10px]">
              {activeWatchersCount}
            </span>
          )}
        </button>

        {/* Tab 2: Visual Market Grid */}
        <button
          onClick={() => onSelectTab("markets")}
          className={`${
            activeTab === "markets"
              ? isPractice ? "tab-active" : "tab-active-real"
              : "tab-inactive"
          } px-3 py-1.5 flex items-center gap-2 border-r border-border-base cursor-pointer transition-colors`}
        >
          <span className="text-text-dim text-[11px]">2:</span>
          <span className="font-mono">eval (live-markets)</span>
          <span className="text-text-dim text-[10px]">[{openWindowsCount}]</span>
        </button>

        {/* Tab 3: Calibration Scorecard */}
        <button
          onClick={() => onSelectTab("scorecard")}
          className={`${
            activeTab === "scorecard"
              ? isPractice ? "tab-active" : "tab-active-real"
              : "tab-inactive"
          } px-3 py-1.5 flex items-center gap-2 border-r border-border-base cursor-pointer transition-colors`}
        >
          <span className="text-neutral-gray text-[11px]">3:</span>
          <span className="font-mono">scorecard</span>
        </button>

        {/* Tab 4: Positions Ledger */}
        <button
          onClick={() => onSelectTab("positions")}
          className={`${
            activeTab === "positions"
              ? isPractice ? "tab-active" : "tab-active-real"
              : "tab-inactive"
          } px-3 py-1.5 flex items-center gap-2 border-r border-border-base cursor-pointer transition-colors`}
        >
          <span className="text-neutral-gray text-[11px]">4:</span>
          <span className="font-mono">positions</span>
        </button>
      </div>

      {/* Right: Telemetry & RainbowKit Connect */}
      <div className="flex items-center gap-3 text-[11px] font-mono text-text-dim pr-1">
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-text-secondary">RPC:</span>
          <span className="text-text-dim">somnia-shannon (50312)</span>
        </div>

        <div className="hidden md:block h-3 w-[1px] bg-border-base"></div>

        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-text-secondary">BUFFER:</span>
          <span className="text-text-primary tabular-nums">{bufferLineCount} lines</span>
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
