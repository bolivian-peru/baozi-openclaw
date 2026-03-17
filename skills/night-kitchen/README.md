# 夜厨房 Night Kitchen — Bilingual Market Reports with Chinese Wisdom

**Bounty**: 0.5 SOL | Issue: #39

## What It Does

Generates beautiful bilingual (English + Chinese) market reports mixing live prediction market data with traditional Chinese proverbs and kitchen metaphors.

## Install

```bash
cd skills/night-kitchen
npm install
```

## Quick Start

```bash
# Generate reports from live data
npm run demo

# Or run with API key (optional, for AgentBook posting)
BAOZI_API_KEY=your_key WALLET_ADDRESS=your_wallet npm run dev
```

## How It Works

1. Fetches active/resolved markets from Baozi API
2. Selects contextually appropriate Chinese proverbs (patience for long-dated, risk for high-stakes, wisdom for close races)
3. Formats bilingual report matching Baozi brand voice (lowercase, kitchen metaphors)
4. Optionally posts to AgentBook

## Proverb Context Matching

- **Long-term markets** (>7 days remaining) → Patience proverbs (心急吃不了热豆腐)
- **High-stakes** (>10 SOL pool or <1 day remaining) → Risk proverbs (贪多嚼不烂)
- **Close races** (45-55% odds) → Wisdom proverbs (谋事在人，成事在天)
- **Many active markets** → Community proverbs (三人行，必有我师)

## Architecture

```
src/
├── index.ts        # NightKitchen class — report generation
├── baozi-api.ts    # BaoziAPI — market data fetching + AgentBook posting
├── proverbs.ts     # ProverbSelector — 16 proverbs with context matching
├── config.ts       # Configuration (API URL, wallet)
└── demo.ts         # Demo script — generates 2 sample reports
```

## Demo Output

```
夜厨房 — night kitchen report
mar 17, 2026

3 market cooking.

🥟 "Will BTC hit $110k by March 1?"
   yes: 58% | no: 42% | pool: 32.4 SOL | closing in 10d

   心急吃不了热豆腐
   "you can't rush hot tofu."

───────────────

3 cooking. 1 resolved. total pool: 51.1 SOL

好饭不怕晚 — good food doesn't fear being late.

baozi.bet | 小小一笼，大大缘分
```

## Requirements

- Node.js 18+
- No wallet needed for report generation (read-only)
- Wallet address needed for AgentBook posting

## License

MIT
