import React, { useState } from "react";
import type { OpenWindow, Call } from "../../types/index.js";
import { RefreshCw, ShieldCheck, Zap, Award, Clock } from "lucide-react";

export type RolloverPolicy = "compound" | "preserve" | "sweep";

interface RolloverEngineProps {
  window: OpenWindow;
  calls: Call[];
  mode: "practice" | "real";
  onClaimWinnings?: (call: Call) => void;
  edgeThresholdBps?: number;
  onEdgeThresholdChange?: (bps: number) => void;
}

export function RolloverEngine({
  window: w,
  calls,
  mode,
  onClaimWinnings,
  edgeThresholdBps = 200,
  onEdgeThresholdChange,
}: RolloverEngineProps) {
  const [policy, setPolicy] = useState<RolloverPolicy>("preserve");
  const [edgeGuardEnabled, setEdgeGuardEnabled] = useState(true);

  const mins = Math.floor(w.secondsRemaining / 60);
  const secs = (w.secondsRemaining % 60).toString().padStart(2, "0");
  const isClosing = w.secondsRemaining <= 30 && w.secondsRemaining > 0;
  const isExpired = w.secondsRemaining === 0;

  // Active or pending calls for this mode
  const activeCalls = calls.filter((c) => c.mode === mode && c.settlementStatus === "pending");
  const redeemableCalls = calls.filter((c) => c.mode === mode && c.settlementStatus === "won");

  return (
    <div className="bg-bg-raised border border-border-base font-mono text-[11px] p-2.5 flex flex-col select-none">
      {/* Header & Window Status */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-text-primary font-bold">
          <RefreshCw size={13} className="text-accent-primary" />
          <span>AUTONOMOUS LIFECYCLE & ROLLOVER</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] tabular-nums">
          <Clock size={11} className={isClosing ? "text-warning-amber" : "text-text-dim"} />
          <span className={isClosing ? "text-warning-amber font-bold" : "text-text-secondary"}>
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* Lifecycle Status Pill */}
      <div className="flex items-center justify-between bg-bg-base/70 p-2 border border-border-subtle mb-2">
        <div>
          <div className="text-[9px] text-text-dim">WINDOW LIFECYCLE</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: isExpired ? "#ff5252" : isClosing ? "#ffb300" : "#00e676",
              }}
            />
            <span className="font-bold text-[11px] text-text-primary">
              {isExpired ? "RESOLVING ON-CHAIN" : isClosing ? "CLOSING IMMINENT" : "ACCEPTING ORDERS"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-text-dim">ACTIVE EXPOSURE</div>
          <div className="font-bold text-text-primary tabular-nums">
            {activeCalls.length} Open Positions
          </div>
        </div>
      </div>

      {/* Rollover Policy Switcher */}
      <div className="mb-2">
        <div className="text-[10px] text-text-dim mb-1">SETTLEMENT ROLLOVER POLICY</div>
        <div className="grid grid-cols-3 gap-1">
          {[
            {
              id: "compound",
              label: "Compound",
              desc: "100% Payout Roll",
              icon: Zap,
            },
            {
              id: "preserve",
              label: "Preserve",
              desc: "Roll Stake, Bank PnL",
              icon: ShieldCheck,
            },
            {
              id: "sweep",
              label: "Full Sweep",
              desc: "100% Cash to Wallet",
              icon: Award,
            },
          ].map((opt) => {
            const Icon = opt.icon;
            const isSelected = policy === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPolicy(opt.id as RolloverPolicy)}
                className={`p-1.5 border text-left flex flex-col justify-between transition-colors ${
                  isSelected
                    ? "bg-accent-primary/20 border-accent-primary text-text-primary"
                    : "bg-bg-base border-border-subtle text-text-secondary hover:border-border-interactive hover:text-text-primary"
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  <Icon size={11} className={isSelected ? "text-accent-primary" : "text-text-dim"} />
                  <span>{opt.label}</span>
                </div>
                <div className="text-[8px] text-text-dim mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Autonomous Quant Policy / Edge Guard */}
      <div className="border border-border-subtle bg-bg-base/50 p-2 flex items-center justify-between text-[10px]">
        <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary">
          <input
            type="checkbox"
            checked={edgeGuardEnabled}
            onChange={(e) => setEdgeGuardEnabled(e.target.checked)}
            className="accent-accent-primary rounded-none cursor-pointer"
          />
          <span>Auto-Flag Mispricings &gt;</span>
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={edgeThresholdBps}
            onChange={(e) => onEdgeThresholdChange?.(Number(e.target.value))}
            className="w-12 bg-bg-raised border border-border-base px-1 py-0.5 text-right font-mono text-[10px] text-text-primary outline-none"
          />
          <span className="text-text-dim">bps</span>
        </div>
      </div>

      {/* Redeemable Claims Trigger */}
      {redeemableCalls.length > 0 && (
        <div className="mt-2 p-1.5 bg-up-green/10 border border-up-green/40 flex items-center justify-between text-[10px]">
          <span className="text-up-green font-bold">
            {redeemableCalls.length} Settled Win(s) Ready to Claim
          </span>
          {onClaimWinnings && (
            <button
              type="button"
              onClick={() => redeemableCalls.forEach(c => onClaimWinnings(c))}
              className="bg-up-green text-black hover:bg-up-green/90 px-2 py-0.5 font-bold transition-colors"
            >
              Claim All Payouts →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
