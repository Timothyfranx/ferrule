import { describe, it, expect } from "vitest";
import { MarketDataService } from "../src/services/marketDataService.js";

describe("MarketDataService — Live Somnia Shannon Discovery & Gating", () => {
  it("discovers active trading windows and gates on onchain status", async () => {
    const dataService = new MarketDataService();
    const windows = await dataService.getOpenWindows();

    console.log(`Discovered ${windows.length} valid, on-chain verified OpenWindows:`);
    for (const w of windows) {
      console.log(`  - [${w.asset}-${w.intervalSec}s] Asset: ${w.asset}, Interval: ${w.intervalSec}s, UpLean: ${w.upLeanPercent}%, Remaining: ${w.secondsRemaining}s`);
      console.log(`    Pool: ${w.poolAddress}, MarketId: ${w.marketId}`);
      console.log(`    UpBid: ${w.bestUpBid}, UpAsk: ${w.bestUpAsk}, Depth: UpBidVol=${w.upBidVolume}, UpAskVol=${w.upAskVolume}`);
    }

    expect(Array.isArray(windows)).toBe(true);
    if (windows.length > 0) {
      const first = windows[0];
      expect(first.secondsRemaining).toBeGreaterThan(45); // Checked cutoff
      expect(first.upLeanProbability).toBeGreaterThan(0);
      expect(first.upLeanProbability).toBeLessThan(1);
      expect(first.upLeanPercent).toBeGreaterThanOrEqual(1);
      expect(first.upLeanPercent).toBeLessThanOrEqual(99);
      expect(["BTC", "ETH", "SOL"]).toContain(first.asset);
    }
  }, 30000);
});
