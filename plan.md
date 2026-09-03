# plan.md — Book Pulse build plan

Team: 3 coding agents working in parallel. Submission window: Aug 25 – Sep 8, 2026.

## Judging criteria (weighted) — keep visible while prioritizing
- ⭐⭐⭐⭐⭐ Technical Implementation — 25%
- ⭐⭐⭐⭐ Innovation & Originality — 20%
- ⭐⭐⭐⭐ User Experience & Design — 20%
- ⭐⭐⭐⭐ Business & Ecosystem Impact — 20%
- ⭐⭐⭐ Presentation & Demo — 15%

**Implication vs. the Arcana project's rubric:** no single category dominates the way
Sepolia deployment did last time. Technical Implementation is highest but not overwhelming —
don't over-invest in one area at the expense of UX and the ecosystem-impact story, both of
which carry real weight here.

## Day 0 — Verification gate (do this before Agents A/B/C start building in parallel)

This is not optional groundwork — it's the single highest-leverage hour available, because
three agents building simultaneously means a wrong foundational assumption propagates into
all three workstreams before anyone notices.

1. Run `listBinaryMarkets({ orderBy: "volume" })` against real testnet. Confirm real trading
   activity actually exists before building the signal design around it. If liquidity is
   thin or dead, that changes the whole plan — find out now, not on day 8.
2. Confirm the `"Finalized"` status open question from `skill.md` empirically — query a real
   settled market and check what status values actually appear in sequence.
3. Confirm the exact contract addresses in the spec by reading them from a live call, not
   just trusting the document.
4. Only after 1–3 are confirmed with real output, kick off Agents A, B, C in parallel.

## Team boundaries (see `design.md` for full detail)
- **Agent A**: live data layer, single source of truth. Nothing else reads the SDK directly
  for market data once Agent A exists.
- **Agent B**: practice + real trading engines, sharing one `Call` interface, never sharing
  an execution path.
- **Agent C**: frontend, scorecard, resolution transparency links.

Define the shared `OpenWindow` and `Call` types once, in one file, before any agent starts —
this is the equivalent of the ABI-mismatch lesson from the last project: a struct/interface
that changes shape on one side without the other side noticing is the single most common
cause of the deepest, hardest-to-diagnose bugs.

## Explicitly out of scope
- Delegated/session-key trading — confirmed no protocol mechanism exists for Event
  Contracts; don't build a custom one under time pressure (see `agents.md` rule 5).
- Multi-asset expansion beyond BTC/ETH Up/Down — stick to what's specified.
- A custom imbalance/signal formula beyond the live Up price + depth — the SDK's price is
  already a probability; don't over-engineer this.

## Safety and correctness pass (§7 of the spec — do not compress this under time pressure)
- Adversarial test: attempt a trade beyond the stated practice/demo cap — must be rejected
  in the practice engine's own logic (no protocol-level cap exists to lean on here).
- Confirm practice orders never reach the real book under any code path — this is a direct
  test, not an assumption.
- Confirm tick-snapping actually prevents the float-precision revert, tested against
  simulated 18-decimal math specifically, not testnet's 6-decimal collateral.
- Confirm redemption correctly handles won / lost / voided, without spending gas redeeming
  a zero-payout loss.
- Confirm decoded error messages (`ERC20InsufficientBalance`, `InsufficientBalance()`) reach
  the user as real text, not a bare selector.

## Demo script target
Live gauge ticking down → practice call placed, informed by the visible signal → window
settles on-chain → scorecard updates → deliberate, honestly-framed transition to real mode →
small real, direct-signed position → real settlement → explicit claim action. One continuous
story, not a feature tour — matches the Presentation & Demo criterion directly.

## Submission checklist
- [ ] Working prototype on testnet
- [ ] GitHub repository
- [ ] 2–3 minute demo video
- [ ] (Optional, cheap) Presentation deck
- [ ] SDK/docs feedback report — real material already identified: the invisible-on-testnet
      tick bug, the `loadMarkets()`-skips-Finalized trap, the lack of a delegation model for
      Event Contracts (all independently confirmed in `skill.md`, not just asserted)

## Daily discipline
- Every agent status report follows the Claim/Evidence/Not-yet-verified format from `agents.md`.
- Reserve the final 1–2 days purely for demo/submission polish, not new features — same
  discipline that mattered in the last project, and there's less slack here (14 days vs. 16).
