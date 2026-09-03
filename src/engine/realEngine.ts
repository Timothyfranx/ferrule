import { 
  ORDER_TYPE,
  type BinarySide,
  type PlaceOrderResult,
  type SomniaMarketsClient,
  type Trader
} from "@somnia-chain/markets-sdk";
import type { Address, Hex, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PrecisionEngine } from "./precision.js";
import type { Call, CallDirection, OpenWindow } from "../types/shared.js";
import { InvalidInputError } from "@somnia-chain/markets-sdk";

export interface RealEngineConfig {
  privateKey?: Hex;
  walletClient?: WalletClient;
  timeoutSeconds?: number;
}

/**
 * Agent B — Real Trading Engine (Direct Signing, No Delegation)
 * 
 * Rules (§6 of Spec / agents.md / plan.md §7):
 * 1. Signs directly with user wallet / signer — NO delegation or session keys.
 * 2. Pre-flight collateral balance check: prevents silent gas burns.
 * 3. Enforces BigInt tick-snapping and lot-snapping via PrecisionEngine.
 * 4. Uses IOC (ImmediateOrCancel) to prevent orders silently resting indefinitely.
 * 5. Dead-man's switch: expireTimestampNs set just past UI timeout (15s).
 * 6. Strictly segregated: tagged mode="real", never merged with practice calls.
 */
export class RealEngine {
  private client: SomniaMarketsClient;
  private trader: Trader;
  private accountAddress: Address;
  private timeoutSeconds: number;
  private calls: Map<string, Call> = new Map();

  constructor(client: SomniaMarketsClient, config: RealEngineConfig) {
    this.client = client;
    this.timeoutSeconds = config.timeoutSeconds ?? 15;

    if (config.walletClient && config.walletClient.account) {
      this.accountAddress = config.walletClient.account.address;
      this.trader = this.client.createTrader({ walletClient: config.walletClient });
    } else if (config.privateKey) {
      this.accountAddress = privateKeyToAccount(config.privateKey).address;
      this.trader = this.client.createTrader({ privateKey: config.privateKey });
    } else {
      throw new InvalidInputError("RealEngine requires either privateKey or walletClient");
    }
  }

  getAccount(): Address {
    return this.accountAddress;
  }

  getCalls(): Call[] {
    return Array.from(this.calls.values());
  }

  /**
   * Pre-flight balance check against user's collateral ERC20.
   * Throws decoded human error if underfunded.
   */
  async checkPreflightBalance(collateralAddress: Address, requiredAmount: bigint, decimals: number): Promise<bigint> {
    const balances = await this.client.getBalances([{ token: collateralAddress }], this.accountAddress);
    const rawBalance = balances[0] ?? 0n;

    if (rawBalance < requiredAmount) {
      const oneBase = 10 ** decimals;
      const humanBal = Number(rawBalance) / oneBase;
      const humanReq = Number(requiredAmount) / oneBase;
      throw new InvalidInputError(
        `Insufficient collateral balance. Required: ${humanReq.toFixed(4)}, Available: ${humanBal.toFixed(4)}`
      );
    }
    return rawBalance;
  }

  /**
   * Execute real on-chain direction call.
   */
  async placeCall(
    window: OpenWindow, 
    direction: CallDirection, 
    stake: number,
    slippageBps = 200 // 2% default slippage tolerance
  ): Promise<Call> {
    if (stake <= 0) {
      throw new InvalidInputError("Stake must be positive");
    }

    // 1. Determine raw parameters and book parameters from on-chain pool
    const pool = window.poolAddress;
    const bookParams = await this.client.getBinaryBookParams(pool);
    const decimals = 6; // Testnet tUSDC is 6dp; onchain/config provides venue decimals
    const oneBase = 10n ** BigInt(decimals);

    // 2. Select execution price based on live order book
    let basePrice: number;
    const side: BinarySide = direction === "UP" ? "BUY_YES" : "BUY_NO";

    if (direction === "UP") {
      basePrice = window.bestUpAsk ?? window.upLeanProbability;
    } else {
      basePrice = window.bestDownAsk ?? (1 - window.upLeanProbability);
    }

    // Apply slippage tolerance to limit price for IOC fill
    const slippageMultiplier = 1 + (slippageBps / 10000);
    const limitPrice = Math.min(0.99, basePrice * slippageMultiplier);

    // 3. Tick and lot snapping (mandatory for §7 correctness pass)
    const { rawPrice: snappedPrice, humanPrice: finalPrice } = PrecisionEngine.snapPriceToTick(
      limitPrice,
      bookParams.tickSize,
      decimals
    );

    // Approximate contracts count from stake and price: quantity = stake / price
    const contractsDesired = stake / finalPrice;
    const { rawAmount: snappedQuantity, humanAmount: finalQuantity } = PrecisionEngine.snapAmountToLot(
      contractsDesired,
      bookParams.lotSize,
      bookParams.minQuantity,
      decimals
    );

    // 4. Pre-flight Collateral Balance Verification
    const totalCostRaw = (snappedPrice * snappedQuantity) / oneBase;
    const collateralAddress = (await this.client.getMarketOnchain(window.marketId)).collateral;
    await this.checkPreflightBalance(collateralAddress, totalCostRaw, decimals);

    // 5. Dead-man's switch: 15s expiry
    const nowSec = Math.floor(Date.now() / 1000);
    const expireTimestampNs = BigInt(nowSec + this.timeoutSeconds) * 1_000_000_000n;

    // 6. Direct Wallet Sign & Send
    const result: PlaceOrderResult = await this.trader.placeOrder({
      pool,
      side,
      price: snappedPrice,
      quantity: snappedQuantity,
      orderType: ORDER_TYPE.MARKET, // 2: ImmediateOrCancel (IOC)
      expireTimestampNs,
      autoApprove: true,
    });

    const call: Call = {
      id: `real_${result.orderId ?? result.hash.slice(0, 10)}_${Date.now()}`,
      marketId: window.marketId,
      poolAddress: window.poolAddress,
      direction,
      stake,
      mode: "real", // Permanently tagged as real
      entryPrice: finalPrice,
      contractsCount: finalQuantity,
      timestamp: Date.now(),
      expiry: window.expiry,
      settlementStatus: "pending",
      payout: 0,
      netPnl: -stake,
      redeemed: false,
      txHash: result.hash as Hex,
      oracleResolutionUrl: window.oracleQuestionId
        ? `https://prd.oracle.somnia.host/questions/${window.oracleQuestionId}?view=graph`
        : undefined,
    };

    this.calls.set(call.id, call);
    return call;
  }
}
