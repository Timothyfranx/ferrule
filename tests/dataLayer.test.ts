import { describe, it, expect } from "vitest";
import { LiveDataLayer } from "../src/data/marketData.js";

describe("Agent A - Live Data Layer", () => {
  it("discovers active trading windows and gates on onchain status", async () => {
    const dataLayer = new LiveDataLayer();
    const windows = await dataLayer.getOpenWindows(true);

    console.log(`Discovered ${windows.length} valid, on-chain verified OpenWindows:`);
    for (const w of windows) {
      console.log(`  - [${w.symbol}] Asset: ${w.asset}, Interval: ${w.intervalSec}s, UpLean: ${w.upLeanPercent}%, Remaining: ${w.secondsRemaining}s`);
      console.log(`    Pool: ${w.poolAddress}, Market: ${w.marketAddress}`);
      console.log(`    UpBid: ${w.bestUpBid}, UpAsk: ${w.bestUpAsk}, Depth: UpBidVol=${w.depth.upBidVolume}, UpAskVol=${w.depth.upAskVolume}`);
    }

    expect(Array.isArray(windows)).toBe(true);
    if (windows.length > 0) {
      const first = windows[0];
      expect(first.onchainStatus).toBe(1); // strictly Trading
      expect(first.upLeanProbability).toBeGreaterThan(0);
      expect(first.upLeanProbability).toBeLessThan(1);
      expect(first.upLeanPercent).toBeGreaterThanOrEqual(1);
      expect(first.upLeanPercent).toBeLessThanOrEqual(99);
      expect(["BTC", "ETH", "SOL"]).toContain(first.asset);
    }
  }, 25000);
});
