import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Clock, 
  ExternalLink, 
  Award, 
  History, 
  Layers, 
  AlertTriangle,
  Bot,
  X
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useWalletClient } from "wagmi";
import { LiveDataLayer } from "../data/marketData.js";
import { PracticeEngine } from "../engine/practiceEngine.js";
import { RealEngine } from "../engine/realEngine.js";
import { SettlementEngine } from "../engine/settlementEngine.js";
import { ScorecardService } from "../scoring/scorecard.js";
import { DEFAULT_BOT_CONFIGS, StrategyBotEngine } from "../bot/strategyEngine.js";
import { BotTerminal } from "./BotTerminal.js";
import type { 
  OpenWindow, 
  Call, 
  CallDirection, 
  TradingMode, 
  CalibrationScorecard 
} from "../types/shared.js";
import type { BotConfig } from "../bot/types.js";

// Initialize singletons
const dataLayer = new LiveDataLayer();
const practiceEngine = new PracticeEngine({ initialBankroll: 1000, maxStakePerCall: 100 });
const botEngine = new StrategyBotEngine(DEFAULT_BOT_CONFIGS.fade_crowd, practiceEngine);

export default function App() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [mode, setMode] = useState<TradingMode>("practice");
  const [activeTab, setActiveTab] = useState<"markets" | "bot" | "scorecard" | "history">("markets");
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [bankroll, setBankroll] = useState<number>(practiceEngine.getBankroll());
  const [loading, setLoading] = useState(true);
  const [, setBotTick] = useState(0);

  // Initialize RealEngine and SettlementEngine from wagmi walletClient
  const realEngine = useMemo(() => {
    if (isConnected && walletClient) {
      return new RealEngine(dataLayer.client, { walletClient });
    }
    return null;
  }, [isConnected, walletClient]);

  const settlementEngine = useMemo(() => {
    if (realEngine) {
      return new SettlementEngine(dataLayer.client, { trader: (realEngine as any).trader });
    }
    return new SettlementEngine(dataLayer.client);
  }, [realEngine]);

  // Call modal state
  const [selectedWindow, setSelectedWindow] = useState<OpenWindow | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<CallDirection | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(25);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transition modal state
  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);

  // Load persisted calls on mount
  useEffect(() => {
    try {
      const savedCalls = localStorage.getItem("ferrule_calls");
      if (savedCalls) {
        const parsed: Call[] = JSON.parse(savedCalls);
        setCalls(parsed);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  // Save calls to localStorage when changed
  useEffect(() => {
    try {
      if (calls.length > 0) {
        localStorage.setItem("ferrule_calls", JSON.stringify(calls));
      }
    } catch {
      // LocalStorage unavailable
    }
  }, [calls]);

  // Fetch live market data and feed bot
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const liveWindows = await dataLayer.getOpenWindows();
        if (mounted) {
          setWindows(liveWindows);
          setLoading(false);

          // Feed live windows to Strategy Bot Engine
          const botPlacedCall = await botEngine.evaluateTick(liveWindows);
          if (botPlacedCall) {
            setCalls(practiceEngine.getCalls());
            setBankroll(practiceEngine.getBankroll());
            setBotTick((t) => t + 1);
          }
        }
      } catch (err) {
        console.error("Failed to load windows", err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Tick countdown timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setWindows((prev) =>
        prev.map((w) => ({
          ...w,
          secondsRemaining: Math.max(0, w.expiry - Math.floor(Date.now() / 1000)),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Settlement watcher for pending calls (running against on-chain truth)
  useEffect(() => {
    const settlementInterval = setInterval(async () => {
      const pendingCalls = calls.filter((c) => c.settlementStatus === "pending");
      if (pendingCalls.length === 0) return;

      let updated = false;

      for (const c of pendingCalls) {
        try {
          const info = await dataLayer.getSettledMarketInfo(c.marketId);
          if (info.isResolved || info.isVoided) {
            if (c.mode === "practice") {
              const settledCall = practiceEngine.settleCall(c.id, {
                isResolved: info.isResolved,
                isVoided: info.isVoided,
                winningOutcome: info.winningOutcome,
              });
              botEngine.updateSettledCall(settledCall);
              setBankroll(practiceEngine.getBankroll());
            } else {
              // Real mode settlement evaluation
              await settlementEngine.evaluateCallSettlement(c);
            }
            updated = true;
          }
        } catch {
          // Market still pending or awaiting oracle answer
        }
      }

      if (updated) {
        setCalls([...calls]);
        setBotTick((t) => t + 1);
      }
    }, 4000);

    return () => clearInterval(settlementInterval);
  }, [calls, settlementEngine]);

  function handleSwitchMode(newMode: TradingMode) {
    if (newMode === "real" && mode === "practice") {
      setShowTransitionModal(true);
    } else {
      setMode(newMode);
    }
  }

  function confirmSwitchToReal() {
    setMode("real");
    setShowTransitionModal(false);
  }

  function openCallModal(window: OpenWindow, direction: CallDirection) {
    setSelectedWindow(window);
    setSelectedDirection(direction);
    setStakeAmount(25);
    setTxError(null);
  }

  async function executeCall() {
    if (!selectedWindow || !selectedDirection) return;
    setTxError(null);
    setIsSubmitting(true);

    try {
      if (mode === "practice") {
        const call = practiceEngine.placeCall(selectedWindow, selectedDirection, stakeAmount);
        setCalls(practiceEngine.getCalls());
        setBankroll(practiceEngine.getBankroll());
        setSelectedWindow(null);
      } else {
        // Real Mode execution via connected wallet
        if (!isConnected || !realEngine) {
          throw new Error("Please connect your wallet on Somnia Testnet (50312) to trade in Real Mode.");
        }
        const call = await realEngine.placeCall(selectedWindow, selectedDirection, stakeAmount);
        setCalls((prev) => [call, ...prev]);
        setSelectedWindow(null);
      }
    } catch (err: any) {
      setTxError(err.message || "Execution failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClaimWinnings(call: Call) {
    if (!isConnected || !realEngine) {
      alert("Please connect your wallet to claim winnings.");
      return;
    }
    try {
      await settlementEngine.redeemWinningCall(call);
      setCalls([...calls]);
      alert(`Winnings claimed successfully! Tx: ${call.redeemTxHash?.slice(0, 10)}...`);
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    }
  }

  function handleBotConfigChange(updates: Partial<BotConfig>) {
    botEngine.updateConfig(updates);
    setBotTick((t) => t + 1);
  }

  const currentScorecard: CalibrationScorecard = ScorecardService.computeScorecard(calls, mode);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-icon">BP</div>
          <div>
            <h1 className="brand-title">Book Pulse</h1>
            <div className="brand-tagline">DreamDEX Event Contracts · Crowd Lean & Strategy Terminal</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="network-badge">
            <span className="pulse-dot"></span>
            <span>Somnia Shannon (50312)</span>
          </div>

          {/* Mode Switcher */}
          <div className="mode-toggle-container">
            <button
              className={`mode-btn practice ${mode === "practice" ? "active" : ""}`}
              onClick={() => handleSwitchMode("practice")}
            >
              <ShieldCheck size={14} />
              Practice Mode
            </button>
            <button
              className={`mode-btn real ${mode === "real" ? "active" : ""}`}
              onClick={() => handleSwitchMode("real")}
            >
              <Zap size={14} />
              Real Trading
            </button>
          </div>

          {/* Established RainbowKit Connect Button */}
          <ConnectButton 
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />

          {mode === "practice" && (
            <div className="bankroll-card">
              <span className="bankroll-label">Practice Bankroll</span>
              <span className="bankroll-val mono">${bankroll.toFixed(2)} USDso</span>
            </div>
          )}
        </div>
      </header>

      {/* Real Mode Notices */}
      {mode === "real" && (
        <div className="transition-banner">
          <ShieldCheck size={28} color="#10b981" />
          <div style={{ flex: 1 }}>
            <h4>Direct Wallet Signing Active · 100% Self-Custodial</h4>
            <p>
              By protocol design, Event Contracts feature no delegated session keys. Every real order signs directly from your wallet.
              {!isConnected && (
                <strong style={{ color: "var(--warning)", display: "block", marginTop: "0.25rem" }}>
                  Please connect your wallet using the RainbowKit connector in the header.
                </strong>
              )}
            </p>
          </div>
          {!isConnected && (
            <ConnectButton />
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "markets" ? "active" : ""}`}
          onClick={() => setActiveTab("markets")}
        >
          <Layers size={16} />
          Live Windows ({windows.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "bot" ? "active" : ""}`}
          onClick={() => setActiveTab("bot")}
        >
          <Bot size={16} color={botEngine.getConfig().active ? "var(--up-color)" : undefined} />
          Bot Terminal {botEngine.getConfig().active && <span className="pulse-dot" style={{ width: "6px", height: "6px" }}></span>}
        </button>
        <button
          className={`tab-btn ${activeTab === "scorecard" ? "active" : ""}`}
          onClick={() => setActiveTab("scorecard")}
        >
          <Award size={16} />
          Calibration Scorecard
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={16} />
          My Calls ({calls.filter((c) => c.mode === mode).length})
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === "markets" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Scanning on-chain verified binary market windows...
            </div>
          ) : windows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              No active windows within safety threshold. Awaiting next rolling window...
            </div>
          ) : (
            <div className="windows-grid">
              {windows.map((w) => {
                const mins = Math.floor(w.secondsRemaining / 60);
                const secs = w.secondsRemaining % 60;
                const timeLabel = `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;

                return (
                  <div key={w.marketId} className="window-card">
                    <div className="window-card-header">
                      <div className="asset-badge">
                        <span className="asset-symbol">{w.asset}/USDC</span>
                        <span className="cadence-pill">{w.intervalSec}s Window</span>
                      </div>
                      <div className="countdown-timer mono">
                        <Clock size={13} />
                        {timeLabel}
                      </div>
                    </div>

                    {/* Crowd Lean Gauge */}
                    <div className="signal-section">
                      <div className="signal-meta">
                        <span className="lean-label">Crowd Lean (Live Order Book)</span>
                        <span
                          className="lean-val mono"
                          style={{ color: w.upLeanPercent >= 50 ? "var(--up-color)" : "var(--down-color)" }}
                        >
                          {w.upLeanPercent}% UP
                        </span>
                      </div>
                      <div className="lean-gauge-bar">
                        <div
                          className="lean-gauge-fill"
                          style={{ width: `${w.upLeanPercent}%` }}
                        ></div>
                      </div>
                      <div className="gauge-indicators">
                        <span>YES / UP ({w.upLeanPercent}%)</span>
                        <span>NO / DOWN ({100 - w.upLeanPercent}%)</span>
                      </div>
                    </div>

                    {/* Depth Snapshot */}
                    <div className="book-summary">
                      <div className="up-side">
                        <div className="book-side-title">UP Bids / Asks</div>
                        <div className="book-row">
                          <span>Best Bid:</span>
                          <span className="book-val mono">{w.bestUpBid?.toFixed(3) ?? "-"}</span>
                        </div>
                        <div className="book-row">
                          <span>Best Ask:</span>
                          <span className="book-val mono">{w.bestUpAsk?.toFixed(3) ?? "-"}</span>
                        </div>
                      </div>
                      <div className="down-side">
                        <div className="book-side-title">DOWN Bids / Asks</div>
                        <div className="book-row">
                          <span>Best Bid:</span>
                          <span className="book-val mono">{w.bestDownBid?.toFixed(3) ?? "-"}</span>
                        </div>
                        <div className="book-row">
                          <span>Best Ask:</span>
                          <span className="book-val mono">{w.bestDownAsk?.toFixed(3) ?? "-"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Call Actions */}
                    <div className="card-actions">
                      <button
                        className="call-btn btn-up"
                        onClick={() => openCallModal(w, "UP")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <TrendingUp size={16} /> CALL UP
                        </div>
                        <span className="btn-subprice mono">
                          Ask: {w.bestUpAsk ? `$${w.bestUpAsk.toFixed(2)}` : "Market"}
                        </span>
                      </button>

                      <button
                        className="call-btn btn-down"
                        onClick={() => openCallModal(w, "DOWN")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <TrendingDown size={16} /> CALL DOWN
                        </div>
                        <span className="btn-subprice mono">
                          Ask: {w.bestDownAsk ? `$${w.bestDownAsk.toFixed(2)}` : "Market"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bot Terminal Tab */}
      {activeTab === "bot" && (
        <BotTerminal
          botEngine={botEngine}
          onConfigChange={handleBotConfigChange}
        />
      )}

      {/* Scorecard Tab */}
      {activeTab === "scorecard" && (
        <div className="scorecard-view">
          <div className="metrics-row">
            <div className="metric-card">
              <span className="metric-title">Brier Calibration Score</span>
              <span className="metric-value mono">
                {currentScorecard.brierScore !== null
                  ? currentScorecard.brierScore.toFixed(3)
                  : "N/A"}
              </span>
              <span className="metric-sub">Lower is better (0.00 = perfect, 0.25 = random)</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Win Rate (Decisive)</span>
              <span className="metric-value mono">
                {(currentScorecard.winRate * 100).toFixed(1)}%
              </span>
              <span className="metric-sub">
                {currentScorecard.wonCalls} Won / {currentScorecard.lostCalls} Lost / {currentScorecard.voidedCalls} Voided
              </span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Cumulative PnL</span>
              <span
                className="metric-value mono"
                style={{ color: currentScorecard.totalPnl >= 0 ? "var(--up-color)" : "var(--down-color)" }}
              >
                {currentScorecard.totalPnl >= 0 ? "+" : ""}
                ${currentScorecard.totalPnl.toFixed(2)}
              </span>
              <span className="metric-sub">ROI: {currentScorecard.roiPercent.toFixed(1)}%</span>
            </div>
          </div>

          <div className="calibration-chart-card">
            <div>
              <h3>Probabilistic Calibration Analysis ({mode.toUpperCase()} MODE)</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Compares predicted market probability against empirical outcome frequency.
              </p>
            </div>

            <div className="bins-list">
              {currentScorecard.calibrationBuckets.map((b) => (
                <div key={b.bucketLabel} className="bin-item">
                  <div className="bin-meta">
                    <span>{b.bucketLabel} Confidence Bucket ({b.count} calls)</span>
                    <span className="mono">
                      Target: {(b.averageConfidence * 100).toFixed(0)}% | Actual: {(b.empiricalWinRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bin-bars">
                    <div className="bin-bar-track">
                      <div
                        className="bin-bar-fill predicted"
                        style={{ width: `${b.averageConfidence * 100}%` }}
                        title={`Predicted: ${(b.averageConfidence * 100).toFixed(1)}%`}
                      ></div>
                    </div>
                    <div className="bin-bar-track">
                      <div
                        className="bin-bar-fill empirical"
                        style={{ width: `${b.empiricalWinRate * 100}%` }}
                        title={`Actual Win Rate: ${(b.empiricalWinRate * 100).toFixed(1)}%`}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div style={{ background: "var(--bg-card)", borderRadius: "0.75rem", border: "1px solid var(--border-color)", overflow: "hidden" }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Direction</th>
                <th>Stake</th>
                <th>Entry Price</th>
                <th>Status</th>
                <th>PnL</th>
                <th>Resolution Transparency</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {calls
                .filter((c) => c.mode === mode)
                .map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{c.marketId.slice(0, 10)}...</td>
                    <td style={{ color: c.direction === "UP" ? "var(--up-color)" : "var(--down-color)", fontWeight: 700 }}>
                      {c.direction}
                    </td>
                    <td className="mono">${c.stake.toFixed(2)}</td>
                    <td className="mono">{c.entryPrice.toFixed(3)}</td>
                    <td>
                      <span className={`badge-${c.settlementStatus}`}>
                        {c.settlementStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="mono" style={{ color: c.netPnl >= 0 ? "var(--up-color)" : "var(--down-color)" }}>
                      {c.netPnl >= 0 ? "+" : ""}${c.netPnl.toFixed(2)}
                    </td>
                    <td>
                      {c.oracleResolutionUrl ? (
                        <a
                          href={c.oracleResolutionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="proof-link"
                        >
                          Verify Proof <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>Pending</span>
                      )}
                    </td>
                    <td>
                      {c.mode === "real" && (c.settlementStatus === "won" || c.settlementStatus === "voided") && !c.redeemed ? (
                        <button className="claim-btn" onClick={() => handleClaimWinnings(c)}>
                          Claim Winnings
                        </button>
                      ) : c.redeemed ? (
                        <a
                          href={`https://shannon-explorer.somnia.network/tx/${c.redeemTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--up-color)", fontSize: "0.75rem", textDecoration: "none" }}
                        >
                          Claimed ✓
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              {calls.filter((c) => c.mode === mode).length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                    No {mode} calls recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Call Modal */}
      {selectedWindow && selectedDirection && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                Call {selectedDirection} · {selectedWindow.asset}/USDC
              </h3>
              <button className="close-btn" onClick={() => setSelectedWindow(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span>Execution Mode:</span>
              <strong style={{ color: mode === "practice" ? "#3b82f6" : "var(--up-color)" }}>
                {mode.toUpperCase()}
              </strong>
            </div>

            <div className="stake-input-container">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Stake Amount (USDso)
              </label>
              <input
                type="number"
                className="stake-input mono"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                min={1}
                max={mode === "practice" ? 100 : 10000}
              />
              <div className="quick-stakes">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    className="quick-stake-btn"
                    onClick={() => setStakeAmount(amt)}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--bg-subtle)", padding: "0.85rem", borderRadius: "0.5rem", fontSize: "0.8rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Entry Price:</span>
                <span className="mono">
                  {selectedDirection === "UP"
                    ? (selectedWindow.bestUpAsk?.toFixed(3) ?? selectedWindow.upLeanProbability.toFixed(3))
                    : (selectedWindow.bestDownAsk?.toFixed(3) ?? (1 - selectedWindow.upLeanProbability).toFixed(3))}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Potential Payout:</span>
                <span className="mono" style={{ color: "var(--up-color)", fontWeight: 700 }}>
                  ${(
                    stakeAmount /
                    (selectedDirection === "UP"
                      ? (selectedWindow.bestUpAsk ?? selectedWindow.upLeanProbability)
                      : (selectedWindow.bestDownAsk ?? (1 - selectedWindow.upLeanProbability)))
                  ).toFixed(2)} USDso
                </span>
              </div>
            </div>

            {txError && (
              <div style={{ color: "var(--down-color)", fontSize: "0.8rem", background: "rgba(244, 63, 94, 0.1)", padding: "0.6rem", borderRadius: "0.375rem" }}>
                {txError}
              </div>
            )}

            {mode === "real" && !isConnected ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Connect your wallet to execute real trade
                </p>
                <ConnectButton />
              </div>
            ) : (
              <button
                className={`call-btn ${selectedDirection === "UP" ? "btn-up" : "btn-down"}`}
                style={{ width: "100%", padding: "0.9rem" }}
                onClick={executeCall}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Signing & Sending..."
                  : `Confirm ${selectedDirection} (${mode.toUpperCase()})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Honest Transition Modal (§6 / §7) */}
      {showTransitionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle color="var(--warning)" size={22} /> Transition to Real Trading
              </h3>
              <button className="close-btn" onClick={() => setShowTransitionModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.88rem", lineHeight: "1.5", color: "var(--text-muted)" }}>
              <p>
                <strong>You have practiced the mechanics, not mastered risk psychology.</strong>
              </p>
              <p>
                Paper trading is well-documented not to transfer the emotional reality of real capital risk. In Real Mode:
              </p>
              <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <li>Every order signs directly with your connected wallet.</li>
                <li>There are no delegated session keys — your spend is 100% in your control.</li>
                <li>Redemption is an explicit action: winning claims must be triggered by you.</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                className="mode-btn"
                style={{ flex: 1, padding: "0.75rem", background: "var(--bg-subtle)", color: "white", justifyContent: "center" }}
                onClick={() => setShowTransitionModal(false)}
              >
                Keep Practicing
              </button>
              <button
                className="mode-btn"
                style={{ flex: 1, padding: "0.75rem", background: "var(--up-color)", color: "#06261c", fontWeight: 800, justifyContent: "center" }}
                onClick={confirmSwitchToReal}
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
