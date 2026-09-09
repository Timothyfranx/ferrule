import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { OpenWindow, Call, CallDirection, TradingMode } from "../../types/index.js";
import { calculateFairValue } from "../../services/quantService.js";
import { L2DepthLadder } from "./L2DepthLadder.js";
import { EdgeRadarCard } from "./EdgeRadarCard.js";
import { RolloverEngine } from "./RolloverEngine.js";
import { BarChart3, Keyboard, Sparkles } from "lucide-react";

interface OrderflowCockpitProps {
  windows: OpenWindow[];
  calls: Call[];
  mode: TradingMode;
  bankroll: number;
  onOpenTradeModal: (window: OpenWindow, direction: CallDirection, stake: number) => void;
  onClaimWinnings?: (call: Call) => void;
  focusedMarketId?: string;
  onFocusMarket?: (marketId: string) => void;
}

export function OrderflowCockpit({
  windows,
  calls,
  mode,
  bankroll,
  onOpenTradeModal,
  onClaimWinnings,
  focusedMarketId,
  onFocusMarket,
}: OrderflowCockpitProps) {
  const [selectedMarketId, setSelectedMarketId] = useState<string>(
    focusedMarketId || (windows[0]?.marketId ?? "")
  );
  const [selectedStake, setSelectedStake] = useState<number>(25);
  const [edgeThresholdBps, setEdgeThresholdBps] = useState<number>(200);

  // Sync external focus (e.g. from CLI `focus btc`)
  useEffect(() => {
    if (focusedMarketId && focusedMarketId !== selectedMarketId) {
      setSelectedMarketId(focusedMarketId);
    }
  }, [focusedMarketId, selectedMarketId]);

  // Keep selected window valid
  const activeWindow = useMemo(() => {
    if (windows.length === 0) return null;
    const found = windows.find((w) => w.marketId === selectedMarketId);
    return found || windows[0];
  }, [windows, selectedMarketId]);

  // Calculate Black-Scholes Fair Value for active window
  const fairValue = useMemo(() => {
    if (!activeWindow) return null;
    const strikeNum = activeWindow.strikeFormatted
      ? parseFloat(activeWindow.strikeFormatted.replace(/[^0-9.]/g, "")) || 95000
      : activeWindow.asset === "BTC" ? 95000 : 2700;

    const spotShift = (activeWindow.upLeanPercent - 50) * (strikeNum * 0.0003);
    const spotNum = strikeNum + spotShift;

    const marketUpPrice = activeWindow.bestUpAsk ?? (activeWindow.upLeanPercent / 100);
    const vol = activeWindow.asset === "BTC" ? 0.48 : 0.56;

    return calculateFairValue(spotNum, strikeNum, activeWindow.secondsRemaining, marketUpPrice, vol);
  }, [activeWindow]);

  // Hotkey listener: Shift+U for UP, Shift+D for DOWN
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.shiftKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        if (activeWindow) {
          onOpenTradeModal(activeWindow, "UP", selectedStake);
        }
      } else if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        if (activeWindow) {
          onOpenTradeModal(activeWindow, "DOWN", selectedStake);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeWindow, selectedStake, onOpenTradeModal]);

  const handleSelectMarket = useCallback((mId: string) => {
    setSelectedMarketId(mId);
    onFocusMarket?.(mId);
  }, [onFocusMarket]);

  if (!activeWindow || !fairValue) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-text-dim font-mono text-[12px]">
        <BarChart3 size={24} className="mb-2 opacity-50 animate-pulse" />
        <span>Scanning Somnia Shannon CLOB order books...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-base overflow-hidden border-l border-border-base select-none">
      {/* 1. Asset Switcher Header */}
      <div className="p-2 border-b border-border-base bg-bg-raised flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          {windows.slice(0, 4).map((w) => {
            const isSelected = w.marketId === activeWindow.marketId;
            return (
              <button
                key={w.marketId}
                type="button"
                onClick={() => handleSelectMarket(w.marketId)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-accent-primary/20 border-accent-primary text-text-primary shadow-sm"
                    : "bg-bg-base border-border-subtle text-text-secondary hover:border-border-interactive hover:text-text-primary"
                }`}
              >
                <span>{w.asset}/USDC</span>
                <span className="text-[9px] text-text-dim px-1 bg-bg-raised border border-border-subtle">
                  {w.intervalSec}s
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: w.upLeanPercent >= 50 ? "#00e676" : "#ff5252",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-text-dim shrink-0">
          <Sparkles size={12} className="text-cyan-eval" />
          <span>Real Somnia CLOB (50312)</span>
        </div>
      </div>

      {/* 2. Cockpit Multi-Panel Scroll Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Top Split: Edge Radar & Quant Visualizer */}
        <EdgeRadarCard
          window={activeWindow}
          fairValue={fairValue}
          bankroll={bankroll}
          selectedStake={selectedStake}
          onStakeChange={setSelectedStake}
          onSelectCall={onOpenTradeModal}
        />

        {/* Middle: Autonomous Rollover Engine */}
        <RolloverEngine
          window={activeWindow}
          calls={calls}
          mode={mode}
          onClaimWinnings={onClaimWinnings}
          edgeThresholdBps={edgeThresholdBps}
          onEdgeThresholdChange={setEdgeThresholdBps}
        />

        {/* Bottom: L2 Depth of Market (DOM) Ladder */}
        <div className="h-[320px]">
          <L2DepthLadder
            window={activeWindow}
            onSelectCall={onOpenTradeModal}
            selectedStake={selectedStake}
          />
        </div>
      </div>

      {/* 3. Global Hotkey Status Bar */}
      <div className="p-1.5 bg-bg-raised border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-text-dim select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Keyboard size={12} className="text-text-secondary" />
            <span>Hotkeys:</span>
          </div>
          <span>
            <kbd className="px-1 py-0.5 bg-bg-base border border-border-base text-up-green font-bold">Shift+U</kbd> Buy UP
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-bg-base border border-border-base text-down-red font-bold">Shift+D</kbd> Buy DOWN
          </span>
        </div>
        <div className="text-text-secondary font-bold">
          Stake: ${selectedStake}
        </div>
      </div>
    </div>
  );
}
