import React from "react";
import { 
  Terminal, 
  Layers, 
  Cpu, 
  Clock, 
  ExternalLink,
  ChevronRight,
  BarChart3,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { OpenWindow, TradingMode, CalibrationScorecard } from "../../types/index.js";

interface LandingScreenProps {
  windows: OpenWindow[];
  onEnterBasic: () => void;
  onEnterPro: () => void;
  onOpenModeSelector: () => void;
  mode: TradingMode;
  onToggleMode: () => void;
  bankroll: number;
  scorecard: CalibrationScorecard;
}

export function LandingScreen({
  windows,
  onEnterBasic,
  onEnterPro,
  onOpenModeSelector,
  mode,
  onToggleMode,
  bankroll,
  scorecard,
}: LandingScreenProps) {
  const isPractice = mode === "practice";
  const primaryWindow = windows.length > 0 ? windows[0] : null;

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base text-text-primary select-text">
      {/* 1. Hero Section (Stitch Design: ferrule_landing_page/code.html) */}
      <section className="w-full border-b border-border-flat pt-10 sm:pt-14 pb-14 px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-border-flat bg-bg-raised text-text-dim font-mono text-[11px] uppercase tracking-widest rounded-sm mb-6">
            <span className="w-1.5 h-1.5 bg-up-green inline-block"></span>
            <span className="text-text-secondary">DETERMINISTIC PREDICTION PROTOCOL</span>
            <span className="text-border-interactive">|</span>
            <span className="text-cyan-eval">SOMNIA DREAMDEX CLOB</span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-sans text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-text-primary max-w-3xl mb-4 leading-[1.12]">
            Trade real market signals, risk-free, until you&apos;re ready.
          </h1>

          {/* Explanatory Subtitle */}
          <p className="font-sans text-base sm:text-lg text-text-secondary max-w-2xl mb-8 leading-relaxed">
            Practice against Somnia DreamDEX live Central Limit Order Book with zero capital risk. When your strategy proves empirical calibration, transition seamlessly to direct on-chain execution.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center mb-6">
            <button
              onClick={onEnterBasic}
              className="w-full sm:w-auto h-11 px-6 bg-up-green text-[#0a0a0f] hover:bg-up-green/90 font-mono text-xs uppercase tracking-wider font-bold rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              <Layers size={16} />
              <span>Launch Basic View</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={onEnterPro}
              className="w-full sm:w-auto h-11 px-6 bg-bg-raised border border-border-interactive hover:border-cyan-eval text-text-primary font-mono text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              <Terminal size={16} className="text-cyan-eval" />
              <span>Enter Pro Terminal</span>
            </button>

            <button
              onClick={onOpenModeSelector}
              className="w-full sm:w-auto h-11 px-4 bg-bg-raised border border-border-flat hover:border-border-interactive text-text-secondary font-mono text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Interface Selector</span>
            </button>
          </div>

          {/* Telemetry Subtext */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-text-dim mb-10">
            <span className="text-up-green">● Practice mode active ($1k bankroll)</span>
            <span>•</span>
            <span>100% Non-custodial</span>
            <span>•</span>
            <span>Zero gas for simulation</span>
            <span>•</span>
            <span>Somnia Shannon (50312)</span>
          </div>

          {/* Terminal Preview Card (Flat 1px border, exact design from Stitch) */}
          <div className="w-full max-w-3xl bg-bg-raised border border-border-flat rounded-sm text-left overflow-hidden">
            {/* Terminal Header Bar */}
            <div className="h-10 px-4 border-b border-border-flat bg-bg-base flex items-center justify-between font-mono text-[11px]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-text-primary font-semibold">
                  <span className="w-2 h-2 bg-up-green inline-block"></span>
                  PRACTICE ENVIRONMENT
                </span>
                <span className="text-border-interactive">|</span>
                <span className="text-text-secondary">
                  DREAMDEX::{primaryWindow ? `${primaryWindow.asset}-USD` : "BTC-USD"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-text-dim text-[11px]">
                <span>ORACLE LATENCY: <span className="text-text-secondary">14ms</span></span>
                <span className="hidden sm:inline">STATE: <span className="text-up-green">TRADING_OPEN</span></span>
              </div>
            </div>

            {/* Terminal Body Grid */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Col 1: Active Target Market */}
              <div className="flex flex-col border border-border-flat bg-bg-base p-3.5 rounded-sm">
                <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider mb-1.5">
                  Target Rolling Window
                </span>
                <span className="font-sans text-sm font-semibold text-text-primary mb-1">
                  {primaryWindow ? `${primaryWindow.asset} Binary (${(primaryWindow.intervalSec / 60).toFixed(0)}m)` : "BTC-300s (5m)"}
                </span>
                <div className="mt-auto pt-3 flex items-baseline justify-between font-mono">
                  <span className="text-[10px] text-text-dim">CROWD LEAN</span>
                  <span className="text-xs font-bold text-up-green">
                    {primaryWindow ? `${primaryWindow.upLeanPercent}% UP` : "64% UP"}
                  </span>
                </div>
              </div>

              {/* Col 2: Calibration Telemetry */}
              <div className="flex flex-col border border-border-flat bg-bg-base p-3.5 rounded-sm">
                <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider mb-1.5">
                  Calibration Metric
                </span>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-xl font-bold text-up-green">
                    {scorecard.brierScore !== null ? scorecard.brierScore.toFixed(3) : "0.082"}
                  </span>
                  <span className="font-mono text-[10px] text-text-dim">BRIER SCORE</span>
                </div>
                <p className="font-sans text-[11px] text-text-secondary">
                  Lower is better. Theoretical floor = 0.000 (perfect accuracy).
                </p>
                <div className="mt-auto pt-2 flex items-center justify-between font-mono text-[10px] text-text-dim">
                  <span>WIN RATE</span>
                  <span className="text-text-primary font-bold">{(scorecard.winRate * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Col 3: Mode Switch Safeguard */}
              <div className="flex flex-col justify-between border border-border-flat bg-bg-base p-3.5 rounded-sm">
                <div>
                  <span className="font-mono text-[10px] text-text-dim uppercase tracking-wider mb-1 block">
                    Execution Mode
                  </span>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 ${isPractice ? "bg-up-green" : "bg-down-red"}`}></span>
                    <span className="font-mono text-xs font-bold text-text-primary">
                      {isPractice ? "Simulated Zero-Gas" : "Real Direct Sign"}
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-text-dim">
                    {isPractice ? "Zero loss of funds while testing strategies." : "Capital at risk on Somnia testnet."}
                  </p>
                </div>
                <div className="pt-2 border-t border-border-flat mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-text-dim">SIM BALANCE</span>
                  <span className="font-mono text-[11px] text-up-green font-bold">
                    ${bankroll.toFixed(2)} USDso
                  </span>
                </div>
              </div>
            </div>

            {/* Terminal Footer Log */}
            <div className="px-4 py-2 border-t border-border-flat bg-bg-base/70 font-mono text-[11px] text-text-dim flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cyan-eval">&gt;</span>
                <span>DreamDEX binary module confirmed • block live on chain 50312</span>
              </div>
              <button 
                onClick={onEnterPro}
                className="text-cyan-eval hover:underline text-[10px] uppercase font-bold"
              >
                Open Full Shell →
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 2. "What is Ferrule?" Section (ferrule_landing_page/code.html) */}
      <section className="w-full border-b border-border-flat py-16 px-4 sm:px-6 bg-bg-base">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="font-mono text-[11px] text-text-dim uppercase tracking-widest block mb-2">
              Protocol Philosophy
            </span>
            <h2 className="font-sans text-2xl sm:text-3xl text-text-primary font-semibold mb-3">
              What is Ferrule?
            </h2>
            <p className="font-sans text-sm sm:text-base text-text-secondary leading-relaxed">
              Ferrule bridges the gap between risk-free signal training and verifiable on-chain settlement. 
              Most prediction surfaces rely on off-chain points, opaque matchers, or vanity win streaks. Ferrule is grounded in Somnia DreamDEX Central Limit Order Book (CLOB), deterministic Brier scoring, and strict non-custodial safety.
            </p>
          </div>

          {/* 3-Column Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Feature Card 1 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 border border-border-flat bg-bg-base flex items-center justify-center mb-4 font-mono text-xs text-text-primary font-bold">
                  01
                </div>
                <h3 className="font-sans text-base text-text-primary font-semibold mb-2">
                  Zero-Loss Practice Environment
                </h3>
                <p className="font-sans text-xs text-text-secondary leading-relaxed">
                  Simulated order book depth and instant execution matching live oracle feeds without spending gas or risking collateral. Build confidence against real price action.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border-flat flex items-center justify-between font-mono text-[11px] text-text-dim">
                <span>RISK EXPOSURE</span>
                <span className="text-up-green font-bold">0.00 USD</span>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 border border-border-flat bg-bg-base flex items-center justify-center mb-4 font-mono text-xs text-cyan-eval font-bold">
                  02
                </div>
                <h3 className="font-sans text-base text-text-primary font-semibold mb-2">
                  Deterministic Calibration
                </h3>
                <p className="font-sans text-xs text-text-secondary leading-relaxed">
                  Brier score grading and objective probabilistic metrics that evaluate signal accuracy and confidence calibration over fleeting market noise.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border-flat flex items-center justify-between font-mono text-[11px] text-text-dim">
                <span>SCORING MODEL</span>
                <span className="text-text-primary font-bold">STRICT BRIER INDEX</span>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 border border-border-flat bg-bg-base flex items-center justify-center mb-4 font-mono text-xs text-down-red font-bold">
                  03
                </div>
                <h3 className="font-sans text-base text-text-primary font-semibold mb-2">
                  Seamless Mode Switch
                </h3>
                <p className="font-sans text-xs text-text-secondary leading-relaxed">
                  One-click transition between Practice Mode (Green) and Real Settlement (Red) with strict non-custodial wallet safeguards and transparent contract calls.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border-flat flex items-center justify-between font-mono text-[11px] text-text-dim">
                <span>TRANSITION</span>
                <span className="text-text-primary font-bold">INSTANT &amp; SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "How It Works" Execution Flow */}
      <section className="w-full border-b border-border-flat py-16 px-4 sm:px-6 bg-bg-base">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="font-mono text-[11px] text-text-dim uppercase tracking-widest block mb-2">
              Execution Flow
            </span>
            <h2 className="font-sans text-2xl sm:text-3xl text-text-primary font-semibold mb-3">
              How It Works
            </h2>
            <p className="font-sans text-sm text-text-secondary">
              A structured progression designed to turn subjective speculation into systematic precision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-text-dim tracking-wider font-semibold">STEP 01</span>
                  <span className="text-text-dim text-xs font-mono">[CONNECT]</span>
                </div>
                <h4 className="font-sans text-base text-text-primary font-semibold mb-2">Connect &amp; Practice</h4>
                <p className="font-sans text-xs text-text-secondary leading-relaxed mb-4">
                  Connect any Web3 wallet or use a guest observer session. No initial deposit, no contract approvals, and zero gas consumption.
                </p>
              </div>
              <div className="font-mono text-[10px] text-text-dim bg-bg-base p-2.5 border border-border-flat rounded-sm">
                STATUS: ZERO CAPITAL AT RISK
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-text-dim tracking-wider font-semibold">STEP 02</span>
                  <span className="text-text-dim text-xs font-mono">[CALIBRATE]</span>
                </div>
                <h4 className="font-sans text-base text-text-primary font-semibold mb-2">Calibrate Your Accuracy</h4>
                <p className="font-sans text-xs text-text-secondary leading-relaxed mb-4">
                  Place prediction calls against active DreamDEX order books. The protocol computes your Brier score calibration, hit-rate, and conviction index over time.
                </p>
              </div>
              <div className="font-mono text-[10px] text-text-dim bg-bg-base p-2.5 border border-border-flat rounded-sm">
                METRIC: BRIER SCORE VERIFIED
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-bg-raised border border-border-flat p-6 rounded-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs text-text-dim tracking-wider font-semibold">STEP 03</span>
                  <span className="text-text-dim text-xs font-mono">[EXECUTE]</span>
                </div>
                <h4 className="font-sans text-base text-text-primary font-semibold mb-2">Execute Live</h4>
                <p className="font-sans text-xs text-text-secondary leading-relaxed mb-4">
                  Once your empirical calibration passes threshold conviction, toggle to Real Mode. Trade directly with non-custodial wallet signatures on Somnia Shannon.
                </p>
              </div>
              <div className="font-mono text-[10px] text-text-dim bg-bg-base p-2.5 border border-border-flat rounded-sm">
                EXECUTION: ON-CHAIN DETERMINISTIC
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="border-t border-border-flat px-4 py-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-text-dim">
        <div>
          <span>Ferrule © 2026 · Somnia DreamDEX Event Contracts</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onEnterBasic} className="text-up-green hover:underline">
            Launch Basic View
          </button>
          <span>/</span>
          <button onClick={onEnterPro} className="text-cyan-eval hover:underline">
            Launch Pro Terminal
          </button>
          <span>/</span>
          <a 
            href="https://prd.oracle.somnia.host" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-text-primary flex items-center gap-1"
          >
            <span>Somnia OracleHub</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </footer>
    </div>
  );
}
