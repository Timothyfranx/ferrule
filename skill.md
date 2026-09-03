# skill.md — @somnia-chain/markets-sdk ground truth

Everything below was verified by downloading the actual package (`npm pack
@somnia-chain/markets-sdk@0.29.0`) and reading its real `.d.ts` files — not by trusting
documentation prose. Where the spec doc and the package disagree, the package wins. If you
need an SDK behavior not listed here, fetch the real type definitions yourself before using
it — do not guess a plausible-sounding name.

## Package facts
- Published on npm as `@somnia-chain/markets-sdk`. Confirmed versions: 0.20.0, 0.21.0,
  0.22.0, 0.23.0, 0.24.0, 0.25.0, 0.27.0, 0.28.0, 0.28.1, 0.29.0.
- Package is ESM (`"type": "module"`), main entry `./dist/index.js`, types
  `./dist/index.d.ts`. Also exports a `./react` subpath.
- Peer dependency: `viem`.

## Confirmed real functions/exports (verified present in 0.29.0's compiled types)
| Name | Location | Notes |
|---|---|---|
| `isBinaryMarket(m: Market): m is BinaryMarket` | `markets.d.ts` | Type guard, confirmed |
| `listBinaryMarkets(opts)` | `markets.d.ts` | Confirmed; supports a `BinaryMarketFilter` |
| `getMarketOnchain(marketId, sources, client)` | `markets.d.ts` | Confirmed, reads on-chain state directly |
| `exchange.loadMarkets(reload?: boolean)` | `unified/exchange.d.ts` | **Method on a unified exchange instance, not a bare top-level import.** `loadMarkets()` (no arg) early-returns the cached registry; `loadMarkets(true)` forces a retry. |
| `exchange.priceToPrecision(ref, price)` | `unified/exchange.d.ts` | Snaps price to tick grid. Binary ticks come from the pool, read once at `loadMarkets()` time — a pool recycled mid-session keeps the stale grid until `loadMarkets(true)` refreshes it. |
| `exchange.amountToPrecision(ref, amount)` | `unified/exchange.d.ts` | Snaps amount to lot grid (rounds down). **Confirmed historical bug per the SDK's own docstring**: on a binary market whose pool parameters couldn't be read, this used to silently floor sub-token amounts to 0 instead of throwing. Current version throws `InvalidInputError` instead — confirm which behavior your pinned version has. |

## Confirmed lifecycle status type
From `store.d.ts`:
```ts
type BinaryMarketStatus = "Listed" | "Trading" | "Locked" | "Settling" | "Resolved" | "Voided" | "Finalized"
```
**Open question, not yet resolved — check before Agent B writes redemption polling:**
the spec's numeric on-chain enum (`Listed(0) → Trading(1) → Locked(2) → Resolved(4) |
Voided(5)`, with `Settling(3)` rarely observed) does not obviously map one-to-one onto this
7-value string type, which also includes `"Finalized"`. Two plausible explanations, unconfirmed:
(a) `"Finalized"` is an indexer/SDK-level derived label distinct from the raw on-chain enum,
used specifically for query filters like `listBinaryMarkets({ status: "Finalized" })`, or
(b) it's a real state a market passes through after `Resolved`/`Voided`. Confirm which,
empirically, against real testnet markets before Agent B builds redemption-eligibility logic
around it.

## Confirmed: no delegation mechanism for Event Contracts (binary markets)
Directly verified from package structure, not from documentation claims:
- `dist/spot/operatorGrants.js` exists.
- `dist/binary/` directory contents: `index.d.ts/js`, `plugin.d.ts/js`, `portfolio.d.ts/js`,
  `sets.d.ts/js`, `settlement.d.ts/js` — **no grant, session, or operator file present.**
- This confirms the spec's §4 design decision is grounded in the actual package, not just
  documentation prose. Real trades sign directly with the user's wallet — build accordingly.

## Things mentioned in the spec I have not yet independently verified
Flag these to whoever writes the corresponding agent — don't treat as settled:
- The exact `PlaceOrderResult`/`order.info`/`order.receipt` typing quirk described in §6
  (plausible given TypeScript's handling of union/unified return types, but not directly
  inspected)
- Exact contract addresses listed in the spec (BinaryMarketsModule, MarketsCore, etc.) —
  these are protocol-level facts that should be confirmed by reading them directly from a
  live testnet call, not just trusted from the spec document
- Real trading volume/liquidity on testnet — run `listBinaryMarkets({ orderBy: "volume" })`
  for real, this is the Day 1 gate, not optional groundwork

## If you need something not in this file
Run `npm pack @somnia-chain/markets-sdk@<version>` yourself, extract it, and read the real
`.d.ts` files — don't guess, don't trust a docs page's prose description over the actual
shipped types.
