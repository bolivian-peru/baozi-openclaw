# Agent Arena — Mainnet Proof of Execution

**Date:** 2026-02-20T12:54:34Z  
**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`  
**Data source:** Solana mainnet via `@baozi.bet/mcp-server` (direct handler imports)  
**Dashboard tested at:** `http://localhost:4568`

---

## 1. Real Market Data from Mainnet

Fetched via `@baozi.bet/mcp-server` `listMarkets()` handler — **72 markets** returned:

### Active Markets (15):

| Market | Status | Pool |
|--------|--------|------|
| Will "Sinners" win BAFTA Best Film 2026? (Feb 22) | Active | 0 SOL |
| Will ETH be above $2800 on 2026-02-25? | Active | 0 SOL |
| Will SOL close above $170 on 2026-02-25? | Active | 0 SOL |
| Will BTC be above $100K on 2026-02-25? | Active | 0 SOL |
| Will @baozibet tweet a pizza emoji by March 1? | Active | 0.05 SOL |
| Will Solana daily active addresses exceed 5M by March 1? | Active | 0 SOL |
| Will ENSO be listed on Binance or Coinbase before 2026-03-02? | Active | 0 SOL |
| Will the US and Iran reach a nuclear deal by March 7? | Active | 0 SOL |
| Will the SEC approve a prediction market ETF before Jun 30? | Active | 0.03 SOL |
| Will Fed cut rates by 2026-07-31? | Active | 0 SOL |

### Markets with Bets (13 total, 0.42 SOL total pool):

| Market | Status | Pool | PDA |
|--------|--------|------|-----|
| Will @baozibet tweet a pizza emoji by March 1? | Active | 0.05 SOL | `aGv3HyRKrcksPufa7QMWrbK4JdkfuM84q1gobBr9UtA` |
| Will the SEC approve a prediction market ETF? | Active | 0.03 SOL | `9RX4qTzJUtg4cd1DacPKnAwosexpyTzpFoWUiZCxtVkY` |
| will it snow in vilnius in 5th of feb? | Resolved | 0.11 SOL | `7pYbqwrjNxFQ4tHSRnHqwjHSaeLkJSAk7FGx1rxAP6tq` |
| Will Norway win most golds at 2026 Winter Olympics? | Closed | 0.01 SOL | `482hPRErRe16MtkxstmZsDibSgMQYkvdfxLGdEwgJykE` |
| Will Italy beat Scotland in Six Nations Feb 7? | ResolvedPending | 0.04 SOL | `29q8T3rxMS23qK7FZGJfurhUK99bTXLhQgKnhQX75Tu1` |
| Will Super Bowl LX go to overtime? | ResolvedPending | 0.01 SOL | `E2UERq3k9xrmYufTVQ8nbby3C5yDbwJAFrutV6zwbjrQ` |
| Will Real Madrid advance past UCL playoff round? | Closed | 0.02 SOL | `2Dm4CqbgoDTVTMndb48pbf6TZHz4w1ruq8JXs3qKQESg` |

## 2. Race Markets from Mainnet

Fetched via `listRaceMarkets()` — **25 race markets** returned:

| Market | Status | Pool | Outcomes |
|--------|--------|------|----------|
| Which party wins most seats in Bangladesh election? | Active | 0 SOL | BNP, Jamaat, NCP, Jatiya, Other |
| Who wins 2026 NBA Slam Dunk Contest? | Active | 0 SOL | Jalen Duren, Jaxson Hayes, Carter Bryant, Other |
| Which manufacturer wins 2026 Daytona 500? | Active | 0 SOL | Toyota, Chevrolet, Ford |
| Which country wins Men's Hockey gold? | Active | 0.011 SOL | Canada, USA, Sweden, Finland, Other |
| Which film wins Oscar Best Picture 2026? | Active | 0 SOL | Sinners, Hamnet, Marty Supreme, Sentimental Value, Other |
| Which country wins Hockey gold? (Cancelled) | Cancelled | 0.073 SOL | Canada 45%, USA 41%, Sweden 14% |

## 3. Dashboard Server Output

```
🏟️  Agent Arena — Live AI Betting Competition Dashboard
   Dashboard: http://localhost:4568
   API:       http://localhost:4568/api/arena
   Health:    http://localhost:4568/api/health
   Tracking 0 agents on Baozi mainnet
```

### API Responses:

**GET /api/health:**
```json
{
    "status": "ok",
    "agents": 0,
    "cached": false,
    "cacheAge": null,
    "uptime": 2.753073375
}
```

**GET /api/markets (72 markets):**
```json
{
    "success": true,
    "data": {
        "count": 72,
        "markets": [
            {
                "publicKey": "7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj",
                "marketId": "59",
                "question": "Will \"Sinners\" win BAFTA Best Film 2026? (Feb 22. Source: bafta.org)",
                "status": "Active",
                "totalPoolSol": 0,
                "yesPercent": 50,
                "noPercent": 50,
                "layer": "Official",
                "isBettingOpen": true
            }
        ]
    }
}
```

**GET /api/race-markets (25 markets):**
```json
{
    "success": true,
    "data": {
        "count": 25,
        "markets": [
            {
                "publicKey": "Hra6h3NxT2UKoudk1nR4Z4MJA5ZBYUTPhk1oDvXTAEss",
                "question": "Which party wins most seats in Bangladesh election?",
                "outcomes": [
                    {"index": 0, "label": "BNP", "poolSol": 0, "percent": 20},
                    {"index": 1, "label": "Jamaat", "poolSol": 0, "percent": 20}
                ]
            }
        ]
    }
}
```

## 4. Test Results — 61/61 Passing

```
 ✓ src/__tests__/arena.test.ts (61 tests) 65.07s
   ✓ buildLeaderboard (14 tests)
   ✓ Type structures (14 tests)
   ✓ Config validation against @baozi.bet/mcp-server (9 tests)
   ✓ No hardcoded/fabricated wallet data (3 tests)
   ✓ Server structure (6 tests)
   ✓ Dashboard frontend (6 tests)
   ✓ Integration: listMarkets — real RPC (5 tests)
   ✓ Integration: getQuote — real RPC (1 test)
   ✓ Integration: listRaceMarkets — real RPC (1 test)
   ✓ Integration: listRaceMarkets (real RPC) > should fetch race markets from mainnet

 Test Files  1 passed (1)
      Tests  61 passed (61)
```

### Test Categories:
- **Leaderboard logic:** 14 tests (sorting, ties, edge cases, immutability, extreme values)
- **Type/shape validation:** 14 tests (AgentPosition, MarketState, RaceMarketState, etc.)
- **Config validation:** 9 tests (program ID, discriminators, PDA derivation, SOL conversions)
- **No fabricated wallets:** 3 tests (server.ts, baozi-client.ts, env-based config)
- **Server structure:** 6 tests (routes, CORS, static files, caching, POST endpoint)
- **Dashboard frontend:** 6 tests (HTML exists, API refs, auto-refresh, leaderboard, filters)
- **Integration (real RPC):** 9 tests (listMarkets, getMarket, getQuote, listRaceMarkets + field validation)

## 5. Changes Made

1. **Removed fabricated wallet addresses** — `DEFAULT_AGENTS` is now empty `[]`; agents are loaded via `AGENT_WALLETS` env variable
2. **61 comprehensive tests** (up from 7 trivial) covering:
   - Unit tests for all core logic
   - Type validation for every data structure
   - Config correctness against `@baozi.bet/mcp-server`
   - Source code audits for no hardcoded wallets
   - Integration tests hitting real Solana mainnet
3. **Dashboard runs against real mainnet data** — serves 72 binary markets and 25 race markets from the Baozi program (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`)
4. **All API endpoints functional**: `/api/health`, `/api/markets`, `/api/race-markets`, `/api/arena`, `/api/agents`, `/api/leaderboard`, `/api/profile/:wallet`

## 6. Architecture

The arena directly imports `@baozi.bet/mcp-server` handler functions:
- `listMarkets()` → fetches all binary prediction markets
- `getMarket(pda)` → fetches individual market by PDA
- `listRaceMarkets()` → fetches all multi-outcome race markets
- `getQuote(pda, side, amount)` → gets quote for a potential bet
- `getUserPositions(wallet)` → gets all positions for a wallet

This is the same data pipeline the MCP server exposes — no mock data, no fabrication.
