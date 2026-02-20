# 🏭 Baozi Market Factory

**Auto-create prediction markets from news, crypto milestones, sports events, and esports calendars.**

An OpenClaw skill that turns any AI agent into a 24/7 market creation machine for [Baozi.bet](https://baozi.bet) on Solana — generating market supply and earning creator fees automatically.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Market Factory Pipeline                    │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ CoinGecko│  │RSS Feeds │  │  ESPN    │  │ Esports  │    │
│  │  Crypto  │  │News/Tech │  │ Sports   │  │ Calendar │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │              │              │              │          │
│       └──────────────┴──────────────┴──────────────┘          │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │   Detect    │  Event pattern matching     │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │   Filter    │  Quality, blocked terms     │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │  Deduplicate│  Memory + Baozi API check   │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │  Validate   │  Parimutuel Rules v6.3      │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │   Create    │  Baozi Lab market on-chain  │
│                   └──────┬──────┘                             │
│                          │                                    │
│                   ┌──────▼──────┐                             │
│                   │   Track     │  Memory + category stats    │
│                   └─────────────┘                             │
│                                                               │
│  Resolution Pipeline (separate cron):                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Check   │→ │ Fetch   │→ │ Close   │→ │ Resolve │        │
│  │ Closing │  │ Outcome │  │ Market  │  │ Market  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **4 Event Sources**: CoinGecko crypto milestones, RSS news feeds (crypto + tech), ESPN sports API, esports event calendar
- **Smart Question Generation**: Extracts entities from headlines and generates clear, verifiable Yes/No questions (10-200 chars)
- **Duplicate Detection**: Checks both internal memory and existing Baozi markets via API to prevent duplicates
- **Quality Filters**: Blocks offensive content, enforces minimum confidence scores, validates timing rules
- **Self-Resolution**: Automatically resolves crypto markets via CoinGecko price data and sports markets via ESPN results
- **Category Tracking**: Monitors which categories generate the most volume to optimize market creation
- **Persistent Memory**: All state survives across runs in `memory/factory-state.json`
- **Dry-Run Mode**: Preview everything the factory would do without creating markets

## Setup

### Prerequisites

- Node.js >= 18
- Solana wallet with ~0.1 SOL (for market creation fees)
- Solana RPC endpoint (Helius or QuickNode recommended)
- Baozi CreatorProfile (create at [baozi.bet/agents](https://baozi.bet/agents))

### Installation

```bash
cd market-factory
npm install
```

### Environment Variables

Create a `.env` file or export these:

```bash
# Required
export SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
export SOLANA_PRIVATE_KEY="your-base58-encoded-private-key"
export SOLANA_PUBLIC_KEY="your-wallet-public-key"

# Optional (for higher API rate limits)
export NEWS_API_KEY="your-newsapi-org-key"
export COINGECKO_API_KEY="your-coingecko-pro-key"
```

### Create a Baozi CreatorProfile

Before creating markets, you need a CreatorProfile on-chain:

```bash
# Using the core baozi-openclaw skill:
scripts/create-profile --name "MarketFactory" --fee-bps 50
```

## Usage

### Quick Start — Dry Run

See what the factory would create without actually creating anything:

```bash
npm run scan -- --dry-run
```

### Scan Specific Sources

```bash
# Crypto milestones only
npm run scan -- --source crypto --dry-run

# News feeds only
npm run scan -- --source rss --dry-run

# Sports events only
npm run scan -- --source sports --dry-run
```

### Create Markets (Live)

```bash
# Scan all sources, create up to 5 markets
npm run scan

# Create at most 2 markets from crypto
npm run scan -- --source crypto --max 2
```

### Manual Market Creation

```bash
npm run create -- \
  --question "Will SOL be above $200 at 2026-03-01 00:00 UTC?" \
  --closing-time "2026-02-28T22:00:00Z" \
  --category crypto \
  --resolution-source "CoinGecko SOL/USD price"
```

### Resolve Markets

```bash
# Check all eligible markets and resolve them
npm run resolve

# Preview what would be resolved
npm run resolve -- --dry-run
```

### Check Status

```bash
npm run status
```

Output:

```
╔═══════════════════════════════════════════════╗
║       Market Factory — Status Dashboard       ║
╚═══════════════════════════════════════════════╝

📊 Overview
───────────────────────────────────────────────
  Total markets created:  12
  Active markets:         8
  Resolved markets:       4
  Total volume:           15.3200 SOL
  Total fees earned:      0.076600 SOL

📁 Category Performance
───────────────────────────────────────────────
  CRYPTO
    Markets: 6 | Volume: 10.2000 SOL | Fees: 0.051000 SOL
    Avg volume/market: 1.7000 SOL | Resolution accuracy: 100%
  SPORTS
    Markets: 4 | Volume: 3.8000 SOL | Fees: 0.019000 SOL
    Avg volume/market: 0.9500 SOL | Resolution accuracy: 75%
```

## Cron Setup

For autonomous 24/7 operation, set up cron jobs:

```cron
# Crypto scan every 30 minutes
*/30 * * * * cd /path/to/market-factory && npm run scan -- --source crypto --max 2

# RSS news scan every 30 minutes (offset by 15 min)
15,45 * * * * cd /path/to/market-factory && npm run scan -- --source rss --max 2

# Sports scan every 6 hours
0 */6 * * * cd /path/to/market-factory && npm run scan -- --source sports --max 3

# Resolution check every 6 hours
0 3,9,15,21 * * * cd /path/to/market-factory && npm run resolve

# Daily status report
0 12 * * * cd /path/to/market-factory && npm run status
```

Or use OpenClaw's built-in cron:

```yaml
# In your OpenClaw agent config
cron:
  - schedule: "*/30 * * * *"
    command: "scan-news --source crypto --max 2"
  - schedule: "15,45 * * * *"
    command: "scan-news --source rss --max 2"
  - schedule: "0 */6 * * *"
    command: "scan-news --source sports --max 3"
  - schedule: "0 3,9,15,21 * * *"
    command: "resolve-markets"
```

## Running Tests

```bash
npm test
```

Tests cover:
- CoinGecko price fetching and milestone detection
- RSS feed parsing and event pattern matching
- ESPN API sports event detection
- Duplicate detection (exact + fuzzy matching)
- Quality filter (blocked terms, length, timing)
- Memory persistence (load/save state)
- Full pipeline dry run with mock events

## Event Source Details

### CoinGecko Crypto Milestones
- Monitors: SOL, BTC, ETH, DOGE, SUI
- Detects round-number milestones (e.g., SOL approaching $200)
- Generates snapshot-style questions ("Will X be above $Y at Z UTC?")
- Resolution: Automatic via CoinGecko price API

### RSS News Feeds
- Sources: CoinTelegraph, CoinDesk, TechCrunch, The Verge, ESPN
- Pattern matching for crypto events, tech launches, sports
- Extracts entities (tokens, teams, companies) for question generation
- Resolution: Manual or source-dependent

### ESPN Sports API
- Leagues: UFC, NBA, NFL, NHL, Premier League
- Fetches upcoming games from public scoreboard API
- Generates "Will X beat Y?" boolean markets
- Resolution: Automatic via ESPN game results

### Esports Calendar
- Events: CS2 Major, Valorant Champions, LoL Worlds, TI (Dota 2)
- Curated calendar of major tournaments
- Regional/team winner prediction markets
- Resolution: Manual from esports results sites

## File Structure

```
market-factory/
├── SKILL.md              # OpenClaw skill manifest
├── README.md             # This file
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── lib/                  # Core library
│   ├── config.ts         # Configuration & constants
│   ├── types.ts          # Type definitions
│   ├── memory.ts         # Persistent state management
│   ├── baozi-client.ts   # Baozi API interaction
│   ├── market-generator.ts # Pipeline: detect → filter → create
│   └── sources/          # Event detection sources
│       ├── index.ts      # Source aggregator
│       ├── crypto-source.ts   # CoinGecko milestones
│       ├── rss-source.ts      # RSS news feeds
│       └── sports-source.ts   # ESPN + esports
├── scripts/              # Executable scripts
│   ├── scan-news.ts      # Main scan & create pipeline
│   ├── create-market.ts  # Manual market creation
│   ├── resolve-markets.ts # Auto-resolution
│   └── factory-status.ts # Status dashboard
├── tests/
│   └── run-tests.ts      # Test suite
├── memory/               # Persistent state (gitignored)
│   └── factory-state.json
└── references/           # API docs & references
```

## Economics

| Revenue Stream | Rate | Example |
|---------------|------|---------|
| Creator fees | up to 2% of volume | 10 SOL volume → 0.20 SOL |
| Market creation fee | 0.01 SOL/market | Cost, not revenue |

**Break-even analysis:** At 0.01 SOL creation cost per market, you need just 0.5 SOL in volume per market to cover costs at 2% creator fee. Most sports and crypto markets easily exceed this.

## License

MIT

## Bounty Submission

- **Issue:** [bolivian-peru/baozi-openclaw#3](https://github.com/bolivian-peru/baozi-openclaw/issues/3)
- **Wallet:** `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`
- **Author:** [@manas-io-ai](https://github.com/manas-io-ai)
