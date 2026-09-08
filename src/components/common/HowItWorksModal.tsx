import React, { useState, useEffect } from "react";
import { 
  X, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  Code2,
  Check
} from "lucide-react";
import { SOMNIA_CHAIN_ID, CANONICAL_CONTRACTS } from "../../config/constants.js";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchTerminal: () => void;
  onLaunchBasic: () => void;
}

type ChapterId = "clob" | "terminal" | "pricing" | "calibration";

interface Chapter {
  id: ChapterId;
  number: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const CHAPTERS: Chapter[] = [
  {
    id: "clob",
    number: "01",
    title: "Somnia CLOB Engine",
    subtitle: "On-Chain Central Limit Order Book & Pyth Oracles",
    tag: "MARKET ARCHITECTURE",
    icon: Cpu,
  },
  {
    id: "terminal",
    number: "02",
    title: "Pro Terminal & Scripts",
    subtitle: "VT100 Shell, Watcher Daemons & Algo Strategies",
    tag: "DEVELOPER TOOLING",
    icon: Terminal,
  },
  {
    id: "pricing",
    number: "03",
    title: "Crowd Lean & Pricing",
    subtitle: "Order Book Spread, Tension Clamp & Payouts",
    tag: "QUANT MATHEMATICS",
    icon: TrendingUp,
  },
  {
    id: "calibration",
    number: "04",
    title: "Brier Calibration & Risk",
    subtitle: "Empirical Skill Scoring & Transition to Real Capital",
    tag: "RISK PROTOCOL",
    icon: ShieldCheck,
  },
];

export function HowItWorksModal({
  isOpen,
  onClose,
  onLaunchTerminal,
  onLaunchBasic,
}: HowItWorksModalProps) {
  const [activeChapter, setActiveChapter] = useState<ChapterId>("clob");

  // Keyboard navigation: Esc to close, Arrow keys to cycle chapters
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        const currentIndex = CHAPTERS.findIndex((c) => c.id === activeChapter);
        if (currentIndex < CHAPTERS.length - 1) {
          setActiveChapter(CHAPTERS[currentIndex + 1].id);
        }
      } else if (e.key === "ArrowLeft") {
        const currentIndex = CHAPTERS.findIndex((c) => c.id === activeChapter);
        if (currentIndex > 0) {
          setActiveChapter(CHAPTERS[currentIndex - 1].id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeChapter, onClose]);

  if (!isOpen) return null;

  const currentIdx = CHAPTERS.findIndex((c) => c.id === activeChapter);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f]/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm select-none">
      <div className="bg-bg-base border border-border-interactive rounded-md w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col relative overflow-hidden text-text-primary shadow-2xl">
        
        {/* Modal Top Strip */}
        <div className="h-12 px-4 sm:px-6 border-b border-border-base bg-bg-raised flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 font-mono">
            <div className="w-2.5 h-2.5 bg-cyan-eval"></div>
            <span className="text-xs sm:text-sm font-bold tracking-wider text-text-primary uppercase">
              FERRULE PROTOCOL GUIDE
            </span>
            <span className="hidden sm:inline-block text-[9px] font-mono text-cyan-eval bg-cyan-eval/10 border border-cyan-eval/30 px-1.5 py-0.5 rounded-[2px] tracking-wider uppercase">
              SOMNIA SHANNON ({SOMNIA_CHAIN_ID})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline font-mono text-[10px] text-text-dim">
              [← / → Navigate · ESC Close]
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-text-dim hover:text-text-primary hover:bg-bg-base rounded-[3px] transition-colors cursor-pointer"
              title="Close Guide"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Sidebar Chapters + Right Chapter Canvas */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Chapter Stepper Tabs */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border-base bg-bg-raised/40 p-3 sm:p-4 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
            <span className="hidden md:block font-mono text-[10px] text-text-dim uppercase tracking-wider mb-2 px-2">
              Architecture Chapters
            </span>
            {CHAPTERS.map((ch) => {
              const Icon = ch.icon;
              const isActive = ch.id === activeChapter;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChapter(ch.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-left transition-all cursor-pointer font-mono shrink-0 md:w-full ${
                    isActive
                      ? "bg-bg-base border border-border-interactive text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "text-text-dim hover:text-text-secondary hover:bg-bg-base/40 border border-transparent"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-[2px] flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive
                        ? "bg-cyan-eval/15 text-cyan-eval border border-cyan-eval/30"
                        : "bg-bg-raised text-text-dim border border-border-base"
                    }`}
                  >
                    {ch.number}
                  </div>
                  <div className="truncate">
                    <div className={`text-[11px] font-semibold truncate ${isActive ? "text-text-primary" : "text-text-secondary"}`}>
                      {ch.title}
                    </div>
                    <div className="hidden md:block text-[9px] text-text-dim truncate">
                      {ch.tag}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Quick Summary Pill at bottom of left sidebar */}
            <div className="hidden md:flex flex-col mt-auto p-3 bg-bg-base border border-border-base rounded-[4px] text-[10px] font-mono text-text-dim">
              <span className="text-cyan-eval font-semibold mb-1">DREAMDEX CLOB</span>
              <span>Matching: Double Auction</span>
              <span>Oracles: Pyth Network</span>
              <span>Cutoff: 45s Pre-Lock</span>
            </div>
          </div>

          {/* Right Column: Scrollable Chapter Content */}
          <div className="flex-1 p-4 sm:p-7 overflow-y-auto font-sans select-text">
            
            {/* CHAPTER 01: SOMNIA CLOB ENGINE */}
            {activeChapter === "clob" && (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-border-base pb-4">
                  <span className="font-mono text-[10px] text-cyan-eval uppercase tracking-widest block mb-1">
                    CHAPTER 01 // CORE INFRASTRUCTURE
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Somnia DreamDEX Central Limit Order Book
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                    Unlike traditional automated market makers (AMMs) or bonding curves that suffer from high slippage and front-running, Ferrule routes directly to Somnia DreamDEX live CLOB contracts.
                  </p>
                </div>

                {/* Architecture ASCII Flow */}
                <div className="p-4 bg-bg-raised border border-border-base rounded-[4px] font-mono text-[11px] text-text-dim overflow-x-auto">
                  <div className="text-text-secondary font-bold mb-2 text-[10px] uppercase text-cyan-eval">
                    // Deterministic Binary Pipeline (Somnia Shannon 50312)
                  </div>
                  <div className="whitespace-pre text-[10px] sm:text-[11px] leading-relaxed text-text-primary">
{`+-----------------------+     +--------------------------+     +------------------------+
|   Pyth Oracle Feeds   | --> | Rolling Window Contract  | --> | Somnia DreamDEX CLOB   |
|   (Sub-second Price)  |     | (BTC/ETH: 5m, 1h, 24h)   |     | (Continuous Orderbook) |
+-----------------------+     +--------------------------+     +------------------------+
                                           |
                              +------------v-------------+
                              |    45s Safety Gate       | --> Trading locks before expiry;
                              | (Anti-MEV Front-running) |     Settles deterministically.
                              +--------------------------+`}
                  </div>
                </div>

                {/* Key Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-text-primary mb-2">
                      <Check size={14} className="text-up-green" />
                      <span>Continuous Double Auction</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Makers place limit bids and asks on binary outcomes. Takers cross the spread with deterministic fill pricing and zero slippage on matched depth.
                    </p>
                  </div>

                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-text-primary mb-2">
                      <Check size={14} className="text-up-green" />
                      <span>45s Protocol Safety Cutoff</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      To prevent high-frequency oracle sniping, order intake locks exactly 45 seconds prior to window expiry. Only settlement resolution occurs at close.
                    </p>
                  </div>
                </div>

                {/* On-Chain Contract Registry */}
                <div className="p-4 bg-bg-raised border border-border-base rounded-[4px] font-mono text-xs">
                  <span className="text-[10px] text-text-dim uppercase tracking-wider block mb-2 font-bold">
                    Canonical Verified Contracts (Somnia Shannon Testnet):
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-between justify-between gap-1 py-1 border-b border-border-base/50">
                      <span className="text-text-secondary">Binary Markets Module:</span>
                      <span className="text-text-primary truncate font-mono text-[10px]">{CANONICAL_CONTRACTS.binaryMarketsModule}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-between justify-between gap-1 py-1 border-b border-border-base/50">
                      <span className="text-text-secondary">DreamDEX Markets Core:</span>
                      <span className="text-text-primary truncate font-mono text-[10px]">{CANONICAL_CONTRACTS.marketsCore}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-between justify-between gap-1 py-1 border-b border-border-base/50">
                      <span className="text-text-secondary">Pyth OracleHub:</span>
                      <span className="text-text-primary truncate font-mono text-[10px]">{CANONICAL_CONTRACTS.oracleHub}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-between justify-between gap-1 py-1">
                      <span className="text-text-secondary">Mock USDC Settlement Token:</span>
                      <span className="text-text-primary truncate font-mono text-[10px]">{CANONICAL_CONTRACTS.testUsdc}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 02: PRO TERMINAL & SCRIPTS */}
            {activeChapter === "terminal" && (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-border-base pb-4">
                  <span className="font-mono text-[10px] text-cyan-eval uppercase tracking-widest block mb-1">
                    CHAPTER 02 // QUANT ENVIRONMENT
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Pro Terminal Shell &amp; Automation
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                    Designed for algo traders and quants who prioritize speed, scriptability, and background evaluation over mouse clicks.
                  </p>
                </div>

                {/* Terminal Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-eval mb-2">
                      <Terminal size={14} />
                      <span>Persistent Virtual Shell</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Supports bash built-ins (<code className="text-cyan-eval">mkdir</code>, <code className="text-cyan-eval">cd</code>, <code className="text-cyan-eval">ls</code>, <code className="text-cyan-eval">cat</code>) with local storage persistence. Create directories, write custom notes, and inspect strategy configs.
                    </p>
                  </div>

                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-eval mb-2">
                      <Code2 size={14} />
                      <span>Background Watcher Daemons</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Spawn autonomous evaluators that monitor live Somnia CLOB order books in the background. When conditions trigger, executable suggestion cards appear directly in your prompt.
                    </p>
                  </div>
                </div>

                {/* Example CLI Commands */}
                <div className="bg-bg-raised border border-border-base rounded-[4px] overflow-hidden font-mono text-xs">
                  <div className="px-4 py-2 bg-bg-base border-b border-border-base text-text-dim text-[10px] uppercase font-semibold">
                    Live CLI Examples
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-text-dim text-[10px]"># 1. Query active market windows &amp; crowd lean</span>
                      <div className="text-cyan-eval font-bold">ferrule/~ $ markets</div>
                    </div>
                    <div>
                      <span className="text-text-dim text-[10px]"># 2. Place an order directly via CLI</span>
                      <div className="text-cyan-eval font-bold">ferrule/~ $ call BTC UP 50</div>
                    </div>
                    <div>
                      <span className="text-text-dim text-[10px]"># 3. Spawn an automated background watcher</span>
                      <div className="text-cyan-eval font-bold">ferrule/~ $ watch BTC-15m if lean&gt;=0.65 then suggest stake 250 down</div>
                    </div>
                    <div>
                      <span className="text-text-dim text-[10px]"># 4. Execute a quantitative algorithmic strategy script</span>
                      <div className="text-cyan-eval font-bold">ferrule/~ $ run /strategies/fade_crowd.sh</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 03: CROWD LEAN & PRICING */}
            {activeChapter === "pricing" && (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-border-base pb-4">
                  <span className="font-mono text-[10px] text-cyan-eval uppercase tracking-widest block mb-1">
                    CHAPTER 03 // QUANT MATHEMATICS
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Crowd Lean, Tension Clamp &amp; Payouts
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                    Ferrule transforms raw binary order books into continuous crowd-lean probabilities and calculates deterministic payout multipliers.
                  </p>
                </div>

                {/* Tension Clamp Visual Card */}
                <div className="p-5 bg-bg-raised border border-border-base rounded-[4px] space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-down-red font-bold">DOWN LEAN (32%)</span>
                    <span className="text-text-dim font-medium">NEUTRAL PIN (50%)</span>
                    <span className="text-up-green font-bold">UP LEAN (68%)</span>
                  </div>

                  {/* Visual Bar */}
                  <div className="h-3 w-full bg-bg-base border border-border-base rounded-full overflow-hidden flex relative">
                    <div className="bg-down-red/60 h-full" style={{ width: "32%" }}></div>
                    <div className="bg-up-green h-full" style={{ width: "68%" }}></div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-text-primary -translate-x-1/2"></div>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    When order volume disproportionately bids UP, the price per contract rises toward $0.99. When bids dry up, it drops toward $0.01.
                  </p>
                </div>

                {/* Math Formulas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <span className="text-[10px] text-text-dim uppercase block mb-1">Contract Entry Price</span>
                    <div className="text-sm font-bold text-text-primary mb-2">
                      P(UP) = Best Up Ask
                    </div>
                    <p className="font-sans text-xs text-text-secondary">
                      Represented in cents (e.g. 42¢). Bounded by safety limits [1¢, 99¢] to prevent division anomalies.
                    </p>
                  </div>

                  <div className="p-4 bg-bg-raised border border-border-base rounded-[4px]">
                    <span className="text-[10px] text-text-dim uppercase block mb-1">Potential Payout Multiplier</span>
                    <div className="text-sm font-bold text-text-primary mb-2">
                      Multiplier = 1 / P(Entry)
                    </div>
                    <p className="font-sans text-xs text-text-secondary">
                      A 40¢ entry pays out $1.00 USDC upon winning settlement (2.50x return). A 20¢ contrarian call pays 5.00x return.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAPTER 04: BRIER CALIBRATION & RISK */}
            {activeChapter === "calibration" && (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-border-base pb-4">
                  <span className="font-mono text-[10px] text-cyan-eval uppercase tracking-widest block mb-1">
                    CHAPTER 04 // VERIFIED CALIBRATION
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                    Brier Score Calibration &amp; Real Risk
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                    Master trading mechanics and prove empirical predictive edge in simulation before putting real capital at risk.
                  </p>
                </div>

                {/* Brier Score Formula Banner */}
                <div className="p-4 bg-bg-raised border border-border-base rounded-[4px] font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-eval uppercase">The Brier Calibration Metric</span>
                    <span className="text-[10px] text-text-dim">Lower = More Accurate</span>
                  </div>
                  <div className="p-3 bg-bg-base border border-border-base rounded-[3px] text-center text-sm sm:text-base font-bold text-text-primary tracking-wide">
                    B = (1 / N) · ∑ (fₜ - oₜ)²
                  </div>
                  <p className="font-sans text-xs text-text-secondary mt-2.5 leading-relaxed">
                    Measures the mean squared error between your assessed probability forecast (f) and the binary outcome (o ∈ &#123;0, 1&#125;).
                  </p>
                </div>

                {/* Score Benchmark Table */}
                <div className="border border-border-base rounded-[4px] overflow-hidden font-mono text-xs">
                  <div className="grid grid-cols-3 bg-bg-raised p-2.5 font-bold text-text-dim border-b border-border-base text-[10px] uppercase">
                    <span>Brier Score</span>
                    <span>Classification</span>
                    <span>Readiness Recommendation</span>
                  </div>
                  <div className="divide-y divide-border-base bg-bg-base">
                    <div className="grid grid-cols-3 p-2.5 items-center text-[11px]">
                      <span className="text-up-green font-bold">&lt; 0.15</span>
                      <span className="text-up-green font-semibold">Superforecaster</span>
                      <span className="text-text-secondary">Statistically validated edge. Ready for Real Mode.</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 items-center text-[11px]">
                      <span className="text-text-primary font-bold">0.15 - 0.24</span>
                      <span className="text-text-primary font-semibold">Positive Edge</span>
                      <span className="text-text-secondary">Profitable baseline. Fine-tune strategy weights.</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 items-center text-[11px]">
                      <span className="text-yellow-400 font-bold">0.25</span>
                      <span className="text-yellow-400 font-semibold">Uncalibrated</span>
                      <span className="text-text-secondary">Equivalent to 50/50 coin toss. Keep practicing.</span>
                    </div>
                    <div className="grid grid-cols-3 p-2.5 items-center text-[11px]">
                      <span className="text-down-red font-bold">&gt; 0.35</span>
                      <span className="text-down-red font-semibold">Inverted Bias</span>
                      <span className="text-text-secondary">Negative expectancy. Review contrarian fade tactics.</span>
                    </div>
                  </div>
                </div>

                {/* Transition Guarantee */}
                <div className="p-4 bg-bg-raised border border-border-base rounded-[4px] flex items-start gap-3">
                  <ShieldCheck size={18} className="text-cyan-eval shrink-0 mt-0.5" />
                  <div className="text-xs text-text-secondary leading-relaxed">
                    <strong className="text-text-primary block font-mono text-[11px] mb-1">
                      100% Non-Custodial &amp; Deterministic
                    </strong>
                    Switching to Real Mode executes orders directly against Somnia Shannon (50312) contracts using your Web3 wallet. Ferrule never holds your private keys, funds, or collateral.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="h-14 px-4 sm:px-6 border-t border-border-base bg-bg-raised flex items-center justify-between shrink-0 font-mono text-xs">
          {/* Left: Previous Chapter */}
          <div>
            {currentIdx > 0 ? (
              <button
                onClick={() => setActiveChapter(CHAPTERS[currentIdx - 1].id)}
                className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1.5 px-2 rounded-[3px] border border-border-base hover:border-border-interactive"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Chapter {CHAPTERS[currentIdx - 1].number}</span>
                <span>Prev</span>
              </button>
            ) : (
              <span className="text-text-dim text-[11px]">Start of Guide</span>
            )}
          </div>

          {/* Center: Interactive Chapter Progress Dots */}
          <div className="flex items-center gap-2">
            {CHAPTERS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`h-1.5 transition-all rounded-full cursor-pointer ${
                  ch.id === activeChapter ? "w-6 bg-cyan-eval" : "w-1.5 bg-border-interactive hover:bg-text-dim"
                }`}
                title={ch.title}
              />
            ))}
          </div>

          {/* Right: Next Chapter OR Quick Launch CTAs */}
          <div className="flex items-center gap-2">
            {currentIdx < CHAPTERS.length - 1 ? (
              <button
                onClick={() => setActiveChapter(CHAPTERS[currentIdx + 1].id)}
                className="flex items-center gap-1.5 text-text-primary hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-[3px] border border-border-interactive hover:border-cyan-eval/60 bg-bg-base"
              >
                <span>Next</span>
                <span className="hidden sm:inline">Chapter {CHAPTERS[currentIdx + 1].number}</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onLaunchBasic();
                  }}
                  className="hidden sm:flex items-center gap-1 py-1.5 px-2.5 rounded-[3px] border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <Layers size={13} className="text-up-green" />
                  <span>Basic View</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onLaunchTerminal();
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-[3px] bg-cyan-eval text-[#0a0a0f] font-bold hover:bg-cyan-eval/90 transition-colors cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                >
                  <Terminal size={13} />
                  <span>Launch Pro Terminal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
