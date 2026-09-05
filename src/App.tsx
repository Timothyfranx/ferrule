import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { formatUnits } from "viem";
import { 
  MarketDataService, 
  PracticeTradingService, 
  RealTradingService, 
  SettlementService, 
  ScorecardService, 
  WatcherService 
} from "./services/index.js";
import { 
  ModeBanner, 
  Header, 
  Footer, 
  TerminalEmulator, 
  MarketGrid, 
  CallModal, 
  CalibrationDashboard, 
  PositionsTable 
} from "./components/index.js";
import { CANONICAL_CONTRACTS } from "./config/constants.js";
import type { 
  OpenWindow, 
  Call, 
  CallDirection, 
  TradingMode, 
  CalibrationScorecard 
} from "./types/index.js";
import { AlertTriangle, X } from "lucide-react";

export default function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [mode, setMode] = useState<TradingMode>("practice");
  const [activeTab, setActiveTab] = useState<"terminal" | "markets" | "scorecard" | "positions">("terminal");
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [bufferLineCount, setBufferLineCount] = useState(2);
  const [realUsdcBalance, setRealUsdcBalance] = useState("0.00");

  // Singletons
  const marketDataService = useMemo(() => new MarketDataService(), []);
  const practiceService = useMemo(() => new PracticeTradingService(), []);
  const watcherService = useMemo(() => new WatcherService(), []);

  // Real engine & Settlement
  const realService = useMemo(() => {
    if (isConnected && walletClient && address) {
      try {
        return new RealTradingService(marketDataService.client, { walletClient, account: address });
      } catch (err) {
        console.error("Failed to initialize RealTradingService", err);
        return null;
      }
    }
    return null;
  }, [isConnected, walletClient, address, marketDataService]);

  const settlementService = useMemo(() => {
    return new SettlementService(marketDataService.client, { trader: realService?.trader });
  }, [marketDataService, realService]);

  // Modal states
  const [tradeModal, setTradeModal] = useState<{
    window: OpenWindow;
    direction: CallDirection;
    stake: number;
  } | null>(null);

  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Load initial calls from practice service
  useEffect(() => {
    setCalls(practiceService.getCalls());
  }, [practiceService]);

  // Query Real USDC balance if connected
  useEffect(() => {
    if (!isConnected || !address || !marketDataService.client) return;
    let mounted = true;

    async function fetchUsdc() {
      try {
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          const data = `0x70a08231000000000000000000000000${address!.slice(2).toLowerCase()}`;
          const raw = await ethereum.request({
            method: "eth_call",
            params: [{ to: CANONICAL_CONTRACTS.testUsdc, data }, "latest"],
          });
          if (raw && raw !== "0x" && mounted) {
            setRealUsdcBalance(parseFloat(formatUnits(BigInt(raw), 6)).toFixed(2));
          }
        }
      } catch {
        // Balance query fallback
      }
    }

    fetchUsdc();
    const timer = setInterval(fetchUsdc, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isConnected, address, marketDataService]);

  // Fetch live market data from Somnia testnet
  useEffect(() => {
    let mounted = true;

    async function fetchWindows() {
      try {
        const liveWindows = await marketDataService.getOpenWindows();
        if (mounted) {
          setWindows(liveWindows);
          setLoading(false);
        }
      } catch (err) {
        console.error("Market scan error:", err);
      }
    }

    fetchWindows();
    const interval = setInterval(fetchWindows, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [marketDataService]);

  // Countdown timer tick
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

  // Settlement watcher against on-chain truth
  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingCalls = calls.filter((c) => c.settlementStatus === "pending");
      if (pendingCalls.length === 0) return;

      let hasUpdate = false;

      for (const call of pendingCalls) {
        try {
          const info = await marketDataService.getSettledMarketInfo(call.marketId);
          if (info.isResolved || info.isVoided) {
            if (call.mode === "practice") {
              practiceService.settleCall(call.id, info);
            } else {
              await settlementService.evaluateCallSettlement(call);
            }
            hasUpdate = true;
          }
        } catch {
          // Market still pending resolution
        }
      }

      if (hasUpdate) {
        setCalls(practiceService.getCalls());
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [calls, marketDataService, practiceService, settlementService]);

  // Mode switch handler with risk warning
  function handleToggleMode() {
    if (mode === "practice") {
      setShowTransitionModal(true);
    } else {
      setMode("practice");
    }
  }

  function confirmSwitchToReal() {
    setMode("real");
    setShowTransitionModal(false);
  }

  const handleOpenTradeModal = useCallback((w: OpenWindow, direction: CallDirection, stake = 25) => {
    setTradeModal({ window: w, direction, stake });
  }, []);

  async function handleConfirmTrade(stake: number) {
    if (!tradeModal) return;
    const { window: w, direction } = tradeModal;

    if (mode === "practice") {
      const newCall = practiceService.placeCall(w, direction, stake);
      setCalls(practiceService.getCalls());
    } else {
      if (!realService) {
        throw new Error("Please connect your Web3 wallet on Somnia Shannon Testnet.");
      }
      const newCall = await realService.placeCall(w, direction, stake);
      setCalls((prev) => [newCall, ...prev]);
    }
  }

  async function handleClaimWinnings(call: Call) {
    if (call.mode === "real") {
      await settlementService.redeemWinningCall(call);
      setCalls([...calls]);
    }
  }

  const scorecard: CalibrationScorecard = ScorecardService.computeScorecard(calls, mode);
  const activeRound = windows.length > 0 ? windows[0].marketId.slice(0, 8) : undefined;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base text-text-primary select-none">
      {/* 1. Header (VS Code / iTerm Style Tabs + Telemetry) */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mode={mode}
        bufferLineCount={bufferLineCount}
        activeWatchersCount={watcherService.getWatchers().length}
        openWindowsCount={windows.length}
      />

      {/* 2. Sticky Mode Banner (Unmissable Solid Fill) */}
      <ModeBanner
        mode={mode}
        onToggleMode={handleToggleMode}
        bankroll={practiceService.getBankroll()}
        realBalance={realUsdcBalance}
        activeRound={activeRound}
      />

      {/* 3. Main Multi-Pane Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === "terminal" && (
          <TerminalEmulator
            mode={mode}
            setMode={setMode}
            windows={windows}
            calls={calls}
            onCallsChange={setCalls}
            practiceService={practiceService}
            realService={realService}
            watcherService={watcherService}
            walletAddress={address}
            onOpenTradeModal={handleOpenTradeModal}
            onLineCountChange={setBufferLineCount}
          />
        )}

        {activeTab === "markets" && (
          <MarketGrid
            windows={windows}
            onSelectCall={handleOpenTradeModal}
            loading={loading}
          />
        )}

        {activeTab === "scorecard" && (
          <CalibrationDashboard
            scorecard={scorecard}
            mode={mode}
          />
        )}

        {activeTab === "positions" && (
          <PositionsTable
            calls={calls}
            mode={mode}
            onClaimWinnings={handleClaimWinnings}
          />
        )}
      </div>

      {/* 4. Footer (VS Code Status Strip) */}
      <Footer mode={mode} accountAddress={address} />

      {/* Trade Review & Confirmation Modal */}
      {tradeModal && (
        <CallModal
          window={tradeModal.window}
          direction={tradeModal.direction}
          mode={mode}
          initialStake={tradeModal.stake}
          walletConnected={isConnected}
          onClose={() => setTradeModal(null)}
          onConfirm={handleConfirmTrade}
        />
      )}

      {/* Risk Transition Warning Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f]/80 flex items-center justify-center p-4">
          <div className="bg-bg-raised border border-border-interactive w-full max-w-lg p-5 font-mono text-[13px]">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-down-red font-bold text-[14px]">
                <AlertTriangle size={18} />
                <span>TRANSITION TO REAL TRADING</span>
              </div>
              <button
                onClick={() => setShowTransitionModal(false)}
                className="text-text-dim hover:text-text-primary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-4 space-y-3 text-text-secondary text-[12px] leading-[18px]">
              <p className="text-text-primary font-bold">
                You have practiced the mechanics, not mastered risk psychology.
              </p>
              <p>
                Paper trading is well-documented not to transfer the emotional reality of real capital risk. In Real Mode:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-text-dim">
                <li>Every order signs directly through your connected Web3 wallet.</li>
                <li>There are no delegated session keys — you control 100% of transactions.</li>
                <li>Winnings redemption is an explicit action to protect you from gas burns on lost calls.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border-subtle">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="flex-1 py-2 bg-bg-base border border-border-base text-text-primary hover:border-border-interactive cursor-pointer font-bold"
              >
                Keep Practicing
              </button>
              <button
                onClick={confirmSwitchToReal}
                className="flex-1 py-2 bg-down-red text-[#0a0a0f] hover:bg-down-red/90 cursor-pointer font-bold"
              >
                I Understand, Continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
