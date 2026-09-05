import React, { useState, useMemo } from "react";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ArrowRight,
  Terminal,
  Filter,
  Flame,
  Zap,
  Layers,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState<"ALL" | "BTC" | "ETH">("ALL");
  const [durationFilter, setDurationFilter] = useState<"ALL" | "5m" | "1h" | "24h">("ALL");
  const [sortBy, setSortBy] = useState<"time" | "lean" | "volume">("time");

  // Filter & Sort logic (Polymarket-style catalog)
  const filteredWindows = useMemo(() => {
    return windows
      .filter((w) => {
        // Asset filter
        if (assetFilter !== "ALL" && w.asset !== assetFilter) return false;
        
        // Duration filter
        if (durationFilter === "5m" && w.intervalSec > 300) return false;
        if (durationFilter === "1h" && (w.intervalSec < 3600 || w.intervalSec > 14400)) return false;
        if (durationFilter === "24h" && w.intervalSec < 86400) return false;

        // Search text
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchAsset = w.asset.toLowerCase().includes(term);
          const matchId = w.marketId.toLowerCase().includes(term);
          const matchMins = `${Math.floor(w.intervalSec / 60)}m`.includes(term);
          if (!matchAsset && !matchId && !matchMins) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "time") return a.secondsRemaining - b.secondsRemaining;
        if (sortBy === "lean") {
          const aDeviation = Math.abs(a.upLeanPercent - 50);
          const bDeviation = Math.abs(b.upLeanPercent - 50);
          return bDeviation - aDeviation;
        }
        if (sortBy === "volume") {
          const aVol = a.upBidVolume + a.upAskVolume;
          const bVol = b.upBidVolume + b.upAskVolume;
          return bVol - aVol;
        }
        return 0;
      });
  }, [windows, assetFilter, durationFilter, searchTerm, sortBy]);

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

  return (
    <div className="flex-1 flex flex-col px-3 sm:px-6 py-4 max-w-7xl mx-auto w-full overflow-y-auto select-text pb-20 sm:pb-8">
      {/* 1. Polymarket-style Top Filter & Navigation Strip */}
      <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-border-base">
        {/* Row A: Title & Mode Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2.5 h-2.5 bg-up-green inline-block animate-pulse"></span>
            <h1 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              LIVE PREDICTION MARKETS
            </h1>
            <span className="text-[11px] text-text-dim border border-border-base px-1.5 py-0.5 bg-bg-raised">
              {filteredWindows.length} ACTIVE CLOB PAIRS
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-text-dim flex-wrap">
            <span>FEED: <strong className="text-cyan-eval">DREAMDEX CLOB</strong></span>
            <span>•</span>
            <span>INDEXER: <strong className="text-text-secondary">dev.smk.somnia.host</strong></span>
            <span>•</span>
            <span>CHAIN: <strong className="text-up-green">SHANNON (50312)</strong></span>
            <span>•</span>
            <span className="hidden md:inline">
              MODE: <strong className={mode === "practice" ? "text-up-green" : "text-down-red"}>
                {mode.toUpperCase()}
              </strong>
            </span>
          </div>
        </div>

        {/* Row B: Search & Multi-Tag Category Filters (Cluttered Polymarket Style) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 text-text-dim" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search markets (BTC, ETH, 5m, 1h, round #)..."
              className="w-full h-8 pl-8 pr-3 bg-bg-raised border border-border-base text-text-primary font-mono text-[11px] placeholder:text-text-dim focus:border-border-interactive focus:outline-none"
            />
          </div>

          {/* Quick Filters Pill Cluster */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
            {/* Asset pills */}
            <span className="text-text-dim mr-1 hidden lg:inline">ASSET:</span>
            {(["ALL", "BTC", "ETH"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAssetFilter(a)}
                className={`px-2.5 py-1 border transition-colors shrink-0 cursor-pointer ${
                  assetFilter === a
                    ? "bg-text-primary text-[#0a0a0f] border-text-primary font-bold"
                    : "bg-bg-raised text-text-dim border-border-base hover:text-text-primary"
                }`}
              >
                {a === "BTC" ? "₿ BTC" : a === "ETH" ? "Ξ ETH" : "All Assets"}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-border-base mx-1 hidden sm:block"></div>

            {/* Cadence pills */}
            <span className="text-text-dim mr-1 hidden lg:inline">CADENCE:</span>
            {(["ALL", "5m", "1h", "24h"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDurationFilter(d)}
                className={`px-2 py-1 border transition-colors shrink-0 cursor-pointer ${
                  durationFilter === d
                    ? "bg-text-primary text-[#0a0a0f] border-text-primary font-bold"
                    : "bg-bg-raised text-text-dim border-border-base hover:text-text-primary"
                }`}
              >
                {d === "5m" ? "⚡ 5m" : d === "1h" ? "⏱️ 1h" : d === "24h" ? "📅 24h" : "All Time"}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-border-base mx-1 hidden sm:block"></div>

            {/* Sort Toggle */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-7 px-2 bg-bg-raised border border-border-base text-text-secondary font-mono text-[11px] focus:outline-none shrink-0"
            >
              <option value="time">Ending Soonest</option>
              <option value="lean">Highest Lean</option>
              <option value="volume">Highest Depth</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Polymarket-style Dense Multi-Card Grid */}
      {filteredWindows.length === 0 ? (
        <div className="py-16 text-center text-text-dim font-mono text-xs">
          No active prediction contracts matching your search filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredWindows.map((w) => {
            const upPayout = (1 / Math.max(0.01, w.upLeanProbability)).toFixed(2);
            const downPayout = (1 / Math.max(0.01, 1 - w.upLeanProbability)).toFixed(2);
            const upPriceCents = Math.round(w.upLeanPercent);
            const downPriceCents = 100 - upPriceCents;

            const mins = Math.floor(w.secondsRemaining / 60);
            const secs = w.secondsRemaining % 60;
            const timeFormatted = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
            const isClosingSoon = w.secondsRemaining <= 60;

            const isBtc = w.asset === "BTC";
            const durationLabel = 
              w.intervalSec < 3600 
                ? `${Math.floor(w.intervalSec / 60)}m` 
                : `${Math.floor(w.intervalSec / 3600)}h`;

            return (
              <div
                key={w.marketId}
                className="bg-bg-raised border border-border-base hover:border-border-interactive transition-colors p-4 flex flex-col justify-between font-mono relative group"
              >
                {/* Top Section: Asset Avatar, Title, Countdown */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      {/* Asset Icon Badge */}
                      <div
                        className={`w-8 h-8 flex items-center justify-center font-bold text-sm border ${
                          isBtc 
                            ? "border-[#f7931a]/40 bg-[#f7931a]/10 text-[#f7931a]" 
                            : "border-[#627eea]/40 bg-[#627eea]/10 text-[#627eea]"
                        }`}
                      >
                        {isBtc ? "₿" : "Ξ"}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[13px] text-text-primary tracking-tight">
                            {w.asset}/USDC
                          </span>
                          <span className="text-[10px] px-1 py-0.2 bg-bg-base border border-border-base text-text-dim">
                            {durationLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-dim truncate">
                          Round #{w.marketId.slice(0, 8)}
                        </div>
                      </div>
                    </div>

                    {/* Digital Countdown Badge */}
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border tabular-nums ${
                        isClosingSoon
                          ? "border-down-red/60 bg-down-red/10 text-down-red animate-pulse"
                          : "border-border-base bg-bg-base text-text-secondary"
                      }`}
                    >
                      <Clock size={11} />
                      <span>{timeFormatted}</span>
                    </div>
                  </div>

                  {/* Real On-Chain Market Question */}
                  <div className="text-[12px] font-medium text-text-primary mb-2 leading-snug min-h-[34px]">
                    {w.question ?? `Will ${w.asset} settle higher than strike at ${durationLabel} close?`}
                  </div>

                  {/* On-Chain Provenance Pill Strip */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-mono text-text-dim">
                    <span className="px-1.5 py-0.5 bg-bg-base border border-border-base text-text-secondary">
                      Strike: <strong className="text-text-primary">{w.strikeFormatted ?? "Opening"}</strong>
                    </span>
                    <span className="px-1.5 py-0.5 bg-bg-base border border-border-base text-text-secondary">
                      Liq: <strong className="text-text-primary">{w.backingUsdc ?? "1,500 USDC"}</strong>
                    </span>
                    <a
                      href={`https://shannon-explorer.somnia.network/address/${w.poolAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 bg-bg-base border border-border-base text-cyan-eval hover:underline flex items-center gap-1"
                      title={`Somnia Shannon Pool: ${w.poolAddress}`}
                    >
                      <span>Pool {w.poolAddress.slice(0, 6)}...{w.poolAddress.slice(-4)}</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>

                  {/* Crowd Lean Tension Clamp Mini-Bar */}
                  <div className="bg-bg-base border border-border-base p-2 mb-3">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <div className="flex items-center gap-1 text-up-green">
                        <TrendingUp size={12} />
                        <span>UP {w.upLeanPercent}%</span>
                      </div>
                      <div className="text-[9px] text-text-dim uppercase tracking-wider">
                        CROWD LEAN
                      </div>
                      <div className="flex items-center gap-1 text-down-red">
                        <span>{100 - w.upLeanPercent}% DOWN</span>
                        <TrendingDown size={12} />
                      </div>
                    </div>

                    {/* Dual color tension bar */}
                    <div className="relative w-full h-3 bg-bg-base border border-border-base overflow-hidden flex">
                      <div
                        className="h-full bg-up-green transition-all duration-300"
                        style={{ width: `${w.upLeanPercent}%` }}
                      />
                      <div
                        className="h-full bg-down-red transition-all duration-300"
                        style={{ width: `${100 - w.upLeanPercent}%` }}
                      />
                      {/* Notch */}
                      <div
                        className="absolute top-0 bottom-0 -ml-[2px] w-1 bg-text-primary pointer-events-none"
                        style={{ left: `${w.upLeanPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Polymarket-style Direct Action Execution Buttons */}
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {/* Call UP Button (Polymarket Buy Yes) */}
                    <button
                      onClick={() => onSelectCall(w, "UP", 25)}
                      className="p-2 border border-up-green bg-up-green/5 hover:bg-up-green hover:text-[#0a0a0f] text-up-green transition-all flex flex-col items-center justify-center cursor-pointer group/btn"
                    >
                      <div className="flex items-center gap-1 font-bold text-[12px]">
                        <TrendingUp size={12} />
                        <span>CALL UP</span>
                      </div>
                      <div className="text-[10px] text-text-dim group-hover/btn:text-[#0a0a0f] font-normal tabular-nums">
                        {upPriceCents}¢ • {upPayout}x
                      </div>
                    </button>

                    {/* Call DOWN Button (Polymarket Buy No) */}
                    <button
                      onClick={() => onSelectCall(w, "DOWN", 25)}
                      className="p-2 border border-down-red bg-down-red/5 hover:bg-down-red hover:text-[#0a0a0f] text-down-red transition-all flex flex-col items-center justify-center cursor-pointer group/btn"
                    >
                      <div className="flex items-center gap-1 font-bold text-[12px]">
                        <TrendingDown size={12} />
                        <span>CALL DOWN</span>
                      </div>
                      <div className="text-[10px] text-text-dim group-hover/btn:text-[#0a0a0f] font-normal tabular-nums">
                        {downPriceCents}¢ • {downPayout}x
                      </div>
                    </button>
                  </div>

                  {/* Micro Footer: Depth & Settlement */}
                  <div className="flex items-center justify-between text-[10px] text-text-dim pt-2 border-t border-border-base">
                    <span>Depth: {w.upBidVolume} / {w.upAskVolume}</span>
                    <span className="text-text-secondary">Pyth Oracle Settlement</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Bottom Strip: Recent Execution Feed & Pro Nudge */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-bg-raised border border-border-base font-mono text-[11px]">
        <div className="flex items-center gap-2 truncate">
          <span className="text-text-dim uppercase">LIVE STATUS:</span>
          {recentCalls.length > 0 ? (
            <span className="text-text-primary truncate">
              Last call: {recentCalls[0].direction} on {recentCalls[0].asset} (${recentCalls[0].stake} USDso) — {recentCalls[0].settlementStatus.toUpperCase()}
            </span>
          ) : (
            <span className="text-text-secondary truncate">
              Streaming real-time order books across Somnia Shannon DreamDEX.
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            onClick={onSwitchToPro}
            className="text-cyan-eval hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <Terminal size={14} />
            <span>Open Quant Terminal</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
