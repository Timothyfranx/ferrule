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
import { Columns, Terminal as TerminalIcon, Layers } from "lucide-react";

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

  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "initial_0",
      type: "system",
      text: "[SYS] Connected to Somnia Shannon CLOB (Chain ID: 50312). Institutional Pro Terminal online.",
      timestamp: new Date().toTimeString().slice(0, 8),
    },
    {
      id: "initial_1",
      type: "eval",
      text: "[PRO_COCKPIT] Split View active. Type 'help' for manual, 'dom' for depth, 'edge' for Black-Scholes radar.",
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

  const handleCommand = useCallback(async (command: string) => {
    const currentCwd = terminalService.getCwd();
    const displayCwd = currentCwd === "/" ? "~" : currentCwd.replace(/^\//, "");

    // Echo prompt command with clean ferrule/(cwd) $ prefix
    const promptLine: TerminalLine = {
      id: `prompt_${Date.now()}`,
      type: "prompt",
      prefix: `ferrule/${displayCwd} $`,
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
  }, [mode, setMode, windows, calls, practiceService, realService, watcherService, walletAddress, onOpenTradeModal, onOpenHowItWorks, onCallsChange, focusedMarketId]);

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
            Somnia Shannon CLOB 50312
          </span>
        </div>

        {/* Layout Toggles */}
        <div className="flex items-center gap-1">
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
    </div>
  );
}
