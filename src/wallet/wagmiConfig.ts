import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { http } from "viem";

export const wagmiConfig = getDefaultConfig({
  appName: "Ferrule",
  projectId: "ferrule-somnia-dreamdex", // WalletConnect project ID
  chains: [somniaShannon],
  transports: {
    [somniaShannon.id]: http("https://api.infra.testnet.somnia.network"),
  },
  ssr: false,
});
