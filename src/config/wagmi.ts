import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { http } from "viem";
import { SOMNIA_RPC_URL } from "./constants.js";

export const wagmiConfig = getDefaultConfig({
  appName: "Ferrule",
  projectId: "ferrule-somnia-dreamdex-terminal",
  chains: [somniaShannon],
  transports: {
    [somniaShannon.id]: http(SOMNIA_RPC_URL),
  },
  ssr: false,
});
