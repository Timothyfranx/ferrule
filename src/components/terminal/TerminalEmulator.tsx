import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TerminalBuffer } from "./TerminalBuffer.js";
import { TerminalPrompt } from "./TerminalPrompt.js";
import { OrderflowCockpit } from "../cockpit/OrderflowCockpit.js";
import { TelemetryDrawer } from "../cockpit/TelemetryDrawer.js";
import { AuditModal } from "../cockpit/AuditModal.js";
import type { 
  TerminalLine, 
  SuggestionPayload, 
  TradingMode, 
  OpenWindow, 
  Call, 
  CalibrationScorecard 
} from "../../types/index.js";
import { TerminalService } from "../../services/terminalService.js";
import { PracticeTradingService } from "../../services/practiceTradingService.js";
import { RealTradingService } from "../../services/realTradingService.js";
import { WatcherService } from "../../services/watcherService.js";
import { ScorecardService } from "../../services/scorecardService.js";
import { Columns, Terminal as TerminalIcon, Layers, Bot, Zap } from "lucide-react";
import { TerminalAgentModal } from "./TerminalAgentModal.js";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcMainnet } from "../../config/wagmi.js";
import { ARC_RPC_URL, FERRARC_CONTRACTS } from "../../config/constants.js";
import { ferrArcEventAbi } from "../../config/abi/ferrArcEventAbi.js";
import { calculateFairValue } from "../../services/quantService.js";

interface TerminalEmulatorProps {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
  windows: OpenWindow[];
  calls: Call[];
  onCallsChange: (calls: Call[]) => void;
  practiceService: PracticeTradingService;
  realService: RealTradingService | null;
  watcherService: WatcherService;
  walletAddress?: string | null;
  onOpenTradeModal: (window: OpenWindow, direction: "UP" | "DOWN", stake: number) => void;
  onLineCountChange?: (count: number) => void;
  onOpenHowItWorks?: () => void;
  scorecard?: CalibrationScorecard;
  bankroll?: number;
  onClaimWinnings?: (call: Call) => void;
}

const terminalService = new TerminalService();

export function TerminalEmulator({
  mode,
  setMode,
  windows,
  calls,
  onCallsChange,
  practiceService,
  realService,
  watcherService,
  walletAddress,
  onOpenTradeModal,
  onLineCountChange,
  onOpenHowItWorks,
  scorecard: initialScorecard,
  bankroll: initialBankroll,
  onClaimWinnings,
}: TerminalEmulatorProps) {
  const [cwd, setCwd] = useState<string>(terminalService.getCwd());
  const [layout, setLayout] = useState<"split" | "cli" | "dom">("split");
  const [focusedMarketId, setFocusedMarketId] = useState<string>(windows[0]?.marketId || "");
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Autonomous Agent Daemon State (Fully Integrated with Pro Terminal)
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentStrategy, setAgentStrategy] = useState<"contrarian" | "momentum" | "black_scholes">("contrarian");
  const [agentStake, setAgentStake] = useState<number>(5);
  const [agentPrivateKey, setAgentPrivateKey] = useState<string>("");
  const [agentSignalsCount, setAgentSignalsCount] = useState<number>(0);
  const [agentTradesCount, setAgentTradesCount] = useState<number>(0);
  const [agentLastAction, setAgentLastAction] = useState<string>("");
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);

  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "initial_0",
      type: "system",
      text: "[SYS] Connected to Arc L1 Mainnet (Chain ID: 5042). Institutional Terminal online.",
      timestamp: new Date().toTimeString().slice(0, 8),
    },
    {
      id: "initial_1",
      type: "eval",
      text: "[PRO_COCKPIT] Split View active. Type 'help' for manual, 'agent' for autonomous bot, 'dom' for depth.",
      timestamp: new Date().toTimeString().slice(0, 8),
    },
  ]);

  // Keep focused market valid
  useEffect(() => {
    if (!focusedMarketId && windows.length > 0) {
      setFocusedMarketId(windows[0].marketId);
    }
  }, [windows, focusedMarketId]);

  useEffect(() => {
    onLineCountChange?.(lines.length);
  }, [lines, onLineCountChange]);

  const scorecard = useMemo(() => {
    return initialScorecard || ScorecardService.computeScorecard(calls, mode);
  }, [initialScorecard, calls, mode]);

  const bankroll = useMemo(() => {
    return initialBankroll !== undefined ? initialBankroll : practiceService.getBankroll();
  }, [initialBankroll, practiceService]);

  // Helper for Black-Scholes valuation on an active window
  const evaluateFairValue = useCallback((target: OpenWindow) => {
    const strikeNum = target.strikeFormatted
      ? parseFloat(target.strikeFormatted.replace(/[^0-9.]/g, "")) || (target.asset === "BTC" ? 64000 : target.asset === "ETH" ? 3400 : 1.08)
      : target.asset === "BTC" ? 64000 : target.asset === "ETH" ? 3400 : 1.08;
    const spotShift = (target.upLeanPercent - 50) * (strikeNum * 0.0003);
    const spotNum = strikeNum + spotShift;
    const marketUpPrice = target.bestUpAsk ?? (target.upLeanPercent / 100);
    const vol = target.asset === "BTC" ? 0.48 : target.asset === "ETH" ? 0.56 : 0.12;
    return calculateFairValue(spotNum, strikeNum, target.secondsRemaining, marketUpPrice, vol);
  }, []);

  // Single-run manual scan for agent
  const handleAgentSingleRun = useCallback(async (): Promise<string> => {
    if (windows.length === 0) return "No active market windows found.";
    const activeTarget = windows.find((w) => w.secondsRemaining > 50) || windows[0];
    const fair = evaluateFairValue(activeTarget);
    const timeStr = new Date().toTimeString().slice(0, 8);
    const actionDir: "UP" | "DOWN" = fair.recommendation === "BUY_DOWN" ? "DOWN" : "UP";

    if (mode === "practice") {
      const placed = practiceService.placeCall(activeTarget, actionDir, agentStake);
      onCallsChange(practiceService.getCalls());
      setAgentSignalsCount((prev) => prev + 1);
      setAgentTradesCount((prev) => prev + 1);
      setAgentLastAction(`${activeTarget.asset} ${actionDir} ($${agentStake})`);
      setLines((prev) => [
        ...prev,
        {
          id: `single_run_${Date.now()}`,
          type: "system",
          text: `[AGENT SINGLE-RUN] Executed ${actionDir} on ${activeTarget.asset}/USDC ($${agentStake}) | Fair: ${(fair.fairProbUp * 100).toFixed(1)}% vs Market: ${activeTarget.upLeanPercent}% (+${fair.bestEdgeBps} bps edge)`,
          timestamp: timeStr,
        },
      ]);
      return `Single-shot order filled: ${actionDir} on ${activeTarget.asset} ($${agentStake} USDC). Bankroll: $${practiceService.getBankroll().toFixed(2)}`;
    }
    return `Single scan evaluated ${activeTarget.asset}: edge ${fair.bestEdgeBps} bps. Real mode requires loaded BYOK private key.`;
  }, [windows, mode, practiceService, agentStake, onCallsChange, evaluateFairValue]);

  // Main Autonomous Agent Loop (ticks every 5s when running)
  useEffect(() => {
    if (!isAgentRunning) return;

    const interval = setInterval(async () => {
      if (windows.length === 0) return;

      const activeTarget = windows.find((w) => w.secondsRemaining > 50);
      if (!activeTarget) return;

      let shouldTrade = false;
      let callDirection: "UP" | "DOWN" = "UP";
      let triggerReason = "";

      if (agentStrategy === "contrarian") {
        if (activeTarget.upLeanProbability >= 0.70) {
          shouldTrade = true;
          callDirection = "DOWN";
          triggerReason = `Contrarian fade: crowd lean ${Math.round(activeTarget.upLeanProbability * 100)}% UP > 70% threshold`;
        } else if (activeTarget.upLeanProbability <= 0.30) {
          shouldTrade = true;
          callDirection = "UP";
          triggerReason = `Contrarian rebound: crowd lean ${Math.round(activeTarget.upLeanProbability * 100)}% UP < 30% oversold`;
        }
      } else if (agentStrategy === "momentum") {
        if (activeTarget.upLeanProbability >= 0.60) {
          shouldTrade = true;
          callDirection = "UP";
          triggerReason = `Momentum breakout: directional pressure ${Math.round(activeTarget.upLeanProbability * 100)}% UP`;
        } else if (activeTarget.upLeanProbability <= 0.40) {
          shouldTrade = true;
          callDirection = "DOWN";
          triggerReason = `Momentum breakdown: downward pressure ${Math.round(activeTarget.upLeanProbability * 100)}% UP`;
        }
      } else {
        // Black Scholes
        const fair = evaluateFairValue(activeTarget);
        if (fair.bestEdgeBps >= 75 && fair.recommendation !== "FAIR_VALUE") {
          shouldTrade = true;
          callDirection = fair.recommendation === "BUY_UP" ? "UP" : "DOWN";
          triggerReason = `Black-Scholes edge: analytical fair ${Math.round(fair.fairProbUp * 100)}% vs market ${activeTarget.upLeanPercent}% (+${fair.bestEdgeBps} bps edge)`;
        }
      }

      if (shouldTrade) {
        setAgentSignalsCount((prev) => prev + 1);
        setAgentTradesCount((prev) => prev + 1);
        setAgentLastAction(`${activeTarget.asset} ${callDirection} ($${agentStake})`);

        const timeStr = new Date().toTimeString().slice(0, 8);

        if (mode === "practice") {
          try {
            const placed = practiceService.placeCall(activeTarget, callDirection, agentStake);
            onCallsChange(practiceService.getCalls());
            setLines((prev) => [
              ...prev,
              {
                id: `agent_sig_${Date.now()}`,
                type: "trigger",
                text: `[AGENT SIGNAL] ⚡ ${triggerReason}`,
                timestamp: timeStr,
              },
              {
                id: `agent_fill_${Date.now()}`,
                type: "system",
                text: `[AGENT EXEC] ✓ Practice SIM fill: ${callDirection} on ${activeTarget.asset}/USDC with $${agentStake} USDC @ $${placed.entryPrice.toFixed(3)}. Bankroll: $${practiceService.getBankroll().toFixed(2)}`,
                timestamp: timeStr,
              },
            ]);
          } catch (e: any) {
            setLines((prev) => [
              ...prev,
              { id: `agent_err_${Date.now()}`, type: "error", text: `[AGENT] Execution error: ${e.message}`, timestamp: timeStr },
            ]);
          }
        } else if (mode === "real" && agentPrivateKey) {
          // Arc Mainnet on-chain execution with Viem
          try {
            const formattedKey = (agentPrivateKey.startsWith("0x") ? agentPrivateKey : `0x${agentPrivateKey}`) as `0x${string}`;
            const account = privateKeyToAccount(formattedKey);
            const client = createWalletClient({ account, chain: arcMainnet, transport: http(ARC_RPC_URL) });

            const hash = await client.writeContract({
              address: FERRARC_CONTRACTS.eventEngine,
              abi: ferrArcEventAbi,
              functionName: "placeCall",
              args: [activeTarget.marketId as `0x${string}`, callDirection === "UP" ? 1 : 2],
              value: parseEther(agentStake.toString()),
            });

            setLines((prev) => [
              ...prev,
              {
                id: `agent_real_${Date.now()}`,
                type: "system",
                text: `[AGENT ON-CHAIN] ✓ Arc Mainnet TX: ${hash.slice(0, 18)}... (${callDirection} $${agentStake} native USDC)`,
                timestamp: timeStr,
              },
            ]);
          } catch (err: any) {
            setLines((prev) => [
              ...prev,
              { id: `agent_err_${Date.now()}`, type: "error", text: `[AGENT REAL ERR] ${err?.message?.slice(0, 80) || "On-chain execution failed"}`, timestamp: timeStr },
            ]);
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isAgentRunning, windows, agentStrategy, agentStake, mode, practiceService, agentPrivateKey, onCallsChange]);

  const handleCommand = useCallback(async (command: string) => {
    const currentCwd = terminalService.getCwd();
    const displayCwd = currentCwd === "/" ? "~" : currentCwd.replace(/^\//, "");

    // Echo prompt command with clean ferrarc/(cwd) $ prefix
    const promptLine: TerminalLine = {
      id: `prompt_${Date.now()}`,
      type: "prompt",
      prefix: `ferrarc/${displayCwd} $`,
      text: command,
      timestamp: new Date().toTimeString().slice(0, 8),
    };

    setLines((prev) => [...prev, promptLine]);

    const resultLines = await terminalService.executeCommand(command, {
      mode,
      setMode,
      windows,
      calls,
      practiceService,
      realService,
      watcherService,
      walletAddress,
      onTriggerModal: onOpenTradeModal,
      onTriggerHowItWorks: onOpenHowItWorks,
      onTriggerAudit: () => setShowAuditModal(true),
      onFocusMarket: (mId) => setFocusedMarketId(mId),
      focusedMarketId,
      agentState: {
        isRunning: isAgentRunning,
        strategy: agentStrategy,
        stake: agentStake,
        signalsCount: agentSignalsCount,
        tradesCount: agentTradesCount,
        lastAction: agentLastAction,
      },
      onStartAgent: (strat, st) => {
        if (strat) setAgentStrategy(strat);
        if (st) setAgentStake(st);
        setIsAgentRunning(true);
      },
      onStopAgent: () => {
        setIsAgentRunning(false);
      },
      onTriggerAgentDrawer: () => {
        setShowAgentModal(true);
      },
      onTriggerAgentRun: handleAgentSingleRun,
    });

    setCwd(terminalService.getCwd());

    if (resultLines.some((l) => l.id === "CLEAR_BUFFER")) {
      setLines([]);
      return;
    }

    setLines((prev) => {
      const combined = [...prev, ...resultLines];
      return combined.length > 2000 ? combined.slice(combined.length - 1800) : combined;
    });

    onCallsChange(practiceService.getCalls());
  }, [mode, setMode, windows, calls, practiceService, realService, watcherService, walletAddress, onOpenTradeModal, onOpenHowItWorks, onCallsChange, focusedMarketId, isAgentRunning, agentStrategy, agentStake, agentSignalsCount, agentTradesCount, agentLastAction, handleAgentSingleRun]);

  // Feed live ticks from watcher service into terminal
  useEffect(() => {
    const watcherLines = watcherService.evaluateTick(windows, mode);
    if (watcherLines.length > 0) {
      setLines((prev) => {
        const combined = [...prev, ...watcherLines];
        return combined.length > 2000 ? combined.slice(combined.length - 1800) : combined;
      });
    }
  }, [windows, mode, watcherService]);

  function handleExecuteSuggestion(s: SuggestionPayload) {
    if (mode === "practice") {
      try {
        const call = practiceService.placeCall(s.window, s.direction, s.stake);
        onCallsChange(practiceService.getCalls());
        const confirmLine: TerminalLine = {
          id: `exec_${Date.now()}`,
          type: "system",
          text: `[ORDER_ACK] Executed Practice Call: ${s.direction} on ${s.window.asset} ($${s.stake}) at $${call.entryPrice.toFixed(3)}. Order ID: ${call.id}`,
          timestamp: new Date().toTimeString().slice(0, 8),
        };
        setLines((prev) => [...prev, confirmLine]);
      } catch (err: any) {
        setLines((prev) => [
          ...prev,
          { id: `err_${Date.now()}`, type: "error", text: err.message, timestamp: new Date().toTimeString().slice(0, 8) },
        ]);
      }
    } else {
      onOpenTradeModal(s.window, s.direction, s.stake);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-base font-mono select-none">
      {/* 1. Cockpit Top Sub-Bar with Layout Switcher */}
      <div className="px-3 py-1.5 border-b border-border-subtle bg-bg-raised/70 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text-primary">THE PRO TERMINAL</span>
          <span className="text-[10px] text-text-dim px-1 bg-bg-base border border-border-subtle">
            Arc L1 Mainnet 5042
          </span>

          {/* Autonomous AI Agent HUD Capsule */}
          <button
            type="button"
            onClick={() => setShowAgentModal(true)}
            className={`ml-2 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAgentRunning
                ? "bg-[#10B981]/15 border-[#10B981] text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                : "bg-bg-base border-border-subtle text-text-dim hover:text-text-primary hover:border-border-interactive"
            }`}
            title="Configure Autonomous Agent Daemon"
          >
            <Bot size={12} className={isAgentRunning ? "animate-bounce" : ""} />
            <span>{isAgentRunning ? `AI AGENT: ACTIVE (${agentStrategy.toUpperCase()})` : "AI AGENT: OFF"}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isAgentRunning ? "bg-[#10B981] animate-pulse" : "bg-[#64748B]"}`}></span>
          </button>
        </div>

        {/* Layout & Agent Toggles */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAgentModal(true)}
            className="px-2 py-0.5 text-[10px] font-bold border bg-bg-base border-border-subtle text-[#00E5FF] hover:border-[#00E5FF] transition-colors flex items-center gap-1 cursor-pointer"
            title="Open Autonomous Agent Settings"
          >
            <Bot size={11} />
            <span className="hidden sm:inline">AGENT SETTINGS</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("split")}
            className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              layout === "split"
                ? "bg-accent-primary/20 border-accent-primary text-text-primary"
                : "bg-bg-base border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
            title="Split Cockpit (CLI + Orderflow DOM)"
          >
            <Columns size={11} />
            <span className="hidden sm:inline">SPLIT COCKPIT</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("cli")}
            className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              layout === "cli"
                ? "bg-accent-primary/20 border-accent-primary text-text-primary"
                : "bg-bg-base border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
            title="Terminal CLI Pure"
          >
            <TerminalIcon size={11} />
            <span className="hidden sm:inline">CLI ONLY</span>
          </button>

          <button
            type="button"
            onClick={() => setLayout("dom")}
            className={`px-2 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              layout === "dom"
                ? "bg-accent-primary/20 border-accent-primary text-text-primary"
                : "bg-bg-base border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
            title="Orderflow & DOM Depth"
          >
            <Layers size={11} />
            <span className="hidden sm:inline">DOM ONLY</span>
          </button>
        </div>
      </div>

      {/* 2. Main Body (Split View or Single Full Width) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Terminal CLI Shell */}
        {(layout === "split" || layout === "cli") && (
          <main className={`flex flex-col justify-between overflow-hidden px-4 py-2 bg-bg-base select-text pb-16 sm:pb-2 ${
            layout === "split" ? "w-full md:w-1/2 lg:w-7/12 border-b md:border-b-0 md:border-r border-border-base" : "w-full"
          }`}>
            <TerminalBuffer
              lines={lines}
              mode={mode}
              onExecuteSuggestion={handleExecuteSuggestion}
            />
            <TerminalPrompt
              mode={mode}
              cwd={cwd}
              onSubmit={handleCommand}
              commandHistory={terminalService.getCommandHistory()}
            />
          </main>
        )}

        {/* Right Side: Orderflow & Microstructure Cockpit */}
        {(layout === "split" || layout === "dom") && (
          <div className={`overflow-hidden flex flex-col ${
            layout === "split" ? "w-full md:w-1/2 lg:w-5/12" : "w-full"
          }`}>
            <OrderflowCockpit
              windows={windows}
              calls={calls}
              mode={mode}
              bankroll={bankroll}
              onOpenTradeModal={onOpenTradeModal}
              onClaimWinnings={onClaimWinnings}
              focusedMarketId={focusedMarketId}
              onFocusMarket={setFocusedMarketId}
            />
          </div>
        )}
      </div>

      {/* 3. Persistent Telemetry Stream Drawer at Bottom */}
      <TelemetryDrawer
        calls={calls}
        mode={mode}
        scorecard={scorecard}
        onOpenAuditModal={() => setShowAuditModal(true)}
      />

      {/* 4. Full Analytical Audit Modal */}
      <AuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        calls={calls}
        mode={mode}
        scorecard={scorecard}
      />

      {/* 5. Full Autonomous AI Agent Control Modal */}
      <TerminalAgentModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        isRunning={isAgentRunning}
        onToggleRun={() => setIsAgentRunning(!isAgentRunning)}
        strategy={agentStrategy}
        onStrategyChange={setAgentStrategy}
        stake={agentStake}
        onStakeChange={setAgentStake}
        mode={mode}
        privateKey={agentPrivateKey}
        onPrivateKeyChange={setAgentPrivateKey}
        signalsCount={agentSignalsCount}
        tradesCount={agentTradesCount}
        lastAction={agentLastAction}
        onTriggerSingleRun={handleAgentSingleRun}
      />
    </div>
  );
}
