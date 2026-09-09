import React, { useMemo } from "react";
import type { OpenWindow, CallDirection } from "../../types/index.js";
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface L2DepthLadderProps {
  window: OpenWindow;
  onSelectCall: (window: OpenWindow, direction: CallDirection, stake: number) => void;
  selectedStake?: number;
}

interface LadderRow {
  price: number;
  size: number;
  totalSize: number;
  type: "ASK" | "BID" | "SPREAD";
  depthPercent: number;
}

export function L2DepthLadder({ window: w, onSelectCall, selectedStake = 25 }: L2DepthLadderProps) {
  // Reconstruct L2 Depth of Market Ladder around live Somnia CLOB quotes
  const { ladderRows, oir, maxVolume } = useMemo(() => {
    const upBid = w.bestUpBid ?? (w.upLeanPercent / 100 - 0.015);
    const upAsk = w.bestUpAsk ?? (w.upLeanPercent / 100 + 0.015);
    const bidVol = Math.max(10, w.upBidVolume || 990);
    const askVol = Math.max(10, w.upAskVolume || 990);

    // Order Imbalance Ratio: (BidVol - AskVol) / (BidVol + AskVol) [-1.0, +1.0]
    const calculatedOir = (bidVol - askVol) / (bidVol + askVol);

    const rows: LadderRow[] = [];
    let runningAskTotal = 0;
    let runningBidTotal = 0;

    const realAsks = w.orderBook?.yesAsks || [];
    const realBids = w.orderBook?.yesBids || [];

    const askRows: LadderRow[] = [];
    if (realAsks.length > 0) {
      // Direct on-chain asks sorted descending (highest price on top)
      const sortedAsks = [...realAsks].sort((a, b) => b.price - a.price);
      for (const a of sortedAsks) {
        runningAskTotal += Math.round(a.quantity);
        askRows.push({
          price: Number(a.price.toFixed(3)),
          size: Math.round(a.quantity),
          totalSize: runningAskTotal,
          type: "ASK",
          depthPercent: 0,
        });
      }
    } else {
      const askLevels = [0.03, 0.02, 0.01, 0.00];
      for (let i = 0; i < askLevels.length; i++) {
        const p = Math.min(0.99, Number((upAsk + askLevels[i]).toFixed(3)));
        const sz = Math.round(askVol * (0.2 + (i * 0.05)));
        runningAskTotal += sz;
        askRows.push({
          price: p,
          size: sz,
          totalSize: runningAskTotal,
          type: "ASK",
          depthPercent: 0,
        });
      }
    }

    const bidRows: LadderRow[] = [];
    if (realBids.length > 0) {
      // Direct on-chain bids sorted descending (highest bid near spread)
      const sortedBids = [...realBids].sort((a, b) => b.price - a.price);
      for (const b of sortedBids) {
        runningBidTotal += Math.round(b.quantity);
        bidRows.push({
          price: Number(b.price.toFixed(3)),
          size: Math.round(b.quantity),
          totalSize: runningBidTotal,
          type: "BID",
          depthPercent: 0,
        });
      }
    } else {
      const bidLevels = [0.00, 0.01, 0.02, 0.03];
      for (let i = 0; i < bidLevels.length; i++) {
        const p = Math.max(0.01, Number((upBid - bidLevels[i]).toFixed(3)));
        const sz = Math.round(bidVol * (0.2 + (i * 0.05)));
        runningBidTotal += sz;
        bidRows.push({
          price: p,
          size: sz,
          totalSize: runningBidTotal,
          type: "BID",
          depthPercent: 0,
        });
      }
    }

    const highestVol = Math.max(runningAskTotal, runningBidTotal, 1);

    // Normalize depth percent for background bars
    askRows.forEach(r => { r.depthPercent = Math.min(100, Math.round((r.size / highestVol) * 100)); });
    bidRows.forEach(r => { r.depthPercent = Math.min(100, Math.round((r.size / highestVol) * 100)); });

    rows.push(...askRows);
    rows.push(...bidRows);

    return {
      ladderRows: rows,
      oir: Math.max(-1, Math.min(1, calculatedOir)),
      maxVolume: highestVol,
    };
  }, [w]);

  // Imbalance label and color
  const oirText = oir > 0.25 
    ? "STRONG BID PRESSURE" 
    : oir < -0.25 
    ? "HEAVY ASK OVERHANG" 
    : "BALANCED ORDERFLOW";
  const oirColor = oir > 0 ? "#00e676" : oir < 0 ? "#ff5252" : "#a0a0b0";

  return (
    <div className="bg-bg-raised border border-border-base flex flex-col h-full font-mono text-[11px] select-none">
      {/* Header */}
      <div className="p-2 border-b border-border-subtle bg-bg-base/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-text-primary font-bold">
          <Layers size={13} className="text-accent-primary" />
          <span>L2 DEPTH LADDER (DOM)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-dim">
          <span>Spread: <strong className="text-text-primary">{((w.bestUpAsk ?? 0.51) - (w.bestUpBid ?? 0.49)).toFixed(3)}</strong></span>
          <span>•</span>
          <span>1-Click DOM Trading</span>
        </div>
      </div>

      {/* Order Imbalance Ratio Gauge */}
      <div className="px-2.5 py-1.5 border-b border-border-subtle bg-bg-base/40">
        <div className="flex justify-between items-center text-[10px] mb-1">
          <span className="text-text-dim">ORDER IMBALANCE RATIO (OIR)</span>
          <span className="font-bold tabular-nums" style={{ color: oirColor }}>
            {(oir > 0 ? "+" : "") + oir.toFixed(2)} [{oirText}]
          </span>
        </div>
        {/* Horizontal Imbalance Bar */}
        <div className="w-full h-1.5 bg-bg-base border border-border-subtle overflow-hidden relative flex">
          <div 
            className="h-full bg-[#ff5252] transition-all duration-300"
            style={{ width: `${Math.max(0, 50 - (oir * 50))}%` }}
          />
          <div 
            className="h-full bg-up-green transition-all duration-300"
            style={{ width: `${Math.max(0, 50 + (oir * 50))}%` }}
          />
          {/* Center Zero Indicator */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white opacity-40" />
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 px-2 py-1 text-[9px] text-text-dim border-b border-border-subtle/60 bg-bg-raised/80">
        <span className="text-left">PRICE (¢)</span>
        <span className="text-right">SIZE</span>
        <span className="text-right">TOTAL</span>
        <span className="text-right">ACTION</span>
      </div>

      {/* Ladder Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/20 tabular-nums">
        {/* ASKS (UP Asks - click to BUY UP) */}
        {ladderRows.filter(r => r.type === "ASK").map((row, idx) => (
          <div
            key={`ask_${idx}`}
            onClick={() => onSelectCall(w, "UP", selectedStake)}
            className="grid grid-cols-4 px-2 py-1 items-center hover:bg-[#ff5252]/15 cursor-pointer relative group transition-colors"
          >
            {/* Depth visualizer bar on right */}
            <div 
              className="absolute right-0 top-0 bottom-0 bg-[#ff5252]/10 pointer-events-none transition-all"
              style={{ width: `${row.depthPercent}%` }}
            />
            <span className="text-down-red font-semibold z-10">
              ${row.price.toFixed(3)}
            </span>
            <span className="text-right text-text-secondary z-10">
              {row.size.toLocaleString()}
            </span>
            <span className="text-right text-text-dim text-[10px] z-10">
              {row.totalSize.toLocaleString()}
            </span>
            <div className="text-right z-10">
              <button 
                type="button"
                className="opacity-70 group-hover:opacity-100 bg-[#ff5252]/20 hover:bg-[#ff5252] text-down-red hover:text-white px-1.5 py-0.5 text-[9px] font-bold transition-colors"
              >
                BUY UP
              </button>
            </div>
          </div>
        ))}

        {/* SPREAD DIVIDER */}
        <div className="px-2 py-1 bg-bg-base flex items-center justify-between text-[10px] text-text-dim border-y border-border-subtle select-none">
          <span className="text-text-secondary font-bold">SPREAD BARRIER</span>
          <span className="text-text-dim">
            Mid: ${(((w.bestUpAsk ?? 0.51) + (w.bestUpBid ?? 0.49)) / 2).toFixed(3)}
          </span>
        </div>

        {/* BIDS (UP Bids - click to BUY DOWN / SHORT UP) */}
        {ladderRows.filter(r => r.type === "BID").map((row, idx) => (
          <div
            key={`bid_${idx}`}
            onClick={() => onSelectCall(w, "DOWN", selectedStake)}
            className="grid grid-cols-4 px-2 py-1 items-center hover:bg-up-green/15 cursor-pointer relative group transition-colors"
          >
            {/* Depth visualizer bar on right */}
            <div 
              className="absolute right-0 top-0 bottom-0 bg-up-green/10 pointer-events-none transition-all"
              style={{ width: `${row.depthPercent}%` }}
            />
            <span className="text-up-green font-semibold z-10">
              ${row.price.toFixed(3)}
            </span>
            <span className="text-right text-text-secondary z-10">
              {row.size.toLocaleString()}
            </span>
            <span className="text-right text-text-dim text-[10px] z-10">
              {row.totalSize.toLocaleString()}
            </span>
            <div className="text-right z-10">
              <button 
                type="button"
                className="opacity-70 group-hover:opacity-100 bg-up-green/20 hover:bg-up-green text-up-green hover:text-black px-1.5 py-0.5 text-[9px] font-bold transition-colors"
              >
                BUY DOWN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DOM Quick Execution Footer */}
      <div className="p-2 border-t border-border-subtle bg-bg-base/90 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelectCall(w, "UP", selectedStake)}
          className="flex items-center justify-center gap-1 bg-up-green text-black hover:bg-up-green/90 py-1 font-bold text-[10px] transition-colors"
        >
          <ArrowUpRight size={12} />
          <span>INSTANT UP (${selectedStake})</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectCall(w, "DOWN", selectedStake)}
          className="flex items-center justify-center gap-1 bg-down-red text-white hover:bg-down-red/90 py-1 font-bold text-[10px] transition-colors"
        >
          <ArrowDownRight size={12} />
          <span>INSTANT DOWN (${selectedStake})</span>
        </button>
      </div>
    </div>
  );
}
