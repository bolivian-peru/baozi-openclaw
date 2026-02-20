# Market Factory — Auto-Create Lab Markets from News

**Bounty #3 | 1.25 SOL**

Monitors RSS feeds and crypto milestones, generates prediction markets via LLM, creates them on-chain, tracks creator fees (0.5% of all volume).

## Sources
- CoinDesk, CoinTelegraph RSS feeds
- Reuters Technology news
- CoinGecko price milestones (BTC/ETH/SOL round numbers)

## What It Does
1. Fetches latest headlines every 30 min
2. LLM converts headline → prediction market question (or SKIP if not suitable)
3. Duplicate detection against existing Baozi markets (keyword overlap)
4. Blocked terms filter (no politics names in race markets, slurs, etc.)
5. Creates market on-chain via `scripts/create-market`
6. Tracks: created markets, category stats, estimated fee income

## Usage
```bash
# Dry-run (no on-chain tx)
python3 agent.py --dry-run --verbose

# Live
BAOZI_WALLET=xxx SOLANA_PRIVATE_KEY=xxx LLM_API_KEY=sk-... python3 agent.py --daemon
```

## Creator Fees
0.5% of all betting volume on markets you create, automatically.
10 markets × 5 SOL avg volume = 0.25 SOL/week passive income.
