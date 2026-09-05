import React, { useState, useEffect, useMemo, useRef } from "react";
import type { TradingMode, OpenWindow } from "../../types/index.js";
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Plus, 
  RotateCcw, 
  Check, 
  Terminal
} from "lucide-react";

export interface StrategyRule {
  id: string;
  name: string;
  symbol: string;
  category: "MOMENTUM" | "CONTRARIAN" | "VOLATILITY" | "TREND" | "SQUEEZE" | "TAIL-RISK";
  status: "running" | "paused";
  pid?: number;
  lastTrigger: string;
  ruleCode: string;
  totalEvals: number;
  hits: number;
  hitRate: number;
  sparkline: number[];
}

interface StrategyLibraryProps {
  mode: TradingMode;
  windows: OpenWindow[];
  bankroll: number;
  realBalance?: string;
  onOpenTerminalWithCommand?: (command: string) => void;
}

const INITIAL_STRATEGIES: StrategyRule[] = [
  {
    id: "strat_1",
    name: "BTC-15m-LeanWatcher",
    symbol: "BTC",
    category: "MOMENTUM",
    status: "running",
    pid: 401,
    lastTrigger: "14m ago",
    ruleCode: "watch BTC-15m if lean >= 0.65 AND spread < 0.005 then suggest stake 250 up",
    totalEvals: 1420,
    hits: 89,
    hitRate: 64.2,
    sparkline: [18, 16, 20, 10, 14, 8, 12, 4, 8, 3, 5],
  },
  {
    id: "strat_2",
    name: "ETH-5m-MeanReversion",
    symbol: "ETH",
    category: "CONTRARIAN",
    status: "running",
    pid: 404,
    lastTrigger: "3m ago",
    ruleCode: "watch ETH-5m if dev_sigma >= 2.4 AND book_skew <= -0.40 then suggest stake 150 down",
    totalEvals: 964,
    hits: 62,
    hitRate: 68.1,
    sparkline: [22, 20, 14, 16, 12, 8, 10, 6, 8, 4],
  },
  {
    id: "strat_3",
    name: "SOL-15m-Breakout",
    symbol: "SOL",
    category: "VOLATILITY",
    status: "running",
    pid: 412,
    lastTrigger: "58m ago",
    ruleCode: "watch SOL-15m if volume_burst >= 3.2x AND oracle_delta > +0.85% then suggest stake 300 up",
    totalEvals: 812,
    hits: 47,
    hitRate: 59.3,
    sparkline: [15, 12, 18, 11, 14, 9, 13, 7, 10, 6],
  },
  {
    id: "strat_4",
    name: "AVAX-1h-TrendFollow",
    symbol: "AVAX",
    category: "TREND",
    status: "running",
    pid: 429,
    lastTrigger: "2h 11m ago",
    ruleCode: "watch AVAX-1h if ema_cross == bullish AND vwap_dist < 0.002 then suggest stake 100 up",
    totalEvals: 512,
    hits: 29,
    hitRate: 72.4,
    sparkline: [12, 10, 15, 8, 11, 6, 9, 4, 7, 3],
  },
  {
    id: "strat_5",
    name: "ETH-15m-VolatilityCompression",
    symbol: "ETH",
    category: "SQUEEZE",
    status: "paused",
    pid: undefined,
    lastTrigger: "PAUSED (RE-CALIBRATING)",
    ruleCode: "watch ETH-15m if bb_width <= 0.012 AND rsi_14 between [48, 52] then suggest stake 100 neutral",
    totalEvals: 740,
    hits: 21,
    hitRate: 47.6,
    sparkline: [14, 14, 15, 15, 16, 16, 15, 16, 17, 16],
  },
  {
    id: "strat_6",
    name: "BTC-5m-HighConfidenceSpike",
    symbol: "BTC",
    category: "TAIL-RISK",
    status: "paused",
    pid: undefined,
    lastTrigger: "PAUSED (MANUAL)",
    ruleCode: "watch BTC-5m if taker_imbalance >= 0.82 AND funding_rate <= -0.02% then suggest stake 500 up",
    totalEvals: 444,
    hits: 18,
    hitRate: 50.0,
    sparkline: [16, 15, 14, 15, 13, 14, 12, 13, 11, 12],
  },
];

const STORAGE_KEY = "ferrule_saved_strategies_v1";

export function StrategyLibrary({
  mode,
  windows,
  bankroll,
  realBalance,
  onOpenTerminalWithCommand,
}: StrategyLibraryProps) {
  const [strategies, setStrategies] = useState<StrategyRule[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return INITIAL_STRATEGIES;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "running" | "paused">("all");
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [metricsPurged, setMetricsPurged] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Persist to local storage
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
      } catch {}
    }
  }, [strategies]);

  // Press "/" to focus search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    return strategies.filter((s) => {
      const matchSearch =
        searchTerm === "" ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.ruleCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === "all" || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [strategies, searchTerm, filterStatus]);

  // Telemetry Aggregates
  const runningCount = strategies.filter((s) => s.status === "running").length;
  const pausedCount = strategies.filter((s) => s.status === "paused").length;
  const totalEvals = strategies.reduce((acc, s) => acc + s.totalEvals, 0);
  const avgHitRate = strategies.length > 0 
    ? (strategies.reduce((acc, s) => acc + s.hitRate, 0) / strategies.length).toFixed(1)
    : "0.0";

  // Actions
  function handleToggleStatus(id: string) {
    setStrategies((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === "running" ? "paused" : "running";
          return {
            ...s,
            status: nextStatus,
            pid: nextStatus === "running" ? Math.floor(Math.random() * 800) + 400 : undefined,
          };
        }
        return s;
      })
    );
  }

  function handleDelete(id: string) {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }

  function handleExportAll() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(strategies, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ferrule_strategies_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportFeedback(`PACKED ${strategies.length} RULES`);
    setTimeout(() => setExportFeedback(null), 2000);
  }

  function handleResetMetrics() {
    if (confirm("Confirm zeroing empirical counters across all rule models?")) {
      setStrategies((prev) =>
        prev.map((s) => ({
          ...s,
          totalEvals: 0,
          hits: 0,
          hitRate: 0,
          sparkline: [10, 10, 10, 10, 10],
        }))
      );
      setMetricsPurged(true);
      setTimeout(() => setMetricsPurged(false), 2000);
    }
  }

  const oracleRound = windows.length > 0 ? windows[0].marketId.slice(0, 10) : "1044-SOL-PYTH";

  return (
    <div className="flex-1 flex flex-col bg-bg-base overflow-y-auto pb-16 sm:pb-4">
      {/* 1. Telemetry Ribbon */}
      <div className="w-full bg-bg-raised/70 border-b border-border-base px-4 py-2 flex flex-wrap items-center justify-between font-mono text-[11px] text-text-secondary gap-y-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-text-dim uppercase tracking-wider">TELEMETRY:</span>
          <span className="text-text-primary">
            ORACLE ROUND: <span className="text-cyan-eval">#{oracleRound}</span>
          </span>
          <span className="text-text-dim">•</span>
          <span className="text-text-primary">
            CADENCE: <span className="text-text-primary font-medium">300s (5M)</span>
          </span>
          <span className="text-text-dim">•</span>
          <span>
            BALANCE:{" "}
            <span className="text-up-green font-semibold">
              {mode === "practice" ? `${bankroll.toFixed(2)} SIM-USDC` : `${realBalance ?? "0.00"} USDC`}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-dim">SNAPSHOT FREQUENCY: 1000ms</span>
          <span className="px-2 py-0.5 border border-border-interactive text-text-dim">
            SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* 2. Primary Workspace Content */}
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-7xl w-full mx-auto">
        {/* Top Action & Info Block */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border-base pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-semibold text-text-primary tracking-tight font-mono">
                Strategy Library
              </h1>
              <span className="font-mono text-[11px] text-text-dim border border-border-base px-1.5 py-0.5 bg-bg-raised">
                CONFIG_HASH: 7f4a210d
              </span>
            </div>
            <p className="font-mono text-[12px] text-text-dim mt-1">
              Persisted rule definitions and empirical trigger rates across oracle settlement cycles.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-left sm:text-right">
              <button
                onClick={() => onOpenTerminalWithCommand?.("watch BTC-300s if lean>=0.70 then suggest stake 50 up")}
                className="h-9 px-4 bg-[#f0f0f5] text-[#0a0a0f] font-mono text-[13px] font-semibold border border-[#f0f0f5] hover:bg-neutral-gray hover:border-neutral-gray hover:text-text-primary transition-colors flex items-center gap-2 cursor-pointer"
                type="button"
              >
                <Plus size={16} />
                <span>+ New Strategy</span>
              </button>
              <div className="font-mono text-[10px] text-text-dim mt-1 tracking-tight">
                Opens terminal prompt buffer (sh:0)
              </div>
            </div>
          </div>
        </div>

        {/* 3. Aggregated Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-border-base bg-bg-raised divide-x divide-border-base">
          <div className="p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] text-text-dim uppercase">SAVED RULES</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[24px] font-bold text-text-primary leading-none">
                {strategies.length}
              </span>
              <span className="font-mono text-[11px] text-text-dim">DEFINED</span>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] text-text-dim uppercase">ACTIVE POLLING</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[24px] font-bold text-up-green leading-none">
                {runningCount}
              </span>
              <span className="font-mono text-[11px] text-text-dim">/ {pausedCount} PAUSED</span>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] text-text-dim uppercase">AVG HIT RATE</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[24px] font-bold text-up-green leading-none">
                {avgHitRate}%
              </span>
              <span className="font-mono text-[11px] text-cyan-eval">▲ +2.1%</span>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] text-text-dim uppercase">TOTAL EVALS</span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[24px] font-bold text-text-primary leading-none">
                {totalEvals.toLocaleString()}
              </span>
              <span className="font-mono text-[11px] text-text-dim">TICKS</span>
            </div>
          </div>
        </div>

        {/* 4. Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-dim font-mono text-[12px]">
              &gt;
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by symbol, directive, or condition... [Press / to search]"
              className="w-full h-9 pl-7 pr-8 bg-bg-raised border border-border-base text-text-primary font-mono text-[12px] placeholder:text-text-dim focus:border-border-interactive focus:outline-none transition-colors"
            />
            <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[10px] font-mono text-text-dim border border-border-base px-1.5 my-auto h-4 leading-none">
              /
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] overflow-x-auto">
            <span className="text-text-dim shrink-0">FILTER STATUS:</span>
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
                filterStatus === "all"
                  ? "bg-bg-base border-border-interactive text-text-primary"
                  : "bg-bg-raised border-border-base text-text-dim hover:text-text-primary"
              }`}
            >
              ALL ({strategies.length})
            </button>
            <button
              onClick={() => setFilterStatus("running")}
              className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
                filterStatus === "running"
                  ? "bg-bg-base border-border-interactive text-text-primary"
                  : "bg-bg-raised border-border-base text-text-dim hover:text-text-primary"
              }`}
            >
              RUNNING ({runningCount})
            </button>
            <button
              onClick={() => setFilterStatus("paused")}
              className={`px-2.5 py-1 border transition-colors cursor-pointer shrink-0 ${
                filterStatus === "paused"
                  ? "bg-bg-base border-border-interactive text-text-primary"
                  : "bg-bg-raised border-border-base text-text-dim hover:text-text-primary"
              }`}
            >
              PAUSED ({pausedCount})
            </button>
          </div>
        </div>

        {/* 5. Strategy Cards Stack */}
        <div className="flex flex-col gap-3">
          {filteredStrategies.map((rule) => {
            const isRunning = rule.status === "running";
            return (
              <div
                key={rule.id}
                className="bg-bg-raised border border-border-base hover:border-border-interactive p-4 transition-colors font-mono"
              >
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                  {/* Left: State & Condition */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center pt-0.5 w-14 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isRunning ? "bg-up-green" : "bg-text-dim"
                        }`}
                      />
                      <span
                        className={`text-[10px] tracking-wider mt-1 font-semibold ${
                          isRunning ? "text-up-green" : "text-text-dim"
                        }`}
                      >
                        {isRunning ? "RUNNING" : "PAUSED"}
                      </span>
                      <span className="text-[9px] text-text-dim mt-0.5">
                        {rule.pid ? `PID:${rule.pid}` : "IDLE"}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[14px] font-semibold text-text-primary tracking-tight">
                          {rule.name}
                        </span>
                        <span className="px-1.5 py-0.5 border border-border-base text-[10px] text-cyan-eval uppercase">
                          {rule.category}
                        </span>
                        <span className="text-[11px] text-text-dim">
                          LAST TRIGGER: {rule.lastTrigger}
                        </span>
                      </div>

                      {/* DSL Syntax Block */}
                      <div className="mt-2 p-2.5 bg-bg-base border border-border-base text-[12px] overflow-x-auto select-all leading-relaxed">
                        <span className="text-cyan-eval">watch </span>
                        <span className="text-text-primary font-semibold">{rule.symbol}-15m </span>
                        <span className="text-text-dim">if </span>
                        <span className="text-text-primary">{rule.ruleCode.split("if ")[1]?.split(" then")[0] ?? "condition"} </span>
                        <span className="text-cyan-eval">then </span>
                        <span className="text-text-dim">suggest stake </span>
                        <span className="text-up-green font-semibold">
                          {rule.ruleCode.includes("up") ? "250 up" : "150 down"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Sparkline & Metrics */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between xl:justify-end gap-6 w-full xl:w-auto pt-2 xl:pt-0 border-t xl:border-t-0 border-border-base">
                    {/* SVG Sparkline */}
                    <div className="flex flex-col items-start xl:items-end">
                      <span className="text-[10px] text-text-dim tracking-wider uppercase mb-1">
                        LAST 30 EVALS
                      </span>
                      <div className="w-[120px] h-[28px] flex items-center">
                        <svg className="overflow-visible" fill="none" height="28" viewBox="0 0 120 28" width="120">
                          {renderSparkline(rule.sparkline, isRunning ? "#00e676" : "#6b6b7a")}
                        </svg>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 border-l border-border-base pl-4 text-[12px]">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-dim uppercase">TOTAL</span>
                        <span className="text-text-primary font-medium">{rule.totalEvals}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-dim uppercase">HITS</span>
                        <span className="text-text-primary font-medium">{rule.hits} hits</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-dim uppercase">HIT RATE</span>
                        <span className={`font-semibold ${isRunning ? "text-up-green" : "text-text-dim"}`}>
                          {rule.hitRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 border-l border-border-base pl-3">
                      <button
                        onClick={() => handleToggleStatus(rule.id)}
                        className="w-8 h-8 flex items-center justify-center border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title={isRunning ? "Pause Rule" : "Activate Rule"}
                      >
                        {isRunning ? <Pause size={14} /> : <Play size={14} />}
                      </button>

                      <button
                        onClick={() => onOpenTerminalWithCommand?.(rule.ruleCode)}
                        className="w-8 h-8 flex items-center justify-center border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Load in Terminal"
                      >
                        <Terminal size={14} />
                      </button>

                      <button
                        onClick={() => {
                          const blob = new Blob([rule.ruleCode], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${rule.name}.sh`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-8 h-8 flex items-center justify-center border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        title="Download .sh Script"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="w-8 h-8 flex items-center justify-center border border-border-base hover:border-down-red text-text-secondary hover:text-down-red transition-colors cursor-pointer"
                        title="Delete Strategy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. Quick Terminal Bridge Console Bar */}
        <div className="border border-border-base bg-bg-raised p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-up-green shrink-0" />
            <span className="text-[11px] text-up-green font-semibold">ferrule:rules#</span>
            <span className="text-[12px] text-text-secondary truncate">
              rule-eval-daemon --threads=4 --tick-interval=1000ms --dump-path=/var/log/ferrule/rules.db
            </span>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto shrink-0 text-[11px]">
            <button
              onClick={handleExportAll}
              className="h-7 px-3 border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 bg-bg-base cursor-pointer"
              type="button"
            >
              {exportFeedback ? (
                <>
                  <Check size={14} className="text-up-green" />
                  <span className="text-up-green">{exportFeedback}</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>EXPORT ALL (JSON)</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetMetrics}
              className="h-7 px-3 border border-border-base hover:border-down-red text-text-dim hover:text-down-red transition-colors flex items-center gap-1.5 bg-bg-base cursor-pointer"
              type="button"
            >
              <RotateCcw size={14} />
              <span>{metricsPurged ? "METRICS PURGED" : "RESET HIT METRICS"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSparkline(points: number[], color: string) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points, 25);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 120;
  const height = 24;
  const step = width / (points.length - 1);

  const coords = points.map((val, idx) => {
    const x = idx * step;
    const y = height - ((val - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M${coords.join(" L")}`;
  const lastPoint = coords[coords.length - 1].split(",");

  return (
    <>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" fill={color} />
    </>
  );
}
