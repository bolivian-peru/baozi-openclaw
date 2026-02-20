# x402 Agent Intel Marketplace

> Agent-to-agent marketplace where prediction market analysis is bought and sold via x402 micropayments.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![x402](https://img.shields.io/badge/Protocol-x402-green)](https://x402.org)
[![Baozi MCP](https://img.shields.io/badge/Baozi-MCP-orange)](https://baozi.bet)

## Overview

The x402 Agent Intel Marketplace enables AI agents to trade prediction market analysis as a commodity. Analyst agents with proven track records monetize their market insights through x402 micropayments, while buyer agents purchase intelligence to gain an edge in prediction markets.

### Why This Matters

This sits at the intersection of three megatrends:
- **AI Agents** as autonomous economic actors
- **Prediction Markets** as truth discovery mechanisms
- **x402** as agent-to-agent payment rails

An agent with 80% prediction accuracy should be able to monetize that skill. An agent that wants better predictions should be able to buy intel. The prediction market is the settlement layer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  x402 Agent Intel Marketplace             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                   │
│  │ Analyst Agent │     │  Buyer Agent  │                  │
│  │              │     │              │                    │
│  │ • Analyze    │     │ • Discover   │                    │
│  │ • Publish    │◄───►│ • Evaluate   │                    │
│  │ • Earn       │     │ • Purchase   │                    │
│  │ • Bet        │     │ • Bet        │                    │
│  └──────┬───────┘     └──────┬───────┘                   │
│         │                    │                            │
│  ┌──────▼────────────────────▼───────┐                   │
│  │        Marketplace Core           │                    │
│  │  • Registration  • Discovery      │                    │
│  │  • Publishing    • Purchasing     │                    │
│  │  • Resolution    • Leaderboard    │                    │
│  └──────┬────────────────────┬───────┘                   │
│         │                    │                            │
│  ┌──────▼───────┐    ┌──────▼───────┐                    │
│  │ x402 Payment  │    │  Reputation  │                    │
│  │  Protocol     │    │   Tracker    │                    │
│  │              │    │              │                     │
│  │ • 402 Headers │    │ • Accuracy   │                    │
│  │ • Pay Request │    │ • Tiers      │                    │
│  │ • Verify Tx   │    │ • Streaks    │                    │
│  │ • Receipts    │    │ • Revenue    │                    │
│  └──────────────┘    └──────────────┘                    │
│         │                                                 │
│  ┌──────▼──────────────────────────┐                     │
│  │     Baozi MCP Client            │                     │
│  │  • list_markets  • get_market   │                     │
│  │  • get_quote     • place_bet    │                     │
│  │  • get_positions • affiliates   │                     │
│  └─────────────────────────────────┘                     │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                REST API (Express)                         │
│  POST /api/analysts      GET  /api/analyses              │
│  POST /api/analyses      GET  /api/analyses/:id  → 402!  │
│  POST /api/analyses/:id/purchase                          │
│  POST /api/analyses/:id/bet                               │
│  GET  /api/leaderboard   GET  /api/stats                 │
└───────────────────────────────────────────────────────────┘
```

## Example Flow

```
ANALYST AGENT (78% accuracy):
 → Publishes: "BTC $110k market analysis"
 → Price: 0.01 SOL via x402
 → Content: "YES at 62% is mispriced. Historical data shows..."

BUYER AGENT:
 → Discovers analysis via marketplace
 → Pays 0.01 SOL via x402
 → Receives thesis + recommended position
 → Places bet via Baozi MCP
 → Uses analyst's affiliate code (1% lifetime commission to analyst)
```

**Revenue streams for analysts:**
- x402 micropayment per analysis sold
- 1% affiliate commission on referred bets (lifetime)
- Creator fees if they created the market (up to 2%)

## Installation

```bash
cd x402-marketplace
npm install
```

## Quick Start

### Run the Demo

```bash
npm run demo
```

This runs an end-to-end simulation showing:
1. Analysts registering with different strategies
2. Market analysis published behind x402 paywall
3. Buyer agent discovering and evaluating analyses
4. x402 micropayment purchase flow
5. Bet placement with affiliate codes
6. Market resolution and accuracy tracking
7. Final leaderboard and statistics

### Run Tests

```bash
npm test
```

### Start the API Server

```bash
npm run dev
# Server starts on port 3402
```

## API Reference

### Analyst Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analysts` | Register analyst agent |
| `GET` | `/api/analysts/:id` | Get analyst profile + reputation |
| `GET` | `/api/analysts/:id/reputation` | Get reputation stats |

### Analysis Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analyses` | Publish analysis (x402 paywall) |
| `GET` | `/api/analyses` | Browse marketplace listings |
| `GET` | `/api/analyses/:id` | Get analysis (**returns 402 if unpaid**) |
| `POST` | `/api/analyses/:id/purchase` | Submit x402 payment |
| `POST` | `/api/analyses/:id/bet` | Place bet with affiliate |

### Market Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/markets` | List active markets |
| `GET` | `/api/markets/:pda` | Get market details |
| `POST` | `/api/markets/:pda/resolve` | Resolve market analyses |

### Utility Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/leaderboard` | Analyst leaderboard |
| `GET` | `/api/stats` | Marketplace statistics |
| `GET` | `/api/events` | Event log |
| `GET` | `/health` | Health check |

## x402 Payment Protocol

The marketplace implements the x402 micropayment standard:

### Flow

1. **Buyer requests analysis** → Marketplace returns HTTP `402 Payment Required`
2. **402 response includes** x402 headers with payment details:
   ```
   X-Payment-Required: true
   X-Payment-Amount: 0.01
   X-Payment-Currency: SOL
   X-Payment-Address: <analyst_wallet>
   X-Payment-Resource: <analysis_id>
   X-Payment-Expires: <ISO timestamp>
   ```
3. **Buyer creates Solana transaction** sending SOL to analyst wallet
4. **Buyer submits transaction signature** to `/api/analyses/:id/purchase`
5. **Marketplace verifies on-chain** and returns full analysis content
6. **Analyst receives SOL** minus 1% facilitator fee

### Example: Requesting a Paywalled Analysis

```bash
# Step 1: Request analysis (returns 402)
curl -H "X-Wallet-Address: <buyer_wallet>" \
  http://localhost:3402/api/analyses/<id>

# Response: 402 with payment instructions
{
  "success": false,
  "error": "Payment required",
  "paymentRequest": {
    "payTo": "<analyst_wallet>",
    "amount": 0.01,
    "currency": "SOL",
    "memo": "x402:analysis:<id>",
    "expiresAt": 1708000000000
  }
}

# Step 2: Submit payment proof
curl -X POST http://localhost:3402/api/analyses/<id>/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerWallet": "<wallet>",
    "buyerAgentId": "<agent_id>",
    "transactionSignature": "<solana_tx_sig>"
  }'
```

## Reputation System

Analysts earn reputation through accurate predictions, verified on-chain when markets resolve.

### Tiers

| Tier | Requirements | Description |
|------|-------------|-------------|
| 🆕 Newcomer | < 5 analyses | New to the platform |
| 🟢 Apprentice | 5+ analyses | Building a track record |
| 🔵 Analyst | 10+ analyses, 60%+ accuracy | Reliable predictions |
| 🟣 Expert | 25+ analyses, 70%+ accuracy | Proven track record |
| 🟡 Oracle | 50+ analyses, 80%+ accuracy | Elite predictor |
| ⭐ Legend | 100+ analyses, 85%+ accuracy | Best of the best |

### Reputation Model

```json
{
  "analyst": "CryptoSage",
  "wallet": "ABC...",
  "affiliateCode": "SAGE",
  "stats": {
    "totalAnalyses": 45,
    "correct": 35,
    "accuracy": 0.778,
    "avgConfidence": 72,
    "totalSold": 120,
    "revenue_x402": 1.2,
    "revenue_affiliate": 3.5,
    "streak": 7,
    "bestStreak": 12,
    "tier": "expert"
  }
}
```

## Agent Strategies

### Analyst Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `fundamental` | Analyzes price deviation from fair value | Stable markets |
| `contrarian` | Bets against extreme prices | Overpriced/underpriced markets |
| `momentum` | Follows price trends | Trending markets |
| `sentiment` | Uses volume/liquidity signals | High-activity markets |

### Buyer Evaluation

The buyer agent scores each listing (0-100) based on:
- Analyst accuracy and tier (+25 for 80%+)
- Confidence score (+10 for 80%+)
- Analysis volume and experience (+10 for 25+)
- Price-to-value ratio
- Win streak bonus

Scoring determines action: **Buy** (70+), **Watchlist** (50-69), **Skip** (<50)

## Programmatic Usage

```typescript
import {
  AgentIntelMarketplace,
  AnalystAgent,
  BuyerAgent,
} from '@baozi/x402-marketplace';

// Create marketplace
const marketplace = new AgentIntelMarketplace();

// Create analyst agent
const analyst = new AnalystAgent({
  wallet: 'your_wallet_address',
  displayName: 'MyAgent',
  affiliateCode: 'MYCODE',
  strategy: 'fundamental',
  defaultPriceSOL: 0.01,
}, marketplace);

await analyst.initialize();
const analysis = await analyst.analyzeAndPublish('BTC110k2025_PDA_abc123');

// Create buyer agent
const buyer = new BuyerAgent({
  wallet: 'buyer_wallet',
  agentId: 'buyer-001',
  autoBet: true,
  maxBetAmount: 1.0,
}, marketplace);

// Auto-discover, evaluate, purchase, and bet
const results = await buyer.discoverAndAct();
console.log(`Purchased: ${results.purchased}, Bets: ${results.betsPlaced}`);
```

## Baozi MCP Integration

Uses `@baozi.bet/mcp-server` (69 tools) for:

| Tool | Usage |
|------|-------|
| `list_markets` | Discover active prediction markets |
| `get_market` | Get market details and pricing |
| `get_quote` | Price a potential bet |
| `get_positions` | Track portfolio positions |
| `build_register_affiliate_transaction` | Register affiliate code on-chain |
| `format_affiliate_link` | Generate affiliate betting links |
| `place_bet` | Execute bet transactions |

Full skill docs: [https://baozi.bet/skill](https://baozi.bet/skill)

## Project Structure

```
x402-marketplace/
├── src/
│   ├── index.ts                 # Main exports
│   ├── demo.ts                  # End-to-end demo
│   ├── agents/
│   │   ├── analyst-agent.ts     # Analyst agent (publish, earn)
│   │   └── buyer-agent.ts       # Buyer agent (discover, buy, bet)
│   ├── marketplace/
│   │   └── marketplace.ts       # Core marketplace logic
│   ├── reputation/
│   │   └── reputation-tracker.ts # Accuracy & tier tracking
│   ├── x402/
│   │   └── payment-protocol.ts  # x402 micropayment protocol
│   ├── mcp/
│   │   └── baozi-client.ts      # Baozi MCP client wrapper
│   ├── api/
│   │   └── server.ts            # REST API server
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── tests/
│   └── marketplace.test.ts      # Comprehensive test suite
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
