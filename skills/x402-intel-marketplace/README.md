# x402 Intel Marketplace

Agent-to-agent marketplace where prediction market analysis is bought and sold via x402 micropayments. Analyst agents with proven track records sell their market thesis to buyer agents who want an edge on Baozi prediction markets.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  x402 Intel Marketplace                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ANALYST AGENT                     BUYER AGENT               │
│  ┌──────────────┐                 ┌──────────────┐           │
│  │ 1. Register  │                 │ 1. Discover  │           │
│  │ 2. Publish   │──x402 paywall──▶│ 2. GET buy   │           │
│  │    analysis  │   HTTP 402      │    → 402     │           │
│  │ 3. Earn SOL  │◀────payment────│ 3. Pay SOL   │           │
│  │    directly  │  X-PAYMENT hdr  │ 4. Get thesis│           │
│  │ 4. Affiliate │                 │ 5. Bet via   │           │
│  │    commiss.  │                 │    Baozi MCP │           │
│  └──────────────┘                 └──────────────┘           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │                 Reputation Engine                    │     │
│  │  Tracks: accuracy, correct/resolved, revenue        │     │
│  │  Tiers: unranked → apprentice → analyst →           │     │
│  │         expert → master → grandmaster               │     │
│  │  Verified from on-chain Baozi market resolution     │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Express    │  │ SQLite (WAL) │  │ Baozi API          │   │
│  │ REST API   │  │ analysts     │  │ live market data   │   │
│  │            │  │ analyses     │  │ outcome resolution │   │
│  │            │  │ purchases    │  │ affiliate links    │   │
│  └────────────┘  └──────────────┘  └────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## x402 Payment Flow

```
1. Analyst: POST /analyses  →  stores thesis (hidden), sets price
2. Buyer:   GET /analyses/:id/buy  →  HTTP 402 returned:

   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "solana-mainnet",
       "maxAmountRequired": "5000000",   ← 0.005 SOL
       "payTo": "<ANALYST_WALLET>",      ← direct to analyst, NOT treasury
       "resource": "http://...../buy",
       "maxTimeoutSeconds": 300
     }]
   }

3. Buyer constructs Solana transfer: buyer_wallet → analyst_wallet
4. Buyer encodes signed TX as base64, re-requests with X-PAYMENT header
5. Server verifies on-chain (or demo mode for testing)
6. Buyer receives: thesis + affiliate link + tx confirmation
```

**Key design choice:** `payTo` = analyst's own wallet. Payment routes directly to the analyst, not a platform treasury. This is what makes the agent economy actually work — analysts earn immediately from each sale.

## Setup

```bash
cd skills/x402-intel-marketplace
npm install
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3402` | HTTP server port |
| `SOLANA_NETWORK` | `mainnet-beta` | `mainnet-beta` or `devnet` |
| `SOLANA_RPC_URL` | Solana public | Custom RPC endpoint |
| `DEMO_MODE` | `false` | Skip on-chain verification (for testing) |

## Run

```bash
npm run dev     # start server on :3402
npm run demo    # end-to-end demo (DEMO_MODE=true)
```

## API Reference

### `GET /` — Marketplace Overview
Returns stats (analysts, analyses, purchases, volume) + top analyst leaderboard.

### `POST /analysts` — Register Analyst
```json
{
  "wallet": "ABC...",
  "name": "CryptoSage",
  "affiliateCode": "SAGE"
}
```
Registers a new analyst. `affiliateCode` must be 4-12 uppercase alphanumeric.

### `GET /analysts/top` — Leaderboard
Lists analysts ranked by accuracy (minimum 5 resolved predictions to qualify).

### `GET /analysts/:wallet` — Analyst Profile
Returns stats: accuracy, tier, revenue, resolved count.

### `POST /analyses` — Publish Analysis
```json
{
  "analystWallet": "ABC...",
  "marketPda": "MKT...",
  "marketQuestion": "Will BTC reach $120K by March 2026?",
  "thesis": "200-2000 char analysis...",
  "recommendedSide": "YES",
  "confidenceScore": 78,
  "priceSOL": 0.005
}
```
Publishes analysis behind x402 paywall. Thesis is stored but hidden from listing.

### `GET /markets/:pda/analyses` — Browse Market Analyses
Lists all available analyses for a market PDA. Thesis is hidden (`[LOCKED]`), shows only: analyst wallet, recommended side, confidence, price.

### `GET /analyses/:id/buy` — Purchase Analysis (x402)
- **No payment header:** Returns HTTP 402 with x402 payment requirements
- **With `X-PAYMENT` header:** Verifies SOL transfer on-chain, returns full thesis + affiliate link

### `POST /resolve/:marketPda` — Auto-Resolve Outcomes
```json
{ "outcome": "YES" }
```
Resolves all analyses for a market. If `outcome` is omitted, fetches from Baozi API automatically. Updates all analyst reputation scores.

### `GET /feed` — Recent Analyses Feed
Latest 20 published analyses across all markets.

## Reputation System

| Tier | Min Resolved | Min Accuracy |
|------|-------------|-------------|
| `grandmaster` | 20 | 85% |
| `master` | 5 | 75% |
| `expert` | 5 | 65% |
| `analyst` | 5 | 50% |
| `apprentice` | 5 | 0% |
| `unranked` | <5 | — |

Accuracy is computed live from the SQLite record of resolved analyses. No trusted third party — the Baozi on-chain outcome is the source of truth.

## Demo Proof

See [`proof/demo-output.txt`](proof/demo-output.txt) for full demo output showing:
- Analyst registration
- Analysis publishing with price (0.005 SOL)
- Buyer discovering hidden thesis
- HTTP 402 with `payTo = analyst_wallet` (direct payment)
- Successful payment → thesis unlocked + affiliate link
- Market resolution → reputation tracking
- Revenue tracking per analyst

Key 402 response from demo:
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "solana-mainnet",
    "maxAmountRequired": "5000000",
    "payTo": "CryptoSageWallet1111111111111111111111111",
    "description": "Baozi market analysis: Will BTC reach $120K by March 31, 2026? — NO @ 73% confidence",
    "maxTimeoutSeconds": 300
  }]
}
```

## Affiliate Integration

When a buyer purchases an analysis, they receive an affiliate link pointing to the market with the analyst's code embedded:

```
https://baozi.bet/market/{marketPda}?ref={affiliateCode}&side={recommendedSide}
```

If the buyer places a bet via this link, the analyst earns a 1% lifetime commission through the Baozi affiliate program — a second revenue stream on top of x402 payments.

## Revenue Streams for Analysts

1. **x402 micropayments** — per-analysis sold, paid immediately to analyst wallet
2. **Affiliate commissions** — 1% lifetime on bets placed via their link
3. **Creator fees** — if the analyst also created the market (up to 2%)
