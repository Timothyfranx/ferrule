# design.md — Ferrule + Practice Mode architecture

## One-liner
A DreamDEX Event Contracts trading surface: a live crowd-lean signal from the real order
book, risk-free practice against that same signal, honest scoring, and an explicit,
non-automatic path to real trading.

## Why this is differentiated (stated precisely, for the pitch)
- Not Mirra (copy-trading), not Wagerverse (wager rooms + delegated wallets), not Prophecy
  Social (points/streaks, no real order book underneath).
- The paper-trade-against-a-real-book pattern is validated elsewhere (PolySimulator on
  Polymarket) but not yet built for DreamDEX Event Contracts. Addition beyond that pattern:
  a calibration scorecard, not just a running score.
- Deliberately does NOT build delegated/session-key trading — verified no such mechanism
  exists for Event Contracts (see `skill.md`). This is framed in the product as a safety
  feature (direct wallet signing = the user is always the one authorizing spend), not
  hidden as a missing feature.

## Components

### Agent A — Live data layer (single source of truth)
- Discovers markets via the unified exchange's `loadMarkets(true)`, filters `isBinaryMarket`.
- Gates every read on **on-chain status** via `getMarketOnchain` — the indexer can lag by
  seconds; on-chain state is ground truth for whether a window still accepts orders.
- Computes the Up-lean signal from the live Up price (already a probability, no custom
  imbalance formula needed) plus depth.
- Scopes every query by `venueId` — a deployment can host multiple venues concurrently.
- Keys all internal state by `marketId`/symbol, never pool address (pools recycle).
- Skips markets with under ~5 minutes to expiry — a window can lock between snapshot and send.
- Exposes a single `OpenWindow` read interface that Agents B and C consume — they do not
  independently call the SDK for the same data, ever.

### Agent B — Trading engines (practice + real, shared interface, separate execution paths)
- **Practice engine**: simulated stake, scored against Agent A's real live prices and real
  settlement outcomes. Never calls any write function. Never influences the real signal.
- **Real engine**:
  - Tick-snapping via `amountToPrecision`/`priceToPrecision` is mandatory on every write —
    not optional, not deferred. Confirmed real historical failure mode: silent flooring to 0
    on 18-decimal markets when pool params can't be read (see `skill.md`).
  - IOC order type for the "tap to call a direction" flow.
  - `expireTimestampNs` set just past the UI's own timeout as a dead-man's switch.
  - Pre-flight balance check before every signed write — a reverted write does not always
    throw depending on SDK version; an underfunded flow can otherwise silently resend and
    burn gas repeatedly.
  - Redemption is a **separate, explicit user action**, not automatic. `loadMarkets()` skips
    finalized markets — redemption-eligible markets must be queried directly
    (`listBinaryMarkets({ status: "Finalized" })` or on-chain equivalent, pending
    confirmation of what "Finalized" actually means — see `skill.md`'s open question).
    Check `isResolved`/`isVoided` explicitly before redeeming; voided markets pay both sides
    0.5 each — don't infer a single winner. Redeeming an actual loss succeeds and pays 0 —
    check the outcome before spending gas on it.
- Both engines write to a shared `Call` record, `mode` field set explicitly at creation,
  never inferred, never merged between practice and real in any downstream view or score.

### Agent C — Frontend + scorecard
- One live view per open window: Up-lean gauge, countdown, recent settled outcomes.
- Explicit, non-subtle practice/real toggle — not a hidden setting.
- Calibration scorecard segmented by mode, built on genuine calibration logic (not a raw
  win streak), handling three outcomes (won/lost/voided) rather than a binary.
- Explicit "claim winnings" action for settled real positions — never automatic.
- Honest framing at the practice→real transition: "you've learned the mechanics," not
  "you're ready" — paper trading is well-documented to not transfer real risk psychology.
  This is both an ethical stance and a defensible answer if a judge asks about responsible
  design.
- Deep-links to `https://prd.oracle.somnia.host/questions/{oracleQuestionId}?view=graph`
  on every settled market — protocol-recommended resolution transparency, cheap to add,
  directly strengthens trust in a fast-settling binary product.

## Settlement backstops (Agent B should actively use these, not just wait)
Settlement is oracle-driven and normally automatic. Two permissionless backstops exist for
the rare missed callback:
- `pokeOracle(questionId)` — manually pulls a posted answer and resolves the market.
- `voidExpired()` — callable by anyone once the settlement window passes with no answer;
  both sides then redeem at 0.5.
If a window is past its expected settlement time and still not `Resolved`/`Voided`, call
these rather than leaving the UI showing "pending" indefinitely.

## Known limitations, stated honestly (for the README/pitch, not hidden)
- No delegated trading — confirmed, by design, not a gap. Every real trade requires the
  user's own wallet signature, every time.
- Practice mode is a strong proxy for mechanics, not for real trading psychology — stated
  explicitly at the transition point, not glossed over.
- The `"Finalized"` status semantics need empirical confirmation against live testnet data
  before being fully trusted (see `skill.md`).
