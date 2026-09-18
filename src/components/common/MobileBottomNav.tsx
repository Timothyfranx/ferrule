import React from "react";
import { LayoutGrid, Terminal, Bot, Waves, Home } from "lucide-react";
import type { FerrArcNavTab } from "./Header.js";
import type { TradingMode } from "../../types/index.js";

interface MobileBottomNavProps {
  activeTab: FerrArcNavTab;
  onChangeTab: (tab: FerrArcNavTab) => void;
  mode?: TradingMode;
  onOpenHowItWorks?: () => void;
}

export function MobileBottomNav({
  activeTab,
  onChangeTab,
  onOpenHowItWorks,
}: MobileBottomNavProps) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#080B10] border-t border-[#1E293B] z-50 flex items-center justify-around font-mono text-[10px] select-none">
      {/* 1. Home */}
      <button
        type="button"
        onClick={() => onChangeTab("overview")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "overview"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Home size={16} />
        <span>Home</span>
      </button>

      {/* 2. Markets */}
      <button
        type="button"
        onClick={() => onChangeTab("markets")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "markets"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <LayoutGrid size={16} />
        <span>Markets</span>
      </button>

      {/* 3. Terminal */}
      <button
        type="button"
        onClick={() => onChangeTab("terminal")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "terminal"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Terminal size={16} />
        <span>Terminal</span>
      </button>

      {/* 4. Agent */}
      <button
        type="button"
        onClick={() => onChangeTab("agent")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "agent"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Bot size={16} />
        <span>Agent</span>
      </button>

      {/* 5. Stream */}
      <button
        type="button"
        onClick={() => onChangeTab("stream")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "stream"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Waves size={16} />
        <span>Stream</span>
      </button>
    </nav>
  );
}
