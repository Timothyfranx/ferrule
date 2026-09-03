import { 
  SomniaMarkets, 
  SOMNIA_TESTNET_ADDRESSES,
  type BinaryMarket,
  type SomniaMarketsClient
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { Address, Hex } from "viem";
import type { OpenWindow, SupportedAsset } from "../types/shared.js";

export interface MarketDataConfig {
  indexerUrl?: string;
  wsRpcUrl?: string;
  addresses?: typeof SOMNIA_TESTNET_ADDRESSES;
  minRemainingSeconds?: number;
}

const DEFAULT_CONFIG: MarketDataConfig = {
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
  minRemainingSeconds: 45, // Skip windows locking in under 45s
};

/**
 * Agent A — Live Data Layer (Single Source of Truth)
 * 
 * Rules (§6 of Spec / agents.md):
 * 1. Discovers markets via listBinaryMarkets, filtering isBinaryMarket.
 * 2. GATES every read on on-chain status via getMarketOnchain (status === 1 is Trading).
 * 3. Computes Up-lean signal directly from Up price and depth.
 * 4. Keys state by marketId/symbol, never pool address (pools recycle).
 * 5. Skips markets under minimum expiry threshold.
 * 6. Single point of truth: Agents B and C read from here.
 */
export class LiveDataLayer {
  private exchange: SomniaMarkets;
  public client: SomniaMarketsClient;
  private config: MarketDataConfig;
  private cache: Map<string, { window: OpenWindow; fetchedAt: number }> = new Map();
  private cacheTtlMs = 6000; // 6-second cache to prevent RPC thrashing while staying live

  constructor(config: Partial<MarketDataConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.exchange = new SomniaMarkets({
      indexerUrl: this.config.indexerUrl!,
      chain: somniaShannon,
      wsRpcUrl: this.config.wsRpcUrl!,
      addresses: this.config.addresses!,
    });
    this.client = this.exchange.client;
  }

  /**
   * Fetches all active, verified trading windows for supported assets (BTC, ETH, SOL).
   * Strictly gated by on-chain verification.
   */
  async getOpenWindows(forceRefresh = false): Promise<OpenWindow[]> {
    const nowMs = Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    // 1. Fetch indexed binary markets in "Trading" status
    const indexedTradingMarkets = await this.client.listBinaryMarkets({
      status: "Trading",
      limit: 25,
    });

    const openWindows: OpenWindow[] = [];

    for (const m of indexedTradingMarkets) {
      const asset = m.asset?.toUpperCase() as SupportedAsset;
      if (!["BTC", "ETH", "SOL"].includes(asset)) {
        continue;
      }

      const expiry = Number(m.expiry);
      const secondsRemaining = expiry - nowSec;
      const intervalSec = Number(m.intervalSec) || 300;

      // Filter: skip windows closing too soon to prevent frontrunning/lock reverts
      const minSec = intervalSec <= 60 ? 15 : (this.config.minRemainingSeconds ?? 45);
      if (secondsRemaining < minSec) {
        continue;
      }

      // Check cache if not forcing refresh
      const cached = this.cache.get(m.id);
      if (!forceRefresh && cached && (nowMs - cached.fetchedAt < this.cacheTtlMs)) {
        cached.window.secondsRemaining = expiry - Math.floor(Date.now() / 1000);
        openWindows.push(cached.window);
        continue;
      }

      try {
        // 2. On-chain Status Gate: Ground truth read
        const onchain = await this.client.getMarketOnchain(m.id as Hex);
        if (onchain.status !== 1) { // 1 = Trading
          continue;
        }

        // 3. Read Order Book Depth from the active pool address
        const poolAddress = (m.poolAddress || onchain.pool) as Address;
        const decimals = onchain.decimals || m.quoteDecimals || 6;
        const oneBase = 10 ** decimals;

        let bestUpBid: number | null = null;
        let bestUpAsk: number | null = null;
        let upBidVolume = 0;
        let upAskVolume = 0;
        let downBidVolume = 0;
        let downAskVolume = 0;

        try {
          const book = await this.client.getBinaryOrderBook(poolAddress);

          if (book.yesBids && book.yesBids.length > 0) {
            bestUpBid = Number(book.yesBids[0].price) / oneBase;
            upBidVolume = book.yesBids.reduce((acc, l) => acc + Number(l.quantity) / oneBase, 0);
          }
          if (book.yesAsks && book.yesAsks.length > 0) {
            bestUpAsk = Number(book.yesAsks[0].price) / oneBase;
            upAskVolume = book.yesAsks.reduce((acc, l) => acc + Number(l.quantity) / oneBase, 0);
          }
          if (book.noBids) {
            downBidVolume = book.noBids.reduce((acc, l) => acc + Number(l.quantity) / oneBase, 0);
          }
          if (book.noAsks) {
            downAskVolume = book.noAsks.reduce((acc, l) => acc + Number(l.quantity) / oneBase, 0);
          }
        } catch {
          // If pool book read is empty or temporarily uninitialized
        }

        // Compute Down bid/ask from YES book symmetry: Down = 1 - Up
        const bestDownBid = bestUpAsk !== null ? Math.max(0, Math.min(1, 1 - bestUpAsk)) : null;
        const bestDownAsk = bestUpBid !== null ? Math.max(0, Math.min(1, 1 - bestUpBid)) : null;

        // Compute crowd-lean signal (Up probability)
        let upLeanProbability = 0.5; // default balanced
        if (bestUpBid !== null && bestUpAsk !== null) {
          upLeanProbability = (bestUpBid + bestUpAsk) / 2;
        } else if (bestUpBid !== null) {
          upLeanProbability = bestUpBid;
        } else if (bestUpAsk !== null) {
          upLeanProbability = bestUpAsk;
        } else if (m.lastPrice) {
          upLeanProbability = Number(m.lastPrice) / oneBase;
        }

        // Clamp between 0.01 and 0.99 for probability sanity
        upLeanProbability = Math.max(0.01, Math.min(0.99, upLeanProbability));
        const upLeanPercent = Math.round(upLeanProbability * 100);

        const openWindow: OpenWindow = {
          marketId: m.id as Hex,
          symbol: (m as any).symbol || `${asset}-${intervalSec}s`,
          asset,
          intervalSec,
          venueId: (m.venueId || onchain.collateral) as Hex,
          poolAddress,
          marketAddress: onchain.marketAddress,
          oracleQuestionId: (m.oracleQuestionId ? `0x${BigInt(m.oracleQuestionId).toString(16).padStart(64, "0")}` : null) as Hex | null,
          expiry,
          secondsRemaining,
          bestUpBid,
          bestUpAsk,
          bestDownBid,
          bestDownAsk,
          upLeanProbability,
          upLeanPercent,
          depth: {
            upBidVolume,
            upAskVolume,
            downBidVolume,
            downAskVolume,
          },
          onchainStatus: onchain.status,
        };

        this.cache.set(m.id, { window: openWindow, fetchedAt: nowMs });
        openWindows.push(openWindow);
      } catch (err) {
        // Individual window failure should never bring down the data feed
        continue;
      }
    }

    // Sort: earliest closing first (closingSoon)
    return openWindows.sort((a, b) => a.expiry - b.expiry);
  }

  /**
   * Get a single OpenWindow by marketId (single source of truth for Agents B & C)
   */
  async getOpenWindow(marketId: Hex): Promise<OpenWindow | null> {
    const cached = this.cache.get(marketId);
    if (cached && (Date.now() - cached.fetchedAt < this.cacheTtlMs)) {
      cached.window.secondsRemaining = cached.window.expiry - Math.floor(Date.now() / 1000);
      return cached.window;
    }

    const windows = await this.getOpenWindows(true);
    return windows.find((w) => w.marketId.toLowerCase() === marketId.toLowerCase()) || null;
  }

  /**
   * Inspect on-chain settlement for a settled market
   */
  async getSettledMarketInfo(marketId: Hex) {
    const onchain = await this.client.getMarketOnchain(marketId);
    return {
      marketId,
      status: onchain.status,
      isResolved: onchain.isResolved,
      isVoided: onchain.isVoided,
      finalized: onchain.finalized,
      winningOutcome: onchain.winningOutcome, // 0 = YES (UP), 1 = NO (DOWN)
      backing: onchain.backing,
    };
  }
}
