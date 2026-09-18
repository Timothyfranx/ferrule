import React, { useState, useEffect } from "react";
import { 
  Waves, 
  ArrowUpRight, 
  Plus, 
  Clock, 
  CheckCircle, 
  X, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Zap
} from "lucide-react";
import { formatEther, parseEther } from "viem";
import { ARC_EXPLORER_URL } from "../../config/constants.js";

interface StreamItem {
  id: number;
  recipient: string;
  deposit: number;
  ratePerSecond: number; // e.g. 0.001157 USDC/sec
  startTime: number;     // ms
  stopTime: number;      // ms
  withdrawn: number;
  isCancelled: boolean;
}

interface StreamFlowViewProps {
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export function StreamFlowView({ walletConnected, onConnectWallet }: StreamFlowViewProps) {
  // Mock/Live active streams
  const [streams, setStreams] = useState<StreamItem[]>([
    {
      id: 1,
      recipient: "0x82a9...12f4 (Agent Trading Bankroll)",
      deposit: 100,
      ratePerSecond: 100 / (7 * 86400), // 100 USDC over 7 days
      startTime: Date.now() - (2 * 86400 * 1000), // started 2 days ago
      stopTime: Date.now() + (5 * 86400 * 1000),
      withdrawn: 12.50,
      isCancelled: false,
    },
    {
      id: 2,
      recipient: "0x3f1c...88a2 (Research Contractor)",
      deposit: 500,
      ratePerSecond: 500 / (30 * 86400), // 500 USDC over 30 days
      startTime: Date.now() - (10 * 86400 * 1000), // started 10 days ago
      stopTime: Date.now() + (20 * 86400 * 1000),
      withdrawn: 85.00,
      isCancelled: false,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [durationDays, setDurationDays] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Real-time tick every 50ms for hyper-smooth sub-second balance increments
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate accrued totals
  const totalAccruedUnclaimed = streams.reduce((acc, s) => {
    if (s.isCancelled) return acc;
    const elapsedSec = Math.max(0, Math.min(s.stopTime, now) - s.startTime) / 1000;
    const totalEarned = elapsedSec * s.ratePerSecond;
    const unclaimed = Math.max(0, totalEarned - s.withdrawn);
    return acc + unclaimed;
  }, 0);

  function handleCreateStream(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientInput) return;
    setSubmitting(true);
    setTimeout(() => {
      const durationSec = durationDays * 86400;
      const newStream: StreamItem = {
        id: streams.length + 1,
        recipient: recipientInput,
        deposit: depositAmount,
        ratePerSecond: depositAmount / durationSec,
        startTime: Date.now(),
        stopTime: Date.now() + (durationSec * 1000),
        withdrawn: 0,
        isCancelled: false,
      };
      setStreams([newStream, ...streams]);
      setShowCreateModal(false);
      setRecipientInput("");
      setSubmitting(false);
    }, 600);
  }

  function handleWithdraw(streamId: number) {
    setStreams((prev) =>
      prev.map((s) => {
        if (s.id !== streamId) return s;
        const elapsedSec = Math.max(0, Math.min(s.stopTime, now) - s.startTime) / 1000;
        const totalEarned = elapsedSec * s.ratePerSecond;
        return { ...s, withdrawn: totalEarned };
      })
    );
  }

  function handleCancel(streamId: number) {
    setStreams((prev) =>
      prev.map((s) => (s.id === streamId ? { ...s, isCancelled: true } : s))
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#080B10] text-[#F8FAFC] font-sans px-3 sm:px-6 py-4 select-none">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-5">

        {/* HERO REAL-TIME STREAMING TICKER */}
        <div className="bg-[#0D121D] border border-[#1E293B] rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] uppercase tracking-wider mb-2">
            <Waves size={14} className="animate-pulse" />
            <span>STREAMFLOW // REAL-TIME CONTINUOUS CASHFLOW</span>
          </div>

          {/* Giant Ticking Balance */}
          <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white tabular-nums my-1">
            ${totalAccruedUnclaimed.toFixed(6)} <span className="text-sm text-[#64748B] font-normal">USDC</span>
          </div>

          <p className="text-xs font-mono text-[#64748B] mt-1">
            Ticking up by +$0.000358 USDC every second on Arc Mainnet
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => streams.forEach((s) => handleWithdraw(s.id))}
              className="px-4 py-2 bg-[#10B981] hover:bg-[#10B981]/90 text-[#080B10] text-xs font-mono font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Zap size={13} />
              <span>Withdraw Accrued (${totalAccruedUnclaimed.toFixed(2)})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#080B10] hover:bg-[#1E293B] text-white border border-[#1E293B] hover:border-[#00E5FF] text-xs font-mono font-bold rounded transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={13} className="text-[#00E5FF]" />
              <span>New Stream</span>
            </button>
          </div>
        </div>

        {/* ACTIVE STREAMS DASHBOARD */}
        <div className="bg-[#0D121D] border border-[#1E293B] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E293B] flex items-center justify-between text-xs font-mono text-[#64748B]">
            <span className="text-white font-bold text-[11px] uppercase tracking-wider">
              Active Payment Streams ({streams.length})
            </span>
            <span>Per-Second Resolution (18 Decimals)</span>
          </div>

          <div className="divide-y divide-[#1E293B]">
            {streams.map((s) => {
              const elapsedSec = Math.max(0, Math.min(s.stopTime, now) - s.startTime) / 1000;
              const totalDurationSec = (s.stopTime - s.startTime) / 1000;
              const percentElapsed = Math.min(100, Math.max(0, (elapsedSec / totalDurationSec) * 100));
              const totalEarned = Math.min(s.deposit, elapsedSec * s.ratePerSecond);
              const claimable = Math.max(0, totalEarned - s.withdrawn);

              return (
                <div key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-white font-bold">Stream #{s.id}</span>
                      <span className="text-[#64748B]">→</span>
                      <span className="text-[#94A3B8]">{s.recipient}</span>
                      {s.isCancelled && (
                        <span className="text-[10px] text-[#EF4444] bg-[#EF4444]/15 px-1.5 py-0.5 rounded">
                          Cancelled
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md bg-[#080B10] h-1.5 rounded-full overflow-hidden border border-[#1E293B]">
                      <div 
                        className="bg-[#00E5FF] h-full transition-all duration-300"
                        style={{ width: `${percentElapsed}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#64748B]">
                      <span>Deposited: ${s.deposit} USDC</span>
                      <span>·</span>
                      <span className="tabular-nums">Accrued: ${totalEarned.toFixed(4)} USDC</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => handleWithdraw(s.id)}
                      disabled={claimable <= 0.0001 || s.isCancelled}
                      className="px-3 py-1.5 bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 rounded text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Claim ${claimable.toFixed(2)}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancel(s.id)}
                      disabled={s.isCancelled}
                      className="px-3 py-1.5 bg-[#080B10] hover:bg-[#EF4444]/15 text-[#64748B] hover:text-[#EF4444] border border-[#1E293B] hover:border-[#EF4444]/30 rounded text-xs transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CREATE STREAM MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-[#080B10]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#0D121D] border border-[#1E293B] max-w-md w-full p-5 rounded-lg shadow-xl font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <span className="font-bold text-sm text-white">OPEN CONTINUOUS PAYMENT STREAM</span>
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#64748B] hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateStream} className="space-y-4 my-4">
                <div className="space-y-1">
                  <label className="text-[#64748B] block">Recipient Address (or Agent Wallet)</label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-white rounded outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#64748B] block">Total USDC Deposit (Native Gas Token)</label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-white rounded outline-none text-xs tabular-nums"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Stream Duration:</span>
                    <span className="text-[#00E5FF] font-bold">{durationDays} Days</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={90}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full accent-[#00E5FF] cursor-pointer"
                  />
                </div>

                {/* Rate Calculation Summary */}
                <div className="p-3 bg-[#080B10] border border-[#1E293B] rounded text-[11px] text-[#94A3B8] space-y-1">
                  <div className="flex justify-between">
                    <span>Flow Rate:</span>
                    <span className="text-white font-bold">
                      ${(depositAmount / (durationDays * 86400)).toFixed(6)} USDC/sec
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Payout:</span>
                    <span className="text-[#10B981] font-bold">
                      ${(depositAmount / durationDays).toFixed(2)} USDC/day
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
                >
                  {submitting ? "Opening Stream on Arc Mainnet..." : "Confirm & Stream ($" + depositAmount + " USDC)"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
