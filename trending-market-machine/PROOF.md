# Trending Market Machine — Live Integration Proof

**Date:** 2026-02-21T07:05:48Z  
**Network:** Solana mainnet-beta  
**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`  
**Wallet:** `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`  
**MCP Server:** `@baozi.bet/mcp-server@5.0.0`

---

## Test Results: 12/12 PASSED ✅

### 1. Program ID Verification

```
✅ Program ID matches expected Baozi mainnet (0ms)
   Expected: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
   Got:      FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
```

Imported directly from `@baozi.bet/mcp-server/dist/config.js` — no hardcoded values.

### 2. Network Configuration

```
✅ Network is mainnet-beta (0ms)
   NETWORK imported from @baozi.bet/mcp-server/dist/config.js
```

### 3. Live Market Data from Solana Mainnet

Fetched **20 active markets** from the Baozi program on Solana mainnet via `handleTool('list_markets')`:

| Market PDA | Question | Status |
|---|---|---|
| `7SWR3gkSQ5Qf...` | Will "Sinners" win BAFTA Best Film 2026? | Active |
| `9SVkyP5RTiLN...` | Will ETH be above $2800 on 2026-02-25? | Active |
| `6HUCrzspwETL...` | Will SOL close above $170 on 2026-02-25? | Active |

**Proof:** Data fetched live via `handleTool()` from `@baozi.bet/mcp-server/dist/tools.js`. Response time: 425ms.

### 4. Single Market Detail

Fetched detailed market data for `7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj` via direct `getMarket()` handler:

```json
{
  "publicKey": "7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj",
  "question": "Will \"Sinners\" win BAFTA Best Film 2026? (Feb 22. Source: bafta.org)",
  "status": "Active"
}
```

### 5. Live Quote Data

Fetched real quote via `getQuote()` handler from `@baozi.bet/mcp-server/dist/handlers/quote.js`:

```json
{
  "valid": true,
  "market": "7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj",
  "side": "yes",
  "betAmountSol": 0.1,
  "impliedOdds": 50,
  "decimalOdds": 2,
  "feeBps": 250,
  "currentYesPercent": 50,
  "currentNoPercent": 50
}
```

### 6. Live Trending Topics (27 from 2 sources)

| Source | Topic | Score |
|---|---|---|
| CoinGecko | Aztec (AZTEC) trending | 95 |
| CoinGecko | Optimism (OP) trending | 91 |
| CoinGecko | Zama (ZAMA) trending | 87 |
| HackerNews | Ggml.ai joins Hugging Face... | 85 |
| HackerNews | The path to ubiquitous AI (17k tokens/sec) | 85 |

### 7. Generated Market Proposals (10/10 valid)

Sample proposals from live trending data:
- "Will AZTEC price increase by 20% or more in the next 7 days?"
- "Will OP price increase by 20% or more in the next 7 days?"
- "Will ZAMA price increase by 20% or more in the next 7 days?"

All 10/10 proposals passed Baozi local validation rules.

### 8. Dry-Run Cycle (Full Pipeline)

Ran complete pipeline: **scan → deduplicate → generate → validate → create (dry)**

```
═══════════════════════════════════════════════
🥟 Trending Market Machine — Cycle Complete
   Created: 3 markets (dry-run)
   Rejected: 0 proposals
   Errors: 0
═══════════════════════════════════════════════
```

### 9. Unit Tests: 33/33 PASSED

```
ℹ tests 33
ℹ suites 7
ℹ pass 33
ℹ fail 0
```

---

## Architecture: Direct MCP Handler Imports

**Before (REJECTED):** Spawned `@baozi.bet/mcp-server` as a subprocess via JSON-RPC over stdio.

**After (FIXED):** Direct handler imports from the installed package:

```typescript
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
```

This approach:
- ✅ No subprocess spawning
- ✅ No simulated/stubbed data
- ✅ Direct function calls to real Solana RPC
- ✅ Live mainnet market data
- ✅ Follows same pattern as merged PR #68 (AgentBook Pundit)

---

## How to Reproduce

```bash
cd trending-market-machine
npm install
npm run build
npm test                    # 33 unit tests
npx tsx src/tests/test-live-integration.ts  # 12 live integration tests
DRY_RUN=true npx tsx src/cli.ts run-cycle  # Full dry-run cycle
```
