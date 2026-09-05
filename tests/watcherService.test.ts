import { describe, it, expect } from "vitest";
import { WatcherService } from "../src/services/watcherService.js";
import type { OpenWindow } from "../src/types/index.js";

const mockWindowHighLean: OpenWindow = {
  marketId: "0xaaaa111122223333444455556666777788889999000011112222333344445555",
  poolAddress: "0x3333333333333333333333333333333333333333",
  asset: "BTC",
  intervalSec: 300,
  expiry: Math.floor(Date.now() / 1000) + 250,
  secondsRemaining: 250,
  upLeanPercent: 78,
  upLeanProbability: 0.78,
  bestUpBid: 0.76,
  bestUpAsk: 0.80,
  bestDownBid: 0.20,
  bestDownAsk: 0.24,
  upBidVolume: 1200,
  upAskVolume: 1100,
  status: "Trading",
};

describe("WatcherService — Strategy Watcher Daemon", () => {
  it("spawns a watcher job and emits initialization lines", () => {
    const watcher = new WatcherService();
    const { job, initLines } = watcher.spawnWatcher("watch BTC-300s if lean>=0.70 then suggest stake 150 up");

    expect(job.pid).toBeGreaterThan(0);
    expect(job.symbol).toBe("BTC-300S");
    expect(job.targetLean).toBe(0.70);
    expect(job.stake).toBe(150);
    expect(job.direction).toBe("UP");
    expect(initLines[0].text).toContain("[INIT] Watcher spawned");
  });

  it("evaluates live tick and triggers condition met with suggestion payload", () => {
    const watcher = new WatcherService();
    const { job } = watcher.spawnWatcher("watch BTC-300s if lean>=0.75 then suggest stake 200 up");

    const lines = watcher.evaluateTick([mockWindowHighLean], "practice");
    const triggerLine = lines.find((l) => l.type === "trigger");

    expect(triggerLine).toBeDefined();
    expect(triggerLine?.text).toContain("CONDITION MET");
    expect(triggerLine?.payload).toBeDefined();
    expect(triggerLine?.payload?.stake).toBe(200);
    expect(triggerLine?.payload?.direction).toBe("UP");
    expect(triggerLine?.payload?.window.asset).toBe("BTC");
  });

  it("enforces 15-second cooldown on consecutive ticks (LOGICAL_ERRORS.md §13)", () => {
    const watcher = new WatcherService();
    watcher.spawnWatcher("watch BTC-300s if lean>=0.75 then suggest stake 200 up");

    // First evaluation: Condition Met
    const firstTick = watcher.evaluateTick([mockWindowHighLean], "practice");
    expect(firstTick.some((l) => l.type === "trigger")).toBe(true);

    // Immediate next tick: Cooldown enforced
    const secondTick = watcher.evaluateTick([mockWindowHighLean], "practice");
    expect(secondTick.some((l) => l.type === "trigger")).toBe(false);
    expect(secondTick.some((l) => l.text.includes("Cooldown"))).toBe(true);
  });

  it("terminates a background watcher using killWatcher", () => {
    const watcher = new WatcherService();
    const { job } = watcher.spawnWatcher("watch ETH-300s if lean>=0.70 then suggest stake 50 up");
    expect(watcher.getWatchers().length).toBe(1);

    const killed = watcher.killWatcher(job.pid);
    expect(killed).toBe(true);
    expect(watcher.getWatchers().length).toBe(0);
  });
});
