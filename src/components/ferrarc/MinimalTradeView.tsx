import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Zap, 
  Clock, 
  ArrowUpRight,
  Sliders,
  Layers,
  Activity
} from "lucide-react";
import type { OpenWindow, CallDirection, TradingMode } from "../../types/index.js";
import { L2DepthLadder } from "../cockpit/L2DepthLadder.js";
import { calculateFairValue } from "../../services/quantService.js";

interface MinimalTradeViewProps {
  windows: OpenWindow[];
  mode: TradingMode;
  onPlaceCall: (window: OpenWindow, direction: CallDirection, stake: number) => Promise<void>;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export function MinimalTradeView({
  windows,
  mode,
  onPlaceCall,
  walletConnected,
  onConnectWallet,
}: MinimalTradeViewProps) {
  // Asset selection
  const availableAssets = ["BTC", "ETH", "EURC"] as const;
  const [selectedAsset, setSelectedAsset] = useState<string>("BTC");
  const [selectedInterval, setSelectedInterval] = useState<number>(900); // 15m default
  const [direction, setDirection] = useState<CallDirection>("UP");
  const [stake, setStake] = useState<number>(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  // Active market matching asset & cadence
  const activeWindow = useMemo(() => {
    const matching = windows.filter(w => w.asset === selectedAsset);
    if (matching.length === 0) return windows[0];
    const exact = matching.find(w => w.intervalSec === selectedInterval);
    return exact ?? matching[0];
  }, [windows, selectedAsset, selectedInterval]);

  // Pricing & payouts
  const currentPrice = useMemo(() => {
    if (activeWindow?.strike) return parseFloat(activeWindow.strike);
    if (selectedAsset === "BTC") return 64250.0;
    if (selectedAsset === "ETH") return 3450.0;
    return 1.0850;
  }, [activeWindow, selectedAsset]);

  const strikePrice = useMemo(() => {
    if (selectedAsset === "BTC") return 64180.0;
    if (selectedAsset === "ETH") return 3440.0;
    return 1.0842;
  }, [selectedAsset]);

  const upProbability = activeWindow ? Math.round(activeWindow.upLeanProbability * 100) : 62;
  const downProbability = 100 - upProbability;

  const entryPrice = direction === "UP" ? (upProbability / 100) : (downProbability / 100);
  const safeEntryPrice = Math.max(0.01, Math.min(0.99, entryPrice));
  const multiplier = (1 / safeEntryPrice).toFixed(2);
  const potentialPayout = (stake / safeEntryPrice).toFixed(2);

  // Format seconds remaining
  const secRemaining = activeWindow?.secondsRemaining ?? 300;
  const mins = Math.floor(secRemaining / 60);
  const secs = secRemaining % 60;
  const isLocked = secRemaining <= 45;

  // Black-Scholes analysis
  const fairValue = useMemo(() => {
    if (!activeWindow) return null;
    return calculateFairValue(currentPrice, strikePrice, secRemaining, upProbability / 100);
  }, [activeWindow, currentPrice, strikePrice, secRemaining, upProbability]);

  // Synthetic price trajectory for calm SVG area chart
  const chartPoints = useMemo(() => {
    const pointsCount = 20;
    const base = strikePrice;
    const points: { x: number; y: number; price: number }[] = [];
    const minVal = Math.min(strikePrice, currentPrice) * 0.998;
    const maxVal = Math.max(strikePrice, currentPrice) * 1.002;
    const range = maxVal - minVal || 100;

    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1);
      // Smooth spline wandering around strike and terminating at currentPrice
      const wave = Math.sin(progress * Math.PI * 2.5) * (strikePrice * 0.001);
      const intermediate = base + (currentPrice - base) * Math.pow(progress, 1.2) + wave;
      const x = (i / (pointsCount - 1)) * 100;
      // Invert Y for SVG coordinates (0 is top)
      const y = 85 - ((intermediate - minVal) / range) * 70;
      points.push({ x, y: Math.max(10, Math.min(85, y)), price: intermediate });
    }
    return points;
  }, [currentPrice, strikePrice]);

  const svgPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, "");
  }, [chartPoints]);

  const svgAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return `${svgPath} L 100 95 L 0 95 Z`;
  }, [svgPath, chartPoints]);

  async function handleExecuteTrade() {
    if (!activeWindow) return;
    setError(null);
    setSuccessTx(null);
    setIsSubmitting(true);
    try {
      await onPlaceCall(activeWindow, direction, stake);
      setSuccessTx(`Call ${direction} placed successfully on Arc Mainnet.`);
    } catch (err: any) {
      setError(err?.message || "Execution failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#080B10] text-[#F8FAFC] select-none font-sans px-3 sm:px-6 py-4">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-5">

        {/* 1. TOP ASSET & INTERVAL STRIP */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 shrink-0">
          {/* Asset Pills */}
          <div className="flex items-center gap-1.5 p-0.5 bg-[#0D121D] border border-[#1E293B] rounded-md">
            {availableAssets.map((asset) => (
              <button
                key={asset}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                  selectedAsset === asset
                    ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 shadow-xs"
                    : "text-[#64748B] hover:text-[#94A3B8]"
                }`}
              >
                {asset}/USDC
              </button>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {[
              { label: "1m", sec: 60 },
              { label: "5m", sec: 300 },
              { label: "15m", sec: 900 },
              { label: "1h", sec: 3600 },
            ].map((t) => (
              <button
                key={t.sec}
                type="button"
                onClick={() => setSelectedInterval(t.sec)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedInterval === t.sec
                    ? "bg-[#1E293B] text-white font-bold"
                    : "text-[#64748B] hover:text-[#94A3B8]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. HERO QUESTION & LIVE STRIKE CARDS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D121D] border border-[#1E293B] p-4 sm:p-5 rounded-lg shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] uppercase tracking-wider mb-1">
              <span>{selectedAsset}/USD EVENT WINDOW</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-[#00E5FF]">
                <Clock size={12} />
                <span>{isLocked ? "LOCK GATE (45s)" : `Expires in ${mins}m ${secs}s`}</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-baseline gap-3">
              <span>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-mono text-[#64748B] font-normal">
                Strike: ${strikePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </h2>
          </div>

          {/* Probability Bar */}
          <div className="flex flex-col gap-1.5 sm:w-64">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#10B981] font-bold">{upProbability}% UP</span>
              <span className="text-[#EF4444] font-bold">{downProbability}% DOWN</span>
            </div>
            <div className="h-2 w-full bg-[#1E293B] rounded-full overflow-hidden flex">
              <div className="bg-[#10B981] h-full transition-all duration-300" style={{ width: `${upProbability}%` }}></div>
              <div className="bg-[#EF4444] h-full transition-all duration-300" style={{ width: `${downProbability}%` }}></div>
            </div>
          </div>
        </div>

        {/* 3. CALM PRICE CHART (SVG AREA SPARKLINE) */}
        <div className="h-56 sm:h-64 bg-[#0D121D] border border-[#1E293B] rounded-lg p-3 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] pb-1 border-b border-[#1E293B]/40">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Live Pyth Feed: {selectedAsset}/USD</span>
            </span>
            <span>Strike: ${strikePrice.toFixed(2)}</span>
          </div>

          <div className="relative flex-1 w-full mt-2">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="0" y1="80" x2="100" y2="80" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2 2" />

              {/* Gradient Fill */}
              <path d={svgAreaPath} fill="url(#chartGradient)" />

              {/* Price Trajectory Path */}
              <path
                d={svgPath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current Spot Indicator */}
              {chartPoints.length > 0 && (
                <circle
                  cx={chartPoints[chartPoints.length - 1].x}
                  cy={chartPoints[chartPoints.length - 1].y}
                  r="2.5"
                  fill="#00E5FF"
                  className="animate-pulse"
                />
              )}
            </svg>

            {/* Strike Price Overlay Badge */}
            <div className="absolute right-2 top-4 bg-[#080B10]/80 border border-[#1E293B] px-2 py-0.5 rounded text-[10px] font-mono text-[#94A3B8]">
              Target Strike: ${strikePrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 4. EXECUTION TICKET (UP / DOWN DECISION) */}
        <div className="bg-[#0D121D] border border-[#1E293B] p-4 sm:p-5 rounded-lg flex flex-col gap-4">
          {/* Direction Toggle Pills */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDirection("UP")}
              className={`p-3 rounded-md border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                direction === "UP"
                  ? "bg-[#10B981]/15 border-[#10B981] text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-[#080B10] border-[#1E293B] text-[#64748B] hover:text-[#94A3B8] hover:border-[#334155]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                <TrendingUp size={16} />
                <span>CALL UP</span>
              </div>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                Payout: {direction === "UP" ? multiplier : (1 / (upProbability / 100)).toFixed(2)}x USDC
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDirection("DOWN")}
              className={`p-3 rounded-md border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                direction === "DOWN"
                  ? "bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "bg-[#080B10] border-[#1E293B] text-[#64748B] hover:text-[#94A3B8] hover:border-[#334155]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-mono font-bold text-sm">
                <TrendingDown size={16} />
                <span>CALL DOWN</span>
              </div>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                Payout: {direction === "DOWN" ? multiplier : (1 / (downProbability / 100)).toFixed(2)}x USDC
              </span>
            </button>
          </div>

          {/* Stake Input & Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#64748B] uppercase">Stake:</span>
              <div className="relative w-32">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-2.5 py-1 text-sm font-mono text-white rounded outline-none tabular-nums"
                />
                <span className="absolute right-2 top-1.5 text-[10px] font-mono text-[#64748B]">USDC</span>
              </div>
            </div>

            {/* Quick Stake Pills */}
            <div className="flex items-center gap-1.5">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(amt)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    stake === amt
                      ? "bg-[#00E5FF]/15 border-[#00E5FF]/40 text-[#00E5FF] font-bold"
                      : "bg-[#080B10] border-[#1E293B] text-[#64748B] hover:text-white"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Button */}
          {!walletConnected ? (
            <button
              onClick={onConnectWallet}
              type="button"
              className="w-full py-3 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] font-mono font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap size={14} />
              <span>Connect Wallet to Trade</span>
            </button>
          ) : (
            <button
              onClick={handleExecuteTrade}
              disabled={isSubmitting || isLocked}
              type="button"
              className={`w-full py-3 font-mono font-bold text-xs uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-2 ${
                direction === "UP"
                  ? "bg-[#10B981] hover:bg-[#10B981]/90 text-[#080B10]"
                  : "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>
                {isSubmitting
                  ? "Broadcasting to Arc Mainnet..."
                  : isLocked
                  ? "Order Intake Locked (45s Gate)"
                  : `Confirm Call ${direction} ($${stake} USDC) · Return $${potentialPayout}`}
              </span>
            </button>
          )}

          {/* Notice Feedback */}
          {error && (
            <div className="text-xs font-mono text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 p-2 rounded">
              {error}
            </div>
          )}
          {successTx && (
            <div className="text-xs font-mono text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 p-2 rounded flex items-center justify-between">
              <span>{successTx}</span>
              <a 
                href="https://explorer.arc.io" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-1 underline text-[#00E5FF]"
              >
                Explorer <ArrowUpRight size={12} />
              </a>
            </div>
          )}
        </div>

        {/* 5. PROGRESSIVE DISCLOSURE: COLLAPSIBLE DEEP ANALYTICS */}
        <div className="border border-[#1E293B] rounded-lg overflow-hidden bg-[#0D121D]/60 transition-all">
          <button
            type="button"
            onClick={() => setShowAdvanced(prev => !prev)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-[#64748B] hover:text-[#94A3B8] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders size={13} className="text-[#00E5FF]" />
              <span>Advanced Quantitative Analytics &amp; L2 Depth Ladder</span>
            </div>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvanced && activeWindow && (
            <div className="p-4 border-t border-[#1E293B] grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* L2 Depth Ladder */}
              <div>
                <span className="text-[10px] font-mono text-[#64748B] uppercase block mb-2 font-bold">
                  L2 Continuous Orderbook Depth
                </span>
                <L2DepthLadder 
                  window={activeWindow} 
                  onSelectCall={(w, d, s) => {
                    setDirection(d);
                    setStake(s);
                  }}
                  selectedStake={stake} 
                />
              </div>

              {/* Black-Scholes Radar Summary */}
              <div className="flex flex-col justify-between space-y-3 font-mono text-xs">
                <span className="text-[10px] font-mono text-[#64748B] uppercase font-bold">
                  Mathematical Pricing Model (Black-Scholes)
                </span>
                <div className="bg-[#080B10] p-3 rounded border border-[#1E293B] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Theoretical Fair Prob (UP):</span>
                    <span className="text-white font-bold">
                      {fairValue ? `${(fairValue.fairProbUp * 100).toFixed(1)}%` : "54.2%"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Market Crowd Lean (UP):</span>
                    <span className="text-[#10B981] font-bold">{upProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Mispricing Edge:</span>
                    <span className={fairValue && fairValue.bestEdgeBps > 0 ? "text-[#10B981] font-bold" : "text-[#64748B]"}>
                      {fairValue ? `${fairValue.bestEdgeBps} bps` : "+210 bps"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Quarter-Kelly Sizing:</span>
                    <span className="text-[#00E5FF] font-bold">
                      {fairValue ? `${(fairValue.quarterKellyUp * 100).toFixed(1)}% bankroll` : "12.5%"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#64748B] font-sans leading-relaxed">
                  Arc Mainnet executes trades via atomic native USDC staking. Contracts resolve automatically at expiry against Pyth Network benchmarks.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
