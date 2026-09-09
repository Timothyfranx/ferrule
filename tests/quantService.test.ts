import { describe, it, expect } from "vitest";
import { 
  normalCDF, 
  normalPDF, 
  computeD2, 
  calculateFairValue, 
  generateDistributionCurve 
} from "../src/services/quantService.js";

describe("quantService — Quantitative Mathematics", () => {
  it("computes standard normal CDF Φ(x) with high precision", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 4);
    expect(normalCDF(1.95996)).toBeCloseTo(0.975, 3);
    expect(normalCDF(-1.95996)).toBeCloseTo(0.025, 3);
    expect(normalCDF(3)).toBeCloseTo(0.99865, 4);
    expect(normalCDF(10)).toBe(1.0);
    expect(normalCDF(-10)).toBe(0.0);
  });

  it("computes normal PDF φ(x) correctly", () => {
    expect(normalPDF(0)).toBeCloseTo(0.3989, 4);
    expect(normalPDF(1)).toBeCloseTo(0.24197, 4);
    expect(normalPDF(10)).toBe(0);
  });

  it("computes Black-Scholes d₂ for event contracts", () => {
    // When spot equals strike and r = 0, drift is slightly negative due to -0.5*σ^2*T
    const d2AtTheMoney = computeD2(100, 100, 300, 0.48);
    expect(d2AtTheMoney).toBeLessThan(0);
    expect(d2AtTheMoney).toBeGreaterThan(-0.1);

    // Spot strictly above strike with remaining time: d₂ must be positive
    const d2InTheMoney = computeD2(105, 100, 300, 0.48);
    expect(d2InTheMoney).toBeGreaterThan(1.0);

    // Spot strictly below strike: d₂ must be negative
    const d2OutOfTheMoney = computeD2(95, 100, 300, 0.48);
    expect(d2OutOfTheMoney).toBeLessThan(-1.0);

    // Expiry with spot above strike
    expect(computeD2(101, 100, 0)).toBe(8.0);
    expect(computeD2(99, 100, 0)).toBe(-8.0);
  });

  it("calculates fair value, mispricing edge in bps, and Quarter-Kelly fraction", () => {
    // Spot $102, strike $100 -> Fair probability UP is ~70%
    // Market quoting UP at 0.60 -> Edge is ~ +1000 bps
    const res = calculateFairValue(102, 100, 300, 0.60, 0.48);
    expect(res.fairProbUp).toBeGreaterThan(0.65);
    expect(res.fairProbDown).toBeLessThan(0.35);
    expect(res.edgeUpBps).toBeGreaterThan(500);
    expect(res.recommendation).toBe("BUY_UP");
    expect(res.quarterKellyUp).toBeGreaterThan(0.05);
    expect(res.quarterKellyDown).toBe(0);
  });

  it("generates probability density curve points for SVG rendering", () => {
    const points = generateDistributionCurve(101, 100, 300, 0.48, 20);
    expect(points.length).toBe(20);
    expect(points[0].price).toBeLessThan(100);
    expect(points[points.length - 1].price).toBeGreaterThan(100);
    expect(points.some(p => p.isAboveStrike)).toBe(true);
    expect(points.some(p => !p.isAboveStrike)).toBe(true);
  });
});
