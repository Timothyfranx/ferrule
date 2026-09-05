import React, { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { TradingMode } from "../../types/index.js";

interface TerminalPromptProps {
  mode: TradingMode;
  cwd?: string;
  onSubmit: (command: string) => void;
  commandHistory: string[];
}

export function TerminalPrompt({ mode, cwd = "/", onSubmit, commandHistory }: TerminalPromptProps) {
  const [value, setValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPractice = mode === "practice";
  const displayCwd = (!cwd || cwd === "/") ? "~" : cwd.replace(/^\//, "");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value);
        setValue("");
        setHistoryIndex(-1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setValue(commandHistory[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setValue("");
        } else {
          setHistoryIndex(nextIndex);
          setValue(commandHistory[nextIndex]);
        }
      }
    }
  }

  return (
    <div className="flex flex-col shrink-0 pt-2 pb-1 border-t border-border-subtle select-text">
      {/* Mobile-only Quick Action Chips (discreet on small screens) */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1.5 text-[10px] font-mono select-none">
        {["markets", "positions", "watchers", "ls", "help"].map((quickCmd) => (
          <button
            key={quickCmd}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit(quickCmd);
            }}
            className="px-2 py-0.5 bg-bg-raised border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary text-[10px] shrink-0 cursor-pointer"
          >
            ${quickCmd}
          </button>
        ))}
      </div>

      {/* Terminal Command Line */}
      <div
        className="flex items-center gap-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <span
          className={`font-bold shrink-0 text-[13px] select-none ${
            isPractice ? "text-up-green" : "text-down-red"
          }`}
        >
          ferrule/{displayCwd} $
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-text-primary font-mono text-[13px] p-0 m-0"
          style={{ caretColor: isPractice ? "#00e676" : "#ff5252" }}
          autoComplete="off"
          spellCheck="false"
          placeholder=""
        />
      </div>
    </div>
  );
}
