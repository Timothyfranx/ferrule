import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Key, 
  Play, 
  Square, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Code, 
  Terminal, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Copy,
  Check,
  Zap,
  X
} from "lucide-react";
import { privateKeyToAccount } from "viem/accounts";
import { ARC_RPC_URL, ARC_EXPLORER_URL, FERRARC_CONTRACTS } from "../../config/constants.js";
import type { TradingMode } from "../../types/index.js";

export interface TerminalAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  onToggleRun: () => void;
  strategy: "contrarian" | "momentum" | "black_scholes";
  onStrategyChange: (strategy: "contrarian" | "momentum" | "black_scholes") => void;
  stake: number;
  onStakeChange: (stake: number) => void;
  mode: TradingMode;
  privateKey: string;
  onPrivateKeyChange: (key: string) => void;
  signalsCount: number;
  tradesCount: number;
  lastAction?: string;
  onTriggerSingleRun?: () => void;
}

export function TerminalAgentModal({
  isOpen,
  onClose,
  isRunning,
  onToggleRun,
  strategy,
  onStrategyChange,
  stake,
  onStakeChange,
  mode,
  privateKey,
  onPrivateKeyChange,
  signalsCount,
  tradesCount,
  lastAction,
  onTriggerSingleRun,
}: TerminalAgentModalProps) {
  const [showKey, setShowKey] = useState<boolean>(false);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<"python" | "typescript">("python");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Derive account address when valid private key is provided
  useEffect(() => {
    if (!privateKey) {
      setDerivedAddress(null);
      return;
    }
    try {
      const formattedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
      if (formattedKey.length === 66) {
        const acc = privateKeyToAccount(formattedKey);
        setDerivedAddress(acc.address);
      } else {
        setDerivedAddress(null);
      }
    } catch {
      setDerivedAddress(null);
    }
  }, [privateKey]);

  if (!isOpen) return null;

  const pythonSnippet = `# ferrarc_agent.py - Real Autonomous Market Maker on Arc Mainnet
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("${ARC_RPC_URL}"))
agent = w3.eth.account.from_key("YOUR_PRIVATE_KEY")
ferrarc = w3.eth.contract(address="${FERRARC_CONTRACTS.eventEngine}", abi=FERRARC_ABI)

# 1. Query live crowd lean probability
lean_bps = ferrarc.functions.getCrowdLean(window_id).call()

# 2. 1-Click native USDC execution (Zero approvals required)
if lean_bps > 7000: # > 70% UP -> Enter contrarian DOWN (direction = 2)
    tx = ferrarc.functions.placeCall(window_id, 2).build_transaction({
        'value': Web3.to_wei(5, 'ether'), # 5.00 native USDC
        'from': agent.address,
        'gas': 120000
    })
    signed = agent.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    print(f"Verified Arc Explorer: ${ARC_EXPLORER_URL}/tx/{tx_hash.hex()}")`;

  const tsSnippet = `// ferrarc-agent.ts - Arc Mainnet Autonomous Trader
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcMainnet, FERRARC_ABI, FERRARC_ADDRESS } from "./config";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const client = createWalletClient({ account, chain: arcMainnet, transport: http() });

// Execute 1-click trade using native Arc USDC msg.value
const txHash = await client.writeContract({
  address: FERRARC_ADDRESS,
  abi: FERRARC_ABI,
  functionName: "placeCall",
  args: [windowId, 2], // 2 = DOWN
  value: parseEther("5.0"), // 5 native USDC
});
console.log(\`Verified Arc Explorer: ${ARC_EXPLORER_URL}/tx/\${txHash}\`);`;

  function copyCode() {
    navigator.clipboard.writeText(activeCodeTab === "python" ? pythonSnippet : tsSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="bg-[#0D121D] border border-[#1E293B] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden rounded-lg">
        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] bg-[#080B10] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center border ${
              isRunning 
                ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40" 
                : "bg-[#0D121D] text-[#64748B] border-[#1E293B]"
            }`}>
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">TERMINAL AI AGENT DAEMON</span>
                <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-[#10B981] animate-pulse" : "bg-[#64748B]"}`}></span>
              </div>
              <span className="text-[11px] text-[#64748B]">
                {isRunning ? "DAEMON ACTIVE // STREAMING SIGNALS TO TERMINAL" : "DAEMON IDLE // CONFIGURE & LAUNCH"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center bg-[#0D121D] border border-[#1E293B] hover:border-[#64748B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status & Quick Action Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#080B10] border border-[#1E293B] p-3 rounded">
              <span className="text-[10px] text-[#64748B] block uppercase">Execution Target</span>
              <span className="text-xs text-white font-bold mt-0.5 block">
                {mode === "practice" ? "Practice Sandbox (Zero Risk)" : "Arc L1 Mainnet (5042)"}
              </span>
            </div>
            <div className="bg-[#080B10] border border-[#1E293B] p-3 rounded">
              <span className="text-[10px] text-[#64748B] block uppercase">Signals / Trades</span>
              <span className="text-xs text-[#00E5FF] font-bold mt-0.5 block">
                {signalsCount} signals / {tradesCount} orders
              </span>
            </div>
            <div className="bg-[#080B10] border border-[#1E293B] p-3 rounded flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#64748B] block uppercase">Daemon State</span>
                <span className={`text-xs font-bold mt-0.5 block ${isRunning ? "text-[#10B981]" : "text-[#94A3B8]"}`}>
                  {isRunning ? "RUNNING (5s scan)" : "HALTED"}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleRun}
                className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isRunning 
                    ? "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                    : "bg-[#10B981] hover:bg-[#10B981]/90 text-[#080B10] shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                }`}
              >
                {isRunning ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                <span>{isRunning ? "Stop Daemon" : "Start Daemon"}</span>
              </button>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">
              1. Autonomous Algorithm Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onStrategyChange("contrarian")}
                className={`p-3 rounded text-left border transition-all cursor-pointer ${
                  strategy === "contrarian"
                    ? "bg-[#00E5FF]/10 border-[#00E5FF] text-white"
                    : "bg-[#080B10] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <div className="font-bold text-xs text-white">Contrarian Fade</div>
                <div className="text-[11px] text-[#64748B] mt-1">Fades extreme crowd lean (&gt;70% UP or &lt;30% UP)</div>
              </button>

              <button
                type="button"
                onClick={() => onStrategyChange("momentum")}
                className={`p-3 rounded text-left border transition-all cursor-pointer ${
                  strategy === "momentum"
                    ? "bg-[#00E5FF]/10 border-[#00E5FF] text-white"
                    : "bg-[#080B10] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <div className="font-bold text-xs text-white">Momentum Trend</div>
                <div className="text-[11px] text-[#64748B] mt-1">Rides heavy directional pressure into expiry</div>
              </button>

              <button
                type="button"
                onClick={() => onStrategyChange("black_scholes")}
                className={`p-3 rounded text-left border transition-all cursor-pointer ${
                  strategy === "black_scholes"
                    ? "bg-[#00E5FF]/10 border-[#00E5FF] text-white"
                    : "bg-[#080B10] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <div className="font-bold text-xs text-white">Black-Scholes Arbitrage</div>
                <div className="text-[11px] text-[#64748B] mt-1">Exploits mispricing between analytical fair value &amp; odds</div>
              </button>
            </div>
          </div>

          {/* Stake Sizing & Single-Shot Scan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">
                2. Stake Size Per Signal
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={stake}
                  onChange={(e) => onStakeChange(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="flex-1 bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 rounded text-xs text-white outline-none"
                />
                <span className="text-xs text-[#64748B]">USDC / trade</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-[#64748B] block font-bold uppercase tracking-wider">
                Manual Verification
              </label>
              <button
                type="button"
                onClick={onTriggerSingleRun}
                className="w-full bg-[#080B10] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#00E5FF] px-3 py-2 rounded text-xs text-[#00E5FF] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap size={13} />
                <span>Trigger Immediate Single Scan</span>
              </button>
            </div>
          </div>

          {/* BYOK Private Key (For Real Mode) */}
          <div className="space-y-2 bg-[#080B10] border border-[#1E293B] p-4 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Key size={13} className="text-[#00E5FF]" />
                <span>Bring-Your-Own-Key (Optional for Real On-Chain)</span>
              </div>
              {derivedAddress && (
                <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                  Signer: {derivedAddress.slice(0, 6)}...{derivedAddress.slice(-4)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              If left blank, the agent runs in simulation mode using your practice bankroll. If provided, the agent signs real native 18-dec USDC orders on Arc L1 directly in your browser. Key is stored purely in client RAM.
            </p>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                placeholder="0x... (Private key for autonomous execution)"
                value={privateKey}
                onChange={(e) => onPrivateKeyChange(e.target.value)}
                className="w-full bg-[#0D121D] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 pr-10 rounded text-xs text-white font-mono outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white cursor-pointer"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Terminal CLI Integration Tip */}
          <div className="p-3 bg-[#080B10] border border-[#00E5FF]/20 rounded flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#00E5FF]" />
              <span className="text-[#94A3B8]">
                You can also control the daemon via CLI: <code className="text-[#00E5FF]">agent start</code>, <code className="text-[#00E5FF]">agent stop</code>, <code className="text-[#00E5FF]">agent status</code>.
              </span>
            </div>
          </div>

          {/* Quick Copy SDK Snippets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B] font-bold uppercase tracking-wider">
                Automated Bot SDK Code (Arc L1 Mainnet)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("python")}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    activeCodeTab === "python" ? "bg-[#00E5FF] text-[#080B10] font-bold" : "text-[#64748B]"
                  }`}
                >
                  Python
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("typescript")}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    activeCodeTab === "typescript" ? "bg-[#00E5FF] text-[#080B10] font-bold" : "text-[#64748B]"
                  }`}
                >
                  TypeScript
                </button>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex items-center gap-1 text-[11px] text-[#00E5FF] hover:underline cursor-pointer ml-2"
                >
                  {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[#080B10] border border-[#1E293B] rounded text-[11px] text-[#94A3B8] font-mono overflow-x-auto max-h-36">
              <code>{activeCodeTab === "python" ? pythonSnippet : tsSnippet}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1E293B] bg-[#080B10] flex items-center justify-between text-xs">
          <div className="text-[#64748B] text-[11px]">
            Connected to: <span className="text-white font-bold">Circle Arc L1 (5042)</span> | Pyth Oracles
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white font-bold rounded cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
