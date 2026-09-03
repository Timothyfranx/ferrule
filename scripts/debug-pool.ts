import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http } from "viem";
import { binaryPoolReadAbi } from "@somnia-chain/markets-sdk/readsAbi";

async function main() {
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http("https://api.infra.testnet.somnia.network"),
  });

  const pool = "0x3432a120f36f8c6016643968edaddccc2cd9493d";
  console.log("Checking bytecode for pool:", pool);
  const code = await publicClient.getCode({ address: pool });
  console.log("Code length:", code?.length);

  try {
    const res = await publicClient.readContract({
      address: pool,
      abi: binaryPoolReadAbi,
      functionName: "getBookLevels",
      args: [true, 5n],
    });
    console.log("getBookLevels(true, 5):", res);
  } catch (e: any) {
    console.error("getBookLevels error:", e.message);
  }
}

main().catch(console.error);
