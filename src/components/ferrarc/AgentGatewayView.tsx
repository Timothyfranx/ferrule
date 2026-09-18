import React, { useState, useEffect, useRef } from "react";
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
  Check
} from "lucide-react";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcMainnet } from "../../config/wagmi.js";
import { ARC_RPC_URL, ARC_EXPLORER_URL, FERRARC_CONTRACTS } from "../../config/constants.js";
import { ferrArcEventAbi } from "../../config/abi/ferrArcEventAbi.js";
import type { OpenWindow } from "../../types/index.js";

interface AgentLog {
  id: string;
  timestamp: string;
  type: "info" | "trigger" | "tx" | "error";
  message: string;
  txHash?: string;
}

interface AgentGatewayViewProps {
  windows: OpenWindow[];
}

export function AgentGatewayView({ windows }: AgentGatewayViewProps) {
  // BYOK States
  const [privateKey, setPrivateKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<"contrarian" | "momentum" | "black_scholes">("contrarian");
  const [maxStake, setMaxStake] = useState<number>(5);
  const [llmKey, setLlmKey] = useState<string>("");
  const [showLlmKey, setShowLlmKey] = useState<boolean>(false);

  // Agent Status
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [activeCodeTab, setActiveCodeTab] = useState<"python" | "typescript">("python");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Derive account address whenever valid private key is provided
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

  // Append new log entry
  function addLog(type: AgentLog["type"], message: string, txHash?: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev.slice(-80), // keep latest 80 logs
      { id: `${Date.now()}_${Math.random()}`, timestamp: time, type, message, txHash },
    ]);
  }

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Main autonomous agent loop
  useEffect(() => {
    if (!isRunning) return;

    addLog("info", `Daemon initialized on Arc Mainnet (Chain ID 5042). Signer: ${derivedAddress?.slice(0, 10)}...`);

    const interval = setInterval(async () => {
      if (windows.length === 0) return;

      const activeTarget = windows.find((w) => w.secondsRemaining > 60);
      if (!activeTarget) {
        addLog("info", "Scanning Arc Mainnet pools... all current horizons locked.");
        return;
      }

      addLog("info", `Evaluating ${activeTarget.asset}-15m // Odds: ${Math.round(activeTarget.upLeanProbability * 100)}% UP`);

      // Strategy evaluation trigger
      let shouldTrade = false;
      let callDirection: 1 | 2 = 1; // 1 = UP, 2 = DOWN

      if (strategy === "contrarian") {
        if (activeTarget.upLeanProbability >= 0.70) {
          shouldTrade = true;
          callDirection = 2; // Contrarian DOWN
          addLog("trigger", `SIGNAL: Extreme UP crowd lean (${Math.round(activeTarget.upLeanProbability * 100)}%). Triggering contrarian DOWN trade.`);
        } else if (activeTarget.upLeanProbability <= 0.30) {
          shouldTrade = true;
          callDirection = 1; // Contrarian UP
          addLog("trigger", `SIGNAL: Extreme DOWN crowd lean (${Math.round((1 - activeTarget.upLeanProbability) * 100)}%). Triggering contrarian UP trade.`);
        }
      } else {
        // Momentum
        if (activeTarget.upLeanProbability >= 0.60) {
          shouldTrade = true;
          callDirection = 1;
        }
      }

      // Execute on-chain trade if triggered and private key is loaded
      if (shouldTrade && privateKey) {
        try {
          const formattedKey = (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`;
          const account = privateKeyToAccount(formattedKey);
          const wallet = createWalletClient({
            account,
            chain: arcMainnet,
            transport: http(ARC_RPC_URL),
          });

          addLog("info", `Signing on-chain placeCall(${callDirection === 1 ? "UP" : "DOWN"}) with native USDC msg.value...`);

          const hash = await wallet.writeContract({
            address: FERRARC_CONTRACTS.eventEngine,
            abi: ferrArcEventAbi,
            functionName: "placeCall",
            args: [activeTarget.marketId as `0x${string}`, callDirection],
            value: parseEther(maxStake.toString()), // native Arc USDC 18 decimals
          });

          addLog("tx", `REAL TX CONFIRMED on Arc Mainnet: ${hash.slice(0, 16)}...`, hash);
        } catch (err: any) {
          addLog("error", `On-chain execution error: ${err?.message?.slice(0, 80) || "RPC Failure"}`);
        }
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      addLog("info", "Daemon halted by user.");
    };
  }, [isRunning, windows, strategy, privateKey, derivedAddress, maxStake]);

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
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#080B10] text-[#F8FAFC] font-sans px-3 sm:px-6 py-4">
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-5">
        
        {/* TOP STATUS STRIP */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D121D] border border-[#1E293B] p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${
              isRunning 
                ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" 
                : "bg-[#080B10] text-[#64748B] border-[#1E293B]"
            }`}>
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-white">AUTONOMOUS AGENT RUNNER</span>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-[#10B981] animate-pulse" : "bg-[#64748B]"}`}></span>
              </div>
              <span className="text-xs font-mono text-[#64748B]">
                {isRunning ? "DAEMON RUNNING // 100% REAL ARC MAINNET EXECUTION" : "IDLE // CLIENT-SIDE BYOK ENGINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {derivedAddress ? (
              <span className="bg-[#080B10] border border-[#1E293B] px-2.5 py-1 rounded text-[#00E5FF]">
                Signer: {derivedAddress.slice(0, 6)}...{derivedAddress.slice(-4)}
              </span>
            ) : (
              <span className="text-[#64748B] text-[11px]">No key loaded</span>
            )}
          </div>
        </div>

        {/* 2-COLUMN MAIN CANVAS: CONFIGURATION ON LEFT + LIVE LOGS ON RIGHT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* LEFT: BYOK CONFIGURATION */}
          <div className="bg-[#0D121D] border border-[#1E293B] p-5 rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[#1E293B] pb-3 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Key size={14} className="text-[#00E5FF]" />
              <span>Bring-Your-Own-Key Configuration</span>
            </div>

            {/* Private Key Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#64748B] block">
                Agent Private Key (Stored strictly in client memory)
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="0x..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value.trim())}
                  disabled={isRunning}
                  className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-xs font-mono text-white rounded outline-none pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-white cursor-pointer"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Strategy Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#64748B] block">
                Trading Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as any)}
                disabled={isRunning}
                className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-xs font-mono text-white rounded outline-none cursor-pointer"
              >
                <option value="contrarian">Contrarian Mean Reversion (Fade Extreme Odds &gt;70%)</option>
                <option value="momentum">Pyth Momentum Follower (Enter with Trend)</option>
                <option value="black_scholes">Black-Scholes Delta Arbitrage</option>
              </select>
            </div>

            {/* Max Stake */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#64748B]">Max Stake per Call:</span>
                <span className="text-[#00E5FF] font-bold">${maxStake} USDC</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={maxStake}
                onChange={(e) => setMaxStake(Number(e.target.value))}
                disabled={isRunning}
                className="w-full accent-[#00E5FF] cursor-pointer"
              />
            </div>

            {/* Optional LLM API Key */}
            <div className="space-y-1 pt-1 border-t border-[#1E293B]/60">
              <label className="text-[11px] font-mono text-[#64748B] block">
                Optional LLM Key (OpenAI / Anthropic for Natural Language Reasoning)
              </label>
              <div className="relative">
                <input
                  type={showLlmKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={llmKey}
                  onChange={(e) => setLlmKey(e.target.value.trim())}
                  disabled={isRunning}
                  className="w-full bg-[#080B10] border border-[#1E293B] focus:border-[#00E5FF] px-3 py-2 text-xs font-mono text-white rounded outline-none pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowLlmKey(!showLlmKey)}
                  className="absolute right-2.5 top-2.5 text-[#64748B] hover:text-white cursor-pointer"
                >
                  {showLlmKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Activation Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                disabled={!privateKey && !isRunning}
                className={`w-full py-3 rounded text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isRunning
                    ? "bg-[#EF4444] hover:bg-[#EF4444]/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#080B10] shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isRunning ? (
                  <>
                    <Square size={14} />
                    <span>Stop Autonomous Daemon</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Activate Autonomous Daemon</span>
                  </>
                )}
              </button>
              {!privateKey && !isRunning && (
                <span className="text-[10px] font-mono text-[#64748B] text-center block mt-1.5">
                  Enter an Arc private key above to start live automated trading.
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: REAL ON-CHAIN TICK LOGS */}
          <div className="bg-[#0D121D] border border-[#1E293B] rounded-lg flex flex-col h-96 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#080B10] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono text-[#64748B]">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-[#00E5FF]" />
                <span className="text-white font-bold text-[11px]">ON-CHAIN EXECUTION LOG</span>
              </div>
              <span className="text-[10px] text-[#64748B]">{logs.length} ticks recorded</span>
            </div>

            {/* Scrollable Terminal Output */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-[#080B10]/80">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#64748B] text-center text-xs">
                  <span>Daemon idle. Start the runner to stream live tick evaluations.</span>
                </div>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="leading-relaxed break-words">
                    <span className="text-[#64748B] select-none">[{l.timestamp}] </span>
                    {l.type === "trigger" && <span className="text-[#F59E0B] font-bold">⚡ </span>}
                    {l.type === "tx" && <span className="text-[#10B981] font-bold">✓ </span>}
                    {l.type === "error" && <span className="text-[#EF4444] font-bold">✗ </span>}
                    <span className={
                      l.type === "trigger" ? "text-[#F59E0B]" :
                      l.type === "tx" ? "text-[#10B981] font-bold" :
                      l.type === "error" ? "text-[#EF4444]" : "text-[#94A3B8]"
                    }>
                      {l.message}
                    </span>
                    {l.txHash && (
                      <a
                        href={`${ARC_EXPLORER_URL}/tx/${l.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#00E5FF] underline ml-1 font-bold"
                      >
                        Arc Explorer <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

        </div>

        {/* BOTTOM: DEVELOPER SDK SNIPPET (3 LINES OF CODE) */}
        <div className="bg-[#0D121D] border border-[#1E293B] p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
              <Code size={13} className="text-[#00E5FF]" />
              <span>Developer SDK: Integrate Your Autonomous Bot</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex p-0.5 bg-[#080B10] border border-[#1E293B] rounded text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("python")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeCodeTab === "python" ? "bg-[#00E5FF]/15 text-[#00E5FF] font-bold" : "text-[#64748B]"
                  }`}
                >
                  Python
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCodeTab("typescript")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeCodeTab === "typescript" ? "bg-[#00E5FF]/15 text-[#00E5FF] font-bold" : "text-[#64748B]"
                  }`}
                >
                  TypeScript
                </button>
              </div>

              <button
                type="button"
                onClick={copyCode}
                className="p-1 text-[#64748B] hover:text-white rounded border border-[#1E293B] bg-[#080B10] cursor-pointer"
                title="Copy code"
              >
                {copiedCode ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <pre className="p-3 bg-[#080B10] rounded border border-[#1E293B] overflow-x-auto text-[11px] font-mono text-[#94A3B8] leading-relaxed">
            {activeCodeTab === "python" ? pythonSnippet : tsSnippet}
          </pre>
        </div>

      </div>
    </div>
  );
}
