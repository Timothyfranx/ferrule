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
    <footer className="w-full bg-bg-raised border-t border-border-base px-3 py-1 flex items-center justify-between text-[11px] font-mono text-text-dim shrink-0 select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-text-secondary">
          <span className={isPractice ? "text-up-green" : "text-down-red"}>●</span>
          <span>SESSION: {shortAddress}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <span>SHELL:</span>
          <span className="text-text-primary">bash / somnia bridge</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <span>ORACLES:</span>
          <span className="text-text-secondary">OracleHub (Synced)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">UTF-8</span>
        <span>LF</span>
        <span className="text-text-secondary">TERM_EMU: VT100</span>
        <span className={isPractice ? "text-up-green font-medium" : "text-down-red font-medium"}>
          {isPractice ? "PRACTICE ENVIRONMENT" : "REAL ENVIRONMENT"}
        </span>
      </div>
    </footer>
  );
}
