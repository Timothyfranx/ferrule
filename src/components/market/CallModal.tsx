import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { OpenWindow, CallDirection, TradingMode } from "../../types/index.js";

interface CallModalProps {
  window: OpenWindow;
  direction: CallDirection;
  mode: TradingMode;
  initialStake?: number;
  walletConnected: boolean;
  onClose: () => void;
  onConfirm: (stake: number) => Promise<void>;
}

export function CallModal({
  window: w,
  direction,
  mode,
  initialStake = 25,
  walletConnected,
  onClose,
  onConfirm,
}: CallModalProps) {
  const [stake, setStake] = useState<number>(initialStake);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPractice = mode === "practice";
  const entryPrice = direction === "UP" 
    ? (w.bestUpAsk ?? w.upLeanProbability) 
    : (w.bestDownAsk ?? (1 - w.upLeanProbability));

  const safeEntryPrice = Math.min(0.99, Math.max(0.01, entryPrice));
  const potentialPayout = stake / safeEntryPrice;

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(stake);
      onClose();
    } catch (err: any) {
      setError(err.message || "Execution failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f]/80 flex items-center justify-center p-4">
      <div className="bg-bg-raised border border-border-interactive w-full max-w-md p-5 font-mono text-[13px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-[14px]"
              style={{ color: direction === "UP" ? "#00e676" : "#ff5252" }}
            >
              CALL {direction}
            </span>
            <span className="text-text-primary">· {w.asset}/USDC</span>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Mode Tag */}
        <div className="flex justify-between items-center py-2 text-[12px] border-b border-border-subtle">
          <span className="text-text-dim">ENVIRONMENT:</span>
          <span
            className="font-bold px-1.5 py-0.2"
            style={{
              backgroundColor: isPractice ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 82, 82, 0.15)",
              color: isPractice ? "#00e676" : "#ff5252",
            }}
          >
            {mode.toUpperCase()}
          </span>
        </div>

        {/* Stake Input */}
        <div className="my-3">
          <label className="text-text-secondary text-[11px] block mb-1">
            STAKE AMOUNT ({isPractice ? "SIM-USDC" : "tUSDC"})
          </label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
            min={1}
            max={isPractice ? 100 : 5000}
            className="w-full bg-bg-base border border-border-base focus:border-border-interactive text-text-primary font-mono text-[14px] p-2 outline-none tabular-nums"
          />
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setStake(amt)}
                className={`py-1 text-[11px] border border-border-base cursor-pointer ${
                  stake === amt ? "bg-text-primary text-[#0a0a0f] font-bold" : "bg-bg-base text-text-secondary hover:text-text-primary"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-bg-base/70 p-3 border border-border-subtle space-y-1 text-[12px]">
          <div className="flex justify-between">
            <span className="text-text-dim">Entry Price:</span>
            <span className="text-text-primary tabular-nums">${safeEntryPrice.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-dim">Contracts Count:</span>
            <span className="text-text-primary tabular-nums">{(stake / safeEntryPrice).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-border-subtle/50">
            <span className="text-text-secondary">Potential Payout:</span>
            <span className="text-up-green tabular-nums">${potentialPayout.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Error Output */}
        {error && (
          <div className="bg-down-red/10 border-l-2 border-down-red p-2 my-2 text-down-red text-[11px]">
            {error}
          </div>
        )}

        {/* Submit Actions */}
        <div className="mt-4">
          {!isPractice && !walletConnected ? (
            <div className="flex flex-col items-center gap-2 p-2 bg-bg-base border border-border-base">
              <span className="text-text-dim text-[11px]">Connect wallet to execute real trade:</span>
              <ConnectButton />
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-2.5 font-mono text-[13px] font-bold border transition-colors cursor-pointer ${
                direction === "UP"
                  ? "bg-up-green text-[#0a0a0f] border-up-green hover:bg-up-green/90"
                  : "bg-down-red text-[#0a0a0f] border-down-red hover:bg-down-red/90"
              } disabled:opacity-50`}
            >
              {isSubmitting
                ? "Submitting to Somnia Network..."
                : `CONFIRM CALL ${direction} ($${stake})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
