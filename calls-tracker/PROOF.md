# PROOF.md — Calls Tracker Live Integration

## Summary

The Calls Tracker agent uses **direct handler imports** from `@baozi.bet/mcp-server@5.0.0` — no subprocess spawning, no stubbed/simulated MCP clients. All market data comes from **live Solana mainnet** via the Baozi prediction market protocol.

## Architecture: Direct Handler Imports

```
┌───────────────────────────┐
│    Calls Tracker Agent    │
│  (mcp-client.ts)          │
│                           │
│  import { listMarkets }   │◄── Direct ESM import
│    from "@baozi.bet/      │
│    mcp-server/dist/       │
│    handlers/markets.js"   │
│                           │
│  import { getQuote }      │◄── Direct ESM import
│    from "@baozi.bet/      │
│    mcp-server/dist/       │
│    handlers/quote.js"     │
│                           │
│  import { handleTool }    │◄── Fallback for write tools
│    from "@baozi.bet/      │
│    mcp-server/dist/       │
│    tools.js"              │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Solana Mainnet (RPC)     │
│  Program ID:              │
│  FWyTPzm5cfJwRKzfksc...   │
│  Network: mainnet-beta    │
└───────────────────────────┘
```

## What Changed from Initial PR

The original PR #59 used **subprocess spawning** (`spawn("npx", ["@baozi.bet/mcp-server"])`) and JSON-RPC over stdio. This has been completely replaced with **direct handler imports**:

| Before (Rejected) | After (This Fix) |
|---|---|
| `spawn("npx", ["@baozi.bet/mcp-server"])` | `import { listMarkets } from "@baozi.bet/mcp-server/dist/handlers/markets.js"` |
| JSON-RPC over stdio pipe | Direct function calls |
| 2s init delay + 1s call delay | Instant, no delays |
| HTTP proxy fallback | No proxy needed |
| `execMcpToolHttp()` function | Removed entirely |
| Simulated MCP protocol | Real handler functions |

### Files Modified

- **`src/services/mcp-client.ts`** — Complete rewrite. Now imports `listMarkets`, `getMarket`, `getQuote`, `getPositions`, `listRaceMarkets`, `getRaceMarket`, `getRaceQuote`, `handleTool`, `PROGRAM_ID`, `NETWORK` directly from `@baozi.bet/mcp-server/dist/`. The `execMcpTool()` function maps tool names to handler functions with a `handleTool()` fallback.
- **`src/services/market-service.ts`** — Rewritten to use direct handler imports. Removed HTTP proxy support. Added `getProtocolInfo()` method exposing PROGRAM_ID and NETWORK.
- **`src/index.ts`** — Updated exports to include all direct handler re-exports.
- **`src/cli.ts`** — Removed `--http` and `--http-url` options (no longer needed).
- **`tsconfig.json`** — Changed to `NodeNext` module resolution for ESM compatibility.
- **`src/tests/run.ts`** — Added comprehensive LIVE MCP integration tests hitting Solana mainnet.

## Live Execution Results

**Date:** 2026-02-21  
**Wallet:** `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`  
**Package:** `@baozi.bet/mcp-server@5.0.0`  
**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`  
**Network:** `mainnet-beta`

### Test Results: 76 passed, 0 failed

```
📝 Parser Tests — 18/18 ✓
💾 Database Tests — 20/20 ✓
🔗 Integration Tests (dry run) — 12/12 ✓
🔴 LIVE MCP Integration Tests (Solana Mainnet) — 26/26 ✓
```

### Live Solana Data Retrieved

- **79 markets** fetched from Solana mainnet via `listMarkets()`
- **25 race markets** fetched via `listRaceMarkets()`
- **Market details** fetched for real on-chain PDA `7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj`
- **Live quote** computed: 0.1 SOL Yes bet → payout calculation with real pool data
- **Positions** checked for wallet `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`
- **PROGRAM_ID** verified: `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ` ✓
- **NETWORK** verified: `mainnet-beta` ✓

### Sample Live Market Data

```
Market: "Will 'Sinners' win BAFTA Best Film 2026?"
PDA: 7SWR3gkSQ5QfTFkezK1e2MkMc3vFx23ZhSmF7EvW1Byj
Status: Active
Pool: 0.00 SOL (Yes: 50.0%)
```

### Handler Import Verification

All handlers imported directly — no subprocess, no simulation:

```typescript
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { getPositions } from "@baozi.bet/mcp-server/dist/handlers/positions.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
```

## How to Verify

```bash
cd calls-tracker
npm install
npm test   # Runs all 76 tests including live Solana mainnet integration
```

The test output will show real market data fetched from Solana mainnet, confirming no stubbed/simulated data.
