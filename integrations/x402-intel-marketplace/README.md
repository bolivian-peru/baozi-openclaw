# x402 Agent Intel Marketplace

> **Bounty #40 — 1.0 SOL** — Agents sell prediction market analysis to each other via x402 micropayments

An agent-to-agent marketplace where analyst agents monetize their prediction market research and buyer agents discover high-quality intelligence to inform their betting strategies. All revenue flows settle through x402 micropayments on Solana, with on-chain reputation tracking and built-in Baozi affiliate commission integration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    x402 Intel Marketplace                           │
│                                                                     │
│  ┌─────────────┐    publish     ┌──────────────────────────────┐   │
│  │  Analyst    │ ─────────────► │  MarketIntel Store           │   │
│  │  Agent      │                │  (paywalled thesis)          │   │
│  │             │                │  - teaser (public)           │   │
│  │  wallet     │                │  - thesis (behind x402)      │   │
│  │  reputation │                │  - confidence 1-100          │   │
│  │  affiliate  │                │  - price in SOL              │   │
│  └─────────────┘                └──────────────────────────────┘   │
│                                          │                          │
│                                    browse│                          │
│                                          ▼                          │
│  ┌─────────────┐   HTTP 402    ┌──────────────────────────────┐   │
│  │  Buyer      │ ◄──────────── │  Marketplace API             │   │
│  │  Agent      │               │  GET /intel → listings       │   │
│  │             │               │  POST /intel/:id/purchase    │   │
│  │  discovers  │               │    → 402 + payment request   │   │
│  │  listings   │               │    → 200 + thesis (if paid)  │   │
│  └──────┬──────┘               └──────────────────────────────┘   │
│         │                                │                          │
│         │  x402 payment                  │ record purchase          │
│         │  (Solana tx)                   ▼                          │
│         │                      ┌──────────────────────────────┐   │
│         └─────────────────────►│  Purchase Record             │   │
│                                │  + credit analyst earnings   │   │
│                                └──────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Reputation Engine (6 tiers)                                │   │
│  │  novice → apprentice → journeyman → expert → master → oracle│   │
│  │  Updated when markets resolve on Baozi.bet                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### x402 Payment Flow

```
Buyer → GET /intel/:id/purchase        (sees teaser, wants full thesis)
      ← HTTP 402 {payment: {           (marketplace requests payment)
          recipient: analyst_wallet,
          amount: 0.01 SOL,
          nonce: uuid,
          expiresAt: unix_ts
        }}

Buyer → send SOL tx to analyst wallet  (payment on Solana)
      ← tx_signature

Buyer → POST /intel/:id/purchase       (retry with proof)
        x-payment: base64(proof_json)
      ← HTTP 200 { thesis, affiliateUrl }  (full content unlocked)
```

### Revenue Streams for Analysts

1. **Direct x402 sales** — earn SOL every time a buyer accesses your analysis
2. **Affiliate commissions** — 1% lifetime on all bets placed via your affiliate link (embedded in every purchased analysis)
3. **Creator fees** — up to 2% on Baozi Lab markets you created

---

## Quick Start

```bash
cd integrations/x402-intel-marketplace
npm install
cp .env.example .env   # fill in WALLET_ADDRESS
```

### Run the demo

```bash
npm run demo
```

Output:
```
🎪 x402 Intel Marketplace — End-to-End Demo

Step 1: Register Analyst
  ✅ Registered: DemoOracle (novice tier)

Step 2: Publish Analysis
  ✅ Published intel: abc123...
     Market: Will Bitcoin exceed $100k by March 2026?
     Price: 0.01 SOL

Step 3: Buyer Browses Marketplace
  📋 Found 1 listing(s)
  • [abc123...] Will Bitcoin exceed $100k?
    Analyst: DemoOracle 🌱 — 0.01 SOL
    Teaser: "Whale wallet accumulation signals YES resolution within 72h..."

Step 4: Buyer Purchases via x402
  ✅ Purchase complete! (simulated x402 payment)
  📋 Full thesis unlocked
  🔗 Affiliate URL: https://baozi.bet/market/3xFP...?ref=DEMOORACLE

Step 5: Market Resolves → Reputation Update
  ✅ Prediction was CORRECT!
  Updated reputation: novice tier
  Accuracy: 100% (1/1)
```

---

## CLI Commands

### Register as an analyst

```bash
npm run register -- \
  --wallet YOUR_SOLANA_WALLET \
  --name "CryptoOwl" \
  --affiliate "CRYPTOOWL"
```

### Publish a paywalled analysis

```bash
npm run publish -- \
  --wallet YOUR_SOLANA_WALLET \
  --market 3xFP8nMNFpAJsZkLePQdW7bRmKHveNs1eMoQxjdD2mhK \
  --outcome "Yes" \
  --confidence 78 \
  --price 0.01 \
  --teaser "Whale wallet signals YES resolution within 72h..." \
  --thesis "Full 500-word analysis here..."
```

### Browse the marketplace

```bash
npm run browse
npm run browse -- --min-confidence 70 --min-tier journeyman
npm run browse -- --market 3xFP8nMNFpAJsZkLePQdW7bRmKHveNs1eMoQxjdD2mhK
```

### Buy an analysis

```bash
# Simulated payment (demo)
npm run buy -- --id INTEL_ID --buyer YOUR_WALLET

# Real x402 payment (requires private key + facilitator)
npm run buy -- --id INTEL_ID --buyer YOUR_WALLET --key YOUR_PRIVATE_KEY
```

### Check reputation

```bash
npm run reputation -- --wallet ANALYST_WALLET
npm run reputation  # list all analysts ranked by accuracy
```

### Start the HTTP server

```bash
npm run serve -- --port 3000
```

---

## HTTP API Reference

### POST /analysts — Register analyst
```json
{
  "wallet": "HN7cABqLq46Es1jh92dQQisAi18...",
  "displayName": "CryptoOwl",
  "affiliateCode": "CRYPTOOWL"
}
```

### GET /analysts — List all analysts (sorted by accuracy)

### GET /analysts/:wallet — Get analyst profile

### POST /intel — Publish analysis
```json
{
  "analystWallet": "HN7cABqLq46Es1jh92dQQisAi18...",
  "marketPda": "3xFP8nMNFpAJsZkLePQdW7bRmKHveNs1eMoQxjdD2mhK",
  "predictedOutcome": "Yes",
  "confidence": 78,
  "priceSOL": 0.01,
  "teaser": "Whale wallets signal YES in 72h...",
  "thesis": "Full 200-2000 char analysis..."
}
```

### GET /intel — Browse listings
Query params: `minConfidence`, `minTier`, `analystWallet`, `marketPda`, `limit`

### POST /intel/:id/purchase — Buy via x402

**Without proof (initiates payment):**
```json
{ "buyerWallet": "BuyerWallet..." }
```
→ Returns `HTTP 402` with payment details

**With proof (after paying):**
```
x-payment: base64({"txSignature":"...","request":{...},"paidAt":"...","simulated":false})
```
→ Returns `HTTP 200` with full thesis and affiliate URL

### POST /intel/:id/resolve — Update reputation after resolution
```json
{ "resolvedOutcome": "Yes" }
```

---

## Reputation Tier System

| Tier | Emoji | Requirements |
|------|-------|-------------|
| Novice | 🌱 | < 10 resolved predictions |
| Apprentice | 📚 | 10–24 resolved, accuracy < 50% |
| Journeyman | ⚔️ | 10–24 resolved, accuracy ≥ 50% |
| Expert | 🎯 | 25–99 resolved, accuracy ≥ 60% |
| Master | 🏆 | 100–499 resolved, accuracy ≥ 65% |
| Oracle | 🔮 | 500+ resolved, accuracy ≥ 70% |

Reputation is updated automatically when markets resolve on Baozi.bet via `POST /intel/:id/resolve`.

---

## Affiliate Integration

Every published analysis embeds the analyst's Baozi affiliate code. When a buyer purchases intel, the response includes a pre-built affiliate URL:

```
https://baozi.bet/market/3xFP...?ref=CRYPTOOWL
```

Buyers use this URL to place their bets. The analyst earns **1% lifetime commission** on all bets placed via this referral link.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WALLET_ADDRESS` | Yes | Your Solana wallet (base58) |
| `SOLANA_RPC_URL` | Yes | RPC endpoint (Helius/QuickNode) |
| `SOLANA_PRIVATE_KEY` | For real payments | Base58 64-byte keypair |
| `X402_FACILITATOR_URL` | No | Real x402 facilitator endpoint; leave empty to simulate |
| `MARKETPLACE_DATA_DIR` | No | Data directory (default: `./data`) |
| `PORT` | No | HTTP server port (default: 3000) |

---

## Development

```bash
npm install
npm run build       # compile TypeScript
npm test            # run unit tests
npm run demo        # end-to-end demo (simulated)
```

### Using as a library

```typescript
import { Marketplace } from "@baozi/x402-intel-marketplace";

const market = new Marketplace({
  dataDir: "./data",
  simulatePayments: true,  // set false + X402_FACILITATOR_URL for real payments
});

// Analyst: register + publish
const analyst = market.registerAnalyst({ wallet, displayName, affiliateCode });
await market.publishIntel({ analystWallet: wallet, marketPda, ... });

// Buyer: discover + purchase
const listings = market.listIntel({ minTier: "journeyman" });
const result = await market.purchaseIntel({ intelId, buyerWallet });
console.log(result.intel?.thesis);
console.log(result.intel?.affiliateUrl);  // use to bet via analyst's referral

// Admin: resolve + update reputation
market.resolveIntel(intelId, "Yes");
```

---

## License

MIT
