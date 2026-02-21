# Agent Recruiter — Live Integration Proof

**Date:** 2026-02-21T06:52:07Z  
**Network:** Solana mainnet-beta  
**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`  
**Wallet:** `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`  
**MCP Server:** `@baozi.bet/mcp-server@5.0.0`

---

## Test Results: 13/13 PASSED ✅

All unit tests (45/45) and live integration tests (13/13) pass.

### What Changed (v1 → v2)

**v1 (REJECTED):** Used `@modelcontextprotocol/sdk` with HTTP fetch to APIs. Stubbed/simulated market data. No real Solana interaction.

**v2 (THIS PR):** Direct imports from `@baozi.bet/mcp-server/dist/handlers/*`:
- `import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js"`
- `import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js"`
- `import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js"`
- `import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js"`

**Zero stubs. Zero simulations. 100% live Solana mainnet data.**

---

### 1. Live Market Data from Solana Mainnet

Fetched **20 active markets** from the Baozi program on Solana mainnet via `handleTool('list_markets')`:

| Market PDA | Question | YES/NO % | Pool (SOL) |
|---|---|---|---|
| `7SWR3gkS...` | Will "Sinners" win BAFTA Best Film 2026? | 50/50 | 0.00 |
| `9SVkyP5R...` | Will ETH be above $2800 on 2026-02-25? | 50/50 | 0.00 |
| `6HUCrzsp...` | Will SOL close above $170 on 2026-02-25? | 50/50 | 0.00 |
| `9frURmcw...` | Will BTC be above $100K on 2026-02-25? | 50/50 | 0.00 |
| `HASHBqZ6...` | Will "Show HN: Micasa" be covered? | 50/50 | 0.00 |

**Proof:** Data fetched live from `mainnet-beta` via `@baozi.bet/mcp-server/dist/tools.js` → `handleTool()`. Response time: 442ms.

### 2. Single Market Detail

Fetched detailed market via `getMarket()` direct handler import:

```
Market: "Will 'Sinners' win BAFTA Best Film 2026?"
Status: Active
Pool: 0.0000 SOL
Response time: 108ms
```

### 3. Affiliate Code Check (Real MCP)

```
handleTool('check_affiliate_code', { code: 'RECRUITER_TEST_12345' })
Result: { success: true, available: false } (code already taken on-chain)
Response time: 1ms (cached)
```

### 4. Wallet Position Check (Real MCP)

```
handleTool('get_positions', { wallet: 'FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx' })
Result: { success: true, positions: [] } (no positions for this wallet)
Response time: 265ms
```

### 5. Live Quote Calculation

```
getQuote('7SWR3gkS...', 'Yes', 0.01)
Result: { valid: true, impliedOdds: 100.00 }
Response time: 76ms
```

### 6. Full Onboarding Flow (Real MCP Handlers)

The recruiter's onboarding flow now executes against real MCP handlers:
- ✅ Step 1: Contact — pitch generated with affiliate link
- ✅ Step 2: MCP Setup — real installation instructions
- ✅ Step 3: Creator Profile — real MCP tool params generated
- ✅ Step 4: Affiliate Registration — `check_affiliate_code` called via real MCP
- ✅ Step 5: First Bet — `listMarkets()` returns LIVE markets from Solana mainnet

**Onboarding output:**
```
Status: active
Notes: 9
Market suggested: "Will 'Sinners' win BAFTA Best Film 2026?"
```

### 7. All 13 Integration Tests

| # | Test | Duration | Result |
|---|---|---|---|
| 1 | Program ID matches expected | 0ms | ✅ |
| 2 | Fetch live markets via handleTool('list_markets') | 442ms | ✅ |
| 3 | Direct handler: listMarkets('active') | 310ms | ✅ |
| 4 | Direct handler: getMarket(publicKey) | 108ms | ✅ |
| 5 | handleTool('check_affiliate_code') | 1ms | ✅ |
| 6 | handleTool('get_positions') for wallet | 265ms | ✅ |
| 7 | execMcpTool('list_markets') wrapper | 151ms | ✅ |
| 8 | BaoziMCPClient.listMarkets() — real MCP data | 328ms | ✅ |
| 9 | AgentRecruiter.listMarkets() — end-to-end | 300ms | ✅ |
| 10 | Full onboarding flow with real MCP handlers | 437ms | ✅ |
| 11 | Direct handler: getQuote() for live market | 76ms | ✅ |
| 12 | Agent classifier identifies types | 0ms | ✅ |
| 13 | Dashboard renders with real data | 1ms | ✅ |

### 8. Unit Tests: 45/45 PASSED

```
PASS tests/discovery.test.ts
PASS tests/outreach.test.ts
PASS tests/tracking.test.ts
PASS tests/recruiter.test.ts

Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
```

---

## Architecture: Direct MCP Handler Imports

```
agent-recruiter/
├── src/
│   ├── mcp/
│   │   └── client.ts          ← Direct imports from @baozi.bet/mcp-server
│   │       import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js"
│   │       import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js"
│   │       import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js"
│   │       import { PROGRAM_ID } from "@baozi.bet/mcp-server/dist/config.js"
│   ├── recruiter.ts            ← Uses BaoziMCPClient for all market operations
│   ├── onboarding/flow.ts      ← Onboarding uses real MCP handlers
│   ├── discovery/              ← AgentBook discovery via MCP, GitHub via API
│   ├── outreach/               ← Pitch templates (unchanged)
│   └── tracking/               ← Dashboard & store (unchanged)
└── package.json                ← @baozi.bet/mcp-server@^5.0.0 dependency
```

**Pattern matches PR #68 (AgentBook Pundit)** which was merged successfully.
