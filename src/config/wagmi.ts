import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { http } from "wagmi";
import { ARC_CHAIN_ID, ARC_RPC_URL, ARC_EXPLORER_URL } from "./constants.js";

/**
 * Arc L1 Mainnet Chain Configuration
 * Chain ID: 5042
 * Native Gas/Staking: USDC (18 decimals)
 */
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
    public: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: ARC_EXPLORER_URL,
    },
  },
});

// Standard 32-char hexadecimal project ID for WalletConnect v2 handshake
const WALLETCONNECT_PROJECT_ID = 
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID) || 
  "3fbb6bba6f1de962d911bb5b5c9dba88";

export const wagmiConfig = getDefaultConfig({
  appName: "FerrArc — Binary Markets on Arc L1",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [arcMainnet, mainnet, sepolia],
  transports: {
    [arcMainnet.id]: http(ARC_RPC_URL),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
});
