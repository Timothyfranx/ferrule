import { 
  SomniaMarkets, 
  SOMNIA_TESTNET_ADDRESSES,
  quoteBinaryStakeOverBook,
  toHuman,
  fromHuman
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

async function main() {
  console.log("=== TESTING LIVE ORDERBOOK & QUOTING ===");
  const exchange = new SomniaMarkets({
    indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
    chain: somniaShannon,
    wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
    addresses: SOMNIA_TESTNET_ADDRESSES,
  });

  const client = exchange.client;

  console.log("Fetching active trading markets...");
  const tradingMarkets = await client.listBinaryMarkets({ status: "Trading", limit: 5 });
  console.log(`Found ${tradingMarkets.length} trading markets.`);

  for (const m of tradingMarkets) {
    console.log(`\nMarket: [${m.id}] Asset: ${m.asset}, Cadence: ${m.intervalSec}s, Pool: ${m.poolAddress}`);
    try {
      const book = await client.getBinaryOrderBook(m.poolAddress as `0x${string}`);
      console.log(`  Bids count: ${book.bids.length}, Asks count: ${book.asks.length}`);
      if (book.bids.length > 0) {
        console.log(`  Best Bid: price=${book.bids[0].price}, amount=${book.bids[0].amount}`);
      }
      if (book.asks.length > 0) {
        console.log(`  Best Ask: price=${book.asks[0].price}, amount=${book.asks[0].amount}`);
      }
      if (book.closingPrice) {
        console.log(`  Closing Price state:`, book.closingPrice);
      }
    } catch (e: any) {
      console.error(`  Error reading book for pool ${m.poolAddress}:`, e.message);
    }
  }

  console.log("\nTesting exchange.loadMarkets(true)...");
  try {
    await exchange.loadMarkets(true);
    console.log("  loadMarkets completed successfully!");
    const allSymbols = exchange.symbols;
    console.log(`  Loaded ${allSymbols.length} tradable symbols across markets.`);
    const binarySymbols = allSymbols.filter(s => s.includes("#YES") || s.includes("#NO"));
    console.log(`  Binary symbols (${binarySymbols.length}):`, binarySymbols.slice(0, 5));
  } catch (e: any) {
    console.error("  loadMarkets error:", e.message);
  }
}

main().catch(console.error);
