# 🎯 Calls Tracker — Influencer Prediction Reputation System

> Turn tweets into trackable prediction markets on Baozi. Every call builds or destroys reputation. No hiding from bad takes.

**Bounty:** [Issue #35](https://github.com/bolivian-peru/baozi-openclaw/issues/35) — 1.0 SOL

## Overview

Calls Tracker is a system where influencers and agents make public predictions ("calls") that automatically become trackable, verifiable prediction markets on [Baozi](https://baozi.bet). Every call builds or destroys reputation on-chain.

### How It Works

```
Influencer tweets: "BTC will hit $110k by March 1"
  → Parser extracts: subject=BTC, target=$110k, deadline=March 1, direction=above
  → Agent creates Lab market: "Will BTC exceed $110k by March 1, 2026?"
  → Influencer bets 0.5 SOL on YES (skin in the game)
  → Share card generated showing their position
  → Market resolves via Grandma Mei oracle
  → Reputation updated: 7/10 correct calls (70% hit rate)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI / API                               │
│  register · call · resolve · dashboard · leaderboard         │
├─────────────────────────────────────────────────────────────┤
│                   CallsTracker (Orchestrator)                │
├──────────────┬──────────────┬───────────────────────────────┤
│ Prediction   │ Market       │ Reputation                    │
│ Parser       │ Service      │ Service                       │
│              │              │                               │
│ NLP → struct │ MCP tools    │ Hit rate, streaks,           │
│ crypto/sport │ create/bet   │ confidence score,            │
│ date parsing │ share cards  │ leaderboard, P&L             │
├──────────────┴──────────────┴───────────────────────────────┤
│                    SQLite Database                            │
│  callers · calls · positions · reputation                    │
├─────────────────────────────────────────────────────────────┤
│               @baozi.bet/mcp-server (69 tools)               │
│  build_create_lab_market_transaction · build_bet_transaction │
│  get_positions · generate_share_card · get_quote             │
├─────────────────────────────────────────────────────────────┤
│                    Solana Mainnet                             │
│  FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Prediction Parser** | `src/parsers/prediction-parser.ts` | NLP engine that converts natural language predictions into structured market parameters. Handles crypto prices, sports events, date parsing |
| **Market Service** | `src/services/market-service.ts` | Creates Lab markets via MCP, places bets, generates share cards. Follows pari-mutuel rules v6.3 |
| **Reputation Service** | `src/services/reputation-service.ts` | Calculates hit rates, tracks streaks, computes confidence-weighted scores, generates leaderboard |
| **MCP Client** | `src/services/mcp-client.ts` | JSON-RPC over stdio wrapper for `@baozi.bet/mcp-server` |
| **Database** | `src/db/database.ts` | SQLite storage for callers, calls, and computed reputation |
| **CLI** | `src/cli.ts` | Full CLI with register, call, resolve, dashboard, leaderboard commands |

## Setup

### Prerequisites

- Node.js ≥ 20
- npm or yarn

### Install

```bash
cd calls-tracker
npm install
npm run build
```

### Environment Variables (optional)

```bash
# For real mainnet market creation
export SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
export SOLANA_PRIVATE_KEY="your-wallet-private-key"

# Custom database path
export CALLS_DB_PATH="./my-calls.db"
```

## Usage

### CLI Commands

```bash
# Register a caller
npx calls-tracker register "CryptoAlice" "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" \
  --handle @cryptoalice --platform twitter

# Parse a prediction (dry run — shows what would be created)
npx calls-tracker parse "BTC will hit $110k by March 1"

# Submit a call (creates market + places bet + generates share card)
npx calls-tracker call <caller-id> "BTC will hit $110k by March 1" --amount 0.5 --side yes --confidence 9

# Use --dry-run to test without creating real markets
npx calls-tracker --dry-run call <caller-id> "ETH will exceed $5k by April"

# Resolve a call after market resolution
npx calls-tracker resolve <call-id> correct --pnl 0.45

# View call status
npx calls-tracker status <call-id>

# View call history
npx calls-tracker history [caller-id]

# View caller reputation
npx calls-tracker reputation <caller-id>

# Full dashboard
npx calls-tracker dashboard

# Leaderboard
npx calls-tracker leaderboard
```

### Programmatic API

```typescript
import { CallsTracker } from "@baozi/calls-tracker";

const tracker = new CallsTracker({
  dbPath: "my-calls.db",
  dryRun: false, // set true for testing
  defaultBetAmount: 0.1,
  referralCode: "myagent",
});

// Register caller
const caller = tracker.registerCaller(
  "CryptoAlice",
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "@cryptoalice",
  "twitter"
);

// Submit a call
const result = await tracker.submitCall(
  caller.id,
  "BTC will hit $110k by March 1",
  0.5,  // bet amount in SOL
  "yes", // bet side
  9      // confidence (1-10)
);

console.log("Market:", result.call.marketPda);
console.log("Share card:", result.shareCardUrl);

// Later: resolve the call
tracker.resolveCall(result.call.id, "correct", 0.45);

// View reputation
const rep = tracker.getReputation(caller.id);
console.log(`Hit rate: ${rep.hitRate}%`);
console.log(`Score: ${rep.confidenceScore}/100`);

// Leaderboard
const leaderboard = tracker.getLeaderboard(10);
console.log(tracker.formatLeaderboard());
```

## Prediction Parser

The NLP parser handles common prediction patterns:

### Crypto Predictions
```
"BTC will hit $110k by March 1"
  → Question: "Will BTC exceed $110k by March 1, 2026?"
  → Data Source: CoinGecko (bitcoin)
  → Direction: above

"ETH will drop below $3,000 by end of 2026"
  → Question: "Will ETH fall below $3k by December 31, 2026?"
  → Data Source: CoinGecko (ethereum)
  → Direction: below

"SOL will exceed $500 in Q1 2026"
  → Question: "Will SOL exceed $500 by March 31, 2026?"
  → Data Source: CoinGecko (solana)
```

### Sports Predictions
```
"Lakers will win the NBA championship this week"
  → Question: "Will Lakers win the NBA championship this week?"
  → Data Source: ESPN/NBA.com

"NAVI will beat Vitality in CS2 Major finals by March 15"
  → Data Source: HLTV.org
```

### Supported Assets
BTC, ETH, SOL, DOGE, XRP, BNB, ADA, AVAX, DOT, MATIC, LINK, NEAR, SUI, APT, ARB, OP, PEPE, WIF, BONK, JUP, JTO

### Supported Date Formats
- `by March 1` / `by March 1st, 2026`
- `before April 2026`
- `in Q1 2026`
- `by end of 2026` / `by EOY 2026`
- `this week` / `next week`
- `tomorrow`
- `in 7 days` / `in 2 weeks` / `in 3 months`
- `2026-03-01` (ISO format)

## Reputation Scoring

### Metrics Tracked
- **Total calls**: all predictions submitted
- **Correct calls**: predictions resolved correctly
- **Hit rate**: correct / (correct + incorrect) as percentage
- **Streak**: current and best consecutive correct calls
- **SOL wagered**: total amount bet
- **P&L**: net profit/loss in SOL
- **Confidence score**: composite 0-100 score

### Confidence Score Formula

```
score = hitRate * 50 + callsVolume * 15 + streakBonus * 10 + pnlFactor * 25

where:
  hitRate     = correct / resolved (0-1)
  callsVolume = min(log10(totalCalls + 1) / log10(50), 1)
  streakBonus = min(currentStreak / 10, 1)
  pnlFactor   = netPnl > 0 ? min(netPnl / 10, 1) : 0
```

### On-Chain Verifiability
All data is verifiable via:
- Market PDAs on Solana (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`)
- Position PDAs per wallet per market
- Oracle resolution proofs at [baozi.bet/agents/proof](https://baozi.bet/agents/proof)

## Market Creation Rules

Following [pari-mutuel rules v6.3](https://baozi.bet/skill):

1. **Question must be objective and resolvable** — validated before creation
2. **Must specify data source** — CoinGecko, ESPN, HLTV, etc.
3. **Must include clear resolution criteria** — auto-generated from prediction
4. **Type A timing** — close_time set 24h before deadline to prevent info advantage
5. **Caller must bet on their own prediction** — skin in the game requirement
6. **Share cards generated** via `generate_share_card` MCP tool

## Demo

Run the demo to see 3 callers making 11 predictions with resolution and reputation:

```bash
npx tsx examples/demo.ts
```

### Example Output

**Leaderboard:**
```
┌──────┬────────────────────┬──────────┬─────────┬────────┬───────┐
│ Rank │ Caller             │ Hit Rate │ Calls   │ P&L    │ Score │
├──────┼────────────────────┼──────────┼─────────┼────────┼───────┤
│    1 │ CryptoAlice        │   75.0% │       5 │   +1.2 │    47 │
│    2 │ SportsKingBob      │   66.7% │       3 │   +0.5 │    42 │
│    3 │ AgentCharlie       │   50.0% │       3 │   +0.5 │    33 │
└──────┴────────────────────┴──────────┴─────────┴────────┴───────┘
```

**Caller Profile:**
```
┌─────────────────────────────────────────┐
│  CryptoAlice                           │
│  7xKXtg2C...gAsU                        │
├─────────────────────────────────────────┤
│  🔥 Hit Rate: 75.0% (3/4)              │
│  📊 Total Calls: 5                     │
│  ⏳ Pending: 1                          │
│  📏 Streak: 0 (best: 3)                │
│  💰 Wagered: 2.40 SOL                  │
│  📈 P&L: +1.20 SOL                     │
│  🏆 Score: 47/100                      │
└─────────────────────────────────────────┘
```

**Call Summary:**
```
✅ Call by CryptoAlice
   "Will BTC exceed $110k by March 1, 2027?"
   Side: YES | Bet: 0.5 SOL
   Status: resolved (correct)
   Market: DRY_RUN_1771...
   View: https://baozi.bet/labs/DRY_RUN_1771531304511
   Share: https://baozi.bet/api/share/card?market=...&wallet=...&ref=cristol
   P&L: +0.45 SOL
```

**Share Card URLs** (example for real markets):
```
https://baozi.bet/api/share/card?market=<MARKET_PDA>&wallet=<WALLET>&ref=cristol
```

## Tests

```bash
npm test
# or
npx tsx src/tests/run.ts
```

**49 tests** covering:
- Prediction parsing (crypto, sports, dates, validation)
- Database operations (CRUD, reputation queries)
- Integration (full call lifecycle with dry run)

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `validate_market_question` | Validate prediction before market creation |
| `build_create_lab_market_transaction` | Create boolean Lab market |
| `build_create_race_market_transaction` | Create race (multi-outcome) market |
| `build_bet_transaction` | Place bet on market |
| `get_positions` | Check positions per wallet |
| `get_market` | Get market details/status |
| `get_quote` | Get current odds before betting |
| `generate_share_card` | Generate shareable image card |

## Tech Stack

- **TypeScript** — type-safe implementation
- **better-sqlite3** — fast local database for reputation tracking
- **commander** — CLI framework
- **chalk** — terminal styling
- **date-fns** — date utilities
- **@baozi.bet/mcp-server** — 69 on-chain tools via JSON-RPC

## License

MIT

---

*Built by [Cristol](https://github.com/manas-io-ai) for [Baozi Bounty #35](https://github.com/bolivian-peru/baozi-openclaw/issues/35)*

*小小一笼，大大缘分 — small steamer, big fate.*
