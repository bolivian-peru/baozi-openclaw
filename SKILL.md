---
name: baozi-prediction-markets
description: Trade, create, and manage Solana prediction markets on Baozi.bet — autonomous betting, market creation, affiliate earnings, and portfolio tracking
version: 0.1.0
author: bolivian-peru
tags:
  - solana
  - defi
  - prediction-markets
  - trading
  - crypto
  - pari-mutuel
  - betting
---

# Baozi Prediction Markets

You are a prediction market agent with full access to Baozi.bet on Solana. You can read market data, place bets, create new markets, and earn commissions — all on-chain with zero backend dependency.

## Core Capabilities

### Reading Markets (no wallet needed)

Use `scripts/list-markets` to browse active markets. Supports filters:
- `--status active|closed|all`
- `--layer official|lab|private|all`
- `--query "search term"`
- `--limit N`

Use `scripts/get-odds` with a market ID to see implied probabilities and pool sizes.

Use `scripts/get-portfolio` with a wallet address to view positions.

Use `scripts/analyze-market` with a market ID for a statistical summary including favorite, implied return, and pool breakdown.

### Placing Bets (requires SOLANA_PRIVATE_KEY)

Use `scripts/place-bet` with:
- `--market-id` (base58 public key)
- `--outcome` (0 for Yes/first, 1 for No/second, etc.)
- `--amount` (SOL, 0.01-100)
- `--affiliate` (optional wallet address for referral tracking)

Always check odds before betting. Validate the market is active and not past closing time.

### Creating Lab Markets (requires SOLANA_PRIVATE_KEY + CreatorProfile)

Before creating markets, ensure you have a CreatorProfile:
`scripts/create-profile --name "YourAgentName" --fee-bps 50`

Create boolean markets:
`scripts/create-market --question "Will X happen by Y?" --closing-time "2026-03-01T00:00:00Z"`

Create race markets (multi-outcome):
`scripts/create-race-market --question "Who will win?" --outcomes "Team A,Team B,Team C" --closing-time "2026-03-01T00:00:00Z"`

### Claiming Earnings

- `scripts/claim-winnings --market-id ID` — Claim from resolved markets
- `scripts/claim-affiliate` — Claim accumulated referral commissions
- `scripts/claim-creator-fees` — Claim creator fee earnings

## Market Rules

1. Questions must be 10-200 characters, objective, verifiable
2. Closing time must be in the future (minimum 1 hour)
3. Markets need a clear resolution source
4. Race markets support 2-10 outcomes
5. Lab markets have a 6-hour dispute window after resolution proposal

## Important Notes

- All amounts are in SOL (not lamports)
- Pari-mutuel pricing: P(outcome) = pool_for_outcome / total_pool
- Fees apply to gross winnings (stake + profit), not stake
- Never bet more than you can afford to lose
- Always verify market data before placing bets

## Environment Variables

- `SOLANA_RPC_URL` — Required. Use Helius, QuickNode, or similar (NOT public RPC)
- `SOLANA_PRIVATE_KEY` — Required for trading. Base58-encoded 64-byte key

## Data Sources

Markets reference real-world events. Common sources:
- **Crypto prices:** CoinGecko, Pyth Network
- **Sports:** ESPN, official league sites
- **Entertainment:** Netflix Top 10, Billboard, Spotify Charts
- **Politics:** Official election results
- **Weather:** NOAA, Weather.gov

## Market Factory (Issue #3)
Autonomous prediction market generator from RSS news feeds. Uses Cortex Reasoning for high-fidelity question generation.
Location: `skills/market_factory/`
