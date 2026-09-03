# Book Pulse — DreamDEX Event Contracts Surface

> **Hackathon Submission:** Somnia × DreamDEX Event Contracts Hackathon (DoraHacks)  
> **Target Network:** Somnia Shannon Testnet (`50312`) / Somnia Mainnet (`5031`)  
> **Core Stack:** `@somnia-chain/markets-sdk@0.29.0`, `viem`, `react`, `typescript`, `vite`

---

## 1. Overview & Differentiation

**Book Pulse** is an on-chain trading surface for DreamDEX Event Contracts (BTC/ETH/SOL Up/Down binary options).

Unlike existing apps that run generic points or off-chain rooms, Book Pulse is grounded directly in DreamDEX's **real Central Limit Order Book (CLOB)**:
* **Live Crowd Lean Signal:** Derived directly from resting YES/NO order book depth and real-time probability pricing.
* **Risk-Free Practice Mode:** Allows new users to trade against the *real* live order book and settle against *real* on-chain oracle outcomes without capital risk.
* **Honest Probabilistic Scorecard:** Evaluates forecast calibration (binned probability accuracy and Brier score: $(1/N)\sum(p_i - o_i)^2$) rather than vanity win streaks.
* **Direct Wallet Safety:** Fully honors DreamDEX Event Contracts' direct-wallet signing architecture (no unverified session keys or third-party custody).
* **Resolution Transparency:** Direct deep-links to Somnia OracleHub resolution graphs for every settled market (`https://prd.oracle.somnia.host/questions/{oracleQuestionId}?view=graph`).

---

## 2. Architecture

```
                               ┌────────────────────────────────┐
                               │   Somnia Blockchain (50312)    │
                               │   BinaryMarketsModule / CLOB   │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │   Agent A: Live Data Layer     │
                               │   (On-Chain Truth Gated)       │
                               └───────┬────────────────┬───────┘
                                       │                │
                      ┌────────────────┘                └───────────────┐
                      ▼                                                 ▼
        ┌───────────────────────────┐                     ┌───────────────────────────┐
        │  Agent B: Practice Engine │                     │  Agent B: Real Engine     │
        │  - Simulated bankroll     │                     │  - Direct wallet signing  │
        │  - Enforced $100 cap      │                     │  - Pre-flight bal checks  │
        │  - Real settlement scoring│                     │  - 18dp tick-snapping     │
        │  - Strictly isolated      │                     │  - Loss-skipping redeem   │
        └─────────────┬─────────────┘                     └─────────────┬─────────────┘
                      │                                                 │
                      └────────────────┬────────────────────────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │   Agent C: Frontend & Score  │
                        │   - Live Lean Gauge          │
                        │   - Countdown timers         │
                        │   - Brier Scorecard          │
                        │   - OracleHub Proof Deep-link│
                        └──────────────────────────────┘
```

### Agent A — Live Data Layer (`src/data/marketData.ts`)
* **Single source of truth:** Discovers markets via indexer and gates every record on **on-chain status** via `getMarketOnchain` (`status === 1` Trading).
* **Order Book Depth & Up-Lean:** Queries pool books using `getBinaryOrderBook(poolAddress)` and calculates normalized probability prices.
* **Expiry Shielding:** Filters out markets nearing close (<45s) to eliminate frontrunning and lock reverts.

### Agent B — Dual Trading Engines (`src/engine/`)
* **Practice Engine (`src/engine/practiceEngine.ts`):** Enforces strict demo caps ($100 max per call), maintains simulated bankroll, and scores against actual on-chain oracle settlement. Orders can never reach real write functions under any code path.
* **Real Engine (`src/engine/realEngine.ts`):** Direct wallet signing via Viem. Features pre-flight collateral checks to prevent gas burns, IOC order types, and 15s dead-man's switch order expiries.
* **Precision Engine (`src/engine/precision.ts`):** Snaps human inputs to on-chain tick and lot grids with BigInt precision, tested against simulated 18-decimal math (mainnet USDso).
* **Settlement Engine (`src/engine/settlementEngine.ts`):** Evaluates outcomes (`won`, `lost`, `voided` paying 0.5 each). Strictly blocks on-chain redemptions on losses to save user gas. Triggers permissionless backstops (`pokeOracle`, `voidExpired`) if oracles lag.

### Agent C — UI Surface & Scorecard (`src/ui/`)
* Live responsive UI featuring dynamic crowd-lean gauge bars, countdown timers, book snapshots, and segmented history.
* **Calibration Scorecard (`src/scoring/scorecard.ts`):** Binned probability evaluation across 5 confidence tiers (50-60%, 60-70%, 70-80%, 80-90%, 90-100%) and Brier score calculation.
* **Ethical Onboarding:** Explicit modal upon switching from Practice to Real mode reminding users that paper trading does not simulate capital risk psychology.

---

## 3. Verified Correctness & Safety Pass (§7)

The full test suite validates all protocol invariants:
1. **Adversarial Cap Test:** Practice engine rejects any stake exceeding demo cap ($100) or bankroll.
2. **Execution Path Isolation:** Practice calls cannot invoke `trader.placeOrder` or trigger on-chain redemptions.
3. **18-Decimal Float Precision Test:** Verifies that tick/lot snapping prevents precision degradation on 18-decimal markets (e.g. mainnet USDso) unlike 6-decimal testnet.
4. **Redemption Safety:** Won and voided positions redeem; losing calls (payout = 0) are strictly rejected to prevent wasting transaction gas.
5. **Live Testnet Discovery:** Verified on live Somnia Shannon testnet with 14 active on-chain gated binary windows across BTC and ETH.

---

## 4. Getting Started

### Prerequisites
* Node.js v20+
* npm or pnpm

### Installation
```bash
git clone https://github.com/your-username/ferrule.git
cd ferrule
npm install --legacy-peer-deps
```

### Running Tests
```bash
# Run full vitest suite (safety pass + live data layer)
npm test
```

### Type Checking & Building
```bash
# TypeScript verification
npm run typecheck

# Production build
npm run build
```

### Running Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the Book Pulse trading surface on Somnia testnet.
