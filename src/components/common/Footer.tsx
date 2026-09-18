import React from "react";
import type { TradingMode } from "../../types/index.js";

interface FooterProps {
  mode: TradingMode;
  accountAddress?: string | null;
}

export function Footer({ mode, accountAddress }: FooterProps) {
  const isPractice = mode === "practice";
  const shortAddress = accountAddress
    ? `${accountAddress.slice(0, 6)}..${accountAddress.slice(-4)}`
    : "GUEST-SANDBOX";

  return (
    <footer className="w-full bg-[#080B10] border-t border-[#1E293B] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-[#64748B] shrink-0 select-none">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-[#94A3B8]">
          <span className={`w-1.5 h-1.5 rounded-full ${isPractice ? "bg-[#10B981]" : "bg-[#EF4444]"}`}></span>
          <span>SESSION: {shortAddress}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5">
          <span>NETWORK:</span>
          <span className="text-[#F8FAFC]">Arc L1 Mainnet (5042)</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <span>ORACLE:</span>
          <span className="text-[#00E5FF]">Pyth Network (Push Feed)</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5">
          <span>SETTLEMENT:</span>
          <span className="text-[#94A3B8]">Native 18-dec USDC</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:inline text-[#64748B]">LATENCY: ~120ms</span>
        <span className={isPractice ? "text-[#10B981] font-medium" : "text-[#EF4444] font-medium"}>
          {isPractice ? "PRACTICE ENVIRONMENT" : "MAINNET CAPITAL ACTIVE"}
        </span>
      </div>
    </footer>
  );
}
