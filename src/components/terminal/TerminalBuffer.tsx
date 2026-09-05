import React, { useEffect, useRef } from "react";
import type { TerminalLine, SuggestionPayload, TradingMode } from "../../types/index.js";

interface TerminalBufferProps {
  lines: TerminalLine[];
  mode: TradingMode;
  onExecuteSuggestion: (suggestion: SuggestionPayload) => void;
}

export function TerminalBuffer({ lines, mode, onExecuteSuggestion }: TerminalBufferProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const isPractice = mode === "practice";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="flex-1 overflow-y-auto font-mono text-[13px] leading-[21px] flex flex-col justify-start pr-1 space-y-1">
      {/* System Initialization Banner */}
      <div className="text-text-dim text-[11px] mb-2 pb-2 border-b border-border-subtle select-none leading-relaxed">
        <div className="text-text-primary font-bold">Ferrule Deterministic Shell [Somnia DreamDEX CLOB 50312]</div>
        <div>Type <span className="text-text-primary">"help"</span> for commands, <span className="text-text-primary">"markets"</span> for live windows, <span className="text-text-primary">"ls"</span> for files.</div>
      </div>

      {/* Render Buffer Stream */}
      {lines.map((line) => {
        if (line.type === "prompt") {
          return (
            <div key={line.id} className="flex items-center gap-2 mt-1.5 font-mono">
              <span className={isPractice ? "text-up-green font-bold shrink-0 text-[13px]" : "text-down-red font-bold shrink-0 text-[13px]"}>
                {line.prefix ?? "ferrule/~ $"}
              </span>
              <span className="text-text-primary font-medium">{line.text}</span>
            </div>
          );
        }

        if (line.type === "trigger" && line.payload) {
          const s = line.payload;
          return (
            <div
              key={line.id}
              className="py-1.5 px-2.5 bg-[#00e676]/10 border-l-2 border-up-green my-2 transition-all"
            >
              <div className="text-up-green font-semibold">
                {line.text}
              </div>
              <div className="text-text-primary text-[12px] mt-0.5">
                » <span className="text-up-green font-bold">SUGGESTION GENERATED:</span> Call {s.direction} (${s.stake} {isPractice ? "SIM-USDC" : "tUSDC"}) on {s.window.asset}/USDC [{s.window.intervalSec}s Window]
              </div>
              <div className="text-text-dim text-[11px] mt-0.5">
                Reason: {s.reason} | Target Ask Price: ${s.price.toFixed(3)}
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-border-subtle/50 text-[11px]">
                <span className="text-neutral-gray">
                  Execution status: <span className="text-text-secondary">ADVISORY ONLY</span> (Autonomous spend prohibited)
                </span>
                <button
                  onClick={() => onExecuteSuggestion(s)}
                  className="bg-up-green text-[#0a0a0f] hover:bg-up-green/90 px-2 py-0.5 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                >
                  {isPractice ? "Execute Practice Call →" : "Review & Sign with Wallet →"}
                </button>
              </div>
            </div>
          );
        }

        if (line.type === "table") {
          return (
            <pre
              key={line.id}
              className="text-text-primary font-mono text-[12px] leading-[18px] bg-bg-raised/40 p-2 my-1 border border-border-subtle tabular-nums overflow-x-auto select-text"
            >
              {line.text}
            </pre>
          );
        }

        if (line.type === "eval") {
          return (
            <div key={line.id} className="text-cyan-eval text-[12px]">
              {line.text}
            </div>
          );
        }

        if (line.type === "error") {
          return (
            <div key={line.id} className="text-down-red font-medium text-[12px]">
              [ERROR] {line.text}
            </div>
          );
        }

        if (line.type === "dim") {
          return (
            <div key={line.id} className="text-text-dim text-[12px] tabular-nums">
              {line.text}
            </div>
          );
        }

        if (line.type === "system") {
          return (
            <div key={line.id} className="text-text-secondary text-[12px]">
              {line.text}
            </div>
          );
        }

        // Standard output
        return (
          <div key={line.id} className="text-text-primary whitespace-pre-wrap select-text">
            {line.text}
          </div>
        );
      })}

      <div ref={endRef} />
    </div>
  );
}
