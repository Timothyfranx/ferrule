# agents.md — Ferrule + Practice Mode

Rules for any AI coding agent (A, B, or C) working in this repo. Read before writing code.

## What this is
A trading surface for DreamDEX Event Contracts: a live crowd-lean signal derived from the
real order book, a risk-free practice mode scored against that same real signal, and an
explicit, honest path to real trading. Full spec: `SPEC.md`. SDK ground truth: `skill.md`.
Timeline: `plan.md`.

## Hard rules

1. **Never invent an SDK function, field, or behavior.** Every `@somnia-chain/markets-sdk`
   call must appear in `skill.md`'s verified reference. If you need something not listed
   there, STOP and say so — do not guess a plausible-sounding method name. `skill.md` was
   built by inspecting the actual published package (`npm pack` + reading the real `.d.ts`
   files), not by reading documentation prose — treat it as the higher-trust source when the
   two conflict.
2. **Verify, don't summarize.** Don't report a task "done" unless you ran it against real
   testnet data and saw the result. "Implemented but not yet run against testnet" is an
   acceptable status. "Should work" is not a status.
3. **Agent A is the single source of truth for market/order-book data.** Agents B and C read
   from Agent A's layer — never independently query the SDK for the same data. This prevents
   two components silently disagreeing about market state.
4. **Practice and real modes never share execution paths.** The `Call` record's `mode` field
   is set explicitly at creation, never inferred. Practice orders must never be able to reach
   `createOrder` or any other real-money write call, under any code path. This gets its own
   adversarial test (see `plan.md` §7).
5. **No delegated trading.** Confirmed: Event Contracts have no operator-grant mechanism
   (verified against the actual SDK package — `binary/` has no session/grant file, `spot/`
   does). Every real trade signs directly with the connected wallet. Do not build a custom
   hot-wallet or session-key layer to work around this.
6. **Tick-snapping and precision are not optional, and testnet passing is not evidence.**
   The SDK's own docstring for `amountToPrecision` confirms the historical failure mode:
   silently flooring sub-token amounts to 0 on markets where pool parameters can't be read.
   6-decimal testnet collateral will not surface an 18-decimal rounding bug. Write a unit
   test against simulated 18-decimal math before considering this done.
7. **Never hardcode a market or pool address.** Read from the registry every time — pools
   recycle across windows. The contract addresses in `skill.md` are the fixed, top-level
   protocol contracts (CREATE3, identical across networks) — those are fine to reference
   directly. Market/pool addresses discovered at runtime are not.

## Stack
- SDK: `@somnia-chain/markets-sdk` (TypeScript) + `viem`, pinned `^0.25.0` minimum
  (0.29.0 confirmed latest and installable — prefer this unless there's a specific reason not to)
- Network: Somnia testnet (50312) for all development and the submission demo
- Three parallel workstreams: Agent A (data layer), Agent B (trading engines), Agent C
  (frontend + scorecard) — see `plan.md` for sequencing and shared-contract handoff points

## Definition of done for any task
- Code compiles / typechecks
- Ran against real testnet SDK calls, with real output captured, not simulated
- If it touches money-adjacent logic (real engine, redemption, precision), the specific
  test named in `plan.md` §7 for that area has been run and passed
- Any new SDK usage is checked against `skill.md` or flagged as unverified

## When reporting status
- **Claim:** what you're asserting is done
- **Evidence:** what you ran, what output you saw — paste it, don't paraphrase it
- **Not yet verified:** anything inferred rather than directly observed
