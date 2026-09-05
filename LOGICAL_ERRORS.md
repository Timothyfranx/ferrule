# LOGICAL_ERRORS.md — Edge-Case Audit & Vulnerability Catalog for Ferrule

This document catalogs critical logical errors, edge cases, protocol subtleties, and race conditions encountered when building on top of **DreamDEX Event Contracts** (CLOB binary prediction markets) on the **Somnia Shannon Testnet (`Chain ID: 50312`)**. It documents how Ferrule defends against and eliminates each potential vulnerability.

---

## 1. 18-Decimal Float Rounding & Silent Sub-Token Flooring

### The Hazard
In JavaScript, all numbers are 64-bit floating point numbers (IEEE-754). When handling 18-decimal tokens (e.g. Somnia native STT or mainnet USDso), values past 15–17 significant digits lose precision. 
* Historical SDK Gotcha: An early version of `exchange.amountToPrecision` on a binary market whose pool parameters could not be read silently floored sub-token amounts to `0` instead of throwing an error.
* Even in v0.29.0, passing an un-quantized float (e.g., `0.3333333333333333`) to an order placement transaction causes an on-chain contract revert due to off-tick alignment (`InvalidPriceTick` / `InvalidLotSize`).

### How Ferrule Prevents It
Ferrule bypasses IEEE-754 float math entirely in [`src/services/precisionService.ts`](file:///home/replytim/Ferrule/src/services/precisionService.ts):
1. **String-Based Fixed-Point Parsing**: Human numbers are parsed directly as integer and fractional strings into exact BigInt units in `10^decimals` space.
2. **Modular Tick Alignment**:
   $$\text{alignedPrice} = \text{rawPrice} - (\text{rawPrice} \pmod{\text{tickSize}})$$
3. **Lot Quantization & Clamping**: Quantity is snapped down to the pool's `lotSize` and strictly enforced to be $\ge \text{minQuantity}$.
4. **Probability Boundary Protection**: Binary outcome prices are strictly clamped between `tickSize` and `(10^decimals - tickSize)`. A price of `0` or `1` is mathematically prohibited on a binary order book.

---

## 2. Pool Recycled Nonce Mismatch

### The Hazard
In DreamDEX v2, binary pools are recycled across successive rolling windows (e.g., the same pool contract handles successive 5-minute ETH-USD markets). Each new market window increments a `marketNonce`. 
If an application keys its order cache or UI state by `poolAddress`, resting orders or settlement signals from the previous market will bleed into the current market, leading to incorrect state displays and failed order lookups.

### How Ferrule Prevents It
Ferrule decouples the market identity from the physical pool contract:
* All internal indexes, state caches, position ledgers, and scorecard calculations are keyed strictly by **`marketId` (bytes32)** and `symbol`, never naked `poolAddress`.
* The `poolAddress` is resolved dynamically at runtime for each active `marketId`.

---

## 3. Conflating Indexer "Finalized" with On-Chain "Resolved"

### The Hazard
In `@somnia-chain/markets-sdk`:
* On-chain status is a 6-state enum: `Listed(0) → Trading(1) → Locked(2) → Settling(3) → Resolved(4) | Voided(5)`.
* `"Finalized"` is **not** an on-chain enum value on the market itself. It is an indexer/SDK-level terminal status emitted when `BinarySettlement.MarketFinalized` sweeps the net backing into the settlement singleton.
* Furthermore, `client.loadMarkets()` automatically skips `Finalized` markets to prevent registry bloat.
If an application relies on `loadMarkets()` to find markets eligible for winning redemption, the user's settled positions will vanish from the registry.

### How Ferrule Prevents It
1. Active trading discovery strictly checks on-chain status via `client.getMarketOnchain(marketId)`, accepting only `status === 1` (`Trading`).
2. Settlement and redemption logic directly inspects `isResolved`, `winningOutcome`, and `isVoided` on `getMarketOnchain`, and targets `BinarySettlement` (`0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23`) directly for redemption payouts.

---

## 4. Thin / One-Sided Order Book Null Pointer Dereference

### The Hazard
On testnet or during rapid volatility, binary order books often have liquidity on only one side (e.g., asks exist for YES, but NO has zero bids or asks). Attempting to read `book.yesAsks[0].price` without defensive checks causes runtime unhandled exceptions (`TypeError: Cannot read properties of undefined`).

### How Ferrule Prevents It
Ferrule's [`src/services/marketDataService.ts`](file:///home/replytim/Ferrule/src/services/marketDataService.ts) defensively extracts bids and asks:
* If best ask is missing, it falls back to the mid-market probability derived from resting bids or oracle strike bias.
* Total depth is calculated as a safe fold over existing levels with `(level?.quantity ?? 0n)`.
* Visual gauges gracefully render fallback indicator states if depth volume is zero.

---

## 5. Order Expiry Beyond Market Expiry (`OrderExpiryBeyondMarket`)

### The Hazard
Submitting a limit order whose `expireTimestampNs` is greater than or equal to the market's lock/settlement timestamp causes the Somnia CLOB contract to revert with `OrderExpiryBeyondMarket`.

### How Ferrule Prevents It
1. Ferrule uses **Immediate-or-Cancel (IOC)** orders (`ORDER_TYPE.MARKET = 2`) for market-taker entry, ensuring trades fill immediately against resting liquidity or cancel cleanly without resting into dead windows.
2. For all limit orders, Ferrule enforces a 15-second dead-man's switch:
   $$\text{expireTimestampNs} = \min(\text{nowNs} + 15\times 10^9, (\text{marketExpirySec} - 5)\times 10^9)$$

---

## 6. Gas-Wasting Zero-Payout Loss Redemptions

### The Hazard
On Somnia DreamDEX, calling `trader.redeem()` on an outcome token that lost does not revert; the settlement contract successfully processes the transaction and burns the token, but transfers **0 USDC** in payout while consuming network gas.

### How Ferrule Prevents It
Ferrule's [`src/services/settlementService.ts`](file:///home/replytim/Ferrule/src/services/settlementService.ts) enforces a strict **loss-suppression gate**:
* If `call.settlementStatus === "lost"`, Ferrule marks the call as settled with `0` payout and disables the "Claim" button.
* If a redemption method is invoked programmatically for a losing position, it immediately throws `Error("LossSuppressed: Position has zero payout. Skipping on-chain redemption to save gas.")`.

---

## 7. Voided Market Payoff Asymmetry

### The Hazard
When an oracle question cannot be resolved or is canceled, the market is marked `isVoided = true`. In a binary contract, a voided market does not declare a 100% winner; instead, **both YES and NO token holders are entitled to redeem 50% ($0.50 per share) of the collateral pool**. Assuming a binary 1/0 payoff on voided markets corrupts accounting.

### How Ferrule Prevents It
Ferrule's settlement math explicitly handles the voided state:
$$\text{payout} = \begin{cases} 
\text{contracts} \times 1.0 & \text{if won} \\
\text{contracts} \times 0.5 & \text{if voided} \\
0.0 & \text{if lost}
\end{cases}$$
Both practice and real balance updates reflect the exact 50% refund.

---

## 8. Frontrunning the Lock Transition (< 45s Remaining)

### The Hazard
In the final 30–45 seconds of a rolling window, price volatility can cause rapid spread widening or lock transactions to fail if block production lags behind network time. An order broadcast at $T - 5\text{s}$ frequently lands at $T + 1\text{s}$, reverting with `MarketLocked`.

### How Ferrule Prevents It
* Ferrule automatically filters out any market window with $\le 45$ seconds remaining from the active trading grid and strategy watchers.
* If a user manually attempts to place a call on a window with $< 45\text{s}$ remaining, Ferrule prompts an explicit execution warning.

---

## 9. Practice Order Contamination

### The Hazard
In mixed-mode applications, a developer oversight can lead to a practice trade inadvertently routing to the on-chain `trader.placeOrder` method or requesting a wallet signature from the user.

### How Ferrule Prevents It
* [`src/services/practiceTradingService.ts`](file:///home/replytim/Ferrule/src/services/practiceTradingService.ts) has zero imports or dependencies on `viem/WalletClient` or write-capable signers.
* Practice state is completely contained in local memory and `localStorage`.
* An automated test (`tests/safetyPass.test.ts`) verifies that the practice execution path cannot invoke write RPC calls under any condition.

---

## 10. Pre-Flight Collateral Verification

### The Hazard
Submitting an order without sufficient `TestUSDC` collateral causes the transaction to revert on-chain after user signature, wasting STT gas and triggering confusing generic RPC error messages.

### How Ferrule Prevents It
In [`src/services/realTradingService.ts`](file:///home/replytim/Ferrule/src/services/realTradingService.ts), Ferrule executes a pre-flight read via `eth_call` (`balanceOf`) before triggering the wallet signature prompt. If the user's balance is lower than the required stake + buffer, it aborts cleanly with a human-readable prompt: `"Insufficient USDC collateral on Somnia Testnet"`.

---

## 11. Stale Oracle Resolution & Permissionless Backstops

### The Hazard
If the keeper infrastructure running the OracleHub question resolution experiences delays or high gas spikes, settled markets can remain in the `Settling` state indefinitely, locking user collateral.

### How Ferrule Prevents It
Ferrule includes direct hooks for DreamDEX's permissionless resolution backstops:
1. `pokeOracle(oracleQuestionId)`: Pokes the oracle contract to trigger settlement if the resolution window has passed.
2. `voidExpired(marketId)`: Permissionlessly forces a market into the `Voided` state if the resolution timeout has elapsed, allowing traders to safely withdraw 50% of their collateral.

---

## 12. Local Clock Skew vs EVM Block Timestamp

### The Hazard
If a trader's computer clock is skewed forward or backward by 30 seconds, countdown timers will show incorrect remaining time, causing orders to be submitted to already-locked pools.

### How Ferrule Prevents It
Ferrule synchronizes its reference time by comparing local time against the timestamp of the latest mined block returned from `publicClient.getBlock({ blockTag: "latest" })`. Time countdowns use the delta-adjusted chain time.

---

## 13. Strategy Watcher Re-Entrancy & Trigger Spam

### The Hazard
In the terminal, a user can spawn a watcher:
`watch BTC-15m if lean>=0.65 then suggest stake 250 up`
If the condition remains true for 10 consecutive ticks (40 seconds), an unthrottled watcher would generate 10 duplicate suggestions or orders for the same market window.

### How Ferrule Prevents It
[`src/services/watcherService.ts`](file:///home/replytim/Ferrule/src/services/watcherService.ts) enforces:
1. A **15-second trigger cooldown** per watcher.
2. A `tradedMarketIds` tracking set that prevents re-triggering on the same specific `marketId` until the next rolling window begins.

---

## 14. Terminal Buffer Overflow & Memory Leak

### The Hazard
A high-frequency terminal evaluator streaming ticks every 3–4 seconds can generate thousands of DOM nodes in a long browser session, degrading performance and leaking memory.

### How Ferrule Prevents It
Ferrule implements a circular buffer with a hard cap of **2,000 log lines**. When the buffer exceeds 2,000 lines, the oldest 200 lines are purged in a single garbage collection batch.

---

## 15. Unsaved User State Persistence

### The Hazard
Accidental browser refreshes could wipe out practice bankrolls, historical Brier score calculations, or active strategy watcher configurations.

### How Ferrule Prevents It
All practice calls, virtual bankrolls, calibration histories, and active watcher rules are automatically debounced and serialized to browser `localStorage` under `ferrule_state_v1`.
