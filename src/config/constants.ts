import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import type { Address } from "viem";

// --- ARC MAINNET CONSTANTS (CHAIN ID: 5042) ---
export const ARC_CHAIN_ID = 5042;
export const ARC_RPC_URL = "https://rpc.mainnet.arc.io";
export const ARC_EXPLORER_URL = "https://explorer.arc.io";
export const ARC_SYSTEM_EMITTER = "0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE" as Address;
export const ARC_ERC20_USDC = "0x3600000000000000000000000000000000000000" as Address;

// FerrArc Canonical Contracts on Arc Mainnet
export const FERRARC_CONTRACTS = {
  eventEngine: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as Address,
  streamEngine: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D" as Address,
};

// --- SOMNIA CONSTANTS (Preserved for compatibility) ---
export const SOMNIA_CHAIN_ID = 50312;
export const SOMNIA_RPC_URL = "https://api.infra.testnet.somnia.network";
export const SOMNIA_WS_RPC_URL = "wss://api.infra.testnet.somnia.network/ws";
export const SOMNIA_INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";
export const SOMNIA_FALLBACK_RPC_URL = "https://dream-rpc.somnia.network";
export const SOMNIA_EXPLORER_URL = "https://shannon-explorer.somnia.network";
export const ORACLE_HUB_URL = "https://prd.oracle.somnia.host";

export const CANONICAL_CONTRACTS = {
  binaryMarketsModule: (SOMNIA_TESTNET_ADDRESSES.binaryModule ?? "0x3ecC694Cef705358864a646142ac17A90E29e388") as Address,
  marketsCore: (SOMNIA_TESTNET_ADDRESSES.marketsCore ?? "0x2802504314685D89bF6C992CA5a8e7cC78bc0294") as Address,
  binarySettlement: (SOMNIA_TESTNET_ADDRESSES.binarySettlement ?? "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23") as Address,
  oracleHub: (SOMNIA_TESTNET_ADDRESSES.oracleHub ?? "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b") as Address,
  collateralRouter: (SOMNIA_TESTNET_ADDRESSES.collateralRouter ?? "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C") as Address,
  testUsdc: (SOMNIA_TESTNET_ADDRESSES.testUsdc ?? SOMNIA_TESTNET_ADDRESSES.collateral ?? "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E") as Address,
};

export const PROTOCOL_LIMITS = {
  initialPracticeBankroll: 1000,
  maxPracticeStake: 100,
  minTradeStake: 1,
  maxRealStake: 5000,
  lockCutoffSeconds: 45,
  deadmanSwitchSeconds: 15,
  watcherCooldownSeconds: 15,
  maxLogBufferSize: 2000,
};

export const TRACKED_ASSETS = ["BTC", "ETH", "EURC"] as const;
export const TRACKED_CADENCES = [60, 300, 900, 3600, 14400, 86400] as const;
