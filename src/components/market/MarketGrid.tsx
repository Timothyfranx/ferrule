import React, { useState } from "react";
import { WindowCard } from "./WindowCard.js";
import type { OpenWindow, CallDirection, AssetSymbol } from "../../types/index.js";

interface MarketGridProps {
  windows: OpenWindow[];
  onSelectCall: (window: OpenWindow, direction: CallDirection) => void;
  loading: boolean;
}

export function MarketGrid({ windows, onSelectCall, loading }: MarketGridProps) {
  const [assetFilter, setAssetFilter] = useState<"ALL" | AssetSymbol>("ALL");

  const filteredWindows = windows.filter((w) => {
    if (assetFilter === "ALL") return true;
    return w.asset === assetFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-bg-base">
      {/* Control Strip */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-border-base">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary font-mono text-[12px]">FILTER ASSET:</span>
          {(["ALL", "BTC", "ETH"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAssetFilter(a)}
              className={`px-2 py-0.5 font-mono text-[11px] border ${
                assetFilter === a
                  ? "bg-text-primary text-[#0a0a0f] border-text-primary font-bold"
                  : "bg-bg-raised text-text-dim border-border-base hover:text-text-primary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="text-text-dim font-mono text-[11px]">
          ACTIVE WINDOWS: <span className="text-text-primary font-bold">{filteredWindows.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-text-dim font-mono text-[13px]">
          [SYS] Scanning Somnia Shannon Testnet for verified binary market pools...
        </div>
      ) : filteredWindows.length === 0 ? (
        <div className="text-center py-16 text-text-dim font-mono text-[13px]">
          No active market windows within safety threshold (&gt;45s). Awaiting next rolling window...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWindows.map((w) => (
            <WindowCard key={w.marketId} window={w} onSelectCall={onSelectCall} />
          ))}
        </div>
      )}
    </div>
  );
}
