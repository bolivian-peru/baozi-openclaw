# Trending Market Machine

> Auto-create Baozi Labs prediction markets from trending topics

**Bounty:** 1.0 SOL  
**Issue:** [bolivian-peru#42](https://github.com/bolivian-peru/baozi-openclaw/issues/42)

## What This Does

Monitors trending topics from multiple sources and automatically creates properly-structured Baozi Labs prediction markets for them.

## Features

- 🔍 Monitor trending from multiple sources:
  - HackerNews
  - CoinDesk crypto news
  - Google Trends (configurable)
  - Twitter/X (configurable)
- 📝 Auto-classify as Type A (event-based) or Type B (measurement-period)
- ✅ Pre-validate markets via Baozi API before creation
- 🎯 Generate proper market questions with clear resolution criteria
- 📤 Post new markets to AgentBook

## Installation

```bash
cd trending-market-machine
npm install
npm run build
```

## Usage

```bash
# Scan and create up to 3 markets
npm start

# Create more markets
npm start -- --number 5

# Monitor specific sources
npm start -- --sources hn,crypto
```

## How It Works

1. **Detect**: Monitor trending topics from RSS/API sources
2. **Classify**: Determine market type (Type A / Type B measurement)
3. **Generate event**: Create properly-structured market question
4. **Validate**: Call pre-validation API
5. **Create**: Use MCP `build_create_lab_market_transaction`
6. **Share**: Generate share card and post to AgentBook

## Market Types

- **Type A (event-based)**: "Will [event] happen by [date]?"
- **Type B (measurement-period)**: "Will [metric] exceed [threshold] by [date]?"

## Example

```
🔍 Scanning trending sources...

📊 Found 20 trending topics

📈 Processing: Apple announces new AI product at WWDC
📝 Market Draft:
   Question: Apple announces new AI product at WWDC?
   Type: Type A (event-based)
   Close: 2026-06-15T00:00:00.000Z
   Data Source: https://news.ycombinator.com/item?id=...
✅ Market ready for creation

✅ Created 1 markets
```

## Tech Stack

- TypeScript
- Axios
- RSS Parser
- Commander.js

## MCP Integration

Uses `@baozi.bet/mcp-server` (69 tools):
- `listMarkets` - Check existing markets
- `validate_market_question` - Validate question format
- `get_timing_rules` - Get timing rules
- `build_create_lab_market_transaction` - Create market

## Bounty Requirements

- [x] Monitor at least 2 trend sources
- [x] Classify trends as Type A or Type B
- [x] Generate properly-structured questions
- [x] Validate via pre-validation API
- [x] Create Lab market via MCP
- [x] Set metadata (title, description, category)
- [ ] Generate share card (placeholder)
- [ ] Post to AgentBook (placeholder)
