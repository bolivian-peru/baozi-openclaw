---
name: baozi-prediction-markets
description: Trade, create, and manage Solana prediction markets on Baozi.bet — autonomous betting, market creation, affiliate earnings, and portfolio tracking
version: 1.0.0
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

You are a prediction market agent with full access to Baozi.bet on Solana. You can read market data, place bets, create new markets, and earn commissions — all on-chain.

All scripts are thin wrappers over `@baozi.bet/mcp-server` (76 tools). They spawn the MCP server via `npx`, call the relevant tool, and — for write operations — sign the returned transaction locally with your `SOLANA_PRIVATE_KEY` and submit it via `SOLANA_RPC_URL`.

## Setup

```bash
# 1. Install dependencies (once)
npm install

# 2. Export your keys
export SOLANA_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
export SOLANA_PRIVATE_KEY="your_base58_secret_key"   # required for trading / creation / claims

# 3. Smoke test (read-only, no key needed)
./scripts/list-markets --limit 3
```

Every script prints JSON to stdout. Errors go to stderr with a non-zero exit code.

## Core Capabilities

### Reading Markets (no wallet needed)

Use `scripts/list-markets` to browse active markets. Supports filters:
- `--status active|closed|all`
- `--layer official|lab|private|all`
- `--query "search term"`
- `--limit N`

Use `scripts/get-odds` with a market ID to see implied probabilities and pool sizes.

Use `scripts/get-portfolio` with a wallet address to view positions. If `SOLANA_PRIVATE_KEY` is set the wallet argument is optional — it will use your own keypair.

Use `scripts/analyze-market` with a market ID for a statistical summary including favorite, implied return on a 1 SOL bet, and pool breakdown.

### Placing Bets (requires `SOLANA_PRIVATE_KEY`)

Use `scripts/place-bet` with:
- `--market-id` (base58 public key)
- `--outcome` (0 for Yes/first, 1 for No/second)
- `--amount` (SOL, 0.01-100)
- `--affiliate` (optional wallet address for referral tracking)

A quote is fetched automatically before submission. The script prints the transaction signature and Solscan link on success.

### Creating Lab Markets (requires `SOLANA_PRIVATE_KEY` + CreatorProfile)

Before creating markets, ensure you have a CreatorProfile:
```bash
./scripts/create-profile --name "YourAgentName" --fee-bps 50
```

Create boolean markets:
```bash
./scripts/create-market --question "Will X happen by Y?" \
                        --closing-time "2026-06-01T00:00:00Z"
```

Create race markets (multi-outcome):
```bash
./scripts/create-race-market --question "Who will win?" \
                             --outcomes "Team A,Team B,Team C" \
                             --closing-time "2026-06-01T00:00:00Z"
```

### Claiming Earnings

- `scripts/claim-winnings --market-id ID` — Claim from resolved markets
- `scripts/claim-affiliate` — Claim accumulated referral commissions
- `scripts/claim-creator-fees [--market-id ID]` — Claim creator fee earnings

## Market Rules

1. Questions must be 10-200 characters, objective, verifiable
2. Closing time must be > 1 hour in the future
3. Markets need a clear resolution source
4. Race markets support 2-10 outcomes
5. Lab markets have a 6-hour dispute window after resolution proposal
6. **No pre-resolution exit:** pari-mutuel pools don't support selling/closing a position. Positions are held until the market resolves, then winners claim a proportional share of the pool.

## Important Notes

- All amounts are in SOL (not lamports)
- Pari-mutuel pricing: `P(outcome) = pool_for_outcome / total_pool`
- Fees apply to gross winnings (stake + profit), not stake
- Betting closes 5 minutes before `closing_time` (freeze window)
- Never bet more than you can afford to lose
- Always verify market data before placing bets

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SOLANA_RPC_URL` | recommended | Use Helius, QuickNode, Triton, or similar. Public RPC works for light use but is rate-limited. |
| `SOLANA_PRIVATE_KEY` | for write ops | Base58-encoded 64-byte secret key, OR a JSON array of 64 numbers. |

## Program Details

- **Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ` (V4.7.6)
- **Network:** Solana Mainnet
- **IDL:** `https://baozi.bet/api/agent/idl`
- **MCP server:** `@baozi.bet/mcp-server` (76 tools, used under the hood by these scripts)

## Data Sources

Markets reference real-world events. Common sources:
- **Crypto prices:** CoinGecko, Pyth Network
- **Sports:** ESPN, official league sites
- **Entertainment:** Netflix Top 10, Billboard, Spotify Charts
- **Politics:** Official election results
- **Weather:** NOAA, Weather.gov

## Troubleshooting

- **`SOLANA_PRIVATE_KEY environment variable is required`** — export a base58 secret key (64 bytes decoded) or a JSON array of 64 numbers.
- **`MCP call timeout`** — the first `npx @baozi.bet/mcp-server` call may download the package. Subsequent calls are faster. Run `npm install` once to pre-cache.
- **`BettingFrozen` or `BettingClosed` on bet** — market is within the 5-minute pre-close freeze window or already past its closing time.
- **Empty results from `list-markets`** — try `--status all` to include resolved markets, or drop the `--layer` filter.
