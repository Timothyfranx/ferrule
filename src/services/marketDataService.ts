import { 
  MarketsClient, 
  SOMNIA_TESTNET_ADDRESSES,
  isBinaryMarket,
  type BinaryMarket,
  type MarketOnchain
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { Address } from "viem";
import { PROTOCOL_LIMITS } from "../config/constants.js";
import type { 
  OpenWindow, 
  BinaryOrderBook, 
  SettledMarketInfo, 
  AssetSymbol, 
  BookLevel 
} from "../types/index.js";

export class MarketDataService {
  public readonly client: MarketsClient;

  constructor(client?: MarketsClient) {
    this.client = client ?? new MarketsClient({
      chain: somniaShannon,
      addresses: SOMNIA_TESTNET_ADDRESSES,
    });
  }

  /**
   * Discovers active trading windows across Somnia DreamDEX binary markets.
   * Gated on getMarketOnchain status === 1 (Trading).
   */
  async getOpenWindows(): Promise<OpenWindow[]> {
    await this.client.loadMarkets(true);
    const allMarkets = this.client.getMarkets();
    const binaryMarkets = allMarkets.filter(isBinaryMarket);

    const windows: OpenWindow[] = [];
    const nowSec = Math.floor(Date.now() / 1000);

    for (const m of binaryMarkets) {
      const intervalSec = this.extractIntervalSec(m);
      const asset = this.extractAsset(m);
      if (!asset || !intervalSec) continue;

      const expiry = Number(m.expireTimestamp ?? 0n);
      const secondsRemaining = expiry - nowSec;

      // Filter out markets with <= 45s remaining (frontrun lock shield)
      if (secondsRemaining <= PROTOCOL_LIMITS.lockCutoffSeconds) {
        continue;
      }

      // Read on-chain status truth
      let onchain: MarketOnchain | null = null;
      try {
        onchain = await this.client.getMarketOnchain(m.marketId);
      } catch {
        // Fallback to cached status
      }

      // Only accept active "Trading" (1) status
      if (onchain && onchain.status !== 1) {
        continue;
      }

      // Extract live order book from pool
      const poolAddress = m.pool as Address;
      const orderBook = await this.getOrderBook(poolAddress);

      // Best bids / asks
      const bestUpBid = orderBook.yesBids.length > 0 ? orderBook.yesBids[0].price : null;
      const bestUpAsk = orderBook.yesAsks.length > 0 ? orderBook.yesAsks[0].price : null;
      const bestDownBid = orderBook.noBids.length > 0 ? orderBook.noBids[0].price : null;
      const bestDownAsk = orderBook.noAsks.length > 0 ? orderBook.noAsks[0].price : null;

      // Depth volume
      const upBidVolume = orderBook.yesBids.reduce((acc, b) => acc + b.quantity, 0);
      const upAskVolume = orderBook.yesAsks.reduce((acc, a) => acc + a.quantity, 0);

      // Derive mid-market crowd lean
      let upLeanProb = 0.5;
      if (bestUpBid !== null && bestUpAsk !== null) {
        upLeanProb = (bestUpBid + bestUpAsk) / 2;
      } else if (bestUpBid !== null) {
        upLeanProb = bestUpBid;
      } else if (bestUpAsk !== null) {
        upLeanProb = bestUpAsk;
      } else if (bestDownBid !== null) {
        upLeanProb = 1 - bestDownBid;
      }

      const upLeanPercent = Math.min(99, Math.max(1, Math.round(upLeanProb * 100)));

      windows.push({
        marketId: m.marketId as `0x${string}`,
        poolAddress,
        oracleQuestionId: m.oracleQuestionId as `0x${string}` | undefined,
        asset,
        intervalSec,
        expiry,
        secondsRemaining,
        upLeanPercent,
        upLeanProbability: upLeanProb,
        bestUpBid,
        bestUpAsk,
        bestDownBid,
        bestDownAsk,
        upBidVolume,
        upAskVolume,
        status: (m.status as any) ?? "Trading",
      });
    }

    // Sort by asset, then remaining time ascending
    return windows.sort((a, b) => {
      if (a.asset !== b.asset) return a.asset.localeCompare(b.asset);
      return a.secondsRemaining - b.secondsRemaining;
    });
  }

  /**
   * Queries the pool's binary order book.
   */
  async getOrderBook(poolAddress: Address): Promise<BinaryOrderBook> {
    try {
      const book = await this.client.getBinaryOrderBook(poolAddress);
      return {
        yesBids: (book.yesBids || []).map((b) => ({ price: Number(b.price) / 1e6, quantity: Number(b.quantity) / 1e6 })),
        yesAsks: (book.yesAsks || []).map((a) => ({ price: Number(a.price) / 1e6, quantity: Number(a.quantity) / 1e6 })),
        noBids: (book.noBids || []).map((b) => ({ price: Number(b.price) / 1e6, quantity: Number(b.quantity) / 1e6 })),
        noAsks: (book.noAsks || []).map((a) => ({ price: Number(a.price) / 1e6, quantity: Number(a.quantity) / 1e6 })),
      };
    } catch {
      return { yesBids: [], yesAsks: [], noBids: [], noAsks: [] };
    }
  }

  /**
   * Queries settled market info directly on-chain.
   */
  async getSettledMarketInfo(marketId: string): Promise<SettledMarketInfo> {
    const onchain = await this.client.getMarketOnchain(marketId as `0x${string}`);
    return {
      marketId,
      isResolved: onchain.isResolved,
      isVoided: onchain.isVoided,
      winningOutcome: onchain.winningOutcome,
    };
  }

  private extractIntervalSec(m: BinaryMarket): number | null {
    const intervalMap: Record<string, number> = {
      "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400,
      "60": 60, "300": 300, "900": 900, "3600": 3600, "14400": 14400, "86400": 86400,
    };
    if (m.interval && intervalMap[m.interval]) {
      return intervalMap[m.interval];
    }
    const match = m.symbol?.match(/-(60|300|900|3600|14400|86400)s?$/i);
    if (match) return parseInt(match[1], 10);
    return null;
  }

  private extractAsset(m: BinaryMarket): AssetSymbol | null {
    const symbol = m.symbol?.toUpperCase() || "";
    if (symbol.includes("BTC")) return "BTC";
    if (symbol.includes("ETH")) return "ETH";
    if (symbol.includes("SOL")) return "SOL";
    return null;
  }
}
