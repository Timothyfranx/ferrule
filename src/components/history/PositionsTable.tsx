import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Call, TradingMode } from "../../types/index.js";

interface PositionsTableProps {
  calls: Call[];
  mode: TradingMode;
  onClaimWinnings: (call: Call) => Promise<void>;
}

export function PositionsTable({ calls, mode, onClaimWinnings }: PositionsTableProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const filteredCalls = calls.filter((c) => c.mode === mode);

  async function handleClaim(call: Call) {
    setClaimingId(call.id);
    try {
      await onClaimWinnings(call);
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-bg-base font-mono">
      <div className="bg-bg-raised border border-border-base overflow-x-auto">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border-base bg-bg-base/40 text-text-dim text-[11px]">
              <th className="py-2.5 px-3">ORDER ID</th>
              <th className="py-2.5 px-3">ASSET</th>
              <th className="py-2.5 px-3">DIRECTION</th>
              <th className="py-2.5 px-3">STAKE</th>
              <th className="py-2.5 px-3">ENTRY</th>
              <th className="py-2.5 px-3">STATUS</th>
              <th className="py-2.5 px-3">PNL</th>
              <th className="py-2.5 px-3">ORACLE PROOF</th>
              <th className="py-2.5 px-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filteredCalls.map((c) => {
              const isWon = c.settlementStatus === "won";
              const isLost = c.settlementStatus === "lost";
              const isVoided = c.settlementStatus === "voided";

              return (
                <tr key={c.id} className="hover:bg-bg-base/30">
                  <td className="py-2 px-3 text-text-secondary font-mono text-[11px]">
                    {c.id.slice(0, 12)}..
                  </td>
                  <td className="py-2 px-3 text-text-primary font-bold">
                    {c.asset}/USDC
                  </td>
                  <td
                    className="py-2 px-3 font-bold"
                    style={{ color: c.direction === "UP" ? "#00e676" : "#ff5252" }}
                  >
                    {c.direction}
                  </td>
                  <td className="py-2 px-3 tabular-nums">${c.stake.toFixed(2)}</td>
                  <td className="py-2 px-3 tabular-nums">${c.entryPrice.toFixed(3)}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.2 text-[10px] font-bold border ${
                        isWon
                          ? "border-up-green text-up-green"
                          : isLost
                          ? "border-down-red text-down-red"
                          : isVoided
                          ? "border-neutral-gray text-neutral-gray"
                          : "border-text-dim text-text-dim"
                      }`}
                    >
                      {c.settlementStatus.toUpperCase()}
                    </span>
                  </td>
                  <td
                    className="py-2 px-3 font-bold tabular-nums"
                    style={{ color: c.netPnl >= 0 ? "#00e676" : "#ff5252" }}
                  >
                    {c.netPnl >= 0 ? "+" : ""}${c.netPnl.toFixed(2)}
                  </td>
                  <td className="py-2 px-3">
                    {c.oracleResolutionUrl ? (
                      <a
                        href={c.oracleResolutionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-eval hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        OracleHub <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-text-dim">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {mode === "real" && (isWon || isVoided) && !c.redeemed ? (
                      <button
                        onClick={() => handleClaim(c)}
                        disabled={claimingId === c.id}
                        className="bg-up-green text-[#0a0a0f] hover:bg-up-green/90 px-2 py-0.5 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        {claimingId === c.id ? "Claiming..." : "Claim Winnings"}
                      </button>
                    ) : c.redeemed ? (
                      <span className="text-up-green text-[11px]">Claimed ✓</span>
                    ) : (
                      <span className="text-text-dim text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredCalls.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-text-dim">
                  No {mode} positions recorded yet. Use the terminal or market tab to place a trade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
