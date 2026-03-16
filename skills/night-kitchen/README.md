# Night Kitchen — Bilingual Market Report Agent

> 夜里有风，蒸笼有光。  
> "wind at night, light in the steamer."

Bounty: 0.5 SOL | Difficulty: Medium | Category: Content + Culture

## The Vision

Build an agent that generates beautiful bilingual (English + Chinese) market reports mixing live prediction market data with traditional Chinese proverbs and kitchen metaphors.

Why this matters: Bilingual content is rare in crypto. It signals cultural depth, reaches the massive Chinese crypto community, and creates a distinctive brand voice that stands out from every other "gm, markets are pumping" bot.

## What You're Building

A content agent that:

- ✅ Fetches live market data from Baozi (via MCP tools)
- ✅ Generates bilingual market reports (English + Mandarin)
- ✅ Weaves in traditional Chinese proverbs relevant to market conditions
- ✅ Posts to AgentBook and/or social platforms
- ✅ Matches the Baozi brand voice (lowercase, warm, kitchen metaphors)

## Architecture

```
Baozi MCP Server (listMarkets, listRaceMarkets)
        │
        ▼
  Market Data Fetcher
        │
        ▼
  Proverb Selector (context-aware)
        │
        ▼
  Bilingual Report Generator
        │
        ▼
  AgentBook API / File Output
```

## Quick Start

```bash
cd skills/night-kitchen
npm install
npm run build
node dist/index.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BAOZI_API_URL` | No | Baozi API URL (default: https://baozi.bet/api) |
| `AGENTBOOK_API_URL` | No | AgentBook API URL |
| `AGENTBOOK_TOKEN` | No | Token for posting to AgentBook |
| `POST_TO_AGENTBOOK` | No | Set to "true" to post automatically |
| `REPORT_OUTPUT_PATH` | No | Path to save report (default: ./latest-report.txt) |

## Example Output

```
夜厨房 — night kitchen report
Mar 17, 2026

25 markets cooking. 0 resolved. total pool: 0.0 SOL

🥟 "Will "How far back in time can you understand English?" be covered by a major news outlet (NYT, BBC, CNN, Reuters) before 2026-03-01?"
 YES: 50% | NO: 50% | Pool: 0.0 SOL
 closing soon

 谋事在人，成事在天
 "you make your bet, the market decides."

🥟 "Will the US and Iran reach a nuclear deal by March 7, 2026?"
 YES: 50% | NO: 50% | Pool: 0.0 SOL
 closing soon

 心急吃不了热豆腐
 "you can't rush hot tofu — patience."

──────────────-

好饭不怕晚
good food doesn't fear being late — worth waiting.

baozi.bet | 小小一笼，大大缘分
```

## Proverb Library

The agent selects proverbs based on market context:

### Patience (for long-dated markets)
- 心急吃不了热豆腐 — "you can't rush hot tofu — patience."
- 慢工出细活 — "slow work, fine craft — quality takes time."
- 好饭不怕晚 — "good food doesn't fear being late — worth waiting."
- 火候到了，自然熟 — "right heat, naturally cooked — timing."

### Risk (for high-stakes markets)
- 贪多嚼不烂 — "bite off too much, can't chew — risk warning."
- 民以食为天 — "food is heaven for people — fundamentals."

### Luck (for close races)
- 谋事在人，成事在天 — "you make your bet, the market decides."

### Warmth (for community)
- 小小一笼，大大缘分 — "small steamer, big fate — we're in this together."
- 人间烟火气，最抚凡人心 — "the warmth of everyday cooking soothes ordinary hearts."

### Smart Exits
- 知足常乐 — "contentment brings happiness — take profits."
- 见好就收 — "quit while ahead — smart exits."

## Brand Voice Rules

- ✅ Lowercase always
- ✅ Short lines, lots of breaks
- ✅ Kitchen metaphors (steaming, cooking, fire, bamboo)
- ✅ Honest about risk ("this is still gambling. play small, play soft.")
- ❌ Never hype ("moon", "pump", "100x")

## MCP Tools Used

- `listMarkets` — Fetch active binary (yes/no) markets
- `listRaceMarkets` — Fetch multi-outcome race markets
- `getMarket` — Get details for a specific binary market
- `getRaceMarket` — Get details for a specific race market

## Technical Notes

- Uses `@baozi.bet/mcp-server` directly for market data
- Supports both binary (yes/no) and race (multi-outcome) markets
- Context-aware proverb selection based on:
  - Time remaining until market closes
  - Pool size (stakes)
  - Market type (binary vs race)

## Files

```
night-kitchen/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    └── index.ts    # Main agent code
```

## License

MIT
