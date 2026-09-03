import React, { useState } from "react";
import { 
  Play, 
  Pause, 
  Trash2, 
  Terminal, 
  Cpu, 
  Sliders, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import type { StrategyType, BotConfig } from "../bot/types.js";
import { DEFAULT_BOT_CONFIGS, StrategyBotEngine } from "../bot/strategyEngine.js";

interface BotTerminalProps {
  botEngine: StrategyBotEngine;
  onConfigChange: (updates: Partial<BotConfig>) => void;
}

export function BotTerminal({ botEngine, onConfigChange }: BotTerminalProps) {
  const config = botEngine.getConfig();
  const logs = botEngine.getLogs();
  const stats = botEngine.getStats();

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(config.strategy);

  function handleSelectStrategy(strat: StrategyType) {
    setSelectedStrategy(strat);
    const preset = DEFAULT_BOT_CONFIGS[strat];
    onConfigChange({
      strategy: strat,
      name: preset.name,
      stakePerTrade: preset.stakePerTrade,
      fadeThreshold: preset.fadeThreshold,
      trendThreshold: preset.trendThreshold,
      maxCadenceSec: preset.maxCadenceSec,
    });
  }

  function toggleBotActive() {
    onConfigChange({ active: !config.active });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Bot HUD Stats Bar */}
      <div className="metrics-row">
        <div className="metric-card" style={{ borderLeft: `4px solid ${config.active ? "var(--up-color)" : "var(--warning)"}` }}>
          <span className="metric-title">Bot Status</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span
              className="pulse-dot"
              style={{
                backgroundColor: config.active ? "var(--up-color)" : "var(--warning)",
                boxShadow: `0 0 8px ${config.active ? "var(--up-color)" : "var(--warning)"}`,
              }}
            ></span>
            <span className="metric-value" style={{ fontSize: "1.35rem" }}>
              {config.active ? "SCANNING LIVE" : "PAUSED"}
            </span>
          </div>
          <span className="metric-sub">{config.name} ({config.mode.toUpperCase()})</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Bot Net PnL</span>
          <span
            className="metric-value mono"
            style={{ color: stats.totalPnl >= 0 ? "var(--up-color)" : "var(--down-color)" }}
          >
            {stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}
          </span>
          <span className="metric-sub">
            {stats.wonTrades} Won · {stats.lostTrades} Lost · {stats.voidedTrades} Void
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Bot Win Rate</span>
          <span className="metric-value mono">
            {(stats.winRate * 100).toFixed(1)}%
          </span>
          <span className="metric-sub">{stats.settledTrades} Settled Trades</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Brier Accuracy Score</span>
          <span className="metric-value mono">
            {stats.brierScore !== null ? stats.brierScore.toFixed(3) : "N/A"}
          </span>
          <span className="metric-sub">Mean Squared Error vs True Outcomes</span>
        </div>
      </div>

      {/* Strategy Control & Settings Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* Left: Strategy Presets */}
        <div className="metric-card" style={{ gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cpu size={18} color="var(--somnia-accent)" /> Active Strategy Profile
            </h3>
            <button
              className={`mode-btn ${config.active ? "active real" : "practice"}`}
              style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}
              onClick={toggleBotActive}
            >
              {config.active ? <><Pause size={14} /> Pause Bot</> : <><Play size={14} /> Run Bot</>}
            </button>
          </div>

          {/* Strategy selector pills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <button
              className={`tab-btn ${selectedStrategy === "fade_crowd" ? "active" : ""}`}
              style={{ justifyContent: "center", fontSize: "0.8rem" }}
              onClick={() => handleSelectStrategy("fade_crowd")}
            >
              Fade Crowd (Contrarian)
            </button>
            <button
              className={`tab-btn ${selectedStrategy === "momentum_trend" ? "active" : ""}`}
              style={{ justifyContent: "center", fontSize: "0.8rem" }}
              onClick={() => handleSelectStrategy("momentum_trend")}
            >
              Momentum Breakout
            </button>
            <button
              className={`tab-btn ${selectedStrategy === "calibration_value" ? "active" : ""}`}
              style={{ justifyContent: "center", fontSize: "0.8rem" }}
              onClick={() => handleSelectStrategy("calibration_value")}
            >
              Brier Value Arb
            </button>
            <button
              className={`tab-btn ${selectedStrategy === "custom" ? "active" : ""}`}
              style={{ justifyContent: "center", fontSize: "0.8rem" }}
              onClick={() => handleSelectStrategy("custom")}
            >
              Custom Strategy
            </button>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {selectedStrategy === "fade_crowd" &&
              "Fades extreme crowd consensus. Automatically calls DOWN when Up Lean exceeds the threshold (>80%), exploiting overextended binary order books."}
            {selectedStrategy === "momentum_trend" &&
              "Rides dominant momentum. Triggers calls in the direction of accelerating order book imbalance when depth volume confirms direction."}
            {selectedStrategy === "calibration_value" &&
              "Statistical arbitrage bot. Exploits probability mispricings where the live market deviates from historical empirical settlement frequencies."}
            {selectedStrategy === "custom" &&
              "Fully custom rule builder. Tailor your own trigger thresholds, assets, and lot sizes based on your practice learnings."}
          </p>
        </div>

        {/* Right: Strategy Parameters */}
        <div className="metric-card" style={{ gap: "0.85rem" }}>
          <h3 style={{ fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={18} color="#38bdf8" /> Execution Parameters
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Stake Per Trade (USDso)
              </label>
              <input
                type="number"
                className="stake-input mono"
                style={{ padding: "0.45rem 0.75rem", fontSize: "1rem" }}
                value={config.stakePerTrade}
                onChange={(e) => onConfigChange({ stakePerTrade: Number(e.target.value) })}
                min={1}
                max={100}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Target Asset
              </label>
              <select
                className="stake-input"
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", color: "white" }}
                value={config.targetAsset}
                onChange={(e) => onConfigChange({ targetAsset: e.target.value as any })}
              >
                <option value="ALL">ALL Assets (BTC + ETH + SOL)</option>
                <option value="BTC">BTC Only</option>
                <option value="ETH">ETH Only</option>
                <option value="SOL">SOL Only</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Trigger Threshold ({selectedStrategy === "fade_crowd" ? "Fade %" : "Trend %"})
              </label>
              <input
                type="range"
                min={55}
                max={90}
                value={selectedStrategy === "fade_crowd" ? config.fadeThreshold : config.trendThreshold}
                onChange={(e) =>
                  onConfigChange(
                    selectedStrategy === "fade_crowd"
                      ? { fadeThreshold: Number(e.target.value) }
                      : { trendThreshold: Number(e.target.value) }
                  )
                }
                style={{ width: "100%", accentColor: "var(--somnia-accent)", marginTop: "0.3rem" }}
              />
              <span className="mono" style={{ fontSize: "0.8rem", color: "var(--somnia-accent)", fontWeight: 700 }}>
                {selectedStrategy === "fade_crowd" ? `${config.fadeThreshold}% Lean` : `${config.trendThreshold}% Lean`}
              </span>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                Cadence Filter
              </label>
              <select
                className="stake-input"
                style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", color: "white" }}
                value={config.maxCadenceSec}
                onChange={(e) => onConfigChange({ maxCadenceSec: Number(e.target.value) })}
              >
                <option value={0}>All Cadences (60s to 24h)</option>
                <option value={60}>Fast Scalp (60s only)</option>
                <option value={300}>Short Windows (≤ 300s)</option>
                <option value={900}>Medium Windows (≤ 900s)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cyberpunk Bot Terminal Output */}
      <div
        style={{
          background: "#08090d",
          border: "1px solid #1e2433",
          borderRadius: "0.85rem",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            background: "#0f121a",
            padding: "0.6rem 1rem",
            borderBottom: "1px solid #1e2433",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", fontWeight: 700 }}>
            <Terminal size={15} color="var(--up-color)" />
            <span className="mono" style={{ color: "#e2e8f0" }}>BOT LIVE EXECUTION STREAM · SOMNIA TESTNET (50312)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
              {logs.length} log events
            </span>
            <button
              onClick={() => botEngine.clearLogs()}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.2rem",
                fontSize: "0.75rem",
              }}
              title="Clear terminal"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        </div>

        {/* Console Log Rows */}
        <div
          className="mono"
          style={{
            padding: "1rem",
            maxHeight: "340px",
            minHeight: "220px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            fontSize: "0.78rem",
            lineHeight: 1.45,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "2rem" }}>
              Terminal idle. Click "Run Bot" to start scanning active CLOB market windows.
            </div>
          ) : (
            logs.map((l) => {
              const timeStr = new Date(l.timestamp).toLocaleTimeString();
              let color = "#94a3b8";
              if (l.level === "SIGNAL") color = "#38bdf8";
              if (l.level === "ORDER") color = "#f59e0b";
              if (l.level === "SUCCESS") color = "var(--up-color)";
              if (l.level === "WARN") color = "var(--down-color)";
              if (l.level === "SETTLE") color = "#a855f7";

              return (
                <div key={l.id} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                  <span style={{ color: "#475569" }}>[{timeStr}]</span>
                  <span style={{ color, fontWeight: 700, minWidth: "60px" }}>[{l.level}]</span>
                  <span style={{ color: "#cbd5e1", flex: 1 }}>{l.text}</span>
                  {l.txHash && (
                    <span style={{ color: "#64748b", fontSize: "0.7rem" }}>
                      {l.txHash.slice(0, 8)}...
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
