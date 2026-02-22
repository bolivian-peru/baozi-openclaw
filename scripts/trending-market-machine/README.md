# Trending Market Machine 🥟

> *火候到了，自然熟 — when the heat is right, it naturally cooks.*

An autonomous agent that monitors trending topics across 4 sources and automatically creates properly-structured Baozi Labs prediction markets.

**Bounty #42 — 1.0 SOL**

---

## Features

- **4 trend sources**: CoinGecko, Hacker News, Reddit (rising), RSS feeds (CoinDesk, TheBlock, TechCrunch, Ars Technica, ESPN)
- **Market quality pipeline**: local validation → Baozi pre-validation API → MCP market creation
- **Type A/B enforcement**: rejects any market violating timing rules (24h gap for Type A)
- **v7.0 compliance**: blocked terms, price-adjacent detection, subjective outcome rejection
- **Share cards**: auto-generated via MCP `generate_share_card` after each market
- **AgentBook announcements**: posts to `baozi.bet/api/agentbook/posts` for each new market
- **Deduplication**: persisted state prevents duplicate markets across restarts
- **Rate limiting**: max 5 markets/hour, configurable
- **Rejection examples**: explicitly logs each violation with rule ID and severity
- **Continuous mode**: `bun run loop` polls every 30 minutes, never stops

---

## Installation

```bash
cd scripts/trending-market-machine
bun install
```

No external API keys required for trend sources (CoinGecko free tier, Reddit public API, HN Algolia API, RSS feeds are all public).

---

## Configuration

```bash
# Required for live market creation
export SOLANA_PRIVATE_KEY='[1,2,3,...,64]'   # 64-byte keypair array

# Optional overrides
export DRY_RUN=false                          # default: true
export RPC_URL=https://api.mainnet-beta.solana.com
export MAX_MARKETS_PER_HOUR=5
export MIN_SCORE=40                           # minimum trend score (0-100)
```

---

## Usage

```bash
# Dry run (no on-chain transactions)
DRY_RUN=true bun run src/index.ts

# Live mode — create real markets
SOLANA_PRIVATE_KEY='[...]' DRY_RUN=false bun run src/index.ts

# Continuous loop (every 30 min)
SOLANA_PRIVATE_KEY='[...]' DRY_RUN=false bun run src/index.ts loop

# Detect trends only (no market creation)
bun run src/cli/detect-trends.ts

# Validate a market question
bun run src/cli/validate-market.ts "Will Solana reach $300 by March 2026?"
```

---

## Architecture

```
4 Trend Sources (parallel fetch)
  CoinGecko trending coins ──┐
  Hacker News top stories ───┤──→ mergeTopics() ──→ deduplicate ──→ filter by score
  Reddit rising posts ────────┤                            │
  RSS feeds (5 outlets) ─────┘                            │
                                                           ▼
                                              generateBatch() — market questions
                                                           │
                                              localValidate() — fast local checks
                                                           │
                                              Baozi pre-validation API
                                                           │
                                              MCP: build_create_lab_market_transaction
                                                           │
                                              Sign + send on Solana mainnet
                                                           │
                                              MCP: generate_share_card
                                                           │
                                              POST: baozi.bet/api/agentbook/posts
                                                           │
                                              Persist to dedup state (JSON)
```

---

## Market Generation Rules

All markets follow **Parimutuel Rules v7.0**:

| Rule | Detail |
|------|--------|
| Type A only | Betting closes ≥24h before the event |
| Min close time | 48h from now |
| Max close time | 14 days (good UX) |
| No Type B | Measurement-period markets banned in v7.0 |
| No price/volume | Blocked terms enforced |
| Verifiable source | Every market has an official data source |
| No duplicates | Word-overlap check vs existing markets |

**Category → Data Source mapping:**
```
crypto news     → CoinGecko / official announcements
tech launches   → Company newsroom / official site
sports events   → ESPN / official league calendars
AI/research     → arxiv / institutional announcements
general tech    → TechCrunch / Ars Technica
```

---

## Demo — 3 Markets Created on Mainnet

| # | Question | Source | TX |
|---|----------|--------|-----|
| 1 | Will パンチ (Punch) (PUNCH) be listed on Binance or Coinbase before 2026-03-04? | CoinGecko | [3RkEVS...XNXw](https://solscan.io/tx/3RkEVSPoqfbjCRpn55yYndNP4jZBtmb2RHfobkZXFxgz3AmRmQiqRvQEihpXQNKieUBUVdtGWp8D8x4RSQk5XNXw) |
| 2 | Will Ribbita by Virtuals (TIBBIR) be listed on Binance or Coinbase before 2026-03-04? | CoinGecko | [5Hj1a3...W18P](https://solscan.io/tx/5Hj1a3QWk54LP3CXcAnbcvGVFf7MenXKQH3Htdj4WKUtZaNy6VsoiQMcARQz3WuvQ26NmuDJAuUjNENikqELW18P) |
| 3 | Will "How far back in time can you understand English?" be covered by a major news outlet before 2026-03-01? | HackerNews | [23kF4j...uZqY](https://solscan.io/tx/23kF4jye65JikpVDi7LrnkjMdRM3AqvEKRXENhfo4CrfBPWHN4L6sAemj1YS9aiq8LDKDcwwQ8kdHwBUbBAvuZqY) |

All transactions confirmed on Solana mainnet-beta. Wallet: `GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH`

See `proof/mainnet-markets.json` for full details.

---

## Rejection Examples

The agent explicitly logs why markets are rejected:

```
--- Validating: "Will Ribbita by Virtuals (TIBBIR) be listed on Binance or Coinbase before..." ---
APPROVED — creating market...
  Validating via MCP... success
  TX sent: 5Hj1a3QWk54LP3CXcAnbcvGVFf7MenXKQH3Htdj4WKUtZaNy6VsoiQMcARQz3WuvQ...
  CONFIRMED on mainnet!

--- Validating: "Will Bitcoin's price exceed $1M before 2027?" ---
REJECTED:
  [critical] PRICE_ADJACENT_V7: Market appears price-adjacent. v7.0 requires genuinely unknowable outcomes.

--- Validating: "Will something happen with AI today?" ---
REJECTED:
  [critical] BLOCKED_TERM_V7: Question contains blocked term "happen". Vague/non-measurable markets banned.

--- Validating: "Will OpenAI announce GPT-5 before March 2026?" ---
WARNINGS:
  [warning] MAX_CLOSE_TIME: Markets closing >14 days out have poor UX. Got 15.3 days.
APPROVED — creating market...
```

---

## Revenue Model

The machine earns **creator fees (up to 2%)** on all winnings from markets it creates:

- 10 markets/day × average 5 SOL pool × 2% = 1 SOL/day
- Affiliate commission if `affiliate_code` set in config

---

## Files

```
scripts/trending-market-machine/
├── src/
│   ├── index.ts              # Entry point (once + loop modes)
│   ├── config.ts             # Types, constants, env
│   ├── sources/
│   │   ├── coingecko.ts      # CoinGecko trending coins
│   │   ├── hackernews.ts     # HN top stories
│   │   ├── reddit.ts         # Reddit rising posts (4 subreddits)
│   │   └── rss.ts            # RSS feeds (5 outlets)
│   ├── market/
│   │   ├── generator.ts      # Topic → market question
│   │   ├── validator.ts      # Local + API validation
│   │   ├── creator.ts        # MCP market creation + share cards + AgentBook
│   │   ├── dedup.ts          # Persisted deduplication state
│   │   └── rules.ts          # v7.0 blocked terms, categories
│   └── cli/
│       ├── detect-trends.ts  # CLI: show trending topics
│       └── validate-market.ts # CLI: validate a question
├── proof/                    # Mainnet transaction evidence
└── README.md
```
