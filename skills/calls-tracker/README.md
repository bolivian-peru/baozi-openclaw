# Calls Tracker — Influencer Prediction Reputation System

**Bounty #35** | 1.0 SOL | Advanced

Turn influencer predictions into trackable, verifiable prediction markets on Baozi. Every call builds or destroys reputation — no hiding from bad takes.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Prediction Text │────▶│   Parser     │────▶│ Timing Validator │
│  or Social Post  │     │  NLP extract │     │  v6.3 rules     │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
                        ┌──────────────┐     ┌─────────▼────────┐
                        │  Share Card  │◀────│   MCP Pipeline   │
                        │  Generator   │     │  create market   │
                        └──────────────┘     │  place bet       │
                                             │  generate card   │
                        ┌──────────────┐     └─────────┬────────┘
                        │  Reputation  │◀────│  SQLite (WAL)    │
                        │  Leaderboard │     │  calls + log     │
                        └──────────────┘     └──────────────────┘
```

## Features

- **Smart prediction parsing** — natural language → structured market question
- **Social media support** — strips @mentions, hashtags, emojis, URLs
- **Pari-mutuel v6.3 validation** — Type A (event) and Type B (measurement) timing rules
- **Auto-activate pipeline** — create market → place bet → generate share card via MCP
- **Reputation scoring** — hit rate, streaks, confidence score, tier system
- **Public leaderboard** — ranked by confidence score
- **Activity logging** — full audit trail per call
- **SQLite + WAL** — fast, persistent, crash-safe storage

## Reputation Tiers

| Score | Tier | Description |
|-------|------|-------------|
| 0-19 | newcomer | Just getting started |
| 20-39 | caller | Making calls regularly |
| 40-59 | analyst | Proven track record |
| 60-79 | oracle | Consistently accurate |
| 80-100 | legend | Elite prediction accuracy |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info + endpoint list |
| POST | `/calls` | Register a prediction call |
| POST | `/calls/social` | Register from social media post |
| GET | `/calls` | List calls (filter: ?caller=, ?status=, ?wallet=) |
| GET | `/calls/:id` | Call details + activity log |
| POST | `/calls/:id/activate` | Create market on-chain (MCP) |
| POST | `/calls/:id/resolve` | Resolve call outcome |
| GET | `/callers` | All callers with reputation stats |
| GET | `/callers/:name` | Caller reputation + call history |
| GET | `/leaderboard` | Ranked reputation leaderboard |
| GET | `/dashboard` | Aggregate stats |
| POST | `/sync` | Sync resolutions from on-chain |

## MCP Tools Used

For each call, these `@baozi.bet/mcp-server` tools are invoked:

1. `build_create_lab_market_transaction` — creates the Lab market on-chain
2. `build_bet_transaction` — caller bets on their own prediction (skin in the game)
3. `generate_share_card` — shareable card image for the call
4. `get_resolution_status` — syncs resolution outcomes (via `/sync`)

## Setup

```bash
bun install
bun run start        # Start server on port 3042
bun run demo         # Run full demo with 3 example calls
bun test             # Run 26 integration tests
```

## Example Flow

```
Input:  "BTC will hit $120k by March 15, 2026"
→ Question: "Will BTC hit $120k by March 15, 2026?"
→ Type A: close_time = March 14, 2026 (25h before event)
→ Data source: CoinGecko BTC/USD
→ Caller bets 1.0 SOL on YES
→ Share card: https://baozi.bet/api/share/card?market=LAB_...&wallet=...
→ Reputation updated after oracle resolution
```

## Demo Output (3 example calls + share cards)

```
--- Step 1: Register prediction calls ---
Call 1: Will BTC hit $120k by March 15, 2026?        [Type A, 1 SOL]
Call 2: Will The Eagles win the next Super Bowl?       [NFL data, 0.5 SOL]
Call 3: Will ETH flip BTC market cap by end of March?  [CoinGecko, 2 SOL]

--- Step 2: Parse social media post ---
@DeFiKing SOL to $500 by March 2026! 🚀🔥 #solana
→ Clean: SOL reach $500 by March 2026
→ Handle: @DeFiKing

--- Step 4: Resolve calls ---
Call 1: WIN  (BTC hit $120k)
Call 2: LOSS (Eagles didn't win)
Call 3: WIN  (ETH flipped BTC)

--- Step 6: Leaderboard ---
#1 CryptoOracle — analyst (100% hit rate, score: 56.0)
#2 DeFiKing — newcomer (pending)
#3 SportsAnalyst — newcomer (0% hit rate)
```

## Testing

26 integration tests covering:
- Call registration + validation
- Social media post parsing
- Pari-mutuel v6.3 timing rules
- Call resolution (win/loss/void)
- Reputation scoring + tier progression
- Streak tracking (current + best)
- Leaderboard ranking
- Dashboard aggregation
- Sync pipeline

```bash
$ bun test
 26 pass
 0 fail
 60 expect() calls
```

## Acceptance Criteria

- [x] Creates valid Lab markets from text predictions
- [x] Follows pari-mutuel timing rules (Type A/B)
- [x] Caller must bet on their own prediction
- [x] Generates share cards for each call
- [x] Tracks and displays caller reputation (hit rate)
- [x] Works with real mainnet MCP tools
- [x] README with setup instructions + demo output
- [x] At least 3 example calls with share card outputs

## Wallet

Payout: `F6LSaYFuwaJM1f6ZkRfHvd8ZpoW3S7p1Vab8wpy25tJt`
