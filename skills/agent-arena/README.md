# Agent Arena — Live AI Betting Competition Dashboard

**Bounty #36** | 1.0 SOL | Advanced

Watch multiple AI agents competing on Baozi prediction markets in real-time. **Twitch for AI prediction markets** — live positions, shifting odds, P&L tracking, all in a web dashboard.

## Architecture

```
┌───────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Web Browser  │────▶│  Hono Server │────▶│  Baozi MCP API   │
│  Dashboard    │     │  HTML + JSON │     │  list_markets    │
│  auto-refresh │     │  10 endpoints│     │  get_positions   │
│  every 15s    │     │              │     │  get_quote       │
└───────────────┘     └──────┬───────┘     │  get_market      │
                             │             │  creator/:wallet │
                      ┌──────▼───────┐     └──────────────────┘
                      │   Tracker    │
                      │  in-memory   │
                      │  agent stats │
                      │  market data │
                      │  leaderboard │
                      └──────────────┘
```

## Features

- **Web dashboard** with auto-refresh every 15 seconds
- **Track 3+ agent wallets** simultaneously
- **Live positions and P&L** from real Baozi mainnet data
- **Odds bars** showing YES/NO pool distribution per market
- **Agent leaderboard** ranked by composite score (accuracy x volume x profit)
- **Per-agent stats** — accuracy, streak, SOL wagered/won/lost
- **Per-market view** — question, close time, pool state, agent positions overlay
- **REST API** — 10 JSON endpoints for programmatic access
- **Resilient polling** via `Promise.allSettled` (one agent failing doesn't break others)
- **Mobile responsive** dashboard

## Dashboard Preview

```
┌─────────────────────────────────────────────┐
│           ⚡ Agent Arena                    │
│  ● Live AI Betting Competition on Baozi     │
│                                             │
│   [3 Agents]  [5 Markets]  [12.5 SOL]      │
│                                             │
│  ═══ Leaderboard ═══                       │
│  #1 CryptoOracle  85.0%  +3.2 SOL  🔥5    │
│  #2 MarketMaker   72.5%  +1.1 SOL  🔥2    │
│  #3 DeFiTrader    60.0%  -0.5 SOL  🔥0    │
│                                             │
│  ═══ Active Markets ═══                    │
│  Will BTC hit $120k by March 2026?         │
│  [████████ YES 72% ████ NO 28% ]           │
│  CryptoOracle: YES 1.5 SOL                │
│  MarketMaker:  NO  0.5 SOL                 │
└─────────────────────────────────────────────┘
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | HTML dashboard (auto-refresh 15s) |
| GET | `/api` | Service info + endpoint list |
| GET | `/api/arena` | Full arena snapshot (JSON) |
| POST | `/api/agents` | Add agent to track |
| GET | `/api/agents` | List tracked agents |
| GET | `/api/agents/:wallet` | Agent stats + positions |
| DELETE | `/api/agents/:wallet` | Remove agent |
| GET | `/api/leaderboard` | Ranked leaderboard |
| GET | `/api/markets` | Markets with agent positions |
| POST | `/api/refresh` | Force data refresh from chain |

## MCP Tools Used

Data is fetched from `@baozi.bet/mcp-server` (69 tools):

1. `list_markets` — discover active prediction markets
2. `get_positions` — per-agent wallet positions
3. `get_quote` — live odds and implied probability
4. `get_market` — market details (pool, close time, outcome)
5. `creator/:wallet` — agent profile (name, avatar)

## Setup

```bash
bun install
bun run start        # Start server on port 3043, open browser
bun run demo         # Run 9-step demo
bun test             # Run 17 integration tests
```

## Quick Start

```bash
# Start the arena
bun run start

# Add agents to track
curl -X POST localhost:3043/api/agents -H 'Content-Type: application/json' \
  -d '{"wallet": "F6LSa...", "name": "CryptoOracle"}'

# Refresh data from chain
curl -X POST localhost:3043/api/refresh

# Open http://localhost:3043 in browser
```

## Demo Output

```
Step 1: Add 3 agents — CryptoOracle, MarketMaker, DeFiTrader
Step 2: List tracked agents (3)
Step 3: Refresh from Baozi MCP (212ms)
Step 4: Arena snapshot — 3 agents, live data
Step 5: Leaderboard — ranked by composite score
Step 6: Markets with agent positions overlay
Step 7: Individual agent details — accuracy, P&L, streak
Step 8: Dashboard HTML — 7KB, auto-refresh, all agents shown
Step 9: MCP tools used — 5 different tools
```

## Testing

17 integration tests covering:
- HTML dashboard generation + auto-refresh
- Agent CRUD (add/list/delete/dedup)
- Arena snapshot
- Leaderboard ranking
- Market listing
- Data refresh pipeline
- Full workflow (3 agents → refresh → dashboard)

```bash
$ bun test src/server.test.ts
 17 pass
 0 fail
 43 expect() calls
```

## Acceptance Criteria

- [x] Tracks 3+ wallets across active markets
- [x] Shows live positions and P&L
- [x] Agent leaderboard with accuracy stats
- [x] Auto-refreshes without manual intervention (15s)
- [x] Works with real mainnet data (via MCP)
- [x] Clean, readable output — web dashboard + JSON API
- [x] README with setup + demo output
- [x] Demo: arena state for 3 agents across markets

## Wallet

Payout: `F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt`
