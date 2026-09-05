# Ferrule — Hackathon Reframing & Submission Blueprint

> **"Prediction markets shouldn't be binary casinos. They should be continuous crowd-lean estimators with systematic calibration."**

---

## 1. The Core Insight & The Paradigm Shift

### The Problem with Today's Prediction Markets
Current prediction markets (Polymarket, Azuro, etc.) are built like **speculative binary casinos**:
1. **Binary Gambling Mentality**: Users treat them like roulette wheels (all-or-nothing outcomes).
2. **The Calibration Blindspot**: Traders brag about vanity win rates (e.g. "I won 7 out of 10 trades!"), but if you were 99% confident on each trade, a 70% win rate means your model is severely uncalibrated and doomed to wipe out on tail risk.
3. **High Capital Friction**: New traders and bot developers bleed real money and gas just learning the mechanics.
4. **Off-Chain Relayers**: Most CLOBs run on centralized off-chain matching engines rather than native on-chain state.

### The Ferrule Solution on Somnia DreamDEX
**Ferrule** reframes prediction markets from a speculative casino into an **On-Chain Crowd-Lean Discovery, Calibration Engine, and Programmable Strategy Tooling Surface**.

Instead of betting blind, Ferrule provides:
- **Continuous Crowd-Lean Discovery**: Extracts continuous directional sentiment directly from the **Somnia DreamDEX CLOB order book** (visualized as a physical tension clamp).
- **Risk-Free Practice Mode**: A simulated paper-trading environment connected to **100% live, real-time Somnia Shannon Testnet order books and Pyth oracles**, enabling traders to build an empirical track record before committing capital.
- **Brier Calibration Scoring**: Objective mathematical grading ($BS = \frac{1}{N}\sum(f_t - o_t)^2$) that tracks whether your subjective confidence matches empirical frequency across probability buckets.
- **The Programmable Quant Shell (Ferrule Terminal)**: A browser-native Linux-grade shell with a persistent virtual filesystem (`mkdir`, `cd`, `touch`, `rm`, `cat`, `.sh` scripts in `localStorage`), background event daemon (`watch`), and direct Viem non-custodial signing.

---

## 2. Why Somnia DreamDEX is the Native Home for Ferrule

| Dimension | Conventional L1 / L2 | Somnia Shannon Testnet |
| :--- | :--- | :--- |
| **Throughput** | 15 – 2,000 TPS | **400,000+ TPS** |
| **Finality** | 2s – 12s | **Sub-second deterministic finality** |
| **Order Book Paradigm** | Off-chain matcher + rollup settlement | **Fully on-chain reactive CLOB (DreamDEX)** |
| **Cadence** | Hours or days per round | **Continuous 300s (5-minute) rolling micro-windows** |
| **Execution Cost** | High gas during volatility | **Micro-cent gas fees for continuous updates** |

Somnia's high throughput is what makes continuous 5-minute binary micro-markets viable without gas exhaustion or front-running delays.

---

## 3. The 4 Product Pillars

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FERRULE ON SOMNIA DREAMDEX                       │
├────────────────────┬────────────────────┬───────────────────────────────┤
│ 1. CROWD-LEAN      │ 2. PRACTICE        │ 3. BRIER                      │ 4. QUANT SHELL
│    DISCOVERY       │    SANDBOX         │    CALIBRATION                │    & PERSISTED FS
│                    │                    │                               │
│ • Live CLOB Depth  │ • 100% Live Feeds  │ • Objective Math              │ • Persistent Filesystem
│ • Tension Clamp UI │ • Zero Risk Capital│ • Confidence Buckets          │ • mkdir / touch / rm
│ • Continuous Prob  │ • Instant Fills    │ • Over/Under Confidence Score │ • watch BTC-15m daemons
└────────────────────┴────────────────────┴───────────────────────────────┴─────────────────┘
```

### Pillar 1: Crowd-Lean Price Discovery (Tension Clamp)
- Traditional binaries show opaque odds or static percentages.
- Ferrule computes the **volume-weighted order book lean** between Up and Down asks on Somnia DreamDEX.
- Displayed as a physical tension clamp (e.g. `UP LEAN 64% // 36% DOWN`), giving traders an instant visual heuristic of order book imbalance.

### Pillar 2: Risk-Free Practice Sandboxing
- Connects directly to live Somnia testnet contracts (`50312`).
- Traders execute simulated calls against real on-chain order books, learning how order flow moves before committing real capital.
- Seamless transition modal with risk psychology warnings when switching to Real Mode.

### Pillar 3: Brier Calibration Scoring
- Instead of vanity win streaks, Ferrule grades every trader on the **Brier Score**:
  $$BS = \frac{1}{N} \sum_{t=1}^{N} (f_t - o_t)^2$$
  *(Where $0.00$ is perfect probabilistic forecasting, and $0.25$ is random noise).*
- Groups calls into confidence deciles ($50-60\%$, $60-70\%$, $70-80\%$, $80-90\%$, $90-100\%$) and calculates empirical win rate vs predicted confidence.

### Pillar 4: The Programmable Quant Shell & Virtual Filesystem
- **Full Shell Capabilities**: `pwd`, `cd`, `ls`, `mkdir`, `touch`, `rm`, `cat`, `echo > file`, `run`, `resetfs`.
- **Persistent in `localStorage`**: Directories created via `mkdir clob` and custom scripts survive page reloads and browser restarts.
- **Background Event Daemon**: Run `watch BTC-15m if lean>=0.65 AND spread<0.005 then suggest stake 250 up`. The daemon evaluates every live price tick and alerts the operator.
- **Strategy Library**: High-density visual panel with SVG sparklines, empirical trigger rates, JSON export, and hit metrics.

---

## 4. Judging Criteria Alignment (72-Hour Evaluation Matrix)

| Judging Criterion | Weight | How Ferrule Delivers |
| :--- | :--- | :--- |
| **Technical Implementation** | 25% | **Zero-mock architecture**. Live Viem client querying Somnia contracts (`0x00...1426e`), event log scrapers, dynamic Brier calculator, resilient local filesystem, circular terminal buffer. |
| **Innovation & Originality** | 20% | Reframes prediction markets from gambling into **systematic calibration & crowd-lean discovery**. Dual-surface experience: 1-click Basic view vs high-density Pro Quant Terminal. |
| **UX & Design** | 20% | **Stitch Design System v3**: Monospaced Minimalism / Flat Structuralism (`#0a0a0f` base, `#12121a` raised, 1px `#23232f` borders, no gradients, no shadows). **Fully mobile responsive (<640px bottom navigation bar)**. |
| **Business & Ecosystem Impact** | 20% | Onboards both non-technical retail users (via Basic View) and algorithmic quantitative traders (via Pro Terminal) directly onto Somnia DreamDEX. Reduces user churn through calibration training. |
| **Presentation & Demo** | 15% | High-conviction thesis, transparent documentation, live dev server, 23/23 passing unit and integration tests. |

---

## 5. 2-Minute Video Pitch Script

**[0:00 - 0:25] The Hook & The Problem**
> *"Every prediction market today is treated like an online casino. Traders gamble on binary outcomes, obsess over vanity win rates, and burn their capital before they ever understand probabilistic calibration. Worst of all, they're trapped in clunky web interfaces on slow blockchains.*
> *We built Ferrule to fix this on Somnia."*

**[0:25 - 0:55] Live Somnia DreamDEX & The Basic Experience**
> *"Ferrule is an on-chain crowd-lean discovery protocol and systematic calibration terminal powered natively by Somnia's 400,000 TPS and DreamDEX Central Limit Order Book.*
> *In Basic Mode, you see live 5-minute rolling market windows. Our tension clamp continuously extracts crowd probability from the live order book—here you see 64% Up versus 36% Down.*
> *You can place 1-click calls in Practice Mode against real on-chain market data with zero capital risk."*

**[0:55 - 1:25] Brier Calibration & The Pro Terminal**
> *"Every trade you place feeds into your Calibration Scorecard. Instead of showing you a misleading win streak, we calculate your Brier score across confidence buckets, proving whether your 70% calls actually win 70% of the time.*
> *For quants, toggle to Pro Terminal. It's a real browser shell with a persistent filesystem in localStorage. You can `mkdir clob`, write automated `.sh` strategy scripts, and launch background watchers like `watch BTC-15m if lean>=0.65 then suggest stake 250 up`."*

**[1:25 - 2:00] Mobile Ready & Conclusion**
> *"Everything is completely mobile responsive with a dedicated thumb cockpit for live trading on the go. Zero mocks, 100% on-chain Somnia Shannon testnet data, and an open platform for systematic prediction on Somnia.*
> *Ferrule: The disciplined trading terminal for the next billion predictions."*
