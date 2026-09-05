# plan.md — Ferrule build plan (REDRAFT: single agent, ~3 days left)

**Reality check, stated plainly:** today is Sep 5, submission closes Sep 8 at 18:00 UTC.
That's ~72 hours, not the original 14-day window. One coding agent working sequentially,
not three in parallel. This redraft cuts scope hard on purpose — better to submit one real,
working thing than a half-built Pro suite. Everything cut below is listed explicitly as
"cut," not silently dropped, so it can go in the README as honest future work.

## Judging criteria (unchanged, keep visible)
Technical Implementation 25% · Innovation & Originality 20% · UX & Design 20% ·
Business & Ecosystem Impact 20% · Presentation & Demo 15%.

## What ships (locked scope, do not add to this list)
- Basic flow, complete: Landing/Connect → Mode Selector → Live Market → Call → Confirm →
  Scorecard (Basic). This is the safe, guaranteed-working core.
- A **scoped-down** Pro Terminal: real terminal look/feel, live evaluation log, one working
  condition type (`field > value AND field < value`), suggestion-only output — enough to
  prove the differentiator on camera, not the full grammar or the Strategy Library screen.
- The Practice ⇄ Real transition screen and the sticky Mode Banner — non-negotiable, these
  are cheap and they're your safety story.
- The §7 safety pass, all of it — do not compress this even under time pressure. A working
  demo that's provably safe beats a flashier one that isn't.

## What's cut for this submission (say so honestly in the README, not silently dropped)
- Strategy Library screen (saved rules list, per-rule stats) — one strategy typed live in
  the demo is enough to prove the concept.
- Full Order Book Depth screen — Basic's simple lean indicator already uses this data;
  the dedicated dense-table screen is deferred.
- Per-strategy segmented calibration curve — ship the aggregate Basic scorecard only.
- Strategy export (download rule as JSON) — cheap conceptually, cut anyway; every hour
  matters now.
- Native app — was always explicitly future work, unaffected by this redraft.

## Sequential build order (one agent, in this exact order — do not parallelize prematurely)

### Phase 0 — Shared contracts (lock before anything else, ~1 hr)
Write `shared.ts` once: `OpenWindow`, `Call` (with `mode`), `Signal`. With one agent this is
lower-drift-risk than the 3-agent version, but still write it first and don't redefine it
mid-build — every later phase imports from here, never redeclares its own copy.

### Phase 1 — Data layer (~4-6 hrs)
`loadMarkets(true)` → filter `isBinaryMarket` → gate on `getMarketOnchain` status →
compute lean from live Up price. Confirm against real testnet data before moving on —
this is the foundation everything else sits on; a wrong assumption here costs double later
since there's no second agent to catch it in parallel.

### Phase 2 — Practice trading engine (~3-4 hrs)
Simulated stake, scored against Phase 1's real live data and real settlement outcomes.
Never touches a write call. This unblocks Basic-flow frontend work immediately after.

### Phase 3 — Basic flow frontend (~4-6 hrs)
Build against the locked `DESIGN_SYSTEM.md` tokens and the Stitch outputs already generated.
Landing → Mode Selector → Live Market → Call → Confirm → Scorecard. This is your guaranteed
submission floor — if everything after this phase runs out of time, you still have a
complete, working, honest Basic product to submit.

### Phase 4 — Real trading engine (~3-4 hrs)
Tick-snapping via `amountToPrecision`/`priceToPrecision` — mandatory, test against
simulated 18-decimal math specifically, not testnet's 6-decimal collateral. Redemption as
an explicit action. Do not start this phase until Phase 3 is functionally complete —
real-money code deserves undivided attention, not context-switching.

### Phase 5 — Scoped Pro Terminal (~4-6 hrs, cut first if behind)
Real terminal shell per the locked visual spec, one working condition grammar path, live
evaluation log, suggestion-only output (never auto-executes real trades — see `design.md`'s
safety rule). If Phase 4 runs long, this phase shrinks first, not the safety pass in Phase 6.

### Phase 6 — Safety pass (§7, do not skip or compress)
- Adversarial test: practice engine rejects a trade beyond its own stated cap.
- Confirm practice orders never reach a real write call under any code path — test directly.
- Confirm tick-snapping actually prevents the float-precision revert on simulated 18-decimal math.
- Confirm redemption handles won/lost/voided correctly, no wasted gas redeeming a zero payout.
- Confirm decoded errors reach the user as real text, not a bare selector.

### Phase 7 — Demo + submission (reserve real hours, not leftover minutes)
Record against Phase 3 (guaranteed-working) as the backbone, Phase 5 as the differentiator
moment if it's ready, per the demo arc already agreed: Basic first (accessible, judges get
it immediately), then "and for users who want to go deeper" into the terminal. GitHub repo
public, README written honestly (including the "what's cut" list above — this reads as
maturity, not weakness, same lesson from the last project). SDK/docs feedback report if time
allows — real material already exists (`skill.md`'s `MarketFinalized`/`PoolFinalized`
distinction, the invisible-on-testnet tick bug, the confirmed no-delegation finding).

## Rough time budget against ~72 hours
Phases 0-2: today (Sep 5). Phases 3-4: Sep 6. Phase 5 + Phase 6 safety pass: Sep 7. Phase 7,
with real buffer: Sep 8 morning, submit well before the 18:00 UTC deadline — not at the wire.

## The one rule that matters most with this little time left
If something is behind schedule, cut Phase 5 (Pro terminal) further before you cut Phase 6
(safety pass) or Phase 7 (demo prep). A safe, well-presented Basic-only submission beats an
unsafe or poorly-demoed one with a flashy terminal bolted on.
