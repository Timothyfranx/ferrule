/**
 * PrecisionService — BigInt Quantization and Tick Snapping
 * Solves the 18-decimal float precision issue documented in LOGICAL_ERRORS.md §1.
 */
export class PrecisionService {
  /**
   * Snaps a human decimal price (e.g. 0.65) to the exact on-chain tick grid in BigInt unit space.
   */
  static snapPriceToTick(price: number, decimals: number, tickSize: bigint): bigint {
    const rawPrice = this.parseFixedToBigInt(price, decimals);
    
    // Snap down to multiple of tickSize
    const remainder = rawPrice % tickSize;
    let aligned = rawPrice - remainder;

    // Clamp binary probability within (tickSize, 10^decimals - tickSize)
    const maxBound = (10n ** BigInt(decimals)) - tickSize;
    if (aligned < tickSize) aligned = tickSize;
    if (aligned > maxBound) aligned = maxBound;

    return aligned;
  }

  /**
   * Snaps a human stake amount to the nearest lotSize and checks minQuantity.
   */
  static snapAmountToLot(amount: number, decimals: number, lotSize: bigint, minQuantity: bigint): bigint {
    const rawAmount = this.parseFixedToBigInt(amount, decimals);
    const remainder = rawAmount % lotSize;
    let aligned = rawAmount - remainder;
    
    if (aligned < minQuantity) {
      aligned = minQuantity;
    }
    return aligned;
  }

  /**
   * String-based fixed point parser into BigInt space.
   * Avoids IEEE-754 double precision loss on 18dp.
   */
  static parseFixedToBigInt(val: number, decimals: number): bigint {
    const str = val.toFixed(decimals);
    const [integerPart, fractionalPart = ""] = str.split(".");
    const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(integerPart + paddedFraction);
  }

  /**
   * Formats a raw BigInt amount to human-readable string.
   */
  static formatUnits(raw: bigint, decimals: number): string {
    const base = 10n ** BigInt(decimals);
    const integerPart = raw / base;
    const fractionalPart = (raw % base).toString().padStart(decimals, "0");
    return `${integerPart}.${fractionalPart}`;
  }
}
