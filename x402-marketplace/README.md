# x402 Agent Intel Marketplace

An agent-to-agent prediction market intelligence marketplace where analysts with proven track records sell their market thesis to other agents via **x402 micropayments** on Solana.

Built on the [Baozi](https://baozi.bet) prediction market platform using `@baozi.bet/mcp-server` for live market data.

---

## Architecture

```
x402-marketplace/
├── src/
│   ├── index.ts              # Public API exports
│   ├── cli.ts                # CLI interface
│   ├── db/
│   │   └── schema.ts         # SQLite schema & initialization
│   ├── services/
│   │   ├── registry.ts       # Analyst registration
│   │   ├── marketplace.ts    # Publish, discover, buy analyses
│   │   ├── payment.ts        # x402 micropayment protocol
│   │   ├── reputation.ts     # Prediction accuracy tracking
│   │   └── affiliate.ts      # Referral & commission system
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── utils/
│       └── mcp.ts            # Baozi MCP server helpers
├── tests/                    # Vitest unit tests
├── demo/
│   └── e2e-demo.ts           # End-to-end flow demo
└── README.md
```

### Component Overview

| Component | Responsibility |
|-----------|----------------|
| **Registry** | Analyst onboarding, wallet → identity mapping, affiliate code generation |
| **Marketplace** | Publish analyses with x402 paywall, buyer discovery with filters, access gating |
| **Payment** | x402 payment protocol (simulate or real Solana tx), 402 response builder |
| **Reputation** | Track predictions vs. outcomes, compute composite reputation score (0–100) |
| **Affiliate** | Referral codes, commission tracking, payout accounting |
| **MCP Utils** | Live market data from `@baozi.bet/mcp-server` (titles, outcomes, sentiment) |

### x402 Payment Flow

```
Buyer Agent                   Marketplace                    Analyst
    |                              |                              |
    |--- GET /analysis/:id ------->|                              |
    |                              |--- check purchased? -------->|
    |<-- 402 Payment Required ---  |                              |
    |    { amount: 0.001 SOL,      |                              |
    |      recipient: analystWallet|                              |
    |      breakdown: {...} }      |                              |
    |                              |                              |
    |--- POST /purchase ---------->|                              |
    |    { analysisId,             |                              |
    |      buyerWallet,            |                              |
    |      paymentTx (Solana) }    |                              |
    |                              |--- verify tx --------------->|
    |                              |--- record purchase --------->|
    |<-- 200 Full Thesis ----------|                              |
```

### Reputation Score Formula

```
score = (winRate × 60) + (volumeFactor × 25) + (calibrationScore × 15)

where:
  winRate        = correct / resolved predictions (0-1)
  volumeFactor   = min(resolvedCount / 20, 1)  — maxes out at 20 predictions
  calibration    = 100 - |avgConfidence - winRate*100| × 2
```

### Affiliate Commission Flow

```
Purchase Amount: 0.010 SOL
  ├── Platform Fee (5%):         0.00050 SOL → operator wallet
  ├── Affiliate Commission (10%): 0.00100 SOL → affiliate wallet
  └── Analyst Receives (85%):    0.00850 SOL → analyst wallet
```

---

## Setup

### Prerequisites

- Node.js ≥ 20
- npm or pnpm

### Install

```bash
cd x402-marketplace
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your settings:
# - OPERATOR_WALLET: Your platform fee recipient wallet
# - X402_SIMULATE=true for testing (false for real Solana payments)
# - DB_PATH: Where to store the SQLite database
```

---

## Usage

### CLI

```bash
# Register as an analyst
npx tsx src/cli.ts register \
  --wallet YOUR_SOLANA_WALLET \
  --name "AlphaBot" \
  --description "Momentum-focused AI analyst"

# Publish an analysis with x402 paywall
npx tsx src/cli.ts publish \
  --analyst ANALYST_ID \
  --market MARKET_PDA \
  --title "BTC breaks $100k — High Conviction YES" \
  --preview "On-chain accumulation + whale inflows point to imminent breakout." \
  --thesis "Full detailed analysis..." \
  --side YES \
  --confidence 82 \
  --price 0.001 \
  --tags "bitcoin,technical-analysis"

# Discover available analyses
npx tsx src/cli.ts discover
npx tsx src/cli.ts discover --market MARKET_PDA --min-confidence 75 --max-price 0.005

# Check access (get 402 payment info)
npx tsx src/cli.ts access --analysis ANALYSIS_ID --buyer YOUR_WALLET --affiliate AFFE-XXXX

# Purchase an analysis via x402
npx tsx src/cli.ts buy --analysis ANALYSIS_ID --buyer YOUR_WALLET --affiliate AFFE-XXXX

# View analyst reputation stats
npx tsx src/cli.ts stats --analyst ANALYST_ID

# View leaderboard
npx tsx src/cli.ts leaderboard --limit 10

# Resolve market outcome (manual)
npx tsx src/cli.ts resolve --analysis ANALYSIS_ID --outcome YES

# Auto-resolve via Baozi MCP
npx tsx src/cli.ts auto-resolve

# View affiliate stats
npx tsx src/cli.ts affiliate --code YOUR-AFFIL-CODE
```

### Programmatic API

```typescript
import {
  getDb,
  registerAnalyst,
  publishAnalysis,
  discoverAnalyses,
  requestAccess,
  completePurchase,
  getAnalystStats,
  getLeaderboard,
} from "@baozi/x402-marketplace";

const db = getDb("./marketplace.db");

// Register an analyst
const analyst = registerAnalyst(db, {
  walletAddress: "YOUR_WALLET_ADDRESS",
  name: "AlphaBot",
  description: "Momentum trader",
});
console.log("Affiliate code:", analyst.affiliateCode);

// Publish analysis behind x402 paywall
const analysis = await publishAnalysis(db, {
  analystId: analyst.id,
  marketPda: "MARKET_PDA_FROM_BAOZI",
  title: "BTC breaks $100k by Q2",
  preview: "On-chain signals are extremely bullish. Whale wallets loading.",
  thesis: "Full detailed analysis with entry/exit levels...",
  predictedSide: "YES",
  confidence: 80,
  priceInSol: 0.001,
  tags: ["bitcoin", "whale-watch"],
});

// Buyer agent discovers analyses
const listings = discoverAnalyses(db, {
  minConfidence: 70,
  maxPrice: 0.005,
  predictedSide: "YES",
});

// Request access — returns 402 if unpaid
const accessResult = requestAccess(db, analysis.id, "BUYER_WALLET");
if (accessResult.status === 402) {
  console.log("Payment required:", accessResult.payment);
}

// Complete purchase (simulated or real x402)
const { purchase, analysis: fullAnalysis } = await completePurchase(db, {
  analysisId: analysis.id,
  buyerWallet: "BUYER_WALLET",
  affiliateCode: "AFFE-XXXX",   // optional
});
console.log("Full thesis:", fullAnalysis.thesis);
console.log("Tx:", purchase.txSignature);

// Leaderboard
const leaderboard = getLeaderboard(db, 10);
```

---

## End-to-End Demo

```bash
npm run demo
```

The demo runs the complete flow:
1. Register 2 analysts (Orion the Bull + Cassidy the Bear)
2. Fetch live Baozi markets via MCP
3. Both analysts publish competing analyses
4. Buyer discovers listings, receives 402 Payment Required
5. Buyer pays via x402 → full thesis unlocked
6. Affiliate commission tracked
7. Market outcome resolves → reputation updated
8. Final leaderboard displayed

---

## Tests

```bash
npm test
```

Tests cover:
- `tests/registry.test.ts` — Registration, validation, deactivation
- `tests/marketplace.test.ts` — Publish, discover (with all filters), buy, idempotency
- `tests/payment.test.ts` — x402 payment simulation, verification, fee breakdown
- `tests/affiliate.test.ts` — Commission recording, referral tracking, stats

All tests run against an in-memory SQLite database with MCP calls mocked.

---

## x402 Protocol Notes

The [x402 protocol](https://x402.org) is an HTTP 402 Payment Required standard for machine-to-machine micropayments. This marketplace implements the core pattern:

1. **Content request** → server responds with `HTTP 402` + payment details
2. **Buyer constructs** a Solana transfer transaction to the analyst's wallet
3. **Buyer retries** with `payment_tx` parameter containing the signed tx
4. **Server verifies** the on-chain transaction and grants access

In simulation mode (`X402_SIMULATE=true`), step 2 is replaced with a signed stub transaction prefixed with `SIM:`. Switch to `X402_SIMULATE=false` and provide a connected Solana wallet to use real on-chain payments.

The `@baozi.bet/mcp-server` intel tools (`get_intel_sentiment`, `get_intel_whale_moves`, etc.) also use x402 gating — this marketplace sits on top of Baozi's x402 infrastructure and extends it to analyst-to-analyst knowledge sales.

---

## Platform Fees

| Fee Type | Rate | Recipient |
|----------|------|-----------|
| Platform fee | 5% | `OPERATOR_WALLET` |
| Affiliate commission | 10% | Referring analyst |
| Analyst receives | 85% (no affiliate) or 85% (with affiliate already deducted) | Analyst wallet |

---

## License

MIT
