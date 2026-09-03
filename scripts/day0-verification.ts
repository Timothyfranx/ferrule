import { 
  SomniaMarkets, 
  SOMNIA_TESTNET_ADDRESSES, 
  isBinaryMarket 
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http } from "viem";

async function main() {
  console.log("=== DAY 0 VERIFICATION GATE ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Network: Somnia Shannon Testnet (50312)");

  const indexerUrl = "https://dev.smk.somnia.host/v1/graphql";
  const wsRpcUrl = "wss://api.infra.testnet.somnia.network/ws";

  console.log("\n[1] Initializing SomniaMarkets exchange...");
  const exchange = new SomniaMarkets({
    indexerUrl,
    chain: somniaShannon,
    wsRpcUrl,
    addresses: SOMNIA_TESTNET_ADDRESSES,
  });

  const client = exchange.client;

  // 1. Contract Addresses Verification on-chain
  console.log("\n[2] Contract Addresses Verification against Spec:");
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http("https://api.infra.testnet.somnia.network"),
  });

  const contractsToCheck: Record<string, `0x${string}`> = {
    BinaryMarketsModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
    MarketsCore: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294",
    BinarySettlement: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23",
    OutcomeToken6909: "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9",
    OracleHub: "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b",
    CollateralRouter: "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C",
    TestUSDC: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  };

  for (const [name, addr] of Object.entries(contractsToCheck)) {
    try {
      const code = await publicClient.getCode({ address: addr });
      const deployed = !!(code && code !== "0x");
      console.log(`  - ${name} (${addr}): ${deployed ? "DEPLOYED (code len: " + code?.length + ")" : "NOT DEPLOYED"}`);
    } catch (e: any) {
      console.error(`  - ${name} (${addr}): ERROR: ${e.message}`);
    }
  }

  // Check SystemInfo from SDK
  try {
    const sysInfo = await client.getSystemInfo();
    console.log("\nSystem Info from SDK:", JSON.stringify(sysInfo, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } catch (e: any) {
    console.error("Failed to read system info:", e.message);
  }

  // 2. Discover Binary Venues & Assets
  console.log("\n[3] Discovering Venues & Assets...");
  try {
    const venues = await client.listBinaryVenueIds();
    console.log("  Binary Venues:", JSON.stringify(venues, null, 2));
    const assets = await client.listBinaryAssets();
    console.log("  Binary Assets:", JSON.stringify(assets, null, 2));
  } catch (e: any) {
    console.error("  Error reading venues/assets:", e.message);
  }

  // 3. Query listBinaryMarkets by volume
  console.log("\n[4] Querying listBinaryMarkets({ orderBy: 'volume' })...");
  try {
    const byVolume = await client.listBinaryMarkets({ orderBy: "volume", limit: 10 });
    console.log(`  Found ${byVolume.length} markets sorted by volume:`);
    for (const m of byVolume) {
      console.log(`  - [${m.id}] ${m.symbol || m.questionText || 'unknown'} | Asset: ${m.asset} | Status: ${m.status} | Vol: ${m.cumulativeQuoteVolume} | Trades: ${m.tradeCount} | Expiry: ${m.expiry}`);
    }
  } catch (e: any) {
    console.error("  Error querying by volume:", e.message);
  }

  // 4. Query listBinaryMarkets by Trading status
  console.log("\n[5] Querying listBinaryMarkets({ status: 'Trading' })...");
  let activeMarketId: string | null = null;
  try {
    const tradingMarkets = await client.listBinaryMarkets({ status: "Trading", limit: 10 });
    console.log(`  Found ${tradingMarkets.length} active TRADING markets:`);
    for (const m of tradingMarkets) {
      console.log(`  - [${m.id}] ${m.symbol || m.questionText} | Asset: ${m.asset} | Interval: ${m.intervalSec}s | Pool: ${m.poolAddress} | Expiry: ${m.expiry}`);
      if (!activeMarketId) activeMarketId = m.id;
    }
  } catch (e: any) {
    console.error("  Error querying trading markets:", e.message);
  }

  // 5. Query other statuses (Resolved, Finalized, Locked, Voided)
  console.log("\n[6] Status distribution check...");
  const statuses = ["Trading", "Locked", "Settling", "Resolved", "Voided", "Finalized"] as const;
  for (const st of statuses) {
    try {
      const ms = await client.listBinaryMarkets({ status: st, limit: 5 });
      console.log(`  Status '${st}': count returned = ${ms.length}`);
      if (ms.length > 0) {
        console.log(`    Sample market: ${ms[0].id} (${ms[0].status}) - Finalized: ${ms[0].finalized}, Expiry: ${ms[0].expiry}`);
      }
    } catch (e: any) {
      console.error(`  Status '${st}': ERROR ${e.message}`);
    }
  }

  // 6. Empirical check on status history & on-chain state for settled/finalized markets
  console.log("\n[7] Investigating Market Status Transitions & On-chain Mapping...");
  try {
    const pastMarkets = await client.listBinaryMarkets({ status: "Finalized", limit: 3 });
    const targetMarkets = pastMarkets.length > 0 ? pastMarkets : await client.listBinaryMarkets({ status: "Resolved", limit: 3 });

    for (const m of targetMarkets) {
      console.log(`\n  Examining market ${m.id}:`);
      console.log(`    Indexer status: ${m.status}, finalized: ${m.finalized}`);

      try {
        const history = await client.getMarketStatusHistory(m.id);
        console.log(`    Status History (${history.length} events):`);
        for (const h of history) {
          console.log(`      ${h.oldStatus} -> ${h.newStatus} (block: ${h.blockNumber}, tx: ${h.txHash.slice(0, 10)}...)`);
        }
      } catch (e: any) {
        console.log(`    Error getting history: ${e.message}`);
      }

      try {
        const onchain = await client.getMarketOnchain(m.id as `0x${string}`);
        console.log(`    On-chain state: status=${onchain.status}, finalized=${onchain.finalized}, isResolved=${onchain.isResolved}, isVoided=${onchain.isVoided}, winningOutcome=${onchain.winningOutcome}, backing=${onchain.backing}`);
      } catch (e: any) {
        console.log(`    Error getting on-chain state: ${e.message}`);
      }
    }
  } catch (e: any) {
    console.error("  Error in status investigation:", e.message);
  }

  // 7. Check live order book and pricing on active trading market
  if (activeMarketId) {
    console.log(`\n[8] Checking Order Book for active market ${activeMarketId}...`);
    try {
      const book = await client.getBinaryOrderBook(activeMarketId);
      console.log("  Order book result:", JSON.stringify(book, null, 2));
    } catch (e: any) {
      console.log("  getBinaryOrderBook error:", e.message);
    }
  }

  console.log("\n=== DAY 0 VERIFICATION COMPLETE ===");
}

main().catch(console.error);
