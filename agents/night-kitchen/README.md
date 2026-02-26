# 🌙 Night Kitchen — Bilingual Market Report Agent

**Baozi Bounty #39 · 0.5 SOL**

> 小笼包，大命运 — small steamer, big fate.

An agent that generates beautiful **bilingual (English + Mandarin)** market reports from live Baozi prediction market data, weaving in context-aware Chinese proverbs matched to each market's signal.

---

## What Makes This Different

Most agents pick proverbs randomly. Night Kitchen uses a **context-aware proverb engine**:

| Market Signal | Proverb Category | Example |
|---|---|---|
| Long-dated (>7 days) | PATIENCE | 欲速则不达 — can't rush hot tofu |
| Close to resolution (<3 days) | PROFIT_TAKING | 见好就收 — quit while ahead |
| High-stakes, lopsided odds | RISK | 贪多嚼不烂 — bite off too much, can't chew |
| Uncertain, close odds | ACCEPTANCE | 谋事在人，成事在天 — you plan, fate decides |
| Large pool community markets | COMMUNITY | 民以食为天 — the fundamentals always win |

---

## Sample Output

```
🌙 night kitchen report
feb 26, 2026

6 markets on the stove. grandma checked the steamer.

🥟 "will btc hit $110k by march 1?"
  yes: 58% | no: 42%
  pool: 32.4 sol | closing in 3d

  见好就收
  jiàn hǎo jiù shōu
  "quit while ahead — smart exits are cooked, not gambled."

───────────────────────────────

🥟 "who wins nba all-star mvp?"
  lebron: 35% | tatum: 28% | jokic: 22% | other: 15%
  pool: 18.7 sol | closing in 10d

  欲速则不达
  yù sù zé bù dá
  "can't rush hot tofu — patience brings results."

───────────────────────────────

kitchen summary

5 markets cooking. 1 resolved.
total pool: 51.1 sol

民以食为天
mín yǐ shí wéi tiān
"food is heaven for the people — the fundamentals always win."

baozi.bet | 小笼包，大命运
this is still gambling. play small, play soft.
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run
npm start
```

No API key required for market data — uses public Baozi MCP server.

Optional: set `AGENTBOOK_KEY` in your environment to auto-post reports.

---

## MCP Tools Used

| Tool | Purpose |
|---|---|
| `list_markets` | Fetch open prediction markets |
| `get_market` | Get detailed market data per market |
| `get_quote` | Fetch current odds/pricing |
| `list_race_markets` | Fetch race-type markets for variety |

---

## Architecture

```
NightKitchen
  ├── connect()          — MCP stdio transport to @baozi.bet/mcp-server
  ├── buildReport()      — fetches markets, derives signals, selects proverbs
  │     ├── deriveSignals()   — reads time remaining, pool size, odds spread
  │     ├── selectProverb()   — scores proverbs by tag overlap with signals
  │     └── oddsLine()        — formats outcomes into readable odds
  └── postToAgentBook()  — posts to AgentBook (graceful skip if no key)
```

---

## Proverb Library (10 proverbs, 6 categories)

| Chinese | Pinyin | Meaning | Category |
|---|---|---|---|
| 欲速则不达 | yù sù zé bù dá | can't rush hot tofu | PATIENCE |
| 慢工出细活 | màn gōng chū xì huó | slow work, fine craft | PATIENCE |
| 好饭不怕晚 | hǎo fàn bù pà wǎn | good food doesn't fear being late | TIMING |
| 火候到了，自然熟 | huǒ hòu dào le, zì rán shú | right heat, naturally cooked | TIMING |
| 民以食为天 | mín yǐ shí wéi tiān | food is heaven for the people | COMMUNITY |
| 贪多嚼不烂 | tān duō jiáo bù làn | bite off too much, can't chew | RISK |
| 知足者常乐 | zhī zú zhě cháng lè | contentment brings happiness | PROFIT_TAKING |
| 见好就收 | jiàn hǎo jiù shōu | quit while ahead | PROFIT_TAKING |
| 谋事在人，成事在天 | móu shì zài rén, chéng shì zài tiān | you plan, fate decides | ACCEPTANCE |
| 小笼包，大命运 | xiǎo lóng bāo, dà mìng yùn | small steamer, big fate | BRAND |

---

*灶火暖，人心暖 — the warmth of everyday cooking soothes ordinary hearts.*

Built by **FractiAI** · SING 9 · NSPFRNP → ∞⁹
