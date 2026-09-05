import type { 
  OpenWindow, 
  WatcherJob, 
  TerminalLine, 
  CallDirection,
  SuggestionPayload 
} from "../types/index.js";
import { PROTOCOL_LIMITS } from "../config/constants.js";

export class WatcherService {
  private watchers: Map<number, WatcherJob> = new Map();
  private nextPid = 4080;
  private triggeredMarkets: Set<string> = new Set();

  /**
   * Spawns a new strategy watcher.
   * Syntax: watch <symbol> if <condition> then suggest <action>
   * Example: watch BTC-15m if lean>=0.65 and spread<0.005 then suggest stake 250 up
   */
  spawnWatcher(input: string): { job: WatcherJob; initLines: TerminalLine[] } {
    const pid = ++this.nextPid;

    // Parse symbol
    const symbolMatch = input.match(/watch\s+([A-Z0-9-]+)/i);
    const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : "BTC-300s";

    // Parse lean condition (e.g. lean>=0.65 or lean>0.70 or lean<0.30)
    const leanMatch = input.match(/lean\s*(>=|<=|>|<)\s*([0-9.]+)/i);
    const operator = (leanMatch ? leanMatch[1] : ">=") as WatcherJob["operator"];
    const targetLean = leanMatch ? parseFloat(leanMatch[2]) : 0.65;

    // Parse stake (e.g. stake 250)
    const stakeMatch = input.match(/stake\s+([0-9]+)/i);
    const stake = stakeMatch ? parseInt(stakeMatch[1], 10) : 100;

    // Parse direction (up / down)
    const direction: CallDirection = /down/i.test(input) ? "DOWN" : "UP";

    const job: WatcherJob = {
      pid,
      symbol,
      ruleString: input,
      targetLean: targetLean <= 1.0 ? targetLean : targetLean / 100,
      operator,
      stake,
      direction,
      active: true,
      evalCount: 0,
      hitCount: 0,
      lastTriggerTime: 0,
    };

    this.watchers.set(pid, job);

    const now = new Date().toTimeString().slice(0, 8);
    const initLines: TerminalLine[] = [
      {
        id: `init_${pid}_1`,
        type: "system",
        text: `[INIT] Watcher spawned on PID ${pid} [worker-eval-0]`,
        timestamp: now,
      },
      {
        id: `init_${pid}_2`,
        type: "eval",
        text: `Watching ${symbol}... Threshold: lean ${operator} ${job.targetLean.toFixed(3)} | Action: SUGGEST STAKE ${stake} ${direction}`,
        timestamp: now,
      },
    ];

    return { job, initLines };
  }

  killWatcher(pid: number): boolean {
    return this.watchers.delete(pid);
  }

  getWatchers(): WatcherJob[] {
    return Array.from(this.watchers.values());
  }

  /**
   * Evaluates all active watchers against live OpenWindow[] data from Somnia.
   * Returns generated terminal output lines (ticks and triggers).
   */
  evaluateTick(windows: OpenWindow[], currentMode: "practice" | "real"): TerminalLine[] {
    const lines: TerminalLine[] = [];
    const nowSec = Math.floor(Date.now() / 1000);
    const timeStr = new Date().toTimeString().slice(0, 8);

    for (const job of this.watchers.values()) {
      if (!job.active) continue;

      // Find matching market window
      const matchedWindow = windows.find((w) => {
        const winSymbol = `${w.asset}-${w.intervalSec}s`.toUpperCase();
        const altSymbol = `${w.asset}-${Math.floor(w.intervalSec / 60)}m`.toUpperCase();
        return job.symbol === winSymbol || job.symbol === altSymbol || w.asset === job.symbol;
      });

      if (!matchedWindow) continue;

      job.evalCount++;
      const currentLean = matchedWindow.upLeanProbability;
      const spread = Math.abs((matchedWindow.bestUpAsk ?? currentLean) - (matchedWindow.bestUpBid ?? currentLean));

      // Test condition
      let conditionMet = false;
      switch (job.operator) {
        case ">=": conditionMet = currentLean >= job.targetLean; break;
        case ">":  conditionMet = currentLean > job.targetLean; break;
        case "<=": conditionMet = currentLean <= job.targetLean; break;
        case "<":  conditionMet = currentLean < job.targetLean; break;
      }

      if (conditionMet) {
        // Enforce 15-second cooldown and marketId deduplication (LOGICAL_ERRORS.md §13)
        const isCooldown = (nowSec - job.lastTriggerTime) < PROTOCOL_LIMITS.watcherCooldownSeconds;
        const alreadyTriggered = this.triggeredMarkets.has(`${job.pid}_${matchedWindow.marketId}`);

        if (isCooldown || alreadyTriggered) {
          lines.push({
            id: `tick_${Date.now()}_${Math.random()}`,
            type: "dim",
            text: `[${timeStr}] lean=${currentLean.toFixed(3)} spread=${spread.toFixed(4)} timeLeft=${matchedWindow.secondsRemaining}s → CONDITION SUSTAINED (Cooldown)`,
            timestamp: timeStr,
          });
        } else {
          // CONDITION MET TRIGGER
          job.hitCount++;
          job.lastTriggerTime = nowSec;
          this.triggeredMarkets.add(`${job.pid}_${matchedWindow.marketId}`);

          const price = job.direction === "UP" 
            ? (matchedWindow.bestUpAsk ?? currentLean) 
            : (matchedWindow.bestDownAsk ?? (1 - currentLean));

          const suggestion: SuggestionPayload = {
            window: matchedWindow,
            direction: job.direction,
            stake: job.stake,
            price,
            reason: `Watcher rule met: lean (${currentLean.toFixed(3)}) ${job.operator} ${job.targetLean.toFixed(3)}`,
            round: matchedWindow.marketId.slice(0, 8),
            workerPid: job.pid,
          };

          lines.push({
            id: `trig_${Date.now()}_${Math.random()}`,
            type: "trigger",
            text: `[${timeStr}] lean=${currentLean.toFixed(3)} timeLeft=${matchedWindow.secondsRemaining}s → CONDITION MET`,
            timestamp: timeStr,
            payload: suggestion,
          });
        }
      } else {
        // High frequency streaming evaluation tick
        lines.push({
          id: `tick_${Date.now()}_${Math.random()}`,
          type: "dim",
          text: `[${timeStr}] lean=${currentLean.toFixed(3)} spread=${spread.toFixed(4)} timeLeft=${matchedWindow.secondsRemaining}s → EVAL FALSE`,
          timestamp: timeStr,
        });
      }
    }

    return lines;
  }
}
