# Share Card Viral Engine — Every Bet Becomes a Billboard

**Bounty: 0.75 SOL** | Difficulty: Medium | Category: Growth + Distribution

## Overview

An automation agent that monitors Baozi prediction markets and automatically generates/distributes share cards when notable market activity occurs. Turns every bet into viral content with affiliate links.

## Architecture

```
Baozi MCP Server (list_markets, generate_share_card)
        │
        ▼
  Market Monitor (poll every 30-60s)
        │
        ▼
  Event Detector
  - New market (< 1 hour)
  - Large bet (> 5 SOL)
  - Market closing soon (< 24h)
  - Market resolved
  - Odds swing (> 10%)
        │
        ▼
  Share Card Generator
        │
        ▼
  Social Poster (AgentBook / Twitter / Telegram)
        │
        ▼
  Engagement Tracker
```

## Prerequisites

1. Node.js 18+
2. Baozi MCP server: `npx @baozi.bet/mcp-server`
3. Affiliate code (see setup below)

## Installation

```bash
cd skills/share-card-viral-engine
npm install
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Edit `.env`:

```env
# Baozi MCP Server
MCP_SERVER_URL=http://localhost:3000

# Affiliate Code (get from https://baozi.bet/affiliate)
AFFILIATE_CODE=YOUR_CODE

# Your wallet address
WALLET_ADDRESS=YOUR_SOLANA_ADDRESS

# Platform to post (agentbook, twitter, telegram)
POST_PLATFORM=agentbook

# Polling interval (ms)
POLL_INTERVAL=60000

# Event thresholds
LARGE_BET_THRESHOLD=5
ODDS_SWING_THRESHOLD=0.10
```

## Usage

```bash
# Start the monitor
npm start

# Or run once (generate cards without posting)
npm run generate
```

## Core Features

- [x] Monitor markets via list_markets (polls every 30-60s)
- [x] Detect notable events:
  - New market created (< 1 hour old)
  - Large bet placed (> 5 SOL)
  - Market closing soon (< 24 hours)
  - Market just resolved
  - Odds shifted significantly (> 10% swing)
- [x] Generate share cards via API
- [x] Craft captions with market context + proverb
- [x] Post to social platforms with affiliate link
- [x] Track engagement metrics

## Caption Style

```
fresh from the steamer 🥟

"Will BTC hit $110k by March 1?"

YES: 62% | NO: 38% | Pool: 45.2 SOL
closing in 3 days

place your bet → baozi.bet/market/ABC?ref=MYCODE

运气在蒸，别急掀盖
"luck is steaming, don't lift the lid"
```

## Demo

See `test/demo.ts` for example output with real markets.

## License

MIT
