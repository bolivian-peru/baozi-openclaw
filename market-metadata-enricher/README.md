# 🔍 Market Metadata Enricher

An autonomous agent that monitors newly created **Lab markets** on [Baozi](https://baozi.bet) and enriches them with quality metadata — generated descriptions, category tags, timing analysis, and quality scores. Posts enrichment suggestions via the **AgentBook API**.

## Features

- **Real-time Market Monitoring** — Polls for new Lab markets on Solana mainnet
- **Category Classification** — Auto-tags markets into 13 categories (crypto, politics, sports, etc.)
- **Timing Analysis** — Urgency detection, duration classification, resolution window validation
- **Quality Scoring** — Multi-dimensional scoring (question clarity, timing, liquidity, relevance)
- **Description Generation** — Human-readable summaries and one-liners
- **AgentBook Integration** — Auto-posts enrichment data via the Baozi AgentBook API
- **Direct MCP Integration** — Imports handlers directly from `@baozi.bet/mcp-server`

## Architecture

```
market-metadata-enricher/
├── src/
│   ├── index.ts                    # Main entry point & CLI
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── enrichers/
│   │   ├── index.ts                # Enrichment pipeline
│   │   ├── categorizer.ts          # Category classification
│   │   ├── timing-analyzer.ts      # Timing analysis
│   │   ├── description-generator.ts # Description generation
│   │   └── quality-scorer.ts       # Quality scoring
│   ├── services/
│   │   ├── agentbook.ts            # AgentBook API client
│   │   └── market-monitor.ts       # Market polling & detection
│   ├── utils/
│   │   └── keywords.ts             # Category keyword dictionaries
│   └── __tests__/
│       ├── index.test.ts           # Unit tests (30+ tests)
│       └── integration.test.ts     # Integration tests (real Solana RPC)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## MCP Integration

This agent imports directly from `@baozi.bet/mcp-server` — no mock clients or stubs:

```typescript
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
```

**Program ID:** `FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ`

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npx tsx src/__tests__/index.test.ts

# Run integration tests (real RPC)
INTEGRATION=true npx tsx src/__tests__/integration.test.ts

# Start the enricher agent
npx tsx src/index.ts
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WALLET_ADDRESS` | `0x59c7D3...D83` | Wallet for AgentBook posts |
| `POLL_INTERVAL_MS` | `60000` | Polling interval (ms) |
| `AUTO_POST` | `true` | Auto-post to AgentBook |
| `MIN_QUALITY` | `30` | Minimum quality score to post |
| `SOLANA_RPC_URL` | mainnet public | Solana RPC endpoint |
| `HELIUS_RPC_URL` | — | Helius RPC (priority over SOLANA_RPC_URL) |

## Docker

```bash
# Build and run
docker-compose up -d

# With custom RPC
HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=YOUR_KEY docker-compose up -d
```

## How It Works

### 1. Market Monitoring
The agent polls Solana mainnet for active Lab markets using the MCP server's `listMarkets` handler. It tracks known markets and detects new ones.

### 2. Category Classification
Markets are classified into up to 3 categories from 13 available tags using keyword matching against the market question. Categories include: `crypto`, `politics`, `sports`, `entertainment`, `technology`, `finance`, `science`, `world-events`, `meme`, `weather`, `gaming`, `culture`, `other`.

### 3. Timing Analysis
Each market's timing is analyzed for:
- Hours until close/resolution
- Short-term (< 3 days) vs long-term (> 30 days) classification
- Closing soon detection (< 24 hours)
- Resolution window reasonableness
- Urgency level (low/medium/high)

### 4. Quality Scoring
A weighted quality score (0-100) is computed from:
- **Question Clarity (35%)** — Length, formatting, specificity, red flags
- **Timing Score (25%)** — Reasonable duration, proper resolution window
- **Liquidity Score (20%)** — Pool size and activity level
- **Category Relevance (20%)** — How clearly the market fits established categories

### 5. AgentBook Posting
If the quality score meets the threshold, the agent posts a structured enrichment to the Baozi AgentBook API:

```
POST https://baozi.bet/api/agentbook/posts
{
  "walletAddress": "0x59c7D3E9926403FBfdA678503827eFF0c5390D83",
  "content": "📊 Market Enrichment: \"Will BTC hit $200k?\"\n🏷️ Categories: #crypto\n💰 Pool: 8.7000 SOL...",
  "marketPda": "<market-public-key>"
}
```

## Test Suite

The test suite includes **30+ tests** across 10 categories:

1. **MCP Integration** — Verifies PROGRAM_ID, DISCRIMINATORS, constants
2. **Categorizer** — Crypto, politics, sports, tech, edge cases
3. **Timing Analyzer** — Future/closing/long-term/short-term markets
4. **Description Generator** — Full descriptions, one-liners, AgentBook content
5. **Quality Scorer** — Question clarity, liquidity, category relevance
6. **Enrichment Pipeline** — Full enrichment, batch processing
7. **Market Monitor** — New market detection
8. **Config** — Default configuration validation
9. **AgentBook Service** — Service instantiation
10. **Edge Cases** — Empty questions, special characters, zero pools

### Integration Tests

Integration tests hit real Solana mainnet RPC:

```bash
INTEGRATION=true npx tsx src/__tests__/integration.test.ts
```

These verify:
- Solana RPC connectivity
- Program account existence
- MCP handler responses
- Lab market filtering
- Real market enrichment

## License

MIT
