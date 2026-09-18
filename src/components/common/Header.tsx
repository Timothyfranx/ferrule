import React from "react";
import { ConnectWalletButton } from "./ConnectWalletButton.js";
import { HelpCircle, Bot, Waves, LayoutGrid, Terminal } from "lucide-react";
import type { TradingMode } from "../../types/index.js";

export type FerrArcNavTab = "markets" | "terminal" | "agent" | "stream";

export interface HeaderProps {
  activeTab: FerrArcNavTab;
  onChangeTab: (tab: FerrArcNavTab) => void;
  mode: TradingMode;
  onToggleMode?: () => void;
  bankroll?: number;
  realBalance?: string;
  onOpenHowItWorks?: () => void;
}

export function Header({
  activeTab,
  onChangeTab,
  mode,
  onToggleMode,
  bankroll = 1000,
  realBalance = "0.00",
  onOpenHowItWorks,
}: HeaderProps) {
  const isPractice = mode === "practice";

  return (
    <header className="w-full bg-[#080B10] border-b border-[#1E293B] flex items-center justify-between select-none shrink-0 h-12 px-4 z-30 font-sans">
      {/* LEFT: BRAND MARK & MINIMALIST TABS */}
      <div className="flex items-center gap-6">
        {/* Brand Mark */}
        <button
          type="button"
          onClick={() => onChangeTab("markets")}
          className="flex items-center gap-2 text-white hover:text-white transition-opacity cursor-pointer group"
          title="FerrArc — Binary Markets on Arc L1"
        >
          <div className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] group-hover:scale-125 transition-transform"></div>
          <span className="font-mono text-[13px] font-bold tracking-wider text-white">
            FERRARC
          </span>
          <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline-block tracking-wider">
            ARC L1
          </span>
        </button>

        {/* Calm Navigation Tabs */}
        <nav className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => onChangeTab("markets")}
            className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "markets"
                ? "bg-[#0D121D] text-[#00E5FF] font-bold border border-[#1E293B]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <LayoutGrid size={13} />
            <span>Markets</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("terminal")}
            className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "terminal"
                ? "bg-[#0D121D] text-[#00E5FF] font-bold border border-[#1E293B]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <Terminal size={13} />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("agent")}
            className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "agent"
                ? "bg-[#0D121D] text-[#00E5FF] font-bold border border-[#1E293B]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <Bot size={13} />
            <span>Agent</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("stream")}
            className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "stream"
                ? "bg-[#0D121D] text-[#00E5FF] font-bold border border-[#1E293B]"
                : "text-[#64748B] hover:text-[#94A3B8]"
            }`}
          >
            <Waves size={13} />
            <span>Stream</span>
          </button>
        </nav>
      </div>

      {/* RIGHT: QUIET TELEMETRY & WALLET */}
      <div className="flex items-center gap-3">
        {/* Guide Link */}
        {onOpenHowItWorks && (
          <button
            type="button"
            onClick={onOpenHowItWorks}
            className="text-[#64748B] hover:text-white transition-colors cursor-pointer hidden md:flex items-center gap-1 text-xs font-mono"
            title="View Protocol Architecture & Guide"
          >
            <HelpCircle size={14} />
            <span>Guide</span>
          </button>
        )}

        {/* Mode / Balance Capsule */}
        {onToggleMode && (
          <button
            type="button"
            onClick={onToggleMode}
            className="h-7 px-2.5 hidden sm:flex items-center gap-2 bg-[#0D121D] border border-[#1E293B] hover:border-[#334155] rounded text-xs font-mono transition-all cursor-pointer"
            title="Toggle between Simulation and Real on-chain capital"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPractice ? "bg-[#10B981]" : "bg-[#EF4444] animate-pulse"
              }`}
            ></span>
            <span className="text-[#64748B] font-semibold text-[10px] uppercase">
              {isPractice ? "SIM" : "REAL"}
            </span>
            <span className="text-white font-bold tabular-nums">
              {isPractice ? `$${bankroll.toFixed(0)}` : `$${realBalance}`}
            </span>
          </button>
        )}

        {/* RainbowKit Wallet Button (Arc-styled) */}
        <ConnectWalletButton />
      </div>
    </header>
  );
}
