import React, { useState, useEffect, useCallback } from "react";
import { TerminalBuffer } from "./TerminalBuffer.js";
import { TerminalPrompt } from "./TerminalPrompt.js";
import type { 
  TerminalLine, 
  SuggestionPayload, 
  TradingMode, 
  OpenWindow, 
  Call 
} from "../../types/index.js";
import { TerminalService } from "../../services/terminalService.js";
import { PracticeTradingService } from "../../services/practiceTradingService.js";
import { RealTradingService } from "../../services/realTradingService.js";
import { WatcherService } from "../../services/watcherService.js";

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
}: TerminalEmulatorProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "initial_0",
      type: "system",
      text: "[SYS] Connected to Somnia Shannon CLOB Binary Protocol.",
      timestamp: new Date().toTimeString().slice(0, 8),
    },
    {
      id: "initial_1",
      type: "eval",
      text: "[READY] Background evaluation engine listening. Type 'markets' or 'help' to start.",
      timestamp: new Date().toTimeString().slice(0, 8),
    },
  ]);

  useEffect(() => {
    onLineCountChange?.(lines.length);
  }, [lines, onLineCountChange]);

  const handleCommand = useCallback(async (command: string) => {
    // Echo prompt command
    const promptLine: TerminalLine = {
      id: `prompt_${Date.now()}`,
      type: "prompt",
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
    });

    if (resultLines.some((l) => l.id === "CLEAR_BUFFER")) {
      setLines([]);
      return;
    }

    setLines((prev) => {
      const combined = [...prev, ...resultLines];
      // Circular buffer clamp (LOGICAL_ERRORS.md §14)
      return combined.length > 2000 ? combined.slice(combined.length - 1800) : combined;
    });

    onCallsChange(practiceService.getCalls());
  }, [mode, setMode, windows, calls, practiceService, realService, watcherService, walletAddress, onOpenTradeModal, onCallsChange]);

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
      // Real Mode: Open modal for wallet signature
      onOpenTradeModal(s.window, s.direction, s.stake);
    }
  }

  return (
    <main className="flex-1 overflow-hidden px-4 py-2 bg-bg-base font-mono flex flex-col justify-between select-text">
      <TerminalBuffer
        lines={lines}
        mode={mode}
        onExecuteSuggestion={handleExecuteSuggestion}
      />
      <TerminalPrompt
        mode={mode}
        onSubmit={handleCommand}
        commandHistory={terminalService.getCommandHistory()}
      />
    </main>
  );
}
