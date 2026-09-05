import React, { useState } from "react";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  Layers,
  Terminal,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import type { OpenWindow, CallDirection, Call, TradingMode } from "../../types/index.js";

interface BasicMarketViewProps {
  windows: OpenWindow[];
  onSelectCall: (window: OpenWindow, direction: CallDirection, defaultStake?: number) => void;
  onSwitchToPro: () => void;
  recentCalls: Call[];
  loading: boolean;
  mode: TradingMode;
}

export function BasicMarketView({
  windows,
  onSelectCall,
  onSwitchToPro,
  recentCalls,
  loading,
  mode,
}: BasicMarketViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-secondary font-mono text-xs">
        <span className="w-3 h-3 bg-up-green animate-pulse mb-3"></span>
        <span>Scanning Somnia DreamDEX CLOB on-chain windows...</span>
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-secondary font-mono text-xs">
        <span>No active trading windows within safety threshold (&gt;45s). Awaiting next rolling window...</span>
      </div>
    );
  }

  const activeWindow = windows[Math.min(selectedIndex, windows.length - 1)] || windows[0];
  const upPayout = (1 / Math.max(0.01, activeWindow.upLeanProbability)).toFixed(2);
  const downPayout = (1 / Math.max(0.01, 1 - activeWindow.upLeanProbability)).toFixed(2);

  const mins = Math.floor(activeWindow.secondsRemaining / 60);
  const secs = activeWindow.secondsRemaining % 60;
  const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 sm:py-8 max-w-4xl mx-auto w-full overflow-y-auto select-text pb-20 sm:pb-8">
      {/* 1. Market Window Tabs / Selector */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-flat text-xs font-mono">
          {windows.map((w, idx) => (
            <button
              key={w.marketId}
              onClick={() => setSelectedIndex(idx)}
              className={`px-3 py-1.5 rounded-[3px] border transition-colors flex items-center gap-2 shrink-0 ${
                idx === selectedIndex
                  ? "bg-bg-raised border-up-green text-text-primary font-bold"
                  : "bg-bg-base border-border-flat text-text-dim hover:text-text-secondary"
              }`}
            >
              <span>{w.asset}-{(w.intervalSec / 60).toFixed(0)}m</span>
              <span className="text-[10px] text-up-green">{w.upLeanPercent}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Market Header Card: Asset & Target Context */}
      <div className="w-full max-w-xl text-center mb-6">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono text-text-secondary uppercase tracking-wider mb-2">
          <span className="w-2 h-2 rounded-full bg-up-green inline-block animate-pulse"></span>
          <span>LIVE ROUND #{activeWindow.marketId.slice(0, 8)}</span>
          <span className="text-border-flat">|</span>
          <span>{activeWindow.asset}/USDC • {(activeWindow.intervalSec / 60).toFixed(0)}-MIN WINDOW</span>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-2xl sm:text-3xl font-bold font-mono text-text-primary tracking-tight">
            {activeWindow.asset} Binary Event Contract
          </span>
        </div>
        <p className="text-xs text-text-dim font-mono">
          Somnia Shannon Testnet (50312) • DreamDEX Central Limit Order Book
        </p>
      </div>

      {/* 3. Central Tension Lean Indicator & Countdown Card (Stitch: ferrule_live_market_basic) */}
      <div className="w-full max-w-xl bg-bg-raised border border-border-flat rounded-md p-6 sm:p-8 mb-6">
        {/* Big Digital Countdown Timer */}
        <div className="text-center mb-6">
          <div className="text-[10px] uppercase tracking-widest font-mono text-text-dim mb-1">
            Window Closes In
          </div>
          <div className="text-5xl sm:text-6xl font-bold font-mono tracking-wider text-text-primary">
            {timeFormatted}
            <span className="text-xl sm:text-2xl text-neutral-gray font-normal">s</span>
          </div>
          <div className="text-[11px] text-neutral-gray font-mono mt-1">
            Lock cutoff at 00:45 (Anti-frontrun shield active)
          </div>
        </div>

        {/* UP / DOWN LEAN INDICATOR (Horizontal bar under tension — nod to Ferrule clamp joint) */}
        <div className="w-full">
          {/* Lean Pressure Labels */}
          <div className="flex items-center justify-between text-xs font-mono font-semibold mb-2">
            <div className="flex items-center gap-1 text-up-green">
              <TrendingUp size={15} />
              <span>UP LEAN {activeWindow.upLeanPercent}%</span>
            </div>
            <div className="text-[10px] uppercase font-mono text-text-dim tracking-widest hidden sm:block">
              Joint Tension [{activeWindow.upLeanPercent} // {100 - activeWindow.upLeanPercent}]
            </div>
            <div className="flex items-center gap-1 text-down-red">
              <span>{100 - activeWindow.upLeanPercent}% DOWN</span>
              <TrendingDown size={15} />
            </div>
          </div>

          {/* Tension Bar Container: Nod to Ferrule (clamp/ferrule holding two opposing ends under tension) */}
          <div className="relative w-full h-8 bg-bg-base border border-border-flat rounded-[4px] overflow-hidden flex p-1">
            {/* Green Lean Bar */}
            <div 
              className="h-full bg-up-green rounded-[2px] transition-all duration-300" 
              style={{ width: `${activeWindow.upLeanPercent}%` }}
            />
            
            {/* Red Down Bar */}
            <div 
              className="h-full bg-down-red rounded-[2px] transition-all duration-300" 
              style={{ width: `${100 - activeWindow.upLeanPercent}%` }}
            />

            {/* Central Tension Clamp / Ferrule Pivot Marker */}
            <div 
              className="absolute top-0 bottom-0 -ml-[10px] w-5 flex items-center justify-center pointer-events-none z-10 transition-all duration-300"
              style={{ left: `${activeWindow.upLeanPercent}%` }}
            >
              <div className="w-2.5 h-full bg-bg-raised border border-text-primary flex flex-col justify-between py-0.5 items-center">
                <span className="w-1 h-0.5 bg-text-primary block"></span>
                <span className="w-1 h-0.5 bg-text-primary block"></span>
              </div>
            </div>
          </div>

          {/* Tension Subtext & Sentiment description */}
          <div className="flex items-center justify-between text-[11px] font-mono text-text-dim mt-2">
            <span>
              {activeWindow.upLeanPercent >= 50 ? "Majority crowd leaning Higher" : "Majority crowd leaning Lower"}
            </span>
            <span className="text-right">
              Best Bid: {activeWindow.bestUpBid?.toFixed(3) ?? "—"} / Ask: {activeWindow.bestUpAsk?.toFixed(3) ?? "—"}
            </span>
          </div>
        </div>

        {/* Quick Action Call Buttons (Up / Down) */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          {/* Call UP Button */}
          <button
            onClick={() => onSelectCall(activeWindow, "UP", 25)}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-bg-raised border border-border-flat hover:border-up-green transition-all rounded-[4px] group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold font-mono text-up-green mb-0.5">
              <TrendingUp size={16} />
              <span>CALL UP</span>
            </div>
            <span className="text-[11px] font-mono text-text-secondary group-hover:text-text-primary">
              Payout {upPayout}x
            </span>
          </button>

          {/* Call DOWN Button */}
          <button
            onClick={() => onSelectCall(activeWindow, "DOWN", 25)}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 bg-bg-raised border border-border-flat hover:border-down-red transition-all rounded-[4px] group cursor-pointer"
          >
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold font-mono text-down-red mb-0.5">
              <TrendingDown size={16} />
              <span>CALL DOWN</span>
            </div>
            <span className="text-[11px] font-mono text-text-secondary group-hover:text-text-primary">
              Payout {downPayout}x
            </span>
          </button>
        </div>

        {/* Plain Language Safety Note */}
        <div className="mt-5 pt-4 border-t border-border-flat flex items-center justify-between text-xs font-mono">
          <span className="text-text-dim font-sans">
            {mode === "practice" ? "Simulated collateral • Real oracle settlement" : "Direct Viem signature • 15s dead-man expiry"}
          </span>
          <span className="text-up-green text-[11px] font-semibold">
            Instant 1-Click Review
          </span>
        </div>
      </div>

      {/* 4. Simplified Activity Feed Row (Recent Call or Oracle Settlement) */}
      <div className="w-full max-w-xl bg-bg-base border border-border-flat rounded-md px-4 py-3 flex items-center justify-between text-xs font-mono mb-4">
        <div className="flex items-center gap-2 truncate">
          <span className="text-text-dim">STATUS:</span>
          {recentCalls.length > 0 ? (
            <span className="text-text-secondary truncate">
              Last call: {recentCalls[0].direction} on {recentCalls[0].asset} (${recentCalls[0].stake} USDso) — {recentCalls[0].settlementStatus.toUpperCase()}
            </span>
          ) : (
            <span className="text-text-dim">
              Order book depth live: UpVol={activeWindow.upBidVolume} / AskVol={activeWindow.upAskVolume}
            </span>
          )}
        </div>
        <span className="text-up-green text-[11px] shrink-0">100% On-Chain</span>
      </div>

      {/* 5. Upgrade Nudge (Stitch: ferrule_upgrade_nudge) */}
      <div className="w-full max-w-xl bg-bg-raised border border-border-flat p-4 rounded-md flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-text-secondary">
          <Terminal size={16} className="text-cyan-eval shrink-0" />
          <span>Want automated condition watchers &amp; strategy scripts?</span>
        </div>
        <button
          onClick={onSwitchToPro}
          className="text-cyan-eval hover:underline text-[11px] font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
        >
          <span>Pro Terminal</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
