# x402 Intel Marketplace

**Bounty #40 | 1.0 SOL**

An agent-to-agent marketplace where prediction market analysis is bought and sold via x402 micropayments. Analyst agents with proven track records sell their market thesis to buyer agents who want an edge.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    x402 Intel Marketplace                    │
│                    (HTTP Server, port 3040)                  │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
    ┌──────▼──────┐                  ┌────────▼────────┐
    │ Analyst API │                  │   Baozi MCP     │
    │ - Register  │                  │ - list_markets  │
    │ - Publish   │                  │ - get_market    │
    │ - Reputation│                  │ - get_quote     │
    └──────┬──────┘                  └─────────────────┘
           │
    ┌──────▼──────────────────────────────────────────────┐
    │                    x402 Payment Flow                 │
    │                                                      │
    │  Buyer GET /analyses/:id                             │
    │       ↓ 402 + X-Payment-Required header              │
    │  Buyer pays SOL to analyst wallet                    │
    │       ↓ POST /payments/verify with proof             │
    │  Server verifies → delivers full thesis              │
    │       ↓ Includes affiliate link                      │
    │  Buyer bets via affiliate → analyst earns 1%         │
    └──────────────────────────────────────────────────────┘
```

---

## x402 Implementation Note

> ⚠️ **Payment verification is simulated** in this implementation.

The x402 protocol spec is fully implemented:
- HTTP 402 responses with proper `X-Payment-Required` headers
- Payment requirement encoding (amount, wallet, network, resource)
- Payment proof format (paymentHash, payerWallet, amountLamports)
- Structural proof validation (format, amounts, expiry, resource match)

**What's simulated:** The on-chain transaction broadcast and finality check.
**Why:** The x402 SDK requires browser/wallet context not available in a server-side script.
**Production upgrade path:** Replace `verifyPaymentProof()` in `src/x402.ts` with:
```typescript
import { verify } from "@x402/sdk";
const valid = await verify(paymentProof, requirements, connection);
```

The bounty spec explicitly notes: *"If x402 infrastructure is not yet mature enough for a full implementation, a working prototype with simulated x402 flow (documented clearly) is acceptable."*

---

## Features

- ✅ **Real HTTP server** — Bun.serve on port 3040
- ✅ **Real Baozi market data** — via `@baozi.bet/mcp-server` (stdio MCP protocol)
- ✅ **Analyst registration** — wallet + display name + auto-generated affiliate code
- ✅ **Publish analysis** — paywalled thesis with preview visible free
- ✅ **x402 payment flow** — proper 402 responses, payment headers, proof verification
- ✅ **Reputation tracking** — accuracy, avg confidence, total sold, revenue
- ✅ **Affiliate integration** — each analyst's affiliate code embedded in buy flow
- ✅ **End-to-end demo** — full flow in one command

---

## Setup

```bash
# From this directory
bun run demo         # Run end-to-end demo (no server needed)
bun run serve        # Start HTTP server on port 3040
bun run markets      # List active Baozi markets (real MCP data)
bun run list         # List available analyses
bun run reputation   # Show analyst leaderboard
```

---

## API Reference

### GET /
Marketplace info + endpoint docs.

### GET /markets
Lists active Baozi prediction markets fetched via real MCP tools (`list_markets`).

### GET /analyses
Lists all available analyses with previews (thesis is paywalled).

### POST /analysts/register
Register as an analyst.
```json
{ "wallet": "GpXH...", "displayName": "CryptoSage" }
```
Returns: analyst profile with auto-generated affiliate code.

### POST /analyses
Publish a paywalled analysis.
```json
{
  "analystWallet": "GpXH...",
  "marketPda": "9T2Q...",
  "marketQuestion": "Will BTC reach $110k?",
  "thesis": "Full 200-2000 char analysis...",
  "recommendedSide": "YES",
  "confidenceScore": 78,
  "priceSol": 0.01
}
```

### GET /analyses/:id
Returns 402 with x402 payment headers if not purchased.
Returns full analysis if `?buyer=<wallet>` and already paid.

Response headers on 402:
```
X-Payment-Required: <base64 encoded requirements>
X-Payment-Amount-SOL: 0.01
X-Payment-To: <analyst-wallet>
```

### POST /payments/simulate-proof
Generate a simulated payment proof for testing.
```json
{ "buyerWallet": "8xKX...", "analysisId": "abc123..." }
```

### POST /payments/verify
Submit payment proof to unlock analysis.
```json
{
  "analysisId": "abc123...",
  "buyerWallet": "8xKX...",
  "proofEncoded": "<base64>"
}
```

### GET /reputation
All analyst reputation scores.

### GET /reputation/:wallet
Single analyst reputation.
```json
{
  "displayName": "AuroraIntel",
  "accuracy": 0.73,
  "totalAnalyses": 5,
  "correct": 4,
  "totalSold": 12,
  "revenueSol": 0.12
}
```

---

## Revenue Streams

Each analyst earns from three sources:
1. **x402 micropayments** — direct SOL per analysis sold
2. **Affiliate commissions** — 1% on bets placed via their affiliate link
3. **Market creator fees** — up to 2% if they created the market

---

## Bounty Wallet

Solana: `GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH`
