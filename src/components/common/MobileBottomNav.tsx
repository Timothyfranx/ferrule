import React from "react";
import { TrendingUp, Bot, Waves, HelpCircle } from "lucide-react";
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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#080B10] border-t border-[#1E293B] z-50 flex items-center justify-around font-mono text-[11px] select-none">
      {/* 1. Trade */}
      <button
        type="button"
        onClick={() => onChangeTab("trade")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "trade"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <TrendingUp size={18} />
        <span>Trade</span>
      </button>

      {/* 2. Agent */}
      <button
        type="button"
        onClick={() => onChangeTab("agent")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "agent"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Bot size={18} />
        <span>Agent</span>
      </button>

      {/* 3. Stream */}
      <button
        type="button"
        onClick={() => onChangeTab("stream")}
        className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
          activeTab === "stream"
            ? "text-[#00E5FF] font-bold bg-[#0D121D] border-t-2 border-[#00E5FF]"
            : "text-[#64748B] hover:text-[#94A3B8]"
        }`}
      >
        <Waves size={18} />
        <span>Stream</span>
      </button>

      {/* 4. Guide */}
      {onOpenHowItWorks && (
        <button
          type="button"
          onClick={onOpenHowItWorks}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors text-[#64748B] hover:text-[#94A3B8]"
        >
          <HelpCircle size={18} />
          <span>Guide</span>
        </button>
      )}
    </nav>
  );
}
