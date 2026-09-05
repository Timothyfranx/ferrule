import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { mainnet, sepolia } from "viem/chains";
import { http } from "viem";
import { SOMNIA_RPC_URL } from "./constants.js";

// Standard 32-char hexadecimal project ID for WalletConnect v2 handshake
const WALLETCONNECT_PROJECT_ID = 
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID) || 
  "3fbb6bba6f1de962d911bb5b5c9dba88";

export const wagmiConfig = getDefaultConfig({
  appName: "Ferrule — Somnia DreamDEX Terminal",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [somniaShannon, mainnet, sepolia],
  transports: {
    [somniaShannon.id]: http(SOMNIA_RPC_URL),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});

