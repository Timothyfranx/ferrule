# Ferrule — On-Chain Crowd-Lean Trading Surface & Strategy Terminal

> **Hackathon Submission:** Somnia × DreamDEX Event Contracts Hackathon (DoraHacks)  
> **Network:** Somnia Shannon Testnet (`50312`) / Somnia Mainnet Ready (`5031`)  
> **Core SDK:** `@somnia-chain/markets-sdk@0.29.0` (100% Live, Zero Mock)  
> **Interface:** Flat Structuralism & Monospaced Terminal Emulator (Stitch Design System)

---

## 1. Overview & Core Proposition

**Ferrule** is an on-chain crowd-lean trading surface and developer strategy terminal built directly on Somnia DreamDEX binary CLOB (Central Limit Order Book) markets.

Most prediction surfaces present static vanity odds or off-chain consensus. Ferrule treats Event Contracts as **continuous probabilistic order books**:
1. **Live Crowd Lean Discovery:** Real-time extraction of resting YES/NO bids and asks across BTC, ETH, and SOL prediction windows, computing normalized crowd probabilities directly from on-chain liquidity depth.
2. **Dual-Mode Trading Surface:**
   - **Practice Mode:** 100% paper trading against the *live, real order books* with a $1,000 virtual balance and strict $100 demo risk cap. Zero gas, zero loss of funds, but evaluated against real oracle resolutions.
   - **Real Mode:** Direct non-custodial wallet execution via Viem and RainbowKit on Somnia Shannon (`50312`), utilizing Immediate-or-Cancel (IOC) limit/market orders and a 15-second dead-man's switch expiry.
3. **Interactive Live Terminal Shell:** A functional terminal emulator supporting standard bash utilities (`ls`, `cat`, `echo`, `env`, `date`, `whoami`), custom market queries (`markets`, `market status <symbol>`), virtual executable strategy scripts (`run /strategies/fade_crowd.sh`), and real-time event watchers (`watch BTC-300s if up_lean > 70 then suggest fade_up`).
4. **Honest Probabilistic Scorecards:** Evaluates trading performance not with vanity streaks, but with rigorous mathematical calibration: 5 confidence buckets (50-60%, 60-70%, etc.) and exact Brier Scores:
   $$\text{Brier} = \frac{1}{N} \sum_{i=1}^N (p_i - o_i)^2$$
5. **On-Chain Settlement & Loss Suppression:** Strictly guards users from wasting gas by suppressing zero-value redemptions on lost calls, while facilitating claims on wins and 50% void refunds.

---

## 2. Architecture & Modular Directory Structure

Ferrule follows a clean, modular structure adapted from modern high-throughput dapp standards:

```
ferrule/
├── src/
│   ├── config/               # Protocol constants, contracts, and Wagmi setup
│   │   ├── constants.ts      # Somnia Shannon addresses, RPC endpoints, limits
│   │   └── wagmi.ts          # Wagmi & RainbowKit chain configuration
│   ├── types/                # Strict domain types & interfaces
│   │   ├── market.ts         # OpenWindow, BinaryOrderBook, BookLevel
│   │   ├── trading.ts        # Call, TradeParams, TradingMode
│   │   ├── terminal.ts       # TerminalLine, WatcherJob, VirtualFile
│   │   ├── scorecard.ts      # CalibrationScorecard, CalibrationBucket
│   │   └── index.ts          # Central barrel export
│   ├── services/             # Pure business & protocol service layer
│   │   ├── marketDataService.ts     # Parallel Somnia SDK live discovery & order book query
│   │   ├── precisionService.ts      # BigInt lot/tick quantization (18dp/6dp)
│   │   ├── practiceTradingService.ts# Virtual bankroll & order book ask execution
│   │   ├── realTradingService.ts    # Viem direct wallet signing & IOC orders
│   │   ├── settlementService.ts     # On-chain resolution, void 50% split & loss suppression
│   │   ├── scorecardService.ts      # Brier score calculation & calibration binning
│   │   ├── watcherService.ts        # Background strategy evaluation daemon
│   │   └── terminalService.ts       # Shell parser, bash built-ins, virtual filesystem
│   ├── components/           # Flat structuralism UI components
│   │   ├── common/           # ModeBanner, Header (VS Code tabs), Footer
│   │   ├── terminal/         # TerminalEmulator, TerminalBuffer, TerminalPrompt
│   │   ├── market/           # MarketGrid, WindowCard, CallModal
│   │   ├── scorecard/        # CalibrationDashboard, AccuracyChart
│   │   └── history/          # PositionsTable with OracleHub deep links
│   ├── assets/styles/        # Tailwind & custom terminal styling
│   ├── App.tsx               # Root container & reactive state orchestration
│   └── main.tsx              # React 19 root & provider wiring
├── tests/                    # Vitest unit & integration test suites
│   ├── safetyPass.test.ts    # Protocol safety invariant verification (§7)
│   ├── precision.test.ts     # 18dp vs 6dp tick snapping & lot rounding
│   ├── terminalService.test.ts# Bash command parsing, file execution & help
│   ├── watcherService.test.ts# Condition parser & 15s cooldown enforcement
│   └── marketDataService.test.ts # Live Somnia Shannon contract discovery
└── LOGICAL_ERRORS.md         # Comprehensive audit of 15 prediction & CLOB pitfalls
```

---

## 3. Stitch Design System: Flat Structuralism

The interface implements a strict monospaced, VS Code/iTerm-inspired trading dashboard:
- **Palette:** 
  - Canvas: `#0a0a0f`
  - Raised Panels: `#12121a`
  - Structural Borders: `1px solid #23232f`
  - Accents: `#00e676` (Bullish/Practice Green), `#ff5252` (Bearish/Real Red), `#38bdf8` (Terminal Cyan), `#e2e8f0` (Monochrome Text)
- **Typography:** `JetBrains Mono` and `Inter` with zero drop shadows, zero background blurs, and strict high-contrast data visualization.
- **Sticky Mode Banner:** An unmistakable full-width persistent warning indicator signaling whether the trader is in simulated Practice mode or Live Real capital mode.

---

## 4. Real Interactive Terminal Capabilities

The embedded terminal is not a dummy logger; it is a full command-line environment:

### Built-in System Commands
- `help` — Lists all available built-ins, market operations, and watcher commands.
- `ls [dir]` — Lists directory contents (`/strategies`, `/config`).
- `cat <path>` — Displays virtual file contents (e.g. `cat /strategies/fade_crowd.sh`).
- `echo <text>` — Echoes string literals.
- `date`, `whoami`, `env` — Displays current UTC timestamp, connected address, and environment variables.
- `clear` — Clears terminal history buffer.

### Market & Order Execution
- `markets` — Fetches all live Somnia Shannon binary trading windows in an ASCII table.
- `market status <symbol>` — Displays order book bid/ask depth and crowd lean for a specific contract (e.g. `market status BTC-300s`).
- `call <symbol> <up|down> <amount>` — Triggers an order call modal pre-populated with live book pricing.
- `positions` — Lists all open and historical positions with on-chain status.
- `scorecard` — Displays calibration stats, Brier score, and win rate.
- `mode [practice|real]` — Switches execution mode with explicit safety checks.

### Virtual Strategy Scripts
Execute automated strategy definitions stored in the virtual filesystem:
```bash
run /strategies/fade_crowd.sh
```
Executes crowd-contrarian evaluation logic and automatically spawns a live watcher.

### Live Background Strategy Watchers
Register background event watchers that monitor live order books on every polling cycle:
```bash
# Watch for excessive crowd optimism on BTC 5m contracts
watch BTC-300s if up_lean > 70 then suggest fade_up

# View active watcher daemon jobs
watchers

# Terminate a watcher job
kill w1
```
When triggered, Ferrule outputs a highlighted **Suggestion Card** directly into the terminal stream with a **1-Click Review & Execute** button. Autonomous spending is strictly prevented: human authorization is always required.

---

## 5. Scope & Reality Check (What Ships vs What's Cut)

In alignment with the hackathon submission requirements, Ferrule prioritizes **100% verified, live correctness over bloated mocks**:

### ✅ What Ships & Works End-to-End
- **100% Live Somnia Integration:** Real contract calls against `@somnia-chain/markets-sdk` on Shannon testnet (`50312`). Zero mocks.
- **Complete Trading Cycle:** Live discovery -> Order book depth -> Crowd-lean gauge -> Call modal -> Practice/Real trade -> Resolution -> Settlement -> Brier Scorecard.
- **Precision Engine:** Snaps human input to on-chain `tickSize` and `lotSize` with BigInt math across both 6-decimal testnet and 18-decimal mainnet specs.
- **Gas-Saving Settlement Guard:** Blocks loss redemptions from on-chain transactions; enables one-click win redemptions and 50% void refunds.
- **Interactive Terminal & Strategy Engine:** Full bash command set, virtual scripts, and live watcher triggers.
- **Edge-Case Audit (`LOGICAL_ERRORS.md`):** Complete analysis of 15 CLOB prediction pitfalls.

### ✂️ Explicitly Cut / Future Roadmap
- **Autonomous Unprompted Spending:** Auto-executing background trade bots without human signatures were intentionally eliminated to prevent unauthorized drain. Watchers emit human-in-the-loop suggestion cards instead.
- **Custom Solidity Strategy Deployer:** Strategy scripts run in the client-side virtual environment rather than custom user-deployed on-chain proxy contracts.
- **Multi-Hop Oracle Hedging:** External perp cross-hedging on Arbitrum/Hyperliquid is omitted to maintain pure Somnia-native execution.

---

## 6. Verification & Test Suite

The test suite runs Vitest with 100% passing results across 5 comprehensive test suites:

```bash
# Run the entire test suite
npm test
```

### Verified Test Specs:
1. `tests/safetyPass.test.ts` — Verifies adversarial cap rejection ($100 max), execution path isolation, 18-decimal tick snapping, and loss suppression on redemption.
2. `tests/precision.test.ts` — Tests `snapPriceToTick` and `snapAmountToLot` with zero rounding creep.
3. `tests/terminalService.test.ts` — Tests shell parsing, file execution (`run /strategies/fade_crowd.sh`), and built-in commands.
4. `tests/watcherService.test.ts` — Tests live condition matching, 15s cooldown enforcement, and suggestion payload generation.
5. `tests/marketDataService.test.ts` — Integration test directly querying live Somnia Shannon contracts, discovering active BTC and ETH binary windows.

---

## 7. Getting Started

### Prerequisites
- Node.js v20 or higher
- npm or pnpm
- A Web3 wallet (e.g. MetaMask, Rabby) connected to **Somnia Shannon Testnet**:
  - **Network Name:** Somnia Shannon Testnet
  - **RPC URL:** `https://api.infra.testnet.somnia.network`
  - **Chain ID:** `50312`
  - **Currency Symbol:** `STT`
  - **Block Explorer:** `https://shannon-explorer.somnia.network`

### Setup & Installation
```bash
# Clone the repository
git clone https://github.com/your-username/ferrule.git
cd ferrule

# Install dependencies
npm install --legacy-peer-deps
```

### Development & Build
```bash
# Run local Vite development server (port 3000)
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 8. Verified On-Chain Addresses (Somnia Shannon `50312`)

| Contract / System | Address |
|---|---|
| **Binary Module** | `0xc8bFaB4A5d468165Fef27D5cf4A76e1074e62F93` |
| **Markets Core** | `0x98b8c2F844F3a9254d37257FbaE54032d16C19F6` |
| **Binary Settlement** | `0x787A9e89d1aF0356157faad28e7e17F302568ea4` |
| **Oracle Hub** | `0x83e200DccEbba4B774cf708beF7833a697669d0C` |
| **Collateral Router** | `0x2eA31f9EcaeaE6360c7d54bC45cf9396D761bCcf` |
| **Test USDC** | `0x19918456b3e8a719911eBceE2e46BEb8ecFe52A4` |

*Built for the Somnia × DreamDEX Event Contracts Hackathon.*
