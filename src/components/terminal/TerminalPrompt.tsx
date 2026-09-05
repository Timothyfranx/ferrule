import React, { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { TradingMode } from "../../types/index.js";

interface TerminalPromptProps {
  mode: TradingMode;
  onSubmit: (command: string) => void;
  commandHistory: string[];
}

export function TerminalPrompt({ mode, onSubmit, commandHistory }: TerminalPromptProps) {
  const [value, setValue] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPractice = mode === "practice";

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
      {/* Mobile-friendly Quick Command Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px] font-mono select-none">
        {["markets", "positions", "watchers", "ls", "mkdir clob", "help"].map((quickCmd) => (
          <button
            key={quickCmd}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubmit(quickCmd);
            }}
            className="px-2 py-0.5 bg-bg-raised border border-border-base hover:border-border-interactive text-text-secondary hover:text-text-primary text-[11px] shrink-0 cursor-pointer"
          >
            ${quickCmd}
          </button>
        ))}
      </div>

      <div
        className="flex items-baseline gap-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <span className={isPractice ? "glyph-prompt" : "glyph-prompt-real"}>
          ⊏ferrule/{mode}
        </span>

        <div className="flex-1 flex items-center font-mono text-text-primary text-[13px] relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-text-primary font-mono text-[13px] p-0 m-0 caret-transparent"
            autoComplete="off"
            spellCheck="false"
            placeholder="type command, 'help', or 'watch BTC-300s if lean>=0.65 then suggest stake 250 up'..."
          />
          {/* Blinking block cursor overlay */}
          <span className="term-cursor" aria-hidden="true"></span>
        </div>
      </div>
    </div>
  );
}
