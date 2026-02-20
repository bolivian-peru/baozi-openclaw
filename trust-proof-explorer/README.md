# 🥟 Baozi Trust Proof Explorer

A web dashboard for exploring and verifying Baozi prediction market resolution proofs **with real on-chain Solana verification**. Full transparency into oracle decisions, evidence sources, and cryptographic proof validation.

**Live data from:** `GET https://baozi.bet/api/agents/proofs`
**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`

---

## ✨ Features

### On-Chain Verification (New)
- **🔗 PDA Verification** — Every market PDA from the proofs API is verified directly against Solana mainnet via `@solana/web3.js`
- **✅ Owner Check** — Confirms each account is owned by the correct Baozi program (`FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`)
- **🏷️ Discriminator Check** — Validates the first 8 bytes match the Market account discriminator `[219, 190, 213, 55, 0, 227, 198, 154]`
- **📝 Question Cross-Reference** — Decodes the on-chain question field and displays it alongside API data for manual comparison
- **🔗 Transaction Verification** — Confirms tx signatures are finalized on Solana
- **📋 Schema Validation** — Validates API response structure matches expected types before rendering

### Dashboard
- **📊 Oracle Stats** — Total resolutions, verified markets, on-chain proofs, trust score
- **🔍 Resolution Proof Explorer** — Browse every resolution with evidence chain, outcomes, and Solscan links
- **🏗️ 3-Tier Architecture** — Tier 1 (Trustless/Pyth), Tier 2 (Verified/API), Tier 3 (AI Research)
- **⚖️ Trust Comparison** — Baozi vs Polymarket vs traditional bookmakers
- **🔮 Oracle Info** — On-chain oracle address, program ID, API endpoints
- **🔎 Search, Filter & Sort** — Full-text search, tier/category filters, date/count sorting
- **📱 Responsive** — Desktop, tablet, and mobile
- **🌙 Dark Theme** — Native dark UI
- **⚡ Zero Dependencies** — Single HTML file with `@solana/web3.js` CDN

---

## 🔗 On-Chain Verification Flow

```
┌──────────────────────────────────────────────────────────┐
│  Browser loads → fetches /api/agents/proofs              │
│                                                          │
│  1. Schema Validation                                    │
│     ├─ success: boolean ✓                                │
│     ├─ proofs[].markets[].pda: string ✓                  │
│     ├─ oracle.program === PROGRAM_ID ✓                   │
│     └─ All required fields present ✓                     │
│                                                          │
│  2. On-Chain Verification (per market PDA)               │
│     ├─ connection.getAccountInfo(pda)                    │
│     ├─ Check: account exists on Solana ✓                 │
│     ├─ Check: owner === FWyTPzm5...PruJ ✓               │
│     ├─ Check: data[0..8] === Market discriminator ✓      │
│     └─ Decode: on-chain question for cross-reference ✓   │
│                                                          │
│  3. Transaction Verification (where tx signature exists) │
│     ├─ connection.getSignatureStatus(txSig)              │
│     └─ Check: confirmationStatus ∈ {confirmed,finalized} │
│                                                          │
│  Result: Per-market verified/failed badge displayed      │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup

### View Dashboard
```bash
open trust-proof-explorer/index.html
# or serve:
cd trust-proof-explorer && npx serve .
```

### Run Node.js Verification
```bash
cd trust-proof-explorer
npm install
node verify.mjs              # Full verification of all proofs
node verify.mjs --pda <addr> # Verify a single market PDA
```

### Run Tests
```bash
cd trust-proof-explorer
npm install
npm test                      # All 69 tests
npm run test:unit             # 23 unit tests (no network)
npm run test:integration      # Integration tests (hits Solana RPC)
```

---

## 🧪 Test Suite (69 Tests)

### Unit Tests (23 tests) — `test/unit.test.mjs`
- Config constants validation (PROGRAM_ID, discriminators)
- Schema validation with valid data
- Schema validation with missing top-level fields
- Schema validation with invalid oracle fields (wrong program ID)
- Schema validation with invalid proof fields (bad layer/tier)
- Schema validation with invalid market fields (bad outcome/missing pda)
- Edge cases (empty proofs, multiple proofs, non-array proofs)

### Schema Tests (26 tests) — `test/schema.test.mjs`
- Live API HTTP 200 response
- Top-level schema (success, proofs, stats, oracle)
- Stats schema (totalProofs, totalMarkets, byLayer)
- Stats consistency (totalProofs matches proofs.length)
- Oracle schema (name, address, program, network, tiers)
- Oracle program matches `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`
- Proof fields (id, date, slug, title, layer, tier, markets)
- Proof date/createdAt are valid ISO strings
- Unique IDs and slugs
- Market PDA format (valid Solana base58 address)
- Market fields (question, outcome YES/NO, evidence)
- Transaction signature validation
- Source URL validation

### Integration Tests (20 tests) — `test/integration.test.mjs`
- MCP server config matches expected PROGRAM_ID
- Market discriminator bytes match
- RPC endpoint is mainnet
- PDA exists on Solana mainnet (3 PDAs verified)
- PDA owned by Baozi program
- PDA has correct discriminator
- `getMarket()` decodes market successfully
- On-chain question is readable English
- Transaction signatures are confirmed/finalized
- API question matches on-chain question (cross-verification)
- On-chain status code is valid
- `listMarkets()` returns valid market objects

---

## 🏗️ Architecture

### Uses `@baozi.bet/mcp-server` for Real Data

```javascript
import { getMarket, listMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';

// PROGRAM_ID = FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ
// DISCRIMINATORS.MARKET = [219, 190, 213, 55, 0, 227, 198, 154]

const market = await getMarket('FswLya9oMFDP...');
// → { publicKey, question, status, winningOutcome, layer, ... }
```

### Browser Verification (via CDN)

The HTML dashboard uses `@solana/web3.js` from CDN to verify on-chain without Node.js:

```javascript
const conn = new solanaWeb3.Connection('https://api.mainnet-beta.solana.com');
const info = await conn.getAccountInfo(new solanaWeb3.PublicKey(pda));

// Check 1: exists
// Check 2: info.owner === BAOZI_PROGRAM_ID
// Check 3: info.data[0..8] matches Market discriminator
// Check 4: decode question from offset 20
```

---

## 📡 Verified Results

Running `node verify.mjs` against live data:

```
═══════════════════════════════════════════════════
  Results: 18/19 markets verified on-chain
═══════════════════════════════════════════════════
```

All 19 market PDAs exist on Solana and are owned by the correct program. 18/19 have the standard Market discriminator (1 uses the Race Market variant). Transaction signatures with valid lengths are confirmed as finalized.

---

## 📄 License

MIT — Built for [Baozi Openclaw Bounty #43](https://github.com/bolivian-peru/baozi-openclaw/issues/43)
