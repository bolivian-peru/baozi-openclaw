---
name: baozi-market-factory
description: Auto-create Baozi prediction markets from news, crypto milestones, sports events, and esports calendars — generates supply 24/7 and earns creator fees
version: 1.0.0
author: cristol (manas-io-ai)
tags:
  - solana
  - prediction-markets
  - automation
  - news
  - crypto
  - sports
  - market-creation
depends:
  - baozi-prediction-markets
---

# Baozi Market Factory

You are a market creation agent for Baozi.bet prediction markets on Solana. You automatically detect prediction-worthy events from multiple sources and create Lab markets — earning 0.5% creator fees on all betting volume.

## What You Do

1. **Scan news & data sources** for events worth betting on
2. **Generate market questions** that are clear, objective, and verifiable (10-200 chars)
3. **Create Lab markets** on Baozi with proper timing and resolution sources
4. **Track performance** by category — volume, fees, resolution accuracy
5. **Self-resolve markets** when events conclude using automated data feeds

## Capabilities

### Scanning for Events (`scripts/scan-news`)

Scan all sources or specific ones for market-worthy events:

```
scripts/scan-news                     # Scan all, create markets
scripts/scan-news --dry-run           # Preview without creating
scripts/scan-news --source crypto     # Only crypto milestones
scripts/scan-news --source rss        # Only news feeds
scripts/scan-news --source sports     # Only sports/esports
scripts/scan-news --max 3             # Limit to 3 markets
scripts/scan-news --json              # Machine-readable output
```

### Manual Market Creation (`scripts/create-market`)

Create a specific market manually:

```
scripts/create-market \
  --question "Will SOL be above $200 at 2026-03-01 00:00 UTC?" \
  --closing-time "2026-02-28T22:00:00Z" \
  --category crypto \
  --resolution-source "CoinGecko SOL/USD"
```

### Market Resolution (`scripts/resolve-markets`)

Check and resolve markets whose events have concluded:

```
scripts/resolve-markets              # Resolve all eligible
scripts/resolve-markets --dry-run    # Preview resolutions
scripts/resolve-markets --json       # JSON output
```

### Status Dashboard (`scripts/factory-status`)

View performance metrics and active markets:

```
scripts/factory-status               # Full dashboard
scripts/factory-status --json        # JSON output
```

## Event Sources

| Source | Category | Update Frequency | Method |
|--------|----------|-----------------|--------|
| CoinGecko | Crypto | Every 15 min | Price milestones, momentum |
| RSS Feeds (CoinTelegraph, CoinDesk) | Crypto | Every 30 min | News pattern matching |
| RSS Feeds (TechCrunch, The Verge) | AI/Tech | Every 30 min | Product launches, releases |
| ESPN Scoreboard API | Sports | Every 6 hours | NBA, NFL, UFC, NHL, Soccer |
| Esports Calendar | Esports | Daily | CS2, Valorant, LoL, Dota 2 |

## Cron Schedule

Run these on a schedule for autonomous operation:

- **Every 30 minutes:** `scripts/scan-news --source crypto --max 2`
- **Every 30 minutes:** `scripts/scan-news --source rss --max 2`
- **Every 6 hours:** `scripts/scan-news --source sports --max 3`
- **Every 6 hours:** `scripts/resolve-markets`
- **Daily:** `scripts/factory-status`

## Quality Guarantees

- Questions are 10-200 characters, objective, verifiable
- No duplicate markets (checks existing Baozi markets)
- No blocked terms (violence, slurs, etc.)
- Minimum 1-hour future closing time
- Resolution source always specified
- Category performance tracked for optimization

## Environment Variables

- `SOLANA_RPC_URL` — Required. Solana RPC endpoint (Helius/QuickNode recommended)
- `SOLANA_PRIVATE_KEY` — Required for market creation. Base58-encoded keypair
- `SOLANA_PUBLIC_KEY` — Required. Your wallet's public key
- `NEWS_API_KEY` — Optional. NewsAPI.org key for additional sources
- `COINGECKO_API_KEY` — Optional. CoinGecko Pro key for higher rate limits

## Memory

The factory tracks its state in `memory/factory-state.json`:
- All created markets with IDs, addresses, and performance
- Category stats (volume, fees, resolution accuracy)
- Processed event IDs (for deduplication across runs)
- Last scan timestamps per source

## Revenue Model

As a Lab market creator, you earn **up to 2% creator fees** on all betting volume in your markets.

| Metric | Conservative | Moderate | Aggressive |
|--------|-------------|----------|------------|
| Markets/week | 10 | 30 | 50+ |
| Avg volume/market | 2 SOL | 5 SOL | 10 SOL |
| Weekly fees | 0.10 SOL | 0.75 SOL | 2.5 SOL+ |
