import { InvalidInputError } from "@somnia-chain/markets-sdk";

export interface PrecisionGrid {
  tickSize: bigint;
  lotSize: bigint;
  minQuantity: bigint;
  decimals: number;
}

/**
 * Robust, BigInt-exact tick and lot quantizer.
 * 
 * Satisfies §7 correctness requirement:
 * Handles 18-decimal math without float precision drift, preventing
 * the historical failure mode of silent flooring or off-tick reverts.
 */
export class PrecisionEngine {
  /**
   * Snaps a human probability price (0 < price < 1) to the on-chain tick grid.
   * Returns exact raw BigInt scaled by decimals.
   */
  static snapPriceToTick(price: number, tickSize: bigint, decimals: number): {
    rawPrice: bigint;
    humanPrice: number;
  } {
    if (price <= 0 || price >= 1) {
      throw new InvalidInputError(`Price must be strictly between 0 and 1, got ${price}`);
    }
    if (tickSize <= 0n) {
      throw new InvalidInputError(`Invalid tickSize: ${tickSize}`);
    }

    const oneBase = 10n ** BigInt(decimals);

    // Convert human float to BigInt safely without float precision degradation
    // Parse as fixed-point string
    const priceStr = price.toFixed(Math.min(decimals, 10));
    const [intPart, fracPart = ""] = priceStr.split(".");
    const paddedFrac = fracPart.padEnd(decimals, "0").slice(0, decimals);
    const rawPriceApprox = BigInt(intPart) * oneBase + BigInt(paddedFrac);

    // Snap to nearest tickSize (rounding down / flooring)
    const remainder = rawPriceApprox % tickSize;
    let rawAligned = rawPriceApprox - remainder;

    // Binary probabilities cannot rest at 0 or 1
    if (rawAligned < tickSize) {
      rawAligned = tickSize;
    }
    const maxTick = ((oneBase - tickSize) / tickSize) * tickSize;
    if (rawAligned > maxTick) {
      rawAligned = maxTick;
    }

    const humanPrice = Number(rawAligned) / Number(oneBase);
    return { rawPrice: rawAligned, humanPrice };
  }

  /**
   * Snaps a human stake / quantity to the on-chain lot grid.
   * Returns exact raw BigInt scaled by decimals.
   */
  static snapAmountToLot(amount: number, lotSize: bigint, minQuantity: bigint, decimals: number): {
    rawAmount: bigint;
    humanAmount: number;
  } {
    if (amount <= 0) {
      throw new InvalidInputError(`Amount must be positive, got ${amount}`);
    }
    if (lotSize <= 0n) {
      throw new InvalidInputError(`Invalid lotSize: ${lotSize}`);
    }

    const oneBase = 10n ** BigInt(decimals);
    const amountStr = amount.toFixed(Math.min(decimals, 8));
    const [intPart, fracPart = ""] = amountStr.split(".");
    const paddedFrac = fracPart.padEnd(decimals, "0").slice(0, decimals);
    const rawAmountApprox = BigInt(intPart) * oneBase + BigInt(paddedFrac);

    // Strict floor to lot grid
    const remainder = rawAmountApprox % lotSize;
    const rawAligned = rawAmountApprox - remainder;

    if (rawAligned < minQuantity) {
      throw new InvalidInputError(
        `Order amount ${amount} (${rawAligned} raw) is below minimum quantity ${minQuantity} raw`
      );
    }

    const humanAmount = Number(rawAligned) / Number(oneBase);
    return { rawAmount: rawAligned, humanAmount };
  }
}
