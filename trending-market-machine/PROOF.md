# PROOF.md — Live Integration Proof

**Agent:** Trending Market Machine  
**Bounty:** #42 (1.0 SOL)  
**PR:** #56 on bolivian-peru/baozi-openclaw  
**Date:** 2026-02-20  
**Wallet:** `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`

## ✅ What Changed (Rejection Fix)

The original PR was **rejected** for using stubbed/simulated MCP clients (spawning subprocess via `child_process`). This version:

1. **Replaced `src/mcp-client.ts`** — Direct handler imports from `@baozi.bet/mcp-server/dist/handlers/*.js` instead of subprocess spawning
2. **Uses real handlers:** `listMarkets`, `getMarket`, `getQuote`, `handleTool`, `previewMarketCreation`, `buildLabMarketTx`, etc.
3. **Re-exports config constants:** `PROGRAM_ID`, `NETWORK`, `FEES`, `BET_LIMITS`, `TIMING`
4. **Updated `src/creator.ts`** — Uses direct handler calls for market listing, preview, and creation; dry-run mode calls real `previewMarketCreation` handler
5. **Updated `src/validator.ts`** — Uses `validate_market_params` via real handleTool before HTTP fallback
6. **Added `McpResult` type** to `src/types/index.ts`
7. **ESM throughout:** `"type": "module"`, `NodeNext` module resolution
8. **16 live integration tests** that call real Solana mainnet handlers
9. **Moved tests** to `tests/` directory, uses tsx runner (not jest)

### Pattern follows merged PR #68 (AgentBook Pundit)

```typescript
// Direct handler imports (no subprocess, no HTTP proxy)
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
import { previewMarketCreation } from "@baozi.bet/mcp-server/dist/handlers/market-creation.js";
```

## ✅ Live Solana Mainnet Results

### Configuration Verification
```
PROGRAM_ID: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ ✅
NETWORK:    mainnet-beta ✅
Lab creation fee: 10000000 lamports (0.01 SOL)
Lab platform fee: 300 bps (3%)
Min bet: 0.01 SOL, Max bet: 100 SOL
Betting freeze: 300s, Min event buffer: 12h
```

### Live Market Data (from Solana mainnet)
```
Found 79 total markets on-chain
20 active markets with status "Active"
Sample: "Will 'Sinners' win BAFTA Best Film 2026? (Feb 22. Source: bafta.org)"
  - Status: Active
  - Yes: 50%, No: 50%
  - Pool: 0 SOL
  - Betting open: true
```

### Live Quote
```
Quote for "Will 'Sinners' win BAFTA Best Film 2026?":
  valid=true
  impliedOdds=100
  expectedPayout=0.01 SOL
```

### MCP handleTool Results
```
get_creation_fees: ✅ Returns real fee structure with programId FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
get_timing_rules: ✅ Returns v6.3 timing constraints
validate_market_params: ✅ Returns real validation (v6.3 rules)
```

### Market Preview (via previewMarketCreation handler)
```
Question: "Will AZTEC price increase by 20% or more in the next 7 days?"
Preview validation result:
  ruleType: B
  creationFeeSol: 0.01
  platformFeeBps: 300
  estimatedRentSol: 0.005
  totalCostSol: 0.015
  (Correctly flagged missing data source per v6.3 rules)
```

### Trend Scanning (Live)
```
Sources: google-trends, coingecko, hackernews
Total trending topics: 37 from 3 sources
Unique after dedup: 17
Active Baozi markets checked for dedup: 20 (on-chain)
```

## ✅ Test Results

### Unit Tests (33/33 passed)
```
▶ isDuplicateTopic      — 4/4 ✅
▶ deduplicateTopics     — 3/3 ✅
▶ classifyMarketType    — 4/4 ✅
▶ validateQuestion      — 5/5 ✅
▶ calculateCloseTime    — 3/3 ✅
▶ generateMarketProposal — 4/4 ✅
▶ validateProposalLocally — 10/10 ✅
```

### Live Integration Tests (16/16 passed)
```
📋 Configuration Tests:
  ✅ PROGRAM_ID matches expected Baozi mainnet (0ms)
  ✅ NETWORK is mainnet-beta (0ms)
  ✅ FEES are configured (0ms)
  ✅ BET_LIMITS are configured (0ms)
  ✅ TIMING constraints are configured (0ms)

🏗️ Market Creation Handler Tests:
  ✅ getAllCreationFees() returns fee structure (0ms)
  ✅ getAllPlatformFees() returns fee structure (0ms)
  ✅ getTimingConstraints() returns constraints (0ms)

🛠️ handleTool Tests:
  ✅ handleTool('get_creation_fees') works (0ms)
  ✅ handleTool('get_timing_rules') works (0ms)
  ✅ handleTool('validate_market_params') works (1ms)

🔗 Live Handler Tests (Solana Mainnet RPC):
  ✅ listMarkets() returns live on-chain data (32293ms)
  ✅ getMarket() returns specific market details (175ms)
  ✅ getQuote() returns valid quote for active market (2284ms)

📡 execMcpTool Wrapper Tests:
  ✅ execMcpTool('list_markets') returns markets (228ms)
  ✅ execMcpTool('get_market') returns market detail (121ms)

Results: 16 passed, 0 failed, 0 skipped (35102ms)
```

## ✅ No Stubs, No Simulations

Every MCP call in this codebase goes through **direct handler imports** from `@baozi.bet/mcp-server@5.0.0`:

| Function | Source | Used For |
|----------|--------|----------|
| `listMarkets()` | `handlers/markets.js` | Fetching existing markets for dedup |
| `getMarket()` | `handlers/markets.js` | Getting market details |
| `getQuote()` | `handlers/quote.js` | Calculating bet quotes |
| `handleTool()` | `tools.js` | validate_market_params, fees, timing |
| `previewMarketCreation()` | `handlers/market-creation.js` | Dry-run market preview |
| `buildLabMarketTx()` | `handlers/market-creation.js` | Building creation transactions |
| `getAllCreationFees()` | `handlers/market-creation.js` | Fee structure |
| `getAllPlatformFees()` | `handlers/market-creation.js` | Platform fees |
| `getTimingConstraints()` | `handlers/market-creation.js` | Timing rules |
| `PROGRAM_ID` | `config.js` | FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ |
| `NETWORK` | `config.js` | mainnet-beta |

**Zero subprocess spawning. Zero HTTP proxy. Zero simulated data.**
