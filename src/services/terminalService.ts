import type { 
  OpenWindow, 
  Call, 
  TerminalLine, 
  VirtualFile, 
  TradingMode 
} from "../types/index.js";
import { CANONICAL_CONTRACTS, SOMNIA_CHAIN_ID } from "../config/constants.js";
import { PracticeTradingService } from "./practiceTradingService.js";
import { RealTradingService } from "./realTradingService.js";
import { WatcherService } from "./watcherService.js";
import { ScorecardService } from "./scorecardService.js";
import { calculateFairValue } from "./quantService.js";

export class TerminalService {
  private virtualFs: Map<string, VirtualFile> = new Map();
  private commandHistory: string[] = [];
  private cwd: string = "/";
  private static readonly STORAGE_KEY = "ferrule_virtual_fs_v1";

  constructor() {
    this.initVirtualFs();
  }

  private initVirtualFs() {
    // Attempt hydration from localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(TerminalService.STORAGE_KEY);
        if (stored) {
          const parsed: [string, VirtualFile][] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.virtualFs = new Map(parsed);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load virtual FS from localStorage:", err);
      }
    }

    this.seedDefaultFs();
  }

  private seedDefaultFs() {
    this.virtualFs.clear();

    // Default Directories
    this.virtualFs.set("/strategies", {
      path: "/strategies",
      description: "Directory — Automated Strategy Scripts",
      content: "",
      isDirectory: true,
    });

    this.virtualFs.set("/config", {
      path: "/config",
      description: "Directory — System & Network Config",
      content: "",
      isDirectory: true,
    });

    // Default Files
    this.virtualFs.set("/strategies/fade_crowd.sh", {
      path: "/strategies/fade_crowd.sh",
      description: "Contrarian Fade Strategy — Fades overbought crowd lean (>80%)",
      content: `# Contrarian Fade Strategy\n# Fades overbought crowd lean (>80%) into binary close\nwatch BTC-300s if lean>=0.80 then suggest stake 100 down`,
      isDirectory: false,
    });

    this.virtualFs.set("/strategies/momentum.sh", {
      path: "/strategies/momentum.sh",
      description: "Momentum Breakout Strategy — Rides directional sentiment (>70%)",
      content: `# Momentum Breakout Strategy\n# Rides strong directional sentiment (>70%)\nwatch ETH-300s if lean>=0.70 then suggest stake 50 up`,
      isDirectory: false,
    });

    this.virtualFs.set("/strategies/rebound.sh", {
      path: "/strategies/rebound.sh",
      description: "Oversold Rebound Strategy — Buys beaten-down probability (<25%)",
      content: `# Oversold Rebound Strategy\n# Asymmetric upside entry on oversold book\nwatch BTC-300s if lean<=0.25 then suggest stake 25 up`,
      isDirectory: false,
    });

    this.virtualFs.set("/config/env.sh", {
      path: "/config/env.sh",
      description: "Runtime Network Environment Configuration",
      content: `CHAIN_ID=${SOMNIA_CHAIN_ID}\nNETWORK="Somnia Shannon Testnet"\nCLOB="DreamDEX Event Contracts"\nMODULE="${CANONICAL_CONTRACTS.binaryMarketsModule}"\nCOLLATERAL="${CANONICAL_CONTRACTS.testUsdc}"`,
      isDirectory: false,
    });

    this.saveVirtualFs();
  }

  public saveVirtualFs() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const entries = Array.from(this.virtualFs.entries());
        window.localStorage.setItem(TerminalService.STORAGE_KEY, JSON.stringify(entries));
      } catch (err) {
        console.warn("Could not persist virtual FS to localStorage:", err);
      }
    }
  }

  public getCwd(): string {
    return this.cwd;
  }

  public getVirtualFiles(): VirtualFile[] {
    return Array.from(this.virtualFs.values());
  }

  /**
   * Normalizes absolute and relative paths given the current working directory.
   */
  public resolvePath(targetPath: string): string {
    let clean = targetPath.trim();
    if (!clean.startsWith("/")) {
      clean = this.cwd === "/" ? `/${clean}` : `${this.cwd}/${clean}`;
    }
    // Normalize segment traversal (., ..)
    const segments = clean.split("/").filter(Boolean);
    const resolved: string[] = [];
    for (const seg of segments) {
      if (seg === ".") continue;
      if (seg === "..") {
        resolved.pop();
      } else {
        resolved.push(seg);
      }
    }
    return "/" + resolved.join("/");
  }

  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Dispatches and evaluates a command line string.
   */
  async executeCommand(
    rawInput: string,
    context: {
      mode: TradingMode;
      setMode: (mode: TradingMode) => void;
      windows: OpenWindow[];
      calls: Call[];
      practiceService: PracticeTradingService;
      realService: RealTradingService | null;
      watcherService: WatcherService;
      walletAddress?: string | null;
      onTriggerModal?: (window: OpenWindow, direction: "UP" | "DOWN", stake: number) => void;
      onTriggerHowItWorks?: () => void;
      onTriggerAudit?: () => void;
      onFocusMarket?: (marketId: string) => void;
      focusedMarketId?: string;
    }
  ): Promise<TerminalLine[]> {
    const input = rawInput.trim();
    if (!input) return [];

    this.commandHistory.push(input);
    const now = new Date().toTimeString().slice(0, 8);
    const lines: TerminalLine[] = [];

    // Check for redirection: cmd > filepath
    if (rawInput.includes(" > ")) {
      const [cmdPart, filePart] = rawInput.split(" > ");
      const targetPath = this.resolvePath(filePart.trim());
      const subLines = await this.executeCommand(cmdPart.trim(), context);
      const textOutput = subLines.map(l => l.text).join("\n");
      this.virtualFs.set(targetPath, {
        path: targetPath,
        description: "User file",
        content: textOutput,
        isDirectory: false,
      });
      this.saveVirtualFs();
      return [{ id: `line_${Date.now()}`, type: "system", text: `[FS] Wrote output to ${targetPath}`, timestamp: now }];
    }

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // 1. WATCH COMMAND (Strategy Watcher Daemon)
    if (cmd === "watch") {
      const { initLines } = context.watcherService.spawnWatcher(input);
      return initLines;
    }

    // 2. HELP COMMAND
    if (cmd === "help" || cmd === "?") {
      return [
        {
          id: `line_${Date.now()}_1`,
          type: "system",
          text: `Ferrule Terminal Help — Somnia DreamDEX CLOB Binary Shell`,
          timestamp: now,
        },
        {
          id: `line_${Date.now()}_2`,
          type: "output",
          text: `
CORE COMMANDS:
  markets                   List active binary market windows, lean %, and countdowns
  market status <symbol>    Query real-time strike, oracle round, and order book depth
  call <symbol> <up|down> <stake>
                            Place call (Practice: instant simulated fill; Real: wallet prompt)
  positions                 View open and resolved call ledger with PnL
  scorecard                 Print Brier calibration scorecard and empirical accuracy
  mode <practice|real>      Switch trading environment
  guide | how-it-works      Open the interactive architecture and protocol guide overlay

AUTOMATED STRATEGY WATCHERS:
  watch <symbol> if <condition> then suggest <action>
    Example: watch BTC-15m if lean>=0.65 then suggest stake 250 up
    Example: watch ETH-5m if lean<=0.30 then suggest stake 100 up
  watchers | ps             List running background evaluation jobs
  kill <pid>                Terminate a background watcher job

QUANTITATIVE & ORDERFLOW COCKPIT:
  focus <symbol>            Lock orderflow cockpit onto asset (e.g. focus btc, focus eth)
  dom | depth               Render ASCII L2 Depth of Market ladder and Order Imbalance Ratio
  edge                      Print closed-form Black-Scholes Φ(d₂) fair value and edge (bps)
  kelly                     Print Quarter-Kelly position sizing recommendation matrix
  roll <compound|preserve|sweep>
                            Configure autonomous settlement rollover rule
  audit | telemetry         Open full verified execution and calibration audit modal

SHELL & SCRIPT UTILITIES:
  pwd                       Print current working directory
  cd <path>                 Change working directory (e.g. cd clob, cd ..)
  ls [path]                 List files and directories in virtual filesystem
  mkdir <path>              Create a directory in virtual filesystem (persisted to localStorage)
  touch <path>              Create an empty file
  rm [-rf] <path>           Remove a file or directory
  cat <path>                Read contents of a script or config file
  echo <text> [> <file>]    Print text or redirect to a virtual file
  run <path.sh>             Execute a strategy script
  resetfs                   Reset virtual filesystem to default factory state
  whoami                    Display active wallet identity
  env                       Display runtime contract addresses and chain configuration
  date                      Current UTC system timestamp
  clear | cls               Clear the terminal screen
`,
          timestamp: now,
        },
      ];
    }

    // 2b. GUIDE / HOW-IT-WORKS COMMAND
    if (cmd === "guide" || cmd === "how-it-works" || cmd === "howitworks" || cmd === "docs" || cmd === "architecture") {
      context.onTriggerHowItWorks?.();
      return [
        {
          id: `line_${Date.now()}_1`,
          type: "system",
          text: `[GUIDE] Opening Ferrule Protocol & System Architecture Overlay...`,
          timestamp: now,
        },
        {
          id: `line_${Date.now()}_2`,
          type: "output",
          text: `
FERRULE SYSTEM OVERVIEW:
- Central Limit Order Book: Somnia DreamDEX binary markets (Chain ID: 50312)
- Price Feed Resolution: Pyth Network sub-second oracles
- MEV Protection Gate: Orders lock 45s prior to contract expiry
- Calibration Score: Continuous Brier index tracking (B = (1/N) * sum(f - o)^2)
- Automated Tooling: Background watcher daemons & bash strategy scripts

Interactive overlay launched. Press [ESC] in modal to return to terminal.
`,
          timestamp: now,
        },
      ];
    }

    // 2c. FOCUS COMMAND
    if (cmd === "focus" || (cmd === "market" && args[0] && args[0] !== "status" && args[0] !== "list")) {
      const symbol = (cmd === "focus" ? args[0] : args[0]).toUpperCase();
      const target = context.windows.find(w => 
        w.asset.toUpperCase() === symbol || 
        w.marketId.toLowerCase().includes(symbol.toLowerCase())
      );
      if (target) {
        context.onFocusMarket?.(target.marketId);
        return [{
          id: `line_${Date.now()}`,
          type: "system",
          text: `[FOCUS] Active orderflow cockpit locked onto ${target.asset}/USDC (${target.intervalSec}s). Market ID: ${target.marketId.slice(0, 10)}...`,
          timestamp: now,
        }];
      }
      return [{
        id: `line_${Date.now()}`,
        type: "error",
        text: `Market "${symbol}" not found. Type "markets" to view active windows.`,
        timestamp: now,
      }];
    }

    // 2d. DOM / DEPTH COMMAND
    if (cmd === "dom" || cmd === "depth" || cmd === "ladder") {
      const symbol = (args[0] || "").toUpperCase();
      const w = symbol 
        ? context.windows.find(win => win.asset.toUpperCase() === symbol)
        : (context.focusedMarketId ? context.windows.find(win => win.marketId === context.focusedMarketId) : context.windows[0]);
      
      if (!w) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `No active market available for depth ladder.`, timestamp: now }];
      }

      const upBid = w.bestUpBid ?? (w.upLeanPercent / 100 - 0.015);
      const upAsk = w.bestUpAsk ?? (w.upLeanPercent / 100 + 0.015);
      const bidVol = Math.max(10, w.upBidVolume || 990);
      const askVol = Math.max(10, w.upAskVolume || 990);
      const oir = (bidVol - askVol) / (bidVol + askVol);
      const oirLabel = oir > 0.2 ? "STRONG BID PRESSURE" : oir < -0.2 ? "HEAVY ASK OVERHANG" : "BALANCED ORDERFLOW";

      let table = `[L2 DEPTH LADDER (DOM) — ${w.asset}/USDC ${w.intervalSec}s]\n`;
      table += `ORDER IMBALANCE RATIO (OIR): ${(oir > 0 ? "+" : "") + oir.toFixed(2)} [${oirLabel}]\n`;
      table += `----------------------------------------------------------------------\n`;
      table += `SIDE    PRICE      SIZE        TOTAL      DEPTH VISUALIZER\n`;
      table += `----------------------------------------------------------------------\n`;
      
      const askOffsets = [0.03, 0.02, 0.01, 0.00];
      for (let i = 0; i < askOffsets.length; i++) {
        const p = (upAsk + askOffsets[i]).toFixed(3);
        const sz = Math.round(askVol * (0.15 + (i * 0.05)));
        const total = sz * (i + 1);
        const bars = "█".repeat(Math.min(18, Math.max(1, Math.round((sz / (askVol * 0.4)) * 14))));
        table += `ASK     $${p}    ${sz.toString().padStart(6)}      ${total.toString().padStart(6)}      ${bars}\n`;
      }

      table += `-------- SPREAD: ${(upAsk - upBid).toFixed(3)} | MID: ${((upAsk + upBid) / 2).toFixed(3)} --------\n`;

      const bidOffsets = [0.00, 0.01, 0.02, 0.03];
      for (let i = 0; i < bidOffsets.length; i++) {
        const p = Math.max(0.01, upBid - bidOffsets[i]).toFixed(3);
        const sz = Math.round(bidVol * (0.15 + (i * 0.05)));
        const total = sz * (i + 1);
        const bars = "█".repeat(Math.min(18, Math.max(1, Math.round((sz / (bidVol * 0.4)) * 14))));
        table += `BID     $${p}    ${sz.toString().padStart(6)}      ${total.toString().padStart(6)}      ${bars}\n`;
      }

      table += `----------------------------------------------------------------------\n`;
      table += `Tip: Click rows in right DOM panel or use "call ${w.asset} <up|down> <stake>" to trade.`;

      return [{ id: `line_${Date.now()}`, type: "table", text: table, timestamp: now }];
    }

    // 2e. EDGE / RADAR COMMAND
    if (cmd === "edge" || cmd === "radar") {
      const symbol = (args[0] || "").toUpperCase();
      const w = symbol 
        ? context.windows.find(win => win.asset.toUpperCase() === symbol)
        : (context.focusedMarketId ? context.windows.find(win => win.marketId === context.focusedMarketId) : context.windows[0]);
      
      if (!w) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `No active market window found. Type "markets" to view list.`, timestamp: now }];
      }

      const strikeNum = w.strikeFormatted ? parseFloat(w.strikeFormatted.replace(/[^0-9.]/g, "")) || 95000 : (w.asset === "BTC" ? 95000 : 2700);
      const spotShift = (w.upLeanPercent - 50) * (strikeNum * 0.0003);
      const spotNum = strikeNum + spotShift;
      const vol = w.asset === "BTC" ? 0.48 : 0.56;
      const fv = calculateFairValue(spotNum, strikeNum, w.secondsRemaining, w.bestUpAsk ?? (w.upLeanPercent / 100), vol);

      const bankroll = context.practiceService.getBankroll();
      const kellyRec = Math.round(bankroll * (fv.recommendation === "BUY_UP" ? fv.quarterKellyUp : fv.quarterKellyDown));

      let text = `[QUANTITATIVE FAIR-VALUE RADAR — Black-Scholes Φ(d₂)]\n`;
      text += `MARKET: ${w.asset}/USDC (${w.intervalSec}s Window, ${w.secondsRemaining}s remaining)\n`;
      text += `SPOT BENCHMARK: $${spotNum.toFixed(2)} | STRIKE: $${strikeNum.toLocaleString()} | VOL (σ): ${(vol * 100).toFixed(0)}% EWMA\n`;
      text += `d₂ METRIC: ${fv.d2.toFixed(4)}\n\n`;
      text += `FAIR PROBABILITY (UP):   ${(fv.fairProbUp * 100).toFixed(2)}%\n`;
      text += `CLOB IMPLIED PROB (UP): ${(w.upLeanPercent).toFixed(2)}%\n`;
      text += `MISPRICING EDGE:        ${(fv.bestEdgeBps > 0 ? "+" : "") + fv.bestEdgeBps} bps [${fv.recommendation === "BUY_UP" ? "UP UNDERPRICED" : fv.recommendation === "BUY_DOWN" ? "DOWN UNDERPRICED" : "FAIRLY PRICED"}]\n`;
      text += `SIGNAL RECOMMENDATION:  ${fv.recommendation} (${fv.bestEdgeBps >= 50 ? "Positive Statistical Expectation" : "No Arb"})\n`;
      text += `QUARTER-KELLY SIZER:    ${((fv.recommendation === "BUY_UP" ? fv.quarterKellyUp : fv.quarterKellyDown) * 100).toFixed(1)}% (Rec Stake: $${Math.max(10, kellyRec)} USDso)`;

      return [{ id: `line_${Date.now()}`, type: "output", text, timestamp: now }];
    }

    // 2f. KELLY SIZING COMMAND
    if (cmd === "kelly") {
      const bankroll = context.practiceService.getBankroll();
      return [{
        id: `line_${Date.now()}`,
        type: "output",
        text: `[KELLY CRITERION SIZING MATRIX]
Formula: f* = 0.25 * (p * b - q) / b = 0.25 * (p - P) / (1 - P)
Current Bankroll: $${bankroll.toFixed(2)} USDso
Quarter-Kelly Sizing Tiers:
- Conservative (10% Kelly): $${Math.max(10, Math.round(bankroll * 0.025))}
- Balanced (25% Kelly):     $${Math.max(25, Math.round(bankroll * 0.0625))}
- Full Quarter-Kelly:       $${Math.max(50, Math.round(bankroll * 0.125))}
- Maximum Position Cap:     $${Math.round(bankroll * 0.25)} (Risk Envelope Enforced)`,
        timestamp: now,
      }];
    }

    // 2g. ROLLOVER COMMAND
    if (cmd === "roll" || cmd === "rollover") {
      const rule = (args[0] || "").toLowerCase();
      if (!["compound", "preserve", "sweep"].includes(rule)) {
        return [{
          id: `line_${Date.now()}`,
          type: "output",
          text: `Usage: roll <compound|preserve|sweep>
Available Policies:
- compound: 100% of winning payout rolls into consecutive window in same direction
- preserve: Principal rolls forward; net profits swept to wallet
- sweep:    100% of payout redeemed directly to wallet upon settlement`,
          timestamp: now,
        }];
      }
      return [{
        id: `line_${Date.now()}`,
        type: "system",
        text: `[ROLLOVER] Policy updated to "${rule.toUpperCase()}". Automatic settlement engine configured.`,
        timestamp: now,
      }];
    }

    // 2h. AUDIT / TELEMETRY COMMAND
    if (cmd === "audit" || cmd === "telemetry" || cmd === "records") {
      context.onTriggerAudit?.();
      return [{
        id: `line_${Date.now()}`,
        type: "system",
        text: `[AUDIT] Launching Verified Execution & Calibration Audit Modal. Press [ESC] or close modal to return.`,
        timestamp: now,
      }];
    }

    // 3. MARKETS COMMAND
    if (cmd === "markets" || (cmd === "market" && args[0] === "list")) {
      if (context.windows.length === 0) {
        return [{ id: `line_${Date.now()}`, type: "output", text: "No active trading windows within safety threshold. Awaiting next rolling window...", timestamp: now }];
      }
      let table = "ACTIVE DREAMDEX EVENT CONTRACT WINDOWS:\n";
      table += "ASSET    CADENCE   UP LEAN   REMAINING   BEST UP ASK   BEST DOWN ASK   DEPTH VOL\n";
      table += "--------------------------------------------------------------------------------\n";
      for (const w of context.windows) {
        const mins = Math.floor(w.secondsRemaining / 60);
        const secs = (w.secondsRemaining % 60).toString().padStart(2, "0");
        const assetPad = (w.asset + "/USDC").padEnd(8);
        const cadencePad = `${w.intervalSec}s`.padEnd(9);
        const leanPad = `${w.upLeanPercent}% UP`.padEnd(10);
        const timePad = `${mins}m ${secs}s`.padEnd(12);
        const upAsk = (w.bestUpAsk ? `$${w.bestUpAsk.toFixed(3)}` : "-").padEnd(14);
        const downAsk = (w.bestDownAsk ? `$${w.bestDownAsk.toFixed(3)}` : "-").padEnd(16);
        const vol = `${w.upBidVolume + w.upAskVolume}`.padStart(6);
        table += `${assetPad} ${cadencePad} ${leanPad} ${timePad} ${upAsk} ${downAsk} ${vol}\n`;
      }
      return [{ id: `line_${Date.now()}`, type: "table", text: table, timestamp: now }];
    }

    // 4. MARKET STATUS COMMAND
    if (cmd === "market" && args[0] === "status") {
      const targetSymbol = (args[1] || "").toUpperCase();
      const w = context.windows.find((win) => {
        const sym = `${win.asset}-${win.intervalSec}s`.toUpperCase();
        const alt = `${win.asset}-${Math.floor(win.intervalSec / 60)}m`.toUpperCase();
        return sym === targetSymbol || alt === targetSymbol || win.asset === targetSymbol;
      });

      if (!w) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `Market window "${targetSymbol}" not found. Type "markets" to view active windows.`, timestamp: now }];
      }

      return [
        { id: `line_${Date.now()}_1`, type: "system", text: `[SYS] Querying Somnia Pool (${w.poolAddress})...`, timestamp: now },
        { 
          id: `line_${Date.now()}_2`, 
          type: "output", 
          text: `MARKET ID: ${w.marketId}
CONTRACT POOL: ${w.poolAddress}
ORACLE QUESTION ID: ${w.oracleQuestionId ?? "N/A"}
QUESTION: "${w.question ?? "N/A"}"
STRIKE: ${w.strikeFormatted ?? "Opening Price"} | BACKING: ${w.backingUsdc ?? "1,500 USDC"}
ASSET: ${w.asset}/USDC | INTERVAL: ${w.intervalSec}s | EXPIRY: ${w.secondsRemaining}s remaining
CROWD LEAN: ${w.upLeanPercent}% UP (${w.upLeanProbability.toFixed(3)})
YES/UP BOOK: Best Bid: ${w.bestUpBid?.toFixed(3) ?? "-"} | Best Ask: ${w.bestUpAsk?.toFixed(3) ?? "-"} (Vol: ${w.upBidVolume})
NO/DOWN BOOK: Best Bid: ${w.bestDownBid?.toFixed(3) ?? "-"} | Best Ask: ${w.bestDownAsk?.toFixed(3) ?? "-"} (Vol: ${w.upAskVolume})`, 
          timestamp: now 
        },
      ];
    }

    // 5. CALL COMMAND
    if (cmd === "call") {
      const targetSymbol = (args[0] || "").toUpperCase();
      const directionStr = (args[1] || "").toUpperCase();
      const stakeNum = parseFloat(args[2] || "25");

      if (directionStr !== "UP" && directionStr !== "DOWN") {
        return [{ id: `line_${Date.now()}`, type: "error", text: `Invalid direction "${directionStr}". Use "UP" or "DOWN". Usage: call <symbol> <up|down> <stake>`, timestamp: now }];
      }
      if (isNaN(stakeNum) || stakeNum <= 0) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `Invalid stake amount. Must be a positive number.`, timestamp: now }];
      }

      const w = context.windows.find((win) => {
        const sym = `${win.asset}-${win.intervalSec}s`.toUpperCase();
        const alt = `${win.asset}-${Math.floor(win.intervalSec / 60)}m`.toUpperCase();
        return sym === targetSymbol || alt === targetSymbol || win.asset === targetSymbol;
      });

      if (!w) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `Market window "${targetSymbol}" not found. Run "markets" to view active list.`, timestamp: now }];
      }

      if (context.mode === "practice") {
        try {
          const call = context.practiceService.placeCall(w, directionStr as any, stakeNum);
          return [
            { id: `line_${Date.now()}_1`, type: "system", text: `[TRADE_EXEC] Practice call recorded successfully.`, timestamp: now },
            { id: `line_${Date.now()}_2`, type: "output", text: `ORDER ID: ${call.id}\nASSET: ${w.asset}/USDC | DIRECTION: ${directionStr} | STAKE: $${stakeNum.toFixed(2)} USDso\nENTRY PRICE: ${call.entryPrice.toFixed(3)} | CONTRACTS: ${call.contractsCount.toFixed(2)}\nREMAINING PRACTICE BANKROLL: $${context.practiceService.getBankroll().toFixed(2)} USDso`, timestamp: now },
          ];
        } catch (err: any) {
          return [{ id: `line_${Date.now()}`, type: "error", text: `Execution failed: ${err.message}`, timestamp: now }];
        }
      } else {
        // Real Mode: invoke modal / trigger signer
        if (context.onTriggerModal) {
          context.onTriggerModal(w, directionStr as any, stakeNum);
          return [{ id: `line_${Date.now()}`, type: "system", text: `[SIGNER] Real trade modal dispatched. Please review and sign with connected wallet.`, timestamp: now }];
        } else {
          return [{ id: `line_${Date.now()}`, type: "error", text: `Please connect your Web3 wallet in the top header to execute real trades.`, timestamp: now }];
        }
      }
    }

    // 6. POSITIONS COMMAND
    if (cmd === "positions") {
      const modeCalls = context.calls.filter((c) => c.mode === context.mode);
      if (modeCalls.length === 0) {
        return [{ id: `line_${Date.now()}`, type: "output", text: `No ${context.mode} positions recorded yet. Use "call <symbol> <up|down> <stake>" to open a trade.`, timestamp: now }];
      }
      let table = `RECORDED CALLS (${context.mode.toUpperCase()} MODE):\n`;
      table += "ID              ASSET    DIRECTION   STAKE     ENTRY     STATUS     PNL\n";
      table += "-----------------------------------------------------------------------------\n";
      for (const c of modeCalls) {
        const idPad = c.id.slice(0, 14).padEnd(15);
        const assetPad = c.asset.padEnd(8);
        const dirPad = c.direction.padEnd(11);
        const stakePad = `$${c.stake.toFixed(2)}`.padEnd(9);
        const entryPad = c.entryPrice.toFixed(3).padEnd(9);
        const statusPad = c.settlementStatus.toUpperCase().padEnd(10);
        const pnlPad = `${c.netPnl >= 0 ? "+" : ""}$${c.netPnl.toFixed(2)}`;
        table += `${idPad} ${assetPad} ${dirPad} ${stakePad} ${entryPad} ${statusPad} ${pnlPad}\n`;
      }
      return [{ id: `line_${Date.now()}`, type: "table", text: table, timestamp: now }];
    }

    // 7. SCORECARD COMMAND
    if (cmd === "scorecard") {
      const card = ScorecardService.computeScorecard(context.calls, context.mode);
      let text = `CALIBRATION SCORECARD (${context.mode.toUpperCase()} MODE):\n`;
      text += `  Brier Calibration Score: ${card.brierScore !== null ? card.brierScore.toFixed(3) : "N/A"} (0.00 = perfect, 0.25 = random)\n`;
      text += `  Win Rate (Decisive):     ${(card.winRate * 100).toFixed(1)}% (${card.wonCalls}W / ${card.lostCalls}L / ${card.voidedCalls}V)\n`;
      text += `  Cumulative Net PnL:      ${card.totalPnl >= 0 ? "+" : ""}$${card.totalPnl.toFixed(2)} (ROI: ${card.roiPercent.toFixed(1)}%)\n\n`;
      text += `CONFIDENCE BUCKET CALIBRATION:\n`;
      text += `  BUCKET      CALLS   PREDICTED CONFIDENCE   EMPIRICAL WIN RATE\n`;
      text += `  -------------------------------------------------------------\n`;
      for (const b of card.calibrationBuckets) {
        text += `  ${b.bucketLabel.padEnd(11)} ${b.count.toString().padEnd(7)} ${(b.averageConfidence * 100).toFixed(1).padEnd(22)}% ${(b.empiricalWinRate * 100).toFixed(1)}%\n`;
      }
      return [{ id: `line_${Date.now()}`, type: "table", text, timestamp: now }];
    }

    // 8. WATCHERS / PS COMMAND
    if (cmd === "watchers" || cmd === "ps") {
      const watchers = context.watcherService.getWatchers();
      if (watchers.length === 0) {
        return [{ id: `line_${Date.now()}`, type: "output", text: `No active background watcher jobs running. Type "watch <symbol> if <condition> then suggest <action>" to spawn one.`, timestamp: now }];
      }
      let table = "ACTIVE BACKGROUND WATCHER JOBS:\n";
      table += "PID     TARGET       RULE SUMMARY                                    EVALS   HITS\n";
      table += "---------------------------------------------------------------------------------\n";
      for (const j of watchers) {
        table += `${j.pid.toString().padEnd(7)} ${j.symbol.padEnd(12)} ${(j.ruleString.slice(0, 45)).padEnd(47)} ${j.evalCount.toString().padEnd(7)} ${j.hitCount}\n`;
      }
      return [{ id: `line_${Date.now()}`, type: "table", text: table, timestamp: now }];
    }

    // 9. KILL COMMAND
    if (cmd === "kill") {
      const pid = parseInt(args[0], 10);
      if (isNaN(pid)) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: kill <pid>", timestamp: now }];
      }
      const killed = context.watcherService.killWatcher(pid);
      if (killed) {
        return [{ id: `line_${Date.now()}`, type: "system", text: `[KILL] Worker process PID ${pid} terminated.`, timestamp: now }];
      } else {
        return [{ id: `line_${Date.now()}`, type: "error", text: `PID ${pid} not found. Run "ps" or "watchers" to list jobs.`, timestamp: now }];
      }
    }

    // 10a. PWD COMMAND
    if (cmd === "pwd") {
      return [{ id: `line_${Date.now()}`, type: "output", text: this.cwd, timestamp: now }];
    }

    // 10b. CD COMMAND
    if (cmd === "cd") {
      const target = args[0] ? args[0].trim() : "/";
      const resolved = this.resolvePath(target);
      if (resolved === "/") {
        this.cwd = "/";
        return [{ id: `line_${Date.now()}`, type: "output", text: `cwd: /`, timestamp: now }];
      }
      const dirEntry = this.virtualFs.get(resolved);
      if (dirEntry && dirEntry.isDirectory) {
        this.cwd = resolved;
        return [{ id: `line_${Date.now()}`, type: "output", text: `cwd: ${resolved}`, timestamp: now }];
      }
      // Check if any files exist with this directory prefix
      const hasChildren = Array.from(this.virtualFs.keys()).some(k => k.startsWith(resolved + "/"));
      if (hasChildren) {
        this.cwd = resolved;
        return [{ id: `line_${Date.now()}`, type: "output", text: `cwd: ${resolved}`, timestamp: now }];
      }
      return [{ id: `line_${Date.now()}`, type: "error", text: `cd: no such file or directory: ${target}`, timestamp: now }];
    }

    // 10c. LS COMMAND
    if (cmd === "ls") {
      const isLong = args.includes("-l") || args.includes("-la") || args.includes("-ll");
      const cleanArgs = args.filter(a => !a.startsWith("-"));
      const targetDir = cleanArgs[0] ? this.resolvePath(cleanArgs[0].trim()) : this.cwd;
      const normalizedDir = targetDir === "/" ? "/" : targetDir.replace(/\/$/, "");

      // Find direct children in normalizedDir
      const directChildren = new Map<string, { name: string; isDirectory: boolean }>();

      for (const [filePath, file] of this.virtualFs.entries()) {
        if (filePath === "/" || filePath === normalizedDir) continue;

        let relative = "";
        if (normalizedDir === "/") {
          if (filePath.startsWith("/")) {
            relative = filePath.slice(1);
          }
        } else if (filePath.startsWith(normalizedDir + "/")) {
          relative = filePath.slice(normalizedDir.length + 1);
        }

        if (!relative) continue;

        const segment = relative.split("/")[0];
        const isDir = file.isDirectory || relative.includes("/");

        if (!directChildren.has(segment)) {
          directChildren.set(segment, {
            name: segment + (isDir ? "/" : ""),
            isDirectory: isDir,
          });
        }
      }

      if (directChildren.size === 0) {
        return [{ id: `line_${Date.now()}`, type: "output", text: "(empty directory)", timestamp: now }];
      }

      const items = Array.from(directChildren.values()).sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      if (isLong) {
        let output = `total ${items.length}\n`;
        for (const item of items) {
          const type = item.isDirectory ? "drwxr-xr-x" : "-rw-r--r--";
          output += `${type}  1 user  staff  512B  ${item.name}\n`;
        }
        return [{ id: `line_${Date.now()}`, type: "output", text: output.trimEnd(), timestamp: now }];
      } else {
        const line = items.map(i => i.name).join("   ");
        return [{ id: `line_${Date.now()}`, type: "output", text: line, timestamp: now }];
      }
    }

    // 10d. MKDIR COMMAND
    if (cmd === "mkdir") {
      if (!args[0]) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: mkdir <directory>", timestamp: now }];
      }
      const targetPath = this.resolvePath(args[0].trim());
      if (this.virtualFs.has(targetPath)) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `mkdir: cannot create directory '${targetPath}': File exists`, timestamp: now }];
      }
      this.virtualFs.set(targetPath, {
        path: targetPath,
        description: "Directory",
        content: "",
        isDirectory: true,
      });
      this.saveVirtualFs();
      return [{ id: `line_${Date.now()}`, type: "system", text: `[FS] Directory created: ${targetPath}`, timestamp: now }];
    }

    // 10e. TOUCH COMMAND
    if (cmd === "touch") {
      if (!args[0]) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: touch <filepath>", timestamp: now }];
      }
      const targetPath = this.resolvePath(args[0].trim());
      if (!this.virtualFs.has(targetPath)) {
        this.virtualFs.set(targetPath, {
          path: targetPath,
          description: "User file",
          content: "",
          isDirectory: false,
        });
        this.saveVirtualFs();
      }
      return [{ id: `line_${Date.now()}`, type: "system", text: `[FS] File created: ${targetPath}`, timestamp: now }];
    }

    // 10f. RM COMMAND
    if (cmd === "rm") {
      const rawArg = args.filter((a) => !a.startsWith("-")).pop();
      if (!rawArg) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: rm [-rf] <path>", timestamp: now }];
      }
      const targetPath = this.resolvePath(rawArg.trim());
      let removed = false;
      if (this.virtualFs.has(targetPath)) {
        this.virtualFs.delete(targetPath);
        removed = true;
      }
      // Also delete any nested children if removing a folder
      for (const k of Array.from(this.virtualFs.keys())) {
        if (k.startsWith(targetPath + "/")) {
          this.virtualFs.delete(k);
          removed = true;
        }
      }
      if (!removed) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `rm: cannot remove '${targetPath}': No such file or directory`, timestamp: now }];
      }
      this.saveVirtualFs();
      return [{ id: `line_${Date.now()}`, type: "system", text: `[FS] Removed: ${targetPath}`, timestamp: now }];
    }

    // 11. CAT COMMAND
    if (cmd === "cat") {
      if (!args[0]) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: cat <filepath>", timestamp: now }];
      }
      const path = this.resolvePath(args[0]);
      const file = this.virtualFs.get(path);
      if (!file) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `File not found: "${path}". Type "ls" to view available files.`, timestamp: now }];
      }
      if (file.isDirectory) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `cat: ${path}: Is a directory`, timestamp: now }];
      }
      return [{ id: `line_${Date.now()}`, type: "output", text: file.content, timestamp: now }];
    }

    // 12. RUN COMMAND (Execute strategy script)
    if (cmd === "run") {
      if (!args[0]) {
        return [{ id: `line_${Date.now()}`, type: "error", text: "Usage: run <script_path>", timestamp: now }];
      }
      const path = this.resolvePath(args[0]);
      const file = this.virtualFs.get(path);
      if (!file) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `Script not found: "${path}". Type "ls" to view scripts.`, timestamp: now }];
      }
      if (file.isDirectory) {
        return [{ id: `line_${Date.now()}`, type: "error", text: `run: ${path}: Is a directory`, timestamp: now }];
      }
      const scriptLines = file.content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      const executionLines: TerminalLine[] = [
        { id: `run_${Date.now()}_start`, type: "system", text: `[RUN] Executing script: ${path}`, timestamp: now },
      ];
      for (const sLine of scriptLines) {
        const subLines = await this.executeCommand(sLine, context);
        executionLines.push(...subLines);
      }
      return executionLines;
    }

    // 12b. RESETFS COMMAND
    if (cmd === "resetfs") {
      this.seedDefaultFs();
      this.cwd = "/";
      return [{ id: `line_${Date.now()}`, type: "system", text: `[FS] Virtual filesystem reset to default factory state.`, timestamp: now }];
    }

    // 13. WHOAMI COMMAND
    if (cmd === "whoami") {
      const identity = context.walletAddress 
        ? `wallet:${context.walletAddress} (Somnia Shannon 50312)` 
        : `guest-trader@somnia-shannon-sandbox`;
      return [{ id: `line_${Date.now()}`, type: "output", text: identity, timestamp: now }];
    }

    // 14. ENV COMMAND
    if (cmd === "env") {
      const envText = `ENVIRONMENT VARIABLES:\n  CHAIN_ID=50312\n  NETWORK="Somnia Shannon Testnet"\n  MODE=${context.mode}\n  MODULE=${CANONICAL_CONTRACTS.binaryMarketsModule}\n  SETTLEMENT=${CANONICAL_CONTRACTS.binarySettlement}\n  COLLATERAL=${CANONICAL_CONTRACTS.testUsdc}\n  CONNECTED_ACCOUNT=${context.walletAddress ?? "none"}`;
      return [{ id: `line_${Date.now()}`, type: "output", text: envText, timestamp: now }];
    }

    // 15. DATE COMMAND
    if (cmd === "date") {
      return [{ id: `line_${Date.now()}`, type: "output", text: new Date().toUTCString(), timestamp: now }];
    }

    // 16. ECHO COMMAND
    if (cmd === "echo") {
      return [{ id: `line_${Date.now()}`, type: "output", text: args.join(" "), timestamp: now }];
    }

    // 17. MODE COMMAND
    if (cmd === "mode") {
      const targetMode = (args[0] || "").toLowerCase();
      if (targetMode === "practice" || targetMode === "real") {
        context.setMode(targetMode as any);
        return [{ id: `line_${Date.now()}`, type: "system", text: `Trading environment switched to ${targetMode.toUpperCase()} mode.`, timestamp: now }];
      }
      return [{ id: `line_${Date.now()}`, type: "error", text: `Usage: mode practice | mode real (Current: ${context.mode})`, timestamp: now }];
    }

    // 18. CLEAR COMMAND
    if (cmd === "clear" || cmd === "cls") {
      return [{ id: "CLEAR_BUFFER", type: "system", text: "" }];
    }

    // Unknown command
    return [
      {
        id: `line_${Date.now()}`,
        type: "error",
        text: `Command not found: "${cmd}". Type "help" for a list of available commands.`,
        timestamp: now,
      },
    ];
  }
}
