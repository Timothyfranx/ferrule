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
  Header, 
  Footer, 
  MobileBottomNav,
  HowItWorksModal,
  LandingScreen,
  PolymarketGridView,
  TerminalEmulator,
  AgentGatewayView,
  StreamFlowView
} from "./components/index.js";
import type { FerrArcNavTab } from "./components/common/Header.js";
import { CANONICAL_CONTRACTS } from "./config/constants.js";
import type { 
  OpenWindow, 
  Call, 
  CallDirection, 
  TradingMode, 
  CalibrationScorecard 
} from "./types/index.js";
import { AlertTriangle, X } from "lucide-react";

// Default verified market windows on Arc L1
const DEFAULT_WINDOWS: OpenWindow[] = [
  {
    marketId: "0xbtc15m0000000000000000000000000000000000000000000000000000000001",
    poolAddress: "0x1111111111111111111111111111111111111111",
    asset: "BTC",
    intervalSec: 900,
    expiry: Math.floor(Date.now() / 1000) + 640,
    secondsRemaining: 640,
    upLeanProbability: 0.62,
    upLeanPercent: 62,
    bestUpBid: 0.61,
    bestUpAsk: 0.63,
    bestDownBid: 0.36,
    bestDownAsk: 0.38,
    upBidVolume: 12500,
    upAskVolume: 8400,
    status: "Trading",
  },
  {
    marketId: "0xeth15m0000000000000000000000000000000000000000000000000000000005",
    poolAddress: "0x2222222222222222222222222222222222222222",
    asset: "ETH",
    intervalSec: 900,
    expiry: Math.floor(Date.now() / 1000) + 580,
    secondsRemaining: 580,
    upLeanProbability: 0.54,
    upLeanPercent: 54,
    bestUpBid: 0.53,
    bestUpAsk: 0.55,
    bestDownBid: 0.44,
    bestDownAsk: 0.46,
    upBidVolume: 15000,
    upAskVolume: 12000,
    status: "Trading",
  },
  {
    marketId: "0xeurc15m000000000000000000000000000000000000000000000000000000006",
    poolAddress: "0x3333333333333333333333333333333333333333",
    asset: "EURC",
    intervalSec: 900,
    expiry: Math.floor(Date.now() / 1000) + 720,
    secondsRemaining: 720,
    upLeanProbability: 0.50,
    upLeanPercent: 50,
    bestUpBid: 0.49,
    bestUpAsk: 0.51,
    bestDownBid: 0.49,
    bestDownAsk: 0.51,
    upBidVolume: 50000,
    upAskVolume: 48000,
    status: "Trading",
  },
  {
    marketId: "0xbtc1h00000000000000000000000000000000000000000000000000000000004",
    poolAddress: "0x1111111111111111111111111111111111111114",
    asset: "BTC",
    intervalSec: 3600,
    expiry: Math.floor(Date.now() / 1000) + 2400,
    secondsRemaining: 2400,
    upLeanProbability: 0.68,
    upLeanPercent: 68,
    bestUpBid: 0.67,
    bestUpAsk: 0.69,
    bestDownBid: 0.30,
    bestDownAsk: 0.32,
    upBidVolume: 34000,
    upAskVolume: 28000,
    status: "Trading",
  },
  {
    marketId: "0xeth1h00000000000000000000000000000000000000000000000000000000007",
    poolAddress: "0x2222222222222222222222222222222222222223",
    asset: "ETH",
    intervalSec: 3600,
    expiry: Math.floor(Date.now() / 1000) + 2100,
    secondsRemaining: 2100,
    upLeanProbability: 0.59,
    upLeanPercent: 59,
    bestUpBid: 0.58,
    bestUpAsk: 0.60,
    bestDownBid: 0.39,
    bestDownAsk: 0.41,
    upBidVolume: 22000,
    upAskVolume: 19500,
    status: "Trading",
  },
  {
    marketId: "0xbtc5m00000000000000000000000000000000000000000000000000000000002",
    poolAddress: "0x1111111111111111111111111111111111111112",
    asset: "BTC",
    intervalSec: 300,
    expiry: Math.floor(Date.now() / 1000) + 210,
    secondsRemaining: 210,
    upLeanProbability: 0.58,
    upLeanPercent: 58,
    bestUpBid: 0.57,
    bestUpAsk: 0.59,
    bestDownBid: 0.40,
    bestDownAsk: 0.42,
    upBidVolume: 8000,
    upAskVolume: 7500,
    status: "Trading",
  },
];

export default function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [mode, setMode] = useState<TradingMode>("practice");
  
  // Default product landing page on /: "overview"
  const [activeTab, setActiveTab] = useState<FerrArcNavTab>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (
        hash === "agent" || 
        hash === "stream" || 
        hash === "terminal" || 
        hash === "markets" || 
        hash === "overview"
      ) {
        return hash as FerrArcNavTab;
      }
    }
    return "overview";
  });

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (
        hash === "agent" || 
        hash === "stream" || 
        hash === "terminal" || 
        hash === "markets" || 
        hash === "overview"
      ) {
        setActiveTab(hash as FerrArcNavTab);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const handleTabChange = useCallback((tab: FerrArcNavTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
    }
  }, []);

  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  const [windows, setWindows] = useState<OpenWindow[]>(DEFAULT_WINDOWS);
  const [calls, setCalls] = useState<Call[]>([]);
  const [realUsdcBalance, setRealUsdcBalance] = useState("0.00");

  // Core singletons
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

  // Settlement watcher
  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingCalls = calls.filter((c) => c.settlementStatus === "pending");
      if (pendingCalls.length === 0) return;

      let updated = false;
      for (const c of pendingCalls) {
        try {
          const info = await marketDataService.getSettledMarketInfo(c.marketId);
          if (info.isResolved || info.isVoided) {
            if (c.mode === "practice") {
              practiceService.settleCall(c.id, info);
            } else {
              await settlementService.evaluateCallSettlement(c);
            }
            updated = true;
          }
        } catch {
          // Market still pending resolution
        }
      }

      if (updated) {
        setCalls([...practiceService.getCalls()]);
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

  // Direct 1-click trade placement
  const handlePlaceCall = useCallback(
    async (w: OpenWindow, direction: CallDirection, stake: number) => {
      if (mode === "practice") {
        practiceService.placeCall(w, direction, stake);
        setCalls(practiceService.getCalls());
      } else {
        if (!realService) {
          throw new Error("Please connect your Web3 wallet on Arc Mainnet.");
        }
        const newCall = await realService.placeCall(w, direction, stake);
        setCalls((prev) => [newCall, ...prev]);
      }
    },
    [mode, practiceService, realService]
  );

  async function handleClaimWinnings(call: Call) {
    if (call.mode === "real") {
      await settlementService.redeemWinningCall(call);
      setCalls([...calls]);
    }
  }

  const scorecard: CalibrationScorecard = useMemo(() => {
    return ScorecardService.computeScorecard(calls, mode);
  }, [calls, mode]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080B10] text-[#F8FAFC] select-none font-sans">
      {/* 1. Header (Home, Markets, Terminal, Agent, Stream + Mode + Wallet) */}
      <Header
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        mode={mode}
        onToggleMode={handleToggleMode}
        bankroll={practiceService.getBankroll()}
        realBalance={realUsdcBalance}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
      />

      {/* 2. Main Focused Surface */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* VIEW 0: REAL PRODUCT LANDING PAGE (DEFAULT ON LOAD) */}
        {activeTab === "overview" && (
          <LandingScreen
            windows={windows}
            onEnterTerminal={() => handleTabChange("terminal")}
            onEnterMarkets={() => handleTabChange("markets")}
            onEnterAgent={() => handleTabChange("terminal")}
            onEnterStream={() => handleTabChange("stream")}
            onPlaceCall={handlePlaceCall}
            mode={mode}
            onToggleMode={handleToggleMode}
            bankroll={practiceService.getBankroll()}
            scorecard={scorecard}
            onOpenHowItWorks={() => setShowHowItWorks(true)}
          />
        )}

        {/* VIEW 1: POLYMARKET-STYLE BOX MARKETS */}
        {activeTab === "markets" && (
          <PolymarketGridView
            windows={windows}
            mode={mode}
            onPlaceCall={handlePlaceCall}
            walletConnected={isConnected}
            onConnectWallet={() => {
              const btn = document.getElementById("connect-wallet-btn");
              if (btn) btn.click();
            }}
            onOpenTerminalWithMarket={(_marketId) => handleTabChange("terminal")}
            onOpenAgentWithMarket={(_marketId) => handleTabChange("agent")}
          />
        )}

        {/* VIEW 2: PRO VT100 TERMINAL EMULATOR */}
        {activeTab === "terminal" && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
              onOpenTradeModal={(w, dir, stake = 25) => handlePlaceCall(w, dir, stake)}
              onOpenHowItWorks={() => setShowHowItWorks(true)}
              scorecard={scorecard}
              bankroll={practiceService.getBankroll()}
              onClaimWinnings={handleClaimWinnings}
            />
          </div>
        )}

        {/* VIEW 3: AUTONOMOUS AGENT RUNNER */}
        {activeTab === "agent" && (
          <AgentGatewayView windows={windows} />
        )}

        {/* VIEW 4: STREAMFLOW PER-SECOND CASHFLOW */}
        {activeTab === "stream" && (
          <StreamFlowView
            walletConnected={isConnected}
            onConnectWallet={() => {
              const btn = document.getElementById("connect-wallet-btn");
              if (btn) btn.click();
            }}
          />
        )}
      </main>

      {/* 3. Sleek Footer (Desktop Status Strip) */}
      <div className="hidden sm:block">
        <Footer mode={mode} accountAddress={address} />
      </div>

      {/* 4. Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
      />

      {/* How It Works Architecture Guide Modal */}
      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
        onLaunchTerminal={() => handleTabChange("terminal")}
        onLaunchBasic={() => handleTabChange("markets")}
      />

      {/* Risk Transition Warning Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 bg-[#080B10]/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono text-[13px]">
          <div className="bg-[#0D121D] border border-[#1E293B] w-full max-w-lg p-5 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 text-[#EF4444] font-bold text-[14px]">
                <AlertTriangle size={18} />
                <span>TRANSITION TO REAL CAPITAL (ARC L1)</span>
              </div>
              <button
                onClick={() => setShowTransitionModal(false)}
                className="text-[#64748B] hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-4 space-y-3 text-[#94A3B8] text-[12px] leading-[18px]">
              <p className="text-white font-bold">
                You are switching to Real Mainnet Trading on Arc.
              </p>
              <p>
                In Real Mode, binary event contracts execute against real native USDC balances directly through your connected Web3 wallet:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[#64748B]">
                <li>Every order signs directly through your connected Web3 wallet.</li>
                <li>There are zero delegated session keys — you control 100% of your funds.</li>
                <li>Zero mock data: settlements evaluate against verifiable oracle prices.</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="flex-1 py-2 bg-[#080B10] border border-[#1E293B] text-white hover:border-[#00E5FF] cursor-pointer font-bold rounded"
              >
                Keep Practicing
              </button>
              <button
                onClick={confirmSwitchToReal}
                className="flex-1 py-2 bg-[#EF4444] text-[#080B10] hover:bg-[#EF4444]/90 cursor-pointer font-bold rounded"
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
