import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Search, 
  Zap, 
  Bot, 
  Sliders, 
  ArrowUpRight, 
  CheckCircle,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import type { OpenWindow, CallDirection, TradingMode } from "../../types/index.js";

interface PolymarketGridViewProps {
  windows: OpenWindow[];
  mode: TradingMode;
  onPlaceCall: (window: OpenWindow, direction: CallDirection, stake: number) => Promise<void>;
  walletConnected: boolean;
  onConnectWallet: () => void;
  onOpenTerminalWithMarket?: (marketId: string) => void;
  onOpenAgentWithMarket?: (marketId: string) => void;
}

export function PolymarketGridView({
  windows,
  mode,
  onPlaceCall,
  walletConnected,
  onConnectWallet,
  onOpenTerminalWithMarket,
  onOpenAgentWithMarket,
}: PolymarketGridViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "BTC" | "ETH" | "EURC">("ALL");
  const [selectedCadence, setSelectedCadence] = useState<"ALL" | "SHORT" | "HOURLY">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Slide-over Trade Ticket Drawer
  const [activeTicket, setActiveTicket] = useState<{
    window: OpenWindow;
    direction: CallDirection;
    stake: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Filter windows
  const filteredWindows = useMemo(() => {
    return windows.filter((w) => {
      // Category filter
      if (selectedCategory !== "ALL" && w.asset !== selectedCategory) return false;

      // Cadence filter
      if (selectedCadence === "SHORT" && w.intervalSec > 900) return false;
      if (selectedCadence === "HOURLY" && w.intervalSec < 3600) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAsset = w.asset.toLowerCase().includes(q);
        const matchCadence = `${w.intervalSec}s`.includes(q);
        if (!matchAsset && !matchCadence) return false;
      }

      return true;
    });
  }, [windows, selectedCategory, selectedCadence, searchQuery]);

  // Asset price helpers
  function getSpotPrice(asset: string): number {
    if (asset === "BTC") return 64250.0;
    if (asset === "ETH") return 3450.0;
    return 1.0850;
  }

  function getStrikePrice(asset: string): number {
    if (asset === "BTC") return 64180.0;
    if (asset === "ETH") return 3440.0;
    return 1.0842;
  }

  function formatTimeRemaining(sec: number): string {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${secs < 10 ? `0${secs}` : secs}s`;
  }

  async function handleConfirmTrade() {
    if (!activeTicket) return;
    setIsSubmitting(true);
    setTxSuccess(null);
    setTxError(null);

    try {
      await onPlaceCall(activeTicket.window, activeTicket.direction, activeTicket.stake);
      setTxSuccess(`Successfully staked $${activeTicket.stake} USDC on ${activeTicket.direction}!`);
      setTimeout(() => {
        setTxSuccess(null);
        setActiveTicket(null);
      }, 3000);
    } catch (err: any) {
      setTxError(err?.message || "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#080B10] text-[#F8FAFC] select-none font-sans px-4 sm:px-8 py-5">
      <div className="max-w-7xl w-full mx-auto flex flex-col gap-6">

        {/* 1. TOP HEADER & METRICS BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E293B] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></span>
              <span>Arc L1 Native Markets · Pyth Oracles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Binary Prediction Markets
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Trade event outcomes settled directly in 18-decimal native USDC. 0% platform take.
            </p>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex items-center gap-3 bg-[#0D121D] border border-[#1E293B] px-4 py-2 rounded-lg text-xs font-mono">
            <div>
              <span className="text-[#64748B] block text-[10px]">24H VOLUME</span>
              <span className="text-white font-bold">$138,450 USDC</span>
            </div>
            <div className="w-px h-6 bg-[#1E293B]"></div>
            <div>
              <span className="text-[#64748B] block text-[10px]">ACTIVE POOLS</span>
              <span className="text-[#00E5FF] font-bold">{windows.length} Markets</span>
            </div>
            <div className="w-px h-6 bg-[#1E293B]"></div>
            <div>
              <span className="text-[#64748B] block text-[10px]">SETTLEMENT</span>
              <span className="text-[#10B981] font-bold">Sub-Second</span>
            </div>
          </div>
        </div>

        {/* 2. FILTER STRIP (POLYMARKET STYLE) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0D121D] border border-[#1E293B] rounded-lg text-xs font-mono">
            {(["ALL", "BTC", "ETH", "EURC"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#00E5FF] text-[#080B10] shadow-sm"
                    : "text-[#94A3B8] hover:text-white"
                }`}
              >
                {cat === "ALL" ? "All Markets" : `${cat}/USDC`}
              </button>
            ))}
          </div>

          {/* Cadence Filters */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[#64748B] text-[11px] uppercase mr-1">Cadence:</span>
            {[
              { id: "ALL", label: "All Cadences" },
              { id: "SHORT", label: "1m - 15m" },
              { id: "HOURLY", label: "1h+" },
            ].map((cad) => (
              <button
                key={cad.id}
                type="button"
                onClick={() => setSelectedCadence(cad.id as any)}
                className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                  selectedCadence === cad.id
                    ? "bg-[#1E293B] border-[#00E5FF]/40 text-[#00E5FF] font-bold"
                    : "border-[#1E293B] text-[#64748B] hover:text-[#94A3B8]"
                }`}
              >
                {cad.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. BOX-LIKE MARKETS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWindows.map((w) => {
            const spot = getSpotPrice(w.asset);
            const strike = getStrikePrice(w.asset);
            const upProb = Math.round(w.upLeanProbability * 100);
            const downProb = 100 - upProb;
            const upPrice = (upProb / 100).toFixed(2);
            const downPrice = (downProb / 100).toFixed(2);
            const upMultiplier = (1 / Math.max(0.01, w.upLeanProbability)).toFixed(2);
            const downMultiplier = (1 / Math.max(0.01, 1 - w.upLeanProbability)).toFixed(2);
            const isLocked = w.secondsRemaining <= 45;

            return (
              <div
                key={w.marketId}
                className="bg-[#0D121D] border border-[#1E293B] hover:border-[#334155] transition-all rounded-xl p-4 flex flex-col justify-between gap-4 shadow-sm relative group"
              >
                {/* Card Top: Asset Badge + Timer */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center font-mono font-bold text-sm text-[#00E5FF]">
                      {w.asset === "BTC" ? "₿" : w.asset === "ETH" ? "Ξ" : "€"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                        <span>{w.asset} / USD</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#1E293B] text-[#94A3B8] rounded">
                          {w.intervalSec >= 3600 ? `${w.intervalSec / 3600}h` : `${w.intervalSec / 60}m`}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        Spot: ${spot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Expiry Pill */}
                  <div className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
                    isLocked ? "bg-[#EF4444]/15 text-[#EF4444]" : "bg-[#1E293B] text-[#94A3B8]"
                  }`}>
                    <Clock size={11} />
                    <span>{isLocked ? "LOCKED (45s)" : formatTimeRemaining(w.secondsRemaining)}</span>
                  </div>
                </div>

                {/* Card Middle: Core Question */}
                <div>
                  <h3 className="text-sm font-semibold text-[#F8FAFC] leading-snug line-clamp-2">
                    Will {w.asset} be above ${strike.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at expiry?
                  </h3>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] mt-1.5">
                    <span>Target Strike: ${strike.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span>Pyth Benchmark</span>
                  </div>
                </div>

                {/* Probability Ratio Bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#10B981] font-bold">{upProb}% UP (YES)</span>
                    <span className="text-[#EF4444] font-bold">{downProb}% DOWN (NO)</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden flex">
                    <div className="bg-[#10B981] h-full" style={{ width: `${upProb}%` }}></div>
                    <div className="bg-[#EF4444] h-full" style={{ width: `${downProb}%` }}></div>
                  </div>
                </div>

                {/* Card Bottom: The Two Polymarket Action Boxes */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* YES / UP BOX */}
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setActiveTicket({ window: w, direction: "UP", stake: 25 })}
                    className="p-2.5 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 hover:border-[#10B981] transition-all cursor-pointer flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                  >
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#10B981]">
                      <TrendingUp size={13} />
                      <span>YES · {upProb}¢</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                      Payout: {upMultiplier}x
                    </span>
                  </button>

                  {/* NO / DOWN BOX */}
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setActiveTicket({ window: w, direction: "DOWN", stake: 25 })}
                    className="p-2.5 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 hover:border-[#EF4444] transition-all cursor-pointer flex flex-col items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                  >
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#EF4444]">
                      <TrendingDown size={13} />
                      <span>NO · {downProb}¢</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                      Payout: {downMultiplier}x
                    </span>
                  </button>
                </div>

                {/* Footer Strip: Volume + Agent Hook */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1E293B]/60 text-[11px] font-mono text-[#64748B]">
                  <span>${((w.upBidVolume + w.upAskVolume) / 10).toFixed(0)} Volume</span>
                  <div className="flex items-center gap-2">
                    {onOpenAgentWithMarket && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAgentWithMarket(w.marketId);
                        }}
                        className="hover:text-[#00E5FF] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Automate this market with Agent"
                      >
                        <Bot size={12} />
                        <span className="text-[10px]">Agent</span>
                      </button>
                    )}
                    {onOpenTerminalWithMarket && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTerminalWithMarket(w.marketId);
                        }}
                        className="hover:text-[#00E5FF] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Open in Terminal CLI"
                      >
                        <span className="text-[10px] font-bold">&gt;_ CLI</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* 4. POLYMARKET SLIDE-OVER TRADE DRAWER */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-[#080B10]/70 backdrop-blur-xs flex items-center justify-center sm:justify-end p-4">
          <div className="bg-[#0D121D] border border-[#1E293B] w-full max-w-md p-5 rounded-xl shadow-2xl flex flex-col gap-4 font-sans animate-in fade-in slide-in-from-right-10 duration-200">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]"></div>
                <span className="font-mono font-bold text-sm text-white">
                  Place Prediction Bet
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="text-[#64748B] hover:text-white cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Question */}
            <div className="bg-[#080B10] p-3 rounded-lg border border-[#1E293B]">
              <span className="text-[11px] font-mono text-[#64748B] uppercase block mb-1">
                {activeTicket.window.asset} / USD · {activeTicket.window.intervalSec}s Window
              </span>
              <p className="text-xs font-semibold text-white">
                Will {activeTicket.window.asset} be above ${getStrikePrice(activeTicket.window.asset).toFixed(2)} at expiry?
              </p>
            </div>

            {/* Selected Outcome Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTicket(prev => prev ? { ...prev, direction: "UP" } : null)}
                className={`py-2.5 px-3 rounded-lg border font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTicket.direction === "UP"
                    ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]"
                    : "bg-[#080B10] border-[#1E293B] text-[#64748B]"
                }`}
              >
                <TrendingUp size={14} />
                <span>YES / UP ({Math.round(activeTicket.window.upLeanProbability * 100)}¢)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTicket(prev => prev ? { ...prev, direction: "DOWN" } : null)}
                className={`py-2.5 px-3 rounded-lg border font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTicket.direction === "DOWN"
                    ? "bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]"
                    : "bg-[#080B10] border-[#1E293B] text-[#64748B]"
                }`}
              >
                <TrendingDown size={14} />
                <span>NO / DOWN ({100 - Math.round(activeTicket.window.upLeanProbability * 100)}¢)</span>
              </button>
            </div>

            {/* Stake Input & Preset Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-[#64748B]">
                <span>STAKE AMOUNT:</span>
                <span>Mode: {mode === "practice" ? "Practice Bankroll" : "Real Native USDC"}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={activeTicket.stake}
                  onChange={(e) => setActiveTicket(prev => prev ? { ...prev, stake: Math.max(1, Number(e.target.value)) } : null)}
                  className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-base font-mono text-white rounded-lg outline-none tabular-nums"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono text-[#64748B]">USDC</span>
              </div>

              {/* Preset Pills */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setActiveTicket(prev => prev ? { ...prev, stake: amt } : null)}
                    className={`py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                      activeTicket.stake === amt
                        ? "bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] font-bold"
                        : "bg-[#080B10] border-[#1E293B] text-[#64748B] hover:text-white"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Calculation Card */}
            {(() => {
              const prob = activeTicket.direction === "UP" 
                ? activeTicket.window.upLeanProbability 
                : (1 - activeTicket.window.upLeanProbability);
              const safeProb = Math.max(0.01, prob);
              const payout = (activeTicket.stake / safeProb).toFixed(2);
              const profit = (Number(payout) - activeTicket.stake).toFixed(2);
              const multiplier = (1 / safeProb).toFixed(2);

              return (
                <div className="bg-[#080B10] p-3 rounded-lg border border-[#1E293B] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Potential Return:</span>
                    <span className="text-white font-bold">${payout} USDC ({multiplier}x)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Estimated Profit:</span>
                    <span className="text-[#10B981] font-bold">+${profit} USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Settlement Chain:</span>
                    <span className="text-[#00E5FF]">Arc L1 Mainnet (5042)</span>
                  </div>
                </div>
              );
            })()}

            {/* Action Button */}
            {!walletConnected && mode === "real" ? (
              <button
                type="button"
                onClick={onConnectWallet}
                className="w-full py-3 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap size={15} />
                <span>Connect Wallet to Trade</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmTrade}
                className={`w-full py-3 font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTicket.direction === "UP"
                    ? "bg-[#10B981] hover:bg-[#10B981]/90 text-[#080B10]"
                    : "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
              >
                <span>
                  {isSubmitting
                    ? "Confirming on Arc Mainnet..."
                    : `Buy ${activeTicket.direction === "UP" ? "YES" : "NO"} ($${activeTicket.stake} USDC)`}
                </span>
              </button>
            )}

            {/* Feedback messages */}
            {txSuccess && (
              <div className="text-xs font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle size={15} />
                <span>{txSuccess}</span>
              </div>
            )}
            {txError && (
              <div className="text-xs font-mono text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 p-2.5 rounded-lg">
                {txError}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
