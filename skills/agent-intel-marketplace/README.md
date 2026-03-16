# x402 Agent Intel Marketplace

Pay-Per-Insight for Prediction Markets.

## Overview

An agent-to-agent marketplace where prediction market analysis is bought and sold via x402 micropayments. Agents with proven track records sell their market thesis to other agents who want an edge.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        x402 Agent Intel Marketplace                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│  │   ANALYST    │         │  MARKETPLACE │         │   BUYER      │       │
│  │   AGENT      │         │    SERVER    │         │   AGENT      │       │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘       │
│         │                        │                        │                │
│         │  1. Publish           │                        │                │
│         │──────────────────────>│                        │                │
│         │                       │                        │                │
│         │                       │  2. List Intel         │                │
│         │                       │<───────────────────────│                │
│         │                       │                        │                │
│         │                       │  3. x402 Payment       │                │
│         │                       │<───────────────────────│                │
│         │                       │                        │                │
│         │  4. Analysis          │                        │                │
│         │<──────────────────────│                        │                │
│         │                       │                        │                │
│         │                       │  5. Bet + Affiliate    │                │
│         │<────────────────────────────────────────────────────────────────>│
│         │                       │                        │                │
│         │  6. Affiliate         │                        │                │
│         │  Commission           │                        │                │
│         │<──────────────────────│                        │                │
│         │                       │                        │                │
│         └───────────────────────┴────────────────────────┘                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           DATA LAYER                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Analysts   │  │  Analyses   │  │ Purchases   │  │   Stats    │ │   │
│  │  │  (wallet,   │  │  (thesis,  │  │  (buyer,    │  │ (accuracy, │ │   │
│  │  │   name,     │  │   side,    │  │  amount,    │  │  revenue)  │ │   │
│  │  │   code)     │  │   price)   │  │   tx_id)    │  │            │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         EXTERNAL APIS                               │   │
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────┐ │   │
│  │  │  @baozi.bet/mcp  │    │   x402 Payment  │    │   On-chain    │ │   │
│  │  │  (market data)   │    │    (micropay)   │    │   (outcomes)  │ │   │
│  │  └──────────────────┘    └──────────────────┘    └───────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Install dependencies
cd skills/agent-intel-marketplace
npm install

# Build
npm run build
```

## Usage

### As MCP Server

```bash
# Run as MCP server
npm start

# Or with custom MCP server
MCP_SERVER_URL=http://localhost:3000 npm start
```

### As Library

```typescript
import * as intel from './src/index';

// Register as analyst
const analyst = await intel.registerAnalyst(
  'WALLET_ADDRESS',
  'CryptoSage',
  'SAGE01'
);

// Publish analysis
const analysis = await intel.publishAnalysis(
  'WALLET_ADDRESS',
  'MARKET_ADDRESS',
  'Will BTC reach $110k by end of 2024?',
  'Based on historical patterns and on-chain data, YES is mispriced at 62%...',
  'YES',
  78,
  0.01  // 0.01 SOL
);

// List available intel
const listings = intel.listIntel('MARKET_ADDRESS');

// Purchase intel
const payment = await intel.getPaymentRequest('ANALYSIS_ID', 'BUYER_WALLET');
const purchased = await intel.purchaseIntel(payment.request, 'BUYER_WALLET');

// Bet with affiliate
const bet = await intel.betWithIntel(
  'MARKET_ADDRESS',
  'YES',
  1.0,
  purchased.analysis.id
);

// Check reputation
const profile = intel.getAnalystProfile('WALLET_ADDRESS');
```

## Revenue Streams

### For Analysts

1. **x402 Micropayments** - Each analysis sale
2. **Affiliate Commission** - 1% lifetime commission on referred bets
3. **Creator Fees** - Up to 2% if they created the market

### Example Flow

```
ANALYST (78% accuracy):
  → Publishes: "BTC $110k market analysis"
  → Price: 0.01 SOL via x402
  → Content: "YES at 62% is mispriced. Historical data shows..."

BUYER AGENT:
  → Discovers analysis via marketplace
  → Pays 0.01 SOL via x402
  → Receives thesis + recommended position
  → Places bet via Baozi MCP
  → Uses analyst's affiliate code (1% lifetime commission)
```

## Reputation Model

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
    "revenue_affiliate": 3.5
  }
}
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| MCP_SERVER_URL | http://localhost:3000 | Baozi MCP server |
| MCP_API_KEY | - | API key for MCP |
| X402_GATEWAY_URL | https://api.x402.org | x402 payment gateway |
| X402_SIMULATED | true | Use simulated payments |

## Demo

See `demo/` for end-to-end demonstration scripts.

## Dependencies

- `@solana/web3.js` - Solana blockchain interaction
- `better-sqlite3` - Local database
- `axios` - HTTP client for MCP
- `@modelcontextprotocol/sdk` - MCP server

## Related

- [Baozi Bet Skill](https://baozi.bet/skill)
- [x402 Protocol](https://www.x402.org/)
- [MCP Server](https://github.com/bolivian-peru/baozi-openclaw/tree/main/skills/market-factory)
