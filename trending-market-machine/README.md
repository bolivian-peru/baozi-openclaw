# 🥟 Trending Market Machine

**Auto-create Baozi Labs prediction markets from viral trending topics.**

The market machine never sleeps. If it's trending, there's a market.

## Overview

The Trending Market Machine monitors real-time trending topics across multiple platforms and automatically creates properly-structured Lab prediction markets on [Baozi.bet](https://baozi.bet). It handles the full pipeline: trend detection → classification → question generation → validation → market creation → share cards → social announcements.

### How It Works

```
Trending topic detected: "Apple announces new AI product at WWDC"
 │
 ├─→ Classify: Type A (event-based, announcement)
 ├─→ Generate question: "Will Apple announce an AI hardware product at WWDC 2026?"
 ├─→ Set timing: close_time = WWDC date - 24 hours (Type A rule)
 ├─→ Set data source: "Apple Newsroom / official WWDC livestream"
 ├─→ Validate via: POST https://baozi.bet/api/markets/validate
 ├─→ Create Lab market via: build_create_lab_market_transaction
 ├─→ Add metadata: title, description, image, category, tags
 ├─→ Generate share card
 └─→ Post to AgentBook: "fresh market 🥟 trending topic"
```

## Architecture

```
trending-market-machine/
├── src/
│   ├── types/index.ts       # Core type definitions
│   ├── sources/              # Trend source adapters
│   │   ├── index.ts          # Source aggregator
│   │   ├── google-trends.ts  # Google Trends RSS + JSON API
│   │   ├── coingecko.ts      # CoinGecko trending coins/categories
│   │   └── hackernews.ts     # Hacker News top stories (tech/AI)
│   ├── generator.ts          # Market question generator + classifier
│   ├── dedup.ts              # Duplicate detection (topic + question level)
│   ├── validator.ts          # Local + Baozi API validation pipeline
│   ├── creator.ts            # Market creation, metadata, share cards, AgentBook
│   ├── mcp-client.ts         # @baozi.bet/mcp-server JSON-RPC client
│   ├── state.ts              # Persistent state for dedup + tracking
│   ├── index.ts              # Main orchestrator (runCycle, scanTrends)
│   └── cli.ts                # CLI entry point
├── scripts/
│   ├── scan-trends           # Preview trends without creating markets
│   └── create-markets        # Full cycle: scan → validate → create
├── tests/
│   ├── generator.test.ts     # Question generation + classification tests
│   ├── dedup.test.ts         # Duplicate detection tests
│   └── validator.test.ts     # Validation rule tests
├── data/                     # Runtime state (auto-created)
│   └── state.json            # Persisted dedup + tracking state
├── package.json
├── tsconfig.json
└── README.md
```

## Trend Sources

The machine monitors **3 sources** (minimum 2 required by the bounty):

| Source | What It Monitors | API | Auth Required |
|--------|-----------------|-----|---------------|
| **Google Trends** | Real-time trending searches (US) | RSS + JSON API | No |
| **CoinGecko** | Trending coins, NFTs, categories | REST API v3 | No |
| **Hacker News** | Top stories (tech, AI, launches) | Firebase API | No |

### Category Mapping

| Trend Source | → Baozi Category | Data Source |
|-------------|-------------------|-------------|
| Crypto news (CoinGecko) | `crypto` | CoinGecko / CoinMarketCap |
| Sports events | `sports` | ESPN / Official leagues |
| Tech launches (HN) | `technology` | Official company sites |
| Entertainment | `entertainment` | Ceremony / platform sites |
| Economic data | `finance` | BLS.gov / Federal Reserve |

## Market Quality Rules

Every generated market must pass:

1. **No duplicates** — checked against machine state + existing Baozi Lab markets via `list_markets`
2. **No subjective outcomes** — "best", "exciting", "popular" → REJECTED
3. **No past events** — "who won yesterday?" → REJECTED
4. **Objective & verifiable** — must have a clear data source
5. **Timing rules (v6.3)**:
   - Minimum 48 hours until close
   - Maximum 14 days until close
   - Type A (event-based): closes before the event
   - Type B (measurement): closes at end of period
6. **Pre-validation API** — every proposal hits `POST /api/markets/validate` before creation

### Rejection Example

```
Topic: "Super Bowl LVIII was amazing"
  → Question rejected: contains subjective term "amazing"
  → Also rejected: references past event ("was")

Topic: "Bitcoin price"
  → Question: "Will Bitcoin reach $150K by March 2026?"
  → Close time: 2026-03-01T00:00:00Z (7 days)
  → ✅ Passes all validations
```

## Setup

### Prerequisites

- Node.js >= 20
- Solana wallet with SOL for transaction fees
- Solana RPC endpoint (Helius, QuickNode, etc.)

### Install

```bash
cd trending-market-machine
npm install
npm run build
```

### Environment Variables

```bash
# Required for market creation
export SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
export SOLANA_PRIVATE_KEY="your-base58-private-key"

# Optional configuration
export BAOZI_BASE_URL="https://baozi.bet"          # Default
export TREND_SOURCES="google-trends,coingecko,hackernews"  # Default
export MIN_TREND_SCORE="40"                          # 0-100, default 40
export MAX_MARKETS_PER_CYCLE="5"                     # Default 5
export MIN_HOURS_UNTIL_CLOSE="48"                    # Default 48
export MAX_DAYS_UNTIL_CLOSE="14"                     # Default 14
export CREATOR_FEE_BPS="100"                         # 1% default (max 200 = 2%)
export AFFILIATE_WALLET="your-affiliate-wallet"      # Optional
export DRY_RUN="true"                                # Validate without creating
```

## Usage

### Scan Trends (Preview)

See what's trending and preview generated market questions — no markets created:

```bash
npm run scan

# Or with custom sources:
TREND_SOURCES=coingecko,hackernews npm run scan
```

### Create Markets (Dry Run)

Validate proposals against all rules without actually creating:

```bash
DRY_RUN=true npm run create
```

### Create Markets (Live)

Full cycle — scan, validate, and create markets on Baozi mainnet:

```bash
SOLANA_RPC_URL=https://... SOLANA_PRIVATE_KEY=... npm run create
```

### Run as Cron

Set up automated market creation every 6 hours:

```bash
# crontab -e
0 */6 * * * cd /path/to/trending-market-machine && npm run create >> /var/log/market-machine.log 2>&1
```

### View Statistics

```bash
node dist/cli.js stats
```

## Run Tests

```bash
npm run build
npm test
```

## Revenue Model

The market machine earns from every market it creates:

| Revenue Stream | Rate | Example |
|---------------|------|---------|
| Creator fees | Up to 2% on winnings | 10 markets/day × 5 SOL pool × 2% = 1 SOL/day |
| Affiliate fees | 1% lifetime | Share links with affiliate code |
| Volume generated | Protocol fees | More markets = more bets |

## Technical Details

### MCP Integration

Uses `@baozi.bet/mcp-server` (68 tools) via JSON-RPC over stdio:

- `build_create_lab_market_transaction` — Create boolean Lab markets
- `build_create_race_market_transaction` — Create multi-outcome markets
- `validate_market_question` — Validate questions
- `get_timing_rules` — Check timing constraints
- `list_markets` — Fetch existing markets for dedup
- `generate_share_card` — Create shareable market images

### Pre-validation API

Every proposal is validated via `POST https://baozi.bet/api/markets/validate` before creation. This ensures:
- Question format compliance
- Timing rule adherence (Type A/B)
- Category and tag validity
- No duplicate questions on-chain

### State Persistence

The machine tracks all created markets in `data/state.json`:
- Topic IDs (prevent re-processing the same trend)
- Generated questions (fuzzy dedup via Jaccard similarity)
- Market metadata (ID, TX signature, share card URL)
- Run statistics

State is pruned automatically (last 500 topics, 200 markets) to prevent unbounded growth.

## OpenClaw Skill Integration

This tool integrates with the baozi-openclaw skill. The scripts in `scripts/` follow OpenClaw conventions and can be called by the agent:

```
Use `scripts/scan-trends` to preview trending topics and generated market questions.
Use `scripts/create-markets` to run a full market creation cycle.
Use `scripts/create-markets --dry-run` to validate without creating.
```

## License

MIT
