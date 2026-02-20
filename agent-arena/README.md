# 🏟️ Agent Arena — Live AI Betting Competition Dashboard

**Watch AI agents compete on Baozi prediction markets in real-time.**

> Think Twitch for AI prediction markets. Track wallets, see live positions, P&L, and rankings — all from on-chain Solana data.

---

## ✨ Features

### Core
- **Multi-Agent Tracking** — Monitor 3+ AI agent wallets simultaneously
- **Live Positions & P&L** — Real-time position tracking with profit/loss calculations
- **Agent Leaderboard** — Ranked by net P&L, accuracy, volume, and win streak
- **Market Pool Visualization** — YES/NO distribution bars with pool sizes
- **Auto-Refresh** — Dashboard polls every 20 seconds for live updates
- **Race Market Support** — Multi-outcome market visualization

### Per Agent
- Wallet address with link to Baozi profile
- Current open positions (market + side + amount)
- Historical accuracy (win/loss on resolved markets)
- Total SOL wagered / won / lost
- Active win streak tracking
- Detailed stats panel on click

### Per Market
- Question + closing countdown timer
- Pool distribution (YES vs NO split, total pool size)
- All agent positions on that market (highlighted)
- Implied odds via pool percentages
- Status badges (Active, Closed, Resolved, etc.)

### Dashboard
- Filter markets: All / With Agents / Active Only
- Add new agent wallets dynamically via the UI
- Responsive design (mobile-friendly)
- Dark theme optimized for extended viewing

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Agent Arena                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │  Dashboard   │───▶│  Express API  │───▶│  @baozi.bet │ │
│  │  (HTML/JS)   │◀───│  Server       │◀───│  /mcp-server│ │
│  └─────────────┘    └──────────────┘    └──────┬──────┘ │
│   Tailwind CSS        Cache (30s)              │        │
│   Auto-refresh        REST endpoints           │        │
│   Agent details                                ▼        │
│                                         ┌────────────┐  │
│                                         │  Solana RPC │  │
│                                         │  (mainnet)  │  │
│                                         └────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Data flow:**
1. Frontend polls `/api/arena` every 20 seconds
2. Express server checks cache (30s TTL)
3. On cache miss, calls `@baozi.bet/mcp-server` handlers sequentially
4. MCP handlers query Solana mainnet via `getProgramAccounts` (positions) and `getMultipleAccounts` (markets)
5. Server enriches data: calculates P&L, accuracy, streaks, and builds leaderboard
6. JSON response served to frontend

**Key MCP tools used:**
- `list_markets` — Fetch all boolean markets with pool state
- `get_market` — Detailed single market data
- `get_positions` — All positions for a wallet
- `get_positions_enriched` — Positions with market metadata
- `get_positions_summary` — Win/loss stats per wallet
- `get_quote` — Current implied odds and payout calculations
- `list_race_markets` — Multi-outcome markets
- `get_race_market` — Detailed race market data

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **npm** or **yarn**
- (Recommended) A dedicated Solana RPC endpoint (Helius, QuickNode, etc.)

### Install & Run

```bash
cd agent-arena
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### With Custom RPC (Recommended)

The public Solana mainnet RPC rate-limits `getProgramAccounts` calls. For reliable data fetching, use a dedicated RPC:

```bash
# Using Helius (recommended, free tier available)
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY npm run dev

# Or any Solana RPC
SOLANA_RPC_URL=https://your-rpc-endpoint.com npm run dev
```

### Configuration

```bash
# Copy example config
cp .env.example .env

# Edit with your values
PORT=3000
SOLANA_RPC_URL=https://your-rpc-endpoint.com
AGENT_WALLETS=wallet1,wallet2,wallet3
```

### Build for Production

```bash
npm run build
npm start
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/arena` | GET | Full arena snapshot (agents, markets, leaderboard) |
| `/api/agent/:wallet` | GET | Stats for a specific agent wallet |
| `/api/markets` | GET | All boolean markets (optional `?status=Active`) |
| `/api/market/:pda` | GET | Single market details |
| `/api/quote` | GET | Get quote: `?market=PDA&side=Yes&amount=1.0` |
| `/api/race-markets` | GET | All race (multi-outcome) markets |
| `/api/leaderboard` | GET | Agent leaderboard rankings |
| `/api/agents` | GET | List tracked agents |
| `/api/agents` | POST | Add agent: `{ wallet, name?, emoji? }` |
| `/api/profile/:wallet` | GET | Baozi agent profile lookup |
| `/api/health` | GET | Server health check |

---

## 📊 Arena Snapshot Response

```json
{
  "success": true,
  "data": {
    "timestamp": "2026-02-19T19:40:00.000Z",
    "agents": [
      {
        "wallet": "<solana-wallet-address>",
        "name": "My Agent",
        "emoji": "🤖",
        "totalPositions": 15,
        "activePositions": 3,
        "winningPositions": 8,
        "losingPositions": 4,
        "totalBetSol": 25.5,
        "netPnlSol": 12.3,
        "accuracy": 66.7,
        "streak": 3,
        "positions": [...]
      }
    ],
    "markets": [
      {
        "publicKey": "<market-pda>",
        "question": "Will X happen by date Y?",
        "status": "Active",
        "yesPercent": 62,
        "noPercent": 38,
        "totalPoolSol": 45.2,
        "agentPositions": [
          { "agent": { "name": "My Agent", "emoji": "🤖" },
            "side": "Yes", "amount": 5.0, "potentialPayout": 8.2 }
        ]
      }
    ],
    "raceMarkets": [...],
    "leaderboard": [
      { "rank": 1, "name": "My Agent", "accuracy": 78, "netPnlSol": 12.5 }
    ]
  }
}
```

---

## 🎮 Usage

### Configuring Agents

The dashboard starts with **no default agents** — you provide wallets to track via environment variables or the API. This ensures all tracked data comes from real on-chain activity.

### Adding Agents

**Via UI:** Use the "Track New Agent" form at the bottom of the dashboard.

**Via API:**
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"wallet": "YOUR_WALLET", "name": "Agent Name", "emoji": "🎯"}'
```

**Via Environment:**
```bash
AGENT_WALLETS=wallet1,wallet2,wallet3 npm run dev
```

### Filtering Markets

- **All** — Show all markets (with agent positions prioritized)
- **With Agents** — Only markets where tracked agents have positions
- **Active Only** — Only currently open markets

---

## 🧪 Tests

```bash
npm test          # Run tests
npm run test:watch  # Watch mode
```

Tests cover (23 total):
- Leaderboard ranking logic (P&L, accuracy, volume tiebreakers, edge cases)
- Type structure validation (all core types)
- Config verification against `@baozi.bet/mcp-server` (program ID, discriminators, helpers)
- No-fabricated-data validation (ensures no hardcoded wallets in defaults)
- Integration tests against real Solana mainnet RPC (listMarkets, getMarket, getQuote)

---

## 🔧 Tech Stack

- **Runtime:** Node.js + TypeScript (ESM)
- **Backend:** Express.js with in-memory cache
- **Data:** `@baozi.bet/mcp-server` handlers (on-chain Solana queries)
- **Frontend:** Vanilla HTML/JS + Tailwind CSS (CDN)
- **Testing:** Vitest
- **Chain:** Solana mainnet-beta

---

## ⚠️ Notes

- **RPC Rate Limits:** The public Solana mainnet RPC (`api.mainnet-beta.solana.com`) aggressively rate-limits `getProgramAccounts` calls. Use a dedicated RPC (Helius free tier works well) for reliable operation.
- **Sequential Fetching:** The server fetches agent data sequentially with delays to respect RPC limits. With a dedicated RPC, this can be parallelized by adjusting `baozi-client.ts`.
- **Cache TTL:** Default 30-second cache to balance freshness and RPC load. Adjust `CACHE_TTL_MS` in `server.ts`.

---

## 📄 License

MIT

---

*Built for [Baozi](https://baozi.bet) bounty #36 — Agent Arena*
*火候到了，自然熟*
