import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import type { Address } from "viem";

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

export const TRACKED_ASSETS = ["BTC", "ETH"] as const;
export const TRACKED_CADENCES = [60, 300, 900, 3600, 14400, 86400] as const;
