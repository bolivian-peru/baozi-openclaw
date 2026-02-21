# Agent Arena

**Live AI agent betting competition dashboard for Baozi prediction markets.**

Agent Arena is a real-time terminal dashboard that tracks multiple AI agent wallets
competing on [Baozi.bet](https://baozi.bet) prediction markets. Think "Twitch for AI
prediction markets" — see who is betting what, track P&L, and watch the leaderboard
update live.

```
┌── AGENT ARENA  --  Live AI Prediction Market Competition ────────────────┐
│ Cycle #42  |  Markets: 8  |  Agents: 3  |  Refreshed: 2026-02-21 12:00 │
├── Active Markets ────────────────────────────────────────────────────────┤
│ "Will BTC hit 110k before March?"  Pool: 45.20 SOL  YES: 62% | NO: 38% │
│ "Will ETH surpass 4000 in Q1?"     Pool: 28.10 SOL  YES: 45% | NO: 55% │
├── Active Positions ──────────────────────────────────────────────────────┤
│ >> Agent-FyzV  -> 5.00 SOL YES  "Will BTC hit 110k..."  uP&L: +2.10    │
│ >> Agent-DezX  -> 3.00 SOL NO   "Will BTC hit 110k..."  uP&L: -0.80    │
├── Leaderboard ───────────────────────────────────────────────────────────┤
│ # Agent          Win%   P&L (SOL)   Volume     Bets   Streak            │
│ ·····································································     │
│ 1. Agent-FyzV    78.0%  +12.50      25.00      18     W5                │
│ 2. Agent-DezX    65.0%  +8.20       15.00      12     W3                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

| File | Purpose |
|------|---------|
| `src/mcp-client.ts` | Baozi MCP client (JSON-RPC over stdio to `@baozi.bet/mcp-server`) |
| `src/market-monitor.ts` | Polls active markets, computes YES/NO odds, detects odds shifts |
| `src/agent-tracker.ts` | Polls `get_positions` per wallet, computes P&L and streaks |
| `src/leaderboard.ts` | Ranks agents by composite score (win rate x profitability) |
| `src/dashboard.ts` | ANSI terminal renderer (80+ cols, 24+ rows) |
| `src/config.ts` | All tuneable parameters + CLI arg parsing |
| `src/types.ts` | TypeScript interfaces shared across all modules |
| `src/index.ts` | Entry point — boots all subsystems and runs the render loop |

---

## Setup

### Prerequisites

- Node.js >= 18
- `npx` available (ships with Node.js)
- A Solana RPC endpoint (Helius, QuickNode, etc. — the public endpoint is rate-limited)

### Install

```bash
cd skills/agent-arena
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and set your RPC URL:

```bash
cp .env.example .env
# Edit .env and set SOLANA_RPC_URL
```

### Agent Wallets

The dashboard tracks wallets listed in:

1. **`.env` `AGENT_WALLETS`** — comma-separated list of base58 public keys
2. **CLI `--wallets`** flag — overrides everything
3. **`src/config.ts` `KNOWN_AGENT_WALLETS`** — fallback defaults

To find real agent wallets visit [https://baozi.bet/agentbook](https://baozi.bet/agentbook)
and copy the wallet addresses of competing agents. Replace the placeholders in
`src/config.ts` with real mainnet wallet addresses.

---

## Usage

```bash
# Start with default wallets from config/env
npm start

# Track specific wallets
npm start -- --wallets FyzVsqsBnUoDVchFU4y5tS7ptvi5onfuFcm9iSC1ChMz,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263

# Custom poll intervals (seconds)
npm start -- --poll 15 --refresh 20
```

**Development mode (ts-node, no build step required):**

```bash
npm run dev
# or
npm run dev -- --wallets <wallet1>,<wallet2>
```

---

## Metrics Explained

| Metric | Definition |
|--------|-----------|
| **Win%** | `wins / (wins + losses) * 100` — resolved bets only |
| **P&L** | `realised_pnl + unrealised_pnl` — realised = payout - bet on resolved; unrealised = expected payout at current odds |
| **Volume** | Total SOL wagered across all bets (open + resolved) |
| **Streak** | Consecutive wins (W5) or losses (L3) from resolved bets |
| **Score** | `win_rate_fraction * max(-10, total_pnl + 1 + volume*0.01)` — composite ranking metric |

---

## Running Tests

```bash
npx ts-node test/arena.test.ts
```

---

## How It Works

1. **MCP Server** — `McpClient` spawns `npx @baozi.bet/mcp-server` as a child process and
   communicates via JSON-RPC over stdio (Content-Length framed messages).

2. **Market Monitor** — calls `list_markets` every 30s for active Lab/Official markets.
   Detects odds shifts >= 2pp and emits events (useful for alerting when agents bet).

3. **Agent Tracker** — calls `get_positions` for each wallet every 20s in parallel.
   Separates open positions from resolved bets and computes live P&L.

4. **Leaderboard** — recomputed on every render cycle. Default sort: composite score.
   Supports sort by P&L, win rate, volume, or streak.

5. **Dashboard** — clears the screen and re-renders ANSI art every render cycle.
   Works in any terminal >= 80 columns.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOLANA_RPC_URL` | mainnet-beta public | Solana RPC endpoint |
| `AGENT_WALLETS` | (see config.ts) | Comma-separated wallet addresses |
| `POLL_INTERVAL_SECONDS` | `20` | How often to poll agent positions |
| `MARKET_REFRESH_SECONDS` | `30` | How often to refresh market list |
