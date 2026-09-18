import React from "react";
import { 
  Terminal, 
  Layers, 
  Bot, 
  Waves, 
  Clock, 
  ExternalLink,
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  CheckCircle,
  LayoutGrid,
  Cpu,
  Code2
} from "lucide-react";
import type { OpenWindow, TradingMode, CalibrationScorecard, CallDirection } from "../../types/index.js";
import { ARC_CHAIN_ID, ARC_RPC_URL, ARC_EXPLORER_URL, FERRARC_CONTRACTS } from "../../config/constants.js";

interface LandingScreenProps {
  windows: OpenWindow[];
  onEnterTerminal: () => void;
  onEnterMarkets: () => void;
  onEnterAgent: () => void;
  onEnterStream: () => void;
  onPlaceCall?: (window: OpenWindow, direction: CallDirection, stake: number) => Promise<void>;
  mode: TradingMode;
  onToggleMode: () => void;
  bankroll: number;
  scorecard: CalibrationScorecard;
  onOpenHowItWorks?: () => void;
}

export function LandingScreen({
  windows,
  onEnterTerminal,
  onEnterMarkets,
  onEnterAgent,
  onEnterStream,
  onPlaceCall,
  mode,
  onToggleMode,
  bankroll,
  scorecard,
  onOpenHowItWorks,
}: LandingScreenProps) {
  const isPractice = mode === "practice";
  const primaryWindow = windows.length > 0 ? windows[0] : null;

  return (
    <div className="flex-1 overflow-y-auto bg-[#080B10] text-[#F8FAFC] select-text font-sans pb-20">
      
      {/* 1. HERO SECTION (REAL COMMERCIAL PRODUCT) */}
      <section className="relative w-full border-b border-[#1E293B] pt-14 pb-16 px-4 sm:px-6 flex flex-col items-center overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D121D] border border-[#1E293B] text-[#94A3B8] font-mono text-xs uppercase tracking-wider rounded-full mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-pulse"></span>
            <span className="text-white font-semibold">BUILT FOR CIRCLE ARC L1</span>
            <span className="text-[#64748B]">·</span>
            <span className="text-[#00E5FF]">NATIVE 18-DEC USDC</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mb-5 leading-[1.1]">
            Institutional Binary Prediction Markets &amp; Agentic Commerce.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#94A3B8] max-w-2xl mb-8 leading-relaxed">
            Trade high-speed event contracts on BTC, ETH, and EURC with sub-second finality. Zero approval friction with native 18-decimal USDC, autonomous AI agent execution, and continuous cashflow streaming.
          </p>

          {/* Primary Product CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-10">
            <button
              type="button"
              onClick={onEnterTerminal}
              className="h-12 px-6 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.3)] cursor-pointer group"
            >
              <Terminal size={17} />
              <span>Launch Pro Terminal</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onEnterMarkets}
              className="h-12 px-6 bg-[#0D121D] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#334155] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LayoutGrid size={17} className="text-[#10B981]" />
              <span>Explore Box Markets</span>
            </button>

            <button
              type="button"
              onClick={onEnterAgent}
              className="h-12 px-5 bg-[#0D121D] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#334155] text-[#94A3B8] hover:text-white font-mono text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bot size={17} className="text-[#00E5FF]" />
              <span>Agent Gateway</span>
            </button>
          </div>

          {/* Protocol Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs text-[#64748B] pt-3 border-t border-[#1E293B]/60">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
              <span>100% Non-Custodial</span>
            </span>
            <span>·</span>
            <span>Arc L1 Mainnet (5042)</span>
            <span>·</span>
            <span>Pyth Network Push Oracles</span>
            <span>·</span>
            <span>Zero AWS / Serverless</span>
          </div>

        </div>
      </section>

      {/* 2. LIVE POLYMARKET-STYLE BOX MARKETS SHOWCASE */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] uppercase tracking-wider mb-1">
              <span>LIVE ACTIVE MARKETS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Continuous Binary Contracts
            </h2>
          </div>
          <button
            type="button"
            onClick={onEnterMarkets}
            className="text-xs font-mono text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Markets ({windows.length})</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* 3 Box Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {windows.slice(0, 3).map((w) => {
            const upProb = Math.round(w.upLeanProbability * 100);
            const downProb = 100 - upProb;
            const spot = w.asset === "BTC" ? 64250 : w.asset === "ETH" ? 3450 : 1.085;
            const strike = w.asset === "BTC" ? 64180 : w.asset === "ETH" ? 3440 : 1.0842;

            return (
              <div
                key={w.marketId}
                onClick={onEnterMarkets}
                className="bg-[#0D121D] border border-[#1E293B] hover:border-[#00E5FF]/40 transition-all rounded-xl p-5 flex flex-col justify-between gap-4 cursor-pointer group shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center font-mono font-bold text-sm text-[#00E5FF]">
                      {w.asset === "BTC" ? "₿" : w.asset === "ETH" ? "Ξ" : "€"}
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-white">
                        {w.asset} / USD · {w.intervalSec >= 3600 ? `${w.intervalSec / 3600}h` : `${w.intervalSec / 60}m`}
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        Spot: ${spot.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-[#1E293B] text-[#94A3B8] rounded">
                    {Math.floor(w.secondsRemaining / 60)}m {w.secondsRemaining % 60}s
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-[#00E5FF] transition-colors line-clamp-2">
                    Will {w.asset} be above ${strike.toLocaleString()} at expiry?
                  </h3>
                  <span className="text-[11px] font-mono text-[#64748B] block mt-1">
                    Strike Target: ${strike.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-center font-mono">
                    <span className="text-xs font-bold text-[#10B981] block">YES · {upProb}¢</span>
                    <span className="text-[10px] text-[#94A3B8]">{(1 / Math.max(0.01, w.upLeanProbability)).toFixed(2)}x Return</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-center font-mono">
                    <span className="text-xs font-bold text-[#EF4444] block">NO · {downProb}¢</span>
                    <span className="text-[10px] text-[#94A3B8]">{(1 / Math.max(0.01, 1 - w.upLeanProbability)).toFixed(2)}x Return</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1E293B] text-[11px] font-mono text-[#64748B]">
                  <span>${((w.upBidVolume + w.upAskVolume) / 10).toFixed(0)} Volume</span>
                  <span className="text-[#00E5FF] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Trade Box <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. PRODUCT PILLARS: TERMINAL, AGENT, STREAMFLOW */}
      <section className="w-full bg-[#0B0F17] border-y border-[#1E293B] py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="font-mono text-xs text-[#00E5FF] uppercase tracking-wider block mb-2 font-bold">
              THREE CORE ENGINES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Built for Institutional Traders &amp; AI Agents
            </h2>
            <p className="text-sm text-[#94A3B8] mt-2">
              Everything in FerrArc operates on-chain with zero trusted intermediaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pillar 1: VT100 Terminal */}
            <div className="bg-[#0D121D] border border-[#1E293B] p-6 rounded-xl flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center mb-4">
                  <Terminal size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Institutional Pro Terminal
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Full VT100 interactive shell emulator. Trade with bash commands (<code className="text-[#00E5FF]">call up 25</code>, <code className="text-[#00E5FF]">radar</code>, <code className="text-[#00E5FF]">audit</code>), monitor L2 continuous depth ladders, and calculate Black-Scholes mispricing in basis points.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterTerminal}
                className="py-2.5 px-4 bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Launch Terminal</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Pillar 2: Agent Gateway */}
            <div className="bg-[#0D121D] border border-[#1E293B] p-6 rounded-xl flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mb-4">
                  <Bot size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Autonomous Agent Gateway
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Zero-server Bring-Your-Own-Key (BYOK) autonomous bot execution via client-side Viem. Run mean-reversion, momentum, or Kelly criterion bots directly from your browser, or copy our 3-line Python SDK snippet.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterAgent}
                className="py-2.5 px-4 bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open Agent Gateway</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Pillar 3: StreamFlow */}
            <div className="bg-[#0D121D] border border-[#1E293B] p-6 rounded-xl flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] flex items-center justify-center mb-4">
                  <Waves size={22} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  StreamFlow Cashflow
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Real-time per-second continuous cashflow streaming. Stream native USDC continuous compensation for automated AI agent bankrolls, research grants, or per-second contributor payroll.
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterStream}
                className="py-2.5 px-4 bg-[#1E293B] hover:bg-[#334155] text-white font-mono text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open StreamFlow</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 4. VERIFIED SMART CONTRACTS ON ARC MAINNET */}
      <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <div className="bg-[#0D121D] border border-[#1E293B] p-6 rounded-xl font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#00E5FF]" />
              <span className="font-bold text-white uppercase tracking-wider">
                Canonical Architecture (Arc L1 Mainnet)
              </span>
            </div>
            <span className="text-[11px] text-[#10B981]">Chain ID: 5042</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-[#1E293B]/50">
              <span className="text-[#64748B]">FerrArc Event Engine:</span>
              <span className="text-white truncate">{FERRARC_CONTRACTS.eventEngine}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-[#1E293B]/50">
              <span className="text-[#64748B]">StreamFlow Engine:</span>
              <span className="text-white truncate">{FERRARC_CONTRACTS.streamEngine}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 border-b border-[#1E293B]/50">
              <span className="text-[#64748B]">Settlement Asset:</span>
              <span className="text-[#00E5FF]">Native 18-Decimal USDC (msg.value)</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
              <span className="text-[#64748B]">Oracle Infrastructure:</span>
              <span className="text-[#10B981]">Pyth Network Realtime Push Feeds</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
