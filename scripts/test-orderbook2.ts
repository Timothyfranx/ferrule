import { 
  SomniaMarkets, 
  SOMNIA_TESTNET_ADDRESSES,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

async function main() {
  const exchange = new SomniaMarkets({
    indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
    chain: somniaShannon,
    wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
    addresses: SOMNIA_TESTNET_ADDRESSES,
  });

  const client = exchange.client;
  const tradingMarkets = await client.listBinaryMarkets({ status: "Trading", limit: 3 });
  console.log(`Checking ${tradingMarkets.length} active trading markets...`);

  for (const m of tradingMarkets) {
    console.log(`\nMarket ${m.id} | Asset: ${m.asset} | Interval: ${m.intervalSec}s | Pool: ${m.poolAddress}`);
    const book = await client.getBinaryOrderBook(m.poolAddress as `0x${string}`);
    console.log("  yesBids count:", book.yesBids.length);
    console.log("  yesAsks count:", book.yesAsks.length);
    console.log("  noBids count:", book.noBids.length);
    console.log("  noAsks count:", book.noAsks.length);
    if (book.yesBids.length > 0) {
      console.log("  Top YES Bid:", book.yesBids[0]);
    }
    if (book.yesAsks.length > 0) {
      console.log("  Top YES Ask:", book.yesAsks[0]);
    }
  }
}

main().catch(console.error);
