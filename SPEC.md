# Book Pulse + Practice Mode — Build Spec

**Hackathon:** Somnia × DreamDEX Event Contracts Hackathon
**Submission window:** Aug 25 – Sep 8, 2026
**Team capacity:** 3 coding agents, working in parallel

---

## 1. What we're building, in one sentence

A trading surface for DreamDEX Event Contracts (BTC/ETH Up/Down, 15m/1h windows) that shows a live, order-book-derived "crowd lean" signal, lets a new user practice calling directions risk-free against that same real signal, scores their calibration honestly, and offers a clear, explicit path to real trading once they choose it.

## 2. Why this idea, and what it's not

- It is **not** a copy of Mirra (copy-trading, already built on Somnia), Wagerverse (wager rooms with delegated wallets, already built), or Prophecy Social (streaks/points prediction app, already at 15,000+ user markets). It's differentiated from all three because it's grounded in DreamDEX's *actual, real order book* — not a parallel points system or a generic wager mechanic.
- The paper-trading-against-a-real-book pattern is **validated, not novel** — PolySimulator already does this for Polymarket. We are the first to bring it to DreamDEX Event Contracts, and we add something PolySimulator doesn't have: a calibration scorecard.
- We are **not** building session-key/operator infrastructure. That already exists, shipped and mainnet-verified, for DreamDEX's spot pools (`@dreamdex-bot-kit/core`). Event Contracts are a **separate SDK and, as far as we can confirm, do not support delegated trading at all** — see §4.

## 3. Confirmed technical facts

- **Package:** `@somnia-chain/markets-sdk` (TypeScript), install alongside `viem`. **Pin `^0.25.0` or newer** — anything below 0.23.0 fails to read markets at all (dropped indexer column).
- **No HTTP API for Event Contracts** — the HTTP API covers spot only. Use the SDK directly.
- **Prices are Up probabilities in (0,1).** A Down price is always `1 - Up price`. One order book serves both sides.
- **Collateral:** USDso, 18 decimals on mainnet. Test USDC, **6 decimals** on testnet. This must be a config value, never hardcoded — the tick-precision bug below is invisible on 6-decimal testnet and only bites on 18-decimal mainnet.
- **Contracts (identical address on testnet 50312 and mainnet 5031, via CREATE3):** BinaryMarketsModule `0x3ecC694Cef705358864a646142ac17A90E29e388`, MarketsCore `0x2802504314685D89bF6C992CA5a8e7cC78bc0294`, BinarySettlement `0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23`, OutcomeToken6909 `0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9`, OracleHub `0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b`, CollateralRouter `0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C`. **Never hardcode market/pool addresses** — read from the registry, they recycle across windows.
- **No rate limits** — market data is the chain itself. Snapshot once, stay current via live watches, don't poll.

## 4. Locked design decision: no delegated/operator trading for real money

Checked across four separate docs (overview, Recipes, Gotchas, Contracts & Addresses) — no `OperatorPermissionsRegistry` or equivalent exists for Event Contracts, unlike the Bot Kit's spot pools. **Real trades sign directly with the user's own wallet, every time.** Do not attempt to build a custom delegation/hot-wallet layer under time pressure — that would make us the security boundary ourselves, which is a much bigger commitment than this timeline supports. Frame the direct-signing requirement honestly in the UI as what makes it safe, not as a limitation to hide.

## 4b. Lifecycle states and settlement backstops

Full status enum: `Listed(0) → Trading(1) → Locked(2) → Resolved(4) | Voided(5)` (`Settling(3)` exists but is effectively never observable). Only `Trading` accepts new orders — but **cancels still work in `Locked`**, so don't disable cancel UI the moment a window closes.

Settlement is oracle-driven and automatic (Somnia reactivity delivers the callback — no keeper needed on DreamDEX's side). Two permissionless backstops exist for the rare missed callback, and **our app should actively use them, not just wait**:
- `pokeOracle(questionId)` — manually pulls a posted answer and resolves the market.
- `voidExpired()` — callable by anyone once the settlement window passes with no answer; voids the market, both sides redeem at 0.5.

Agent B: if a window is past its expected settlement time and still not `Resolved`/`Voided`, call these rather than leaving the UI showing "pending" indefinitely.

**Resolution transparency (cheap, protocol-endorsed, add to Agent C):** every market carries an `oracleQuestionId`. Deep-link to `https://prd.oracle.somnia.host/questions/{oracleQuestionId}?view=graph` to show the actual price sources, receipts, and median that produced the settlement. The docs explicitly recommend surfacing this in any interface built on Event Contracts — add it as a "view resolution proof" link on each settled window. Directly strengthens trust in a fast-settling binary product.

## 5. Shared data contracts (define once, before splitting into agents)

**`OpenWindow`**: `marketId`, `symbol`, `asset` ("BTC"|"ETH"), `intervalSec`, `venueId`, live best bid/ask, computed Up-lean %, `expiry`. Read `asset`/`intervalSec` as typed fields from the market row — never parse the question text (wording changes, fields don't).

**`Call`**: `marketId`, `direction` (Up/Down), `stake`, `mode` (`"practice"` | `"real"` — explicit, never inferred, never merged), `entryPrice`, `timestamp`, `settlementStatus` (`"pending"|"won"|"lost"|"voided"`), `redeemed` (bool, real mode only).

## 6. Agent breakdown

### Agent A — Live data layer
- Discover markets via `loadMarkets(true)`, filter `isBinaryMarket`, gate every read on **on-chain status** (`getMarketOnchain`, `status === 1` = Trading) — the indexer lags by seconds.
- Compute the Up-lean signal directly from the live Up price (it's already a probability) plus depth, not a custom imbalance formula.
- **Scope every query by `venueId`** — a deployment can host more than one venue with markets sitting side by side.
- **Key all state by `marketId`/symbol, never pool address** — pools are recycled across windows; a market discovered from a live event can have a null `nonce` until the next snapshot resolves it.
- Skip markets with under ~5 minutes to expiry (a window can lock between snapshot and send).
- Snapshot on-chain state once per read-then-write pass and reuse it — don't re-fetch mid-operation.
- This is the single source of truth — Agents B and C read from here, never query the SDK independently for the same data.

### Agent B — Trading engines (practice + real, shared interface)
- **Practice engine:** simulated stake, scored against real live prices and real settlement outcomes. Never touches the real book. Never influences Agent A's signal.
- **Real engine — critical correctness requirements:**
  - **Tick-snapping is mandatory, not optional.** `createOrder`'s float-to-`parseUnits` conversion reverts on ordinary decimals on the 18-decimal mainnet venue (only 0.25/0.5/0.75 survive). This bug is **invisible on testnet** (6 decimals). Implement the BigInt tick-snapping pattern from day one and write a unit test that fakes 18-decimal rounding — testnet passing is not evidence this is correct.
  - Use IOC for the "tap to call a direction" flow so nothing rests silently.
  - Set `expireTimestampNs` just past the UI's own timeout — mandatory dead-man's switch.
  - Size to the lot grid (`amountToPrecision`, SDK ≥0.24.0 handles this for unified verbs; hand-quantize for raw trader-tier calls).
  - **Pre-flight balance check before every signed write.** A reverted write does not always throw (version-dependent — see below); an underfunded flow can silently resend and burn gas every cycle.
  - On SDK ≥0.23.0, writes throw a decoded revert error — let it propagate. On unified verbs, read the receipt via `(order.info as PlaceOrderResult).receipt`, never `order.receipt` (compiles to `unknown`, always undefined).
  - **Redemption is a separate, explicit step**, not automatic: query `listBinaryMarkets({ venueId, status: "Finalized" })` directly — `loadMarkets()` skips finalized markets and will silently show nothing to claim. Check `isResolved`/`isVoided` explicitly; redeem both sides on a voided market (each pays 0.5) — don't infer a winner. Redeeming a loss succeeds and pays 0, so check outcome before spending gas on it.
- Both engines write to the shared `Call` record, tagged `mode` — no silent merging between practice and real.

### Agent C — Frontend + scorecard
- One live view per open window: Up-lean gauge, countdown, recent settled outcomes.
- Call interface with an explicit, non-subtle practice/real toggle.
- Calibration scorecard, **segmented by mode**, built on the same "real skill vs. noise" logic as the Bot Kit's edge-analytics tool — not a raw win streak. Must handle three outcomes (won/lost/voided), not a binary.
- A visible, deliberate "claim winnings" action for settled real positions — this doesn't happen automatically.
- A clear, honest framing at the practice→real transition: this means "you've learned the mechanics," not "you're ready" — paper trading is well-documented to not transfer real risk psychology.

## 7. Safety and correctness pass (do not skip under time pressure)

- Adversarial test: attempt a trade beyond a stated practice/demo cap — must be rejected in the practice engine's own logic (no protocol-level cap exists for us to lean on here, unlike spot).
- Confirm practice orders never reach the real book under any code path.
- Confirm the tick-snapping fix actually prevents the float-precision revert (test against simulated 18-decimal math, not testnet).
- Confirm redemption correctly handles won / lost / voided, and doesn't spend gas redeeming a zero-payout loss unnecessarily.
- Confirm decoded error messages for common reverts (`ERC20InsufficientBalance`, `InsufficientBalance()`) reach the user as real text, not a bare selector.

## 8. Demo script

Live gauge ticking down → practice call placed, informed by the visible signal → window settles on-chain → scorecard updates → deliberate transition to real mode → small real, direct-signed position → real settlement → explicit claim action. One continuous story, not a feature tour.

## 9. Submission checklist

- [ ] Working prototype on testnet
- [ ] GitHub repository
- [ ] 2–3 minute demo video
- [ ] (Optional, cheap, worth including) Presentation deck
- [ ] (Optional, we have real material for this) SDK/docs feedback report — the docs-access friction, the invisible-on-testnet tick bug, the lack of a delegation model for Event Contracts, the `loadMarkets()`-skips-Finalized trap

## 10. Timeline against Aug 25 – Sep 8

Spec is locked as of this document — Phase 0 validation is complete pending one live check: run `listBinaryMarkets({ orderBy: "volume" })` against testnet to confirm real trading activity exists before building the signal around it. Budget the largest share of remaining time to §6 (the parallel build), hold real hours for §7 (safety pass — do not compress this), and reserve the final 1–2 days purely for §8/§9, not new features.

## 11. Open items still worth resolving

- Confirm via the npm README ("raw trader tier" section) that no delegation mechanism was missed across the four docs reviewed.
- Run the real liquidity check (§10) before finalizing the signal design in §6/Agent A.
