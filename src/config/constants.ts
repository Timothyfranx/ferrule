import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import type { Address } from "viem";

export const SOMNIA_CHAIN_ID = 50312;

export const SOMNIA_RPC_URL = "https://api.infra.testnet.somnia.network";
export const SOMNIA_FALLBACK_RPC_URL = "https://dream-rpc.somnia.network";
export const SOMNIA_EXPLORER_URL = "https://shannon-explorer.somnia.network";
export const ORACLE_HUB_URL = "https://prd.oracle.somnia.host";

export const CANONICAL_CONTRACTS = {
  binaryMarketsModule: SOMNIA_TESTNET_ADDRESSES.binaryMarketsModule as Address,
  marketsCore: SOMNIA_TESTNET_ADDRESSES.marketsCore as Address,
  binarySettlement: SOMNIA_TESTNET_ADDRESSES.binarySettlement as Address,
  outcomeToken6909: SOMNIA_TESTNET_ADDRESSES.outcomeToken6909 as Address,
  oracleHub: SOMNIA_TESTNET_ADDRESSES.oracleHub as Address,
  collateralRouter: SOMNIA_TESTNET_ADDRESSES.collateralRouter as Address,
  testUsdc: SOMNIA_TESTNET_ADDRESSES.testUsdc as Address,
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
