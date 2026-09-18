import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain, http } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { mainnet, sepolia } from "viem/chains";
import { ARC_CHAIN_ID, ARC_RPC_URL, ARC_EXPLORER_URL, SOMNIA_RPC_URL } from "./constants.js";

// Arc Mainnet (Chain ID: 5042, Native USDC Gas)
export const arcMainnet = defineChain({
  id: ARC_CHAIN_ID,
  name: "Arc Mainnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: ARC_EXPLORER_URL,
    },
  },
  testnet: false,
});

// Standard 32-char hexadecimal project ID for WalletConnect v2 handshake
const WALLETCONNECT_PROJECT_ID = 
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID) || 
  "3fbb6bba6f1de962d911bb5b5c9dba88";

export const wagmiConfig = getDefaultConfig({
  appName: "FerrArc — Capital Markets on Arc L1",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [arcMainnet, somniaShannon, mainnet, sepolia],
  transports: {
    [arcMainnet.id]: http(ARC_RPC_URL),
    [somniaShannon.id]: http(SOMNIA_RPC_URL),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});
