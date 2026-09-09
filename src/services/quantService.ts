/**
 * Quantitative Financial Service for Ferrule Pro Terminal
 * 
 * Implements:
 * 1. Abramowitz & Stegun polynomial approximation of Standard Normal CDF Φ(x) & PDF φ(x)
 * 2. Closed-form Black-Scholes Binary Option Fair Value: Φ(d₂)
 * 3. Market mispricing edge calculation in basis points (bps)
 * 4. Quarter-Kelly Criterion position sizing: f* = 0.25 * (p - P) / (1 - P)
 * 5. Probability distribution coordinates for deep quant visualizers
 */

export interface FairValueResult {
  fairProbUp: number;        // Fair probability for UP (0.0 to 1.0)
  fairProbDown: number;      // Fair probability for DOWN (0.0 to 1.0)
  d2: number;                // Black-Scholes d₂ metric
  edgeUpBps: number;         // Basis points of mispricing on UP
  edgeDownBps: number;       // Basis points of mispricing on DOWN
  recommendation: "BUY_UP" | "BUY_DOWN" | "FAIR_VALUE";
  bestEdgeBps: number;       // Highest edge available
  volatility: number;        // Annualized σ used (e.g. 0.48)
  quarterKellyUp: number;    // Recommended fraction of bankroll for UP
  quarterKellyDown: number;  // Recommended fraction of bankroll for DOWN
}

export interface DistributionPoint {
  price: number;
  density: number;
  isAboveStrike: boolean;
  isSpot: boolean;
}

/**
 * Standard Normal Cumulative Distribution Function Φ(x)
 * Accuracy: |error| < 1.5e-7 (Abramowitz & Stegun 26.2.17)
 */
export function normalCDF(x: number): number {
  if (isNaN(x)) return 0.5;
  if (x > 8) return 1.0;
  if (x < -8) return 0.0;

  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.3989422804014327; // 1 / sqrt(2 * PI)

  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const cdf = 1.0 - c * Math.exp(-0.5 * absX * absX) * poly;

  return x >= 0 ? cdf : 1.0 - cdf;
}

/**
 * Standard Normal Probability Density Function φ(x)
 */
export function normalPDF(x: number): number {
  if (isNaN(x) || Math.abs(x) > 6) return 0;
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Computes Black-Scholes d₂ for an Event Contract:
 * d₂ = [ln(S / S₀) + (r - 0.5 * σ²) * T] / (σ * √T)
 */
export function computeD2(
  spot: number,
  strike: number,
  secondsRemaining: number,
  annualizedVol = 0.48,
  riskFreeRate = 0.0
): number {
  if (strike <= 0 || spot <= 0) return 0;
  if (secondsRemaining <= 0) {
    if (spot > strike) return 8.0;
    if (spot < strike) return -8.0;
    return 0.0;
  }

  const T = Math.max(1e-6, secondsRemaining / 31536000);
  const sigmaRootT = annualizedVol * Math.sqrt(T);

  if (sigmaRootT === 0) {
    return spot >= strike ? 8.0 : -8.0;
  }

  const logMoneyness = Math.log(spot / strike);
  const drift = (riskFreeRate - 0.5 * annualizedVol * annualizedVol) * T;
  const d2 = (logMoneyness + drift) / sigmaRootT;

  return Math.max(-8.0, Math.min(8.0, d2));
}

/**
 * Calculates Fair Probability, Edge in bps, and Quarter-Kelly sizing
 */
export function calculateFairValue(
  spot: number,
  strike: number,
  secondsRemaining: number,
  marketUpPrice: number,
  annualizedVol?: number
): FairValueResult {
  const vol = annualizedVol ?? 0.48;
  const d2 = computeD2(spot, strike, secondsRemaining, vol);
  const fairProbUp = normalCDF(d2);
  const fairProbDown = 1.0 - fairProbUp;

  const safeMarketUp = Math.max(0.01, Math.min(0.99, marketUpPrice));
  const safeMarketDown = 1.0 - safeMarketUp;

  // Edge in basis points: (Fair - Market) * 10,000
  const edgeUpBps = Math.round((fairProbUp - safeMarketUp) * 10000);
  const edgeDownBps = Math.round((fairProbDown - safeMarketDown) * 10000);

  // Quarter-Kelly sizing: f* = 0.25 * (p - P) / (1 - P)
  const quarterKellyUp = fairProbUp > safeMarketUp
    ? Math.min(0.25, 0.25 * ((fairProbUp - safeMarketUp) / (1 - safeMarketUp)))
    : 0;

  const quarterKellyDown = fairProbDown > safeMarketDown
    ? Math.min(0.25, 0.25 * ((fairProbDown - safeMarketDown) / (1 - safeMarketDown)))
    : 0;

  let recommendation: FairValueResult["recommendation"] = "FAIR_VALUE";
  let bestEdgeBps = 0;

  if (edgeUpBps >= 50 && edgeUpBps > edgeDownBps) {
    recommendation = "BUY_UP";
    bestEdgeBps = edgeUpBps;
  } else if (edgeDownBps >= 50 && edgeDownBps > edgeUpBps) {
    recommendation = "BUY_DOWN";
    bestEdgeBps = edgeDownBps;
  }

  return {
    fairProbUp,
    fairProbDown,
    d2,
    edgeUpBps,
    edgeDownBps,
    recommendation,
    bestEdgeBps,
    volatility: vol,
    quarterKellyUp,
    quarterKellyDown,
  };
}

/**
 * Generates coordinate array for rendering an SVG normal probability density curve
 */
export function generateDistributionCurve(
  spot: number,
  strike: number,
  secondsRemaining: number,
  annualizedVol = 0.48,
  numPoints = 50
): DistributionPoint[] {
  const T = Math.max(1e-6, secondsRemaining / 31536000);
  const standardDev = strike * annualizedVol * Math.sqrt(T);

  const minPrice = Math.max(0, strike - 3.2 * standardDev);
  const maxPrice = strike + 3.2 * standardDev;
  const step = (maxPrice - minPrice) / (numPoints - 1);

  const points: DistributionPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const p = minPrice + i * step;
    const z = standardDev > 0 ? (p - strike) / standardDev : 0;
    const density = normalPDF(z);

    points.push({
      price: p,
      density,
      isAboveStrike: p >= strike,
      isSpot: Math.abs(p - spot) < step / 2,
    });
  }

  return points;
}
