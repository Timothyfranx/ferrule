import { 
  SomniaMarkets,
  SOMNIA_TESTNET_ADDRESSES,
  type BinaryMarket,
  type MarketOnchain,
  type BookLevel,
  type SomniaMarketsClient
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { Address } from "viem";
import { PROTOCOL_LIMITS, SOMNIA_INDEXER_URL, SOMNIA_WS_RPC_URL } from "../config/constants.js";
import type { 
  OpenWindow, 
  BinaryOrderBook, 
  SettledMarketInfo, 
  AssetSymbol 
} from "../types/index.js";

export class MarketDataService {
  public readonly exchange: SomniaMarkets;
  public readonly client: SomniaMarketsClient;

  constructor(exchange?: SomniaMarkets) {
    this.exchange = exchange ?? new SomniaMarkets({
      indexerUrl: SOMNIA_INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: SOMNIA_WS_RPC_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
    });
    this.client = this.exchange.client;
  }

  /**
   * Discovers active trading windows across Somnia DreamDEX binary markets.
   * Gated on getMarketOnchain status === 1 (Trading).
   */
  async getOpenWindows(): Promise<OpenWindow[]> {
    const binaryMarkets = await this.client.listLiveBinaryMarkets();

    const nowSec = Math.floor(Date.now() / 1000);

    const candidates = binaryMarkets.filter((m) => {
      const intervalSec = this.extractIntervalSec(m);
      const asset = this.extractAsset(m);
      if (!asset || !intervalSec) return false;
      const expiry = Number(m.expiry ?? 0);
      const secondsRemaining = expiry - nowSec;
      return secondsRemaining > PROTOCOL_LIMITS.lockCutoffSeconds;
    });

    const results = await Promise.all(
      candidates.map(async (m): Promise<OpenWindow | null> => {
        const intervalSec = this.extractIntervalSec(m)!;
        const asset = this.extractAsset(m)!;
        const expiry = Number(m.expiry ?? 0);
        const secondsRemaining = expiry - nowSec;

        // Read on-chain status truth
        let onchain: MarketOnchain | null = null;
        try {
          onchain = await this.client.getMarketOnchain(m.marketId);
        } catch {
          // Fallback to cached status
        }

        // Only accept active "Trading" (1) status
        if (onchain && onchain.status !== 1) {
          return null;
        }

        // Extract live order book from pool
        const poolAddress = m.poolAddress as Address;
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

        let strikeFormatted = "Opening Price";
        if (m.strike && m.strike !== "0") {
          const strikeNum = Number(m.strike) / 100;
          strikeFormatted = `$${strikeNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        let cleanQuestion = m.question ?? `Will ${asset}/USDC settle higher at close?`;
        if (m.question) {
          cleanQuestion = m.question.replace(/^Pricefeed test:\s*/i, "").trim();
          cleanQuestion = cleanQuestion.charAt(0).toUpperCase() + cleanQuestion.slice(1);
        } else if (strikeFormatted !== "Opening Price") {
          cleanQuestion = `Will ${asset}/USDC price be at or above ${strikeFormatted} at expiry?`;
        } else {
          cleanQuestion = `Will ${asset}/USDC settle at or above opening price at expiry?`;
        }

        let backingUsdc: string | undefined = undefined;
        if (m.backing) {
          const bNum = Number(m.backing) / 1e6;
          backingUsdc = `$${bNum.toLocaleString("en-US", { maximumFractionDigits: 0 })} USDC`;
        }

        return {
          marketId: m.marketId as `0x${string}`,
          poolAddress,
          oracleQuestionId: m.oracleQuestionId ? (m.oracleQuestionId.startsWith("0x") ? m.oracleQuestionId as `0x${string}` : `0x${BigInt(m.oracleQuestionId).toString(16).padStart(64, "0")}`) : undefined,
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
          question: cleanQuestion,
          rawQuestion: m.question,
          strike: m.strike,
          strikeFormatted,
          backingUsdc,
          creator: m.creator,
          marketAddress: m.marketAddress,
        };
      })
    );

    const windows = results.filter((w): w is OpenWindow => w !== null);

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
        yesBids: (book.yesBids || []).map((b: BookLevel) => ({ price: Number(b.price) / 1e6, quantity: Number(b.quantity) / 1e6 })),
        yesAsks: (book.yesAsks || []).map((a: BookLevel) => ({ price: Number(a.price) / 1e6, quantity: Number(a.quantity) / 1e6 })),
        noBids: (book.noBids || []).map((b: BookLevel) => ({ price: Number(b.price) / 1e6, quantity: Number(b.quantity) / 1e6 })),
        noAsks: (book.noAsks || []).map((a: BookLevel) => ({ price: Number(a.price) / 1e6, quantity: Number(a.quantity) / 1e6 })),
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
    if (m.expiry && m.tradingStart) {
      const diff = Number(m.expiry) - Number(m.tradingStart);
      if (diff > 0) return diff;
    }
    const match = m.question?.match(/-(60|300|900|3600|14400|86400)s?$/i);
    if (match) return parseInt(match[1], 10);
    return null;
  }

  private extractAsset(m: BinaryMarket): AssetSymbol | null {
    const assetUpper = (m.asset || "").toUpperCase();
    if (assetUpper.includes("BTC")) return "BTC";
    if (assetUpper.includes("ETH")) return "ETH";
    if (assetUpper.includes("SOL")) return "SOL";
    return null;
  }
}
