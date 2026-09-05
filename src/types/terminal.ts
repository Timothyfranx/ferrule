import type { CallDirection, OpenWindow } from "./index.js";

export type TerminalLineType = 
  | "system" 
  | "prompt" 
  | "output" 
  | "eval" 
  | "trigger" 
  | "error" 
  | "table" 
  | "dim";

export interface SuggestionPayload {
  window: OpenWindow;
  direction: CallDirection;
  stake: number;
  price: number;
  reason: string;
  round?: string;
  workerPid?: number;
}

export interface TerminalLine {
  id: string;
  type: TerminalLineType;
  text: string;
  timestamp?: string;
  prefix?: string;
  payload?: SuggestionPayload;
}

export interface WatcherJob {
  pid: number;
  symbol: string;
  ruleString: string;
  targetLean: number;
  operator: ">=" | "<=" | ">" | "<";
  stake: number;
  direction: CallDirection;
  active: boolean;
  evalCount: number;
  hitCount: number;
  lastTriggerTime: number;
}

export interface VirtualFile {
  path: string;
  description: string;
  content: string;
  isDirectory?: boolean;
}

