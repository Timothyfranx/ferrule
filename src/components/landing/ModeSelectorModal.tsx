import React from "react";
import { X, Layers, Terminal, ArrowRight, Check } from "lucide-react";

interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: "basic" | "terminal") => void;
  currentMode: "basic" | "terminal";
}

export function ModeSelectorModal({
  isOpen,
  onClose,
  onSelectMode,
  currentMode,
}: ModeSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f]/85 flex items-center justify-center p-4 selection:bg-border-flat">
      <div className="bg-bg-base border border-border-flat rounded-md w-full max-w-4xl p-6 sm:p-10 relative overflow-hidden text-text-primary">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-dim hover:text-text-primary transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header / Context */}
        <div className="text-center max-w-lg mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-3 border border-border-flat bg-bg-raised rounded-[4px]">
            <span className="text-[10px] font-mono tracking-wide text-text-secondary uppercase">
              Step 02 of 02 · Interface Selector
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary mb-2">
            Choose your trading interface
          </h2>
          <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
            Select the layout that fits your workflow. You can switch freely at any time from the top bar.
          </p>
        </div>

        {/* Side-by-Side Cards (Equal Weight) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* 1. BASIC CARD */}
          <div 
            onClick={() => {
              onSelectMode("basic");
              onClose();
            }}
            className={`p-6 sm:p-7 flex flex-col justify-between cursor-pointer rounded-md border transition-all ${
              currentMode === "basic"
                ? "bg-bg-raised border-up-green/70"
                : "bg-bg-raised border-border-flat hover:border-border-interactive"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-flat">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-[#00e676]/10 text-up-green border border-up-green/20 rounded-[2px]">
                    <Layers size={16} />
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
                    FLOW // 01
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 border border-border-flat rounded-full text-text-secondary bg-bg-base">
                  SIMPLIFIED
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary flex items-baseline gap-2">
                  <span className="font-mono">BASIC</span>
                  <span className="text-text-secondary font-normal text-sm sm:text-base">— Trade simply</span>
                </h3>
                <p className="text-text-secondary text-xs mt-2 leading-relaxed">
                  Streamlined signals, visual crowd-lean tension clamp, and pure probability metrics with zero terminal noise.
                </p>
              </div>

              <div className="space-y-2 my-5 py-3 border-y border-border-flat text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-up-green"></span>
                  <span>Clear Up/Down market calls with 1-click confirm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-up-green"></span>
                  <span>Clean tension clamp lean indicators & countdowns</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-up-green"></span>
                  <span>Plain-language Brier calibration scorecard</span>
                </div>
              </div>
            </div>

            <button
              className={`w-full py-2.5 px-4 font-mono text-xs uppercase tracking-wider font-bold rounded-[4px] flex items-center justify-center gap-2 transition-colors ${
                currentMode === "basic"
                  ? "bg-up-green text-[#0a0a0f]"
                  : "bg-bg-base border border-border-interactive hover:border-up-green text-text-primary"
              }`}
            >
              <span>{currentMode === "basic" ? "Active Interface" : "Launch Basic View"}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 2. PRO TERMINAL CARD */}
          <div 
            onClick={() => {
              onSelectMode("terminal");
              onClose();
            }}
            className={`p-6 sm:p-7 flex flex-col justify-between cursor-pointer rounded-md border transition-all ${
              currentMode === "terminal"
                ? "bg-bg-raised border-cyan-eval/70"
                : "bg-bg-raised border-border-flat hover:border-border-interactive"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-flat">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-cyan-eval/10 text-cyan-eval border border-cyan-eval/20 rounded-[2px]">
                    <Terminal size={16} />
                  </span>
                  <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
                    FLOW // 02
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 border border-border-flat rounded-full text-cyan-eval bg-bg-base">
                  QUANT &amp; SCRIPTS
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary flex items-baseline gap-2">
                  <span className="font-mono">PRO</span>
                  <span className="text-text-secondary font-normal text-sm sm:text-base">— Terminal shell</span>
                </h3>
                <p className="text-text-secondary text-xs mt-2 leading-relaxed">
                  Real shell executing bash built-ins (mkdir, touch, ls, cat), virtual strategies, and live background watcher daemons.
                </p>
              </div>

              <div className="space-y-2 my-5 py-3 border-y border-border-flat text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-eval"></span>
                  <span>Full VT100 interactive live terminal emulator</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-eval"></span>
                  <span>Background event watchers with suggestion cards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-eval"></span>
                  <span>Virtual scripts: <code className="text-cyan-eval">run /strategies/fade_crowd.sh</code></span>
                </div>
              </div>
            </div>

            <button
              className={`w-full py-2.5 px-4 font-mono text-xs uppercase tracking-wider font-bold rounded-[4px] flex items-center justify-center gap-2 transition-colors ${
                currentMode === "terminal"
                  ? "bg-cyan-eval text-[#0a0a0f]"
                  : "bg-bg-base border border-border-interactive hover:border-cyan-eval text-text-primary"
              }`}
            >
              <span>{currentMode === "terminal" ? "Active Interface" : "Launch Pro Terminal"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
