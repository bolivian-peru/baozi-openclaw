# PROOF.md — Live Execution Results

> Generated: 2026-02-20 23:15 PST  
> Node: v25.4.0  
> Package: `@baozi.bet/mcp-server@5.0.0`  
> Network: Solana Mainnet  
> Program ID: `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`  
> Wallet: `FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx`

---

## Test Results — 71 Tests, All Passing

```
PASS test/unit.test.mjs      (25 tests)
PASS test/schema.test.mjs    (26 tests)
PASS test/integration.test.mjs (20 tests)

Test Suites: 3 passed, 3 total
Tests:       71 passed, 71 total
```

### Unit Tests (25)
- Config Constants: PROGRAM_ID, MARKET discriminator (8 bytes), RACE_MARKET discriminator (8 bytes)
- Schema Validation: valid data, missing fields, wrong program ID, invalid layer/tier/outcome
- Edge cases: empty proofs, multiple proofs, non-array proofs, null stats

### Schema Tests (26) — Live API
- `GET https://baozi.bet/api/agents/proofs` returns HTTP 200
- Top-level schema: `success`, `proofs[]`, `stats{}`, `oracle{}`
- Stats: `totalProofs` matches array length, `totalMarkets` matches market sum
- Oracle: name, address (base58), program matches `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- Proof fields: id, date, slug, title, layer, tier, markets[]
- Market fields: pda (base58), question, outcome (YES/NO), evidence, txSignature

### Integration Tests (20) — Live Solana RPC
- `PROGRAM_ID.toString()` = `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- `DISCRIMINATORS.MARKET` = `[219, 190, 213, 55, 0, 227, 198, 154]`
- `DISCRIMINATORS.RACE_MARKET` = `[235, 196, 111, 75, 230, 113, 118, 238]`
- `RPC_ENDPOINT` contains "mainnet"
- 5 PDAs verified: exist on-chain, owned by program, correct discriminator
- `getMarket()` decodes PDA, returns readable question
- Transaction signatures confirmed as finalized
- API question matches on-chain question (word overlap ≥ 3)
- `listMarkets()` returns array of market objects with required fields

---

## On-Chain Verification — 19/19 Markets Verified

```
═══════════════════════════════════════════════════
  Baozi Trust Proof Explorer — On-Chain Verification
═══════════════════════════════════════════════════

📡 Fetching proofs from API...
✅ Schema valid — 8 proofs, 19 markets
   Program ID: FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
   Oracle: Grandma Mei (36DypUbxfXUe2sL2hjQ1hk7SH4h4nMUuwUAogs3cax3Q)

🔗 Verifying 19 market PDAs on Solana mainnet...

✅ PDA FswLya9oMFDP... — Exists | Owner valid | Discriminator valid
   "Will a Toyota driver win the 2026 Daytona 500?"

✅ PDA 7zskJSEi1N7w... — Exists | Owner valid | Discriminator valid
   "Will a European team win Six Invitational 2026?"

✅ PDA FhLUBT9jUiYQ... — Exists | Owner valid | Discriminator valid
   "Will FaZe Clan win Six Invitational 2026?"

✅ PDA Ud911AkUhMt3... — Exists | Owner valid | Discriminator valid
   "Will any player score 50+ points in 2026 NBA All-Star Game?"

✅ PDA Bb2CHfAP83x3... — Exists | Owner valid | Discriminator valid
   "Will a Toyota driver win the 2026 Daytona 500?"

✅ PDA 7MCnLAAQF3TQ... — Exists | Owner valid | Discriminator valid
   "Will Figure Skating team gold go to USA/Japan/Canada?"

✅ PDA E4LsDB1uGCTW... — Exists | Owner valid | Discriminator valid (RaceMarket)
   "Which party wins most seats in Bangladesh election?"
   ✅ Tx 2cccaZTX8t5rrPkc... finalized

✅ PDA 7MCnLAAQF3TQ... — Exists | Owner valid | Discriminator valid
   "Will Figure Skating team gold go to USA/Japan/Canada?"
   ✅ Tx 5iTpq2xUQjpusctp... finalized

✅ PDA BnaSyRVhyntW... — Exists | Owner valid | Discriminator valid
   "Will Bad Bunny bring out a guest at Super Bowl LX Halftime?"

✅ PDA 9wEs9zJCHs9p... — Exists | Owner valid | Discriminator valid
   "Will BNP win majority in Bangladesh election?"

✅ PDA B94Z2M9C1LQZ... — Exists | Owner valid | Discriminator valid
   "Will voter turnout exceed 60% in Bangladesh election?"

✅ PDA BhuEXD13DwmJ... — Exists | Owner valid | Discriminator valid
   "Will US non-farm payrolls released this week exceed 200K?"

✅ PDA 9oiL41VuFskG... — Exists | Owner valid | Discriminator valid
   "Will Seattle Seahawks win Super Bowl LX?"

✅ PDA E2UERq3k9xrm... — Exists | Owner valid | Discriminator valid
   "Will Super Bowl LX go to overtime?"

✅ PDA G6aEyTTpjtRD... — Exists | Owner valid | Discriminator valid
   "Will Super Bowl LX total points exceed 49.5?"

✅ PDA 29q8T3rxMS23... — Exists | Owner valid | Discriminator valid
   "Will Italy beat Scotland in Six Nations Feb 7?"

✅ PDA 7eCvAX8JSVun... — Exists | Owner valid | Discriminator valid
   "Will Arsenal beat Sunderland Feb 7?"

✅ PDA CuWF932TijWQ... — Exists | Owner valid | Discriminator valid
   "Will England beat Wales in Six Nations Feb 7?"

✅ PDA DY37aqGN8EdX... — Exists | Owner valid | Discriminator valid
   "Will Manchester United beat Tottenham Feb 7?"

═══════════════════════════════════════════════════
  Results: 19/19 markets verified on-chain ✅
═══════════════════════════════════════════════════
```

---

## MCP Handler Integration

All handlers imported directly from `@baozi.bet/mcp-server@5.0.0` — no subprocess, no simulation:

```javascript
import { getMarket, listMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getRaceMarket } from '@baozi.bet/mcp-server/dist/handlers/race-markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { handleTool } from '@baozi.bet/mcp-server/dist/tools.js';
import { PROGRAM_ID, DISCRIMINATORS, RPC_ENDPOINT } from '@baozi.bet/mcp-server/dist/config.js';
```

Live results:
- `listMarkets('active')`: 20 markets returned
- `getMarket(pda)`: Successfully decodes on-chain market data
- `getRaceMarket(pda)`: Successfully decodes race market (multi-outcome)
- `getQuote(pda, 'Yes', 0.01)`: Returns quote data for active markets
- `handleTool('list_markets', ...)`: MCP tool interface operational
- `PROGRAM_ID.toString()` = `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ` ✅
- `DISCRIMINATORS.MARKET` = `[219, 190, 213, 55, 0, 227, 198, 154]` ✅
- `DISCRIMINATORS.RACE_MARKET` = `[235, 196, 111, 75, 230, 113, 118, 238]` ✅

---

## Verification Checks Performed

For each market PDA returned by `/api/agents/proofs`:

1. **PDA Existence** — Account fetched from Solana mainnet via `@solana/web3.js`
2. **Owner Validation** — `info.owner === FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
3. **Discriminator Check** — First 8 bytes match MARKET or RACE_MARKET discriminator
4. **Question Cross-Reference** — On-chain question decoded via `getMarket()`/`getRaceMarket()` and displayed
5. **Tx Signature Verification** — Transaction signatures confirmed as finalized on Solana
6. **Schema Validation** — API response structure validated before rendering
