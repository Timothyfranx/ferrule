import { describe, it, expect } from "vitest";
import { PrecisionService } from "../src/services/precisionService.js";

describe("PrecisionService — BigInt Quantization & Tick Snapping", () => {
  it("snaps 6-decimal price to tick size of 1,000 (0.001)", () => {
    const decimals = 6;
    const tickSize = 1000n;

    // 0.654321 should snap down to 0.654000 (654_000n)
    const snapped = PrecisionService.snapPriceToTick(0.654321, decimals, tickSize);
    expect(snapped).toBe(654000n);
    expect(snapped % tickSize).toBe(0n);
  });

  it("snaps simulated 18-decimal price without float precision loss", () => {
    const decimals = 18;
    const tickSize = 10n ** 15n; // 0.001 in 18dp

    const snapped = PrecisionService.snapPriceToTick(0.723891234, decimals, tickSize);
    expect(snapped % tickSize).toBe(0n);
    expect(snapped).toBe(723000000000000000n);
  });

  it("clamps binary probabilities within valid tick boundaries (LOGICAL_ERRORS.md §1)", () => {
    const decimals = 6;
    const tickSize = 1000n;
    const maxBound = (10n ** 6n) - tickSize; // 999_000n

    // Underflow clamp
    const underflow = PrecisionService.snapPriceToTick(0.000001, decimals, tickSize);
    expect(underflow).toBe(tickSize);

    // Overflow clamp
    const overflow = PrecisionService.snapPriceToTick(0.999999, decimals, tickSize);
    expect(overflow).toBe(maxBound);
  });

  it("snaps lot quantities down and enforces minQuantity", () => {
    const decimals = 6;
    const lotSize = 5000n;
    const minQuantity = 10000n; // 0.01

    // Sub-lot snaps down
    const subLot = PrecisionService.snapAmountToLot(0.024, decimals, lotSize, minQuantity);
    expect(subLot).toBe(20000n); // 0.02

    // Below minimum quantity clamps to minQuantity
    const belowMin = PrecisionService.snapAmountToLot(0.005, decimals, lotSize, minQuantity);
    expect(belowMin).toBe(minQuantity);
  });

  it("converts between raw units and human strings accurately", () => {
    const raw = 150500000n;
    const str = PrecisionService.formatUnits(raw, 6);
    expect(str).toBe("150.500000");
  });
});
