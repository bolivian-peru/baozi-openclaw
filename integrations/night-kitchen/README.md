# 夜厨房 — Night Kitchen

> 夜里有风，蒸笼有光。  
> "wind at night, light in the steamer."

**Bounty #39 — 0.5 SOL**

A bilingual market report agent that generates beautiful English + Mandarin reports from live Baozi prediction markets, weaving in traditional Chinese proverbs matched to each market's context.

---

## Features

- **Live market data** via Baozi REST API (`list_markets`, `list_race_markets`)
- **Bilingual reports** (English primary, Mandarin accents) powered by Claude
- **Contextual proverb matching** — 24+ proverbs across 8 themes (patience/timing/risk/luck/profit/warmth/quality/acceptance)
- **Multi-platform posting**: AgentBook + Telegram
- **Nightly cron schedule** (22:00 UTC by default)
- **Two report formats**: full bilingual + short social-sized (<2000 chars)
- **Railway-deployable** with Dockerfile
- **15 vitest tests** covering proverb selection, formatting, odds logic

---

## Example Output

```
夜厨房 — night kitchen report
feb 21, 2026
夜里有风，蒸笼有光
———————————————————————

🥟 "Will BTC hit $110k by March 1?"
   YES: 58% | NO: 42% | pool: 32.4 SOL
   closing in 10 days

   the steam is steady but the lid stays on.
   蒸笼里火候到，但别急着揭盖。

   心急吃不了热豆腐
   "you can't rush hot tofu — patience"

———————————————————————

🏮 "NBA All-Star MVP?"
   LeBron: 35% | Tatum: 28% | Jokic: 22%
   pool: 18.7 SOL | closing in 2 days

   three chefs, one kitchen, only one dish gets served tonight.
   三位名厨争一道菜，命运决定谁上桌。

   谋事在人，成事在天
   "you make your bet, the market decides"

———————————————————————

2 markets cooking.
好饭不怕晚 — good resolution doesn't fear being late.

baozi.bet | 小小一笼，大大缘分
this is still gambling. play small, play soft.
```

---

## Setup

```bash
cd integrations/night-kitchen
npm install

# generate report (dry-run, no posting)
npm run demo

# generate and post to all platforms
npm run post

# run scheduled daemon
npm start
```

### Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Claude for bilingual prose (falls back to template if unset) |
| `AGENTBOOK_API_KEY` | Yes (to post) | AgentBook API key |
| `AGENTBOOK_AGENT_ID` | Yes (to post) | Your AgentBook agent ID |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token for channel posting |
| `TELEGRAM_CHAT_ID` | No | Telegram channel/group ID |
| `WALLET_ADDRESS` | No | Solana wallet |
| `NIGHT_KITCHEN_CRON` | No | Cron schedule (default: `0 22 * * *`) |
| `RUN_ON_START` | No | Run once on container start (`true`/`false`) |

---

## Architecture

```
integrations/night-kitchen/
├── src/
│   ├── cli.ts           # CLI (report / post commands)
│   ├── index.ts         # Cron scheduler + main pipeline
│   ├── baozi-client.ts  # Baozi REST API client
│   ├── proverbs.ts      # 24+ proverbs, contextual matcher
│   ├── report-gen.ts    # Claude bilingual prose generator + formatters
│   ├── agentbook.ts     # AgentBook API client
│   ├── telegram.ts      # Telegram Bot API client
│   └── index.test.ts    # 15 vitest tests
├── Dockerfile
├── railway.toml
├── .env.example
├── package.json
└── tsconfig.json
```

### Proverb Matching Logic

Each market is scored on 4 dimensions to select the most contextually appropriate proverb:

| Condition | Theme Selected |
|---|---|
| Market resolved | warmth |
| Closing ≤ 24h | timing |
| Pool > 50 SOL + skewed odds | risk |
| Pool > 50 SOL + even odds | luck |
| Closing > 14 days out | patience |
| Even odds (within 10%) | luck |
| Skewed odds (40%+ imbalance) | profit |
| Default | warmth |

---

## Railway Deployment

```bash
railway login
railway link
railway up
```

Set env vars in Railway dashboard. The service runs the nightly cron by default.  
Set `RUN_ON_START=true` for immediate execution on deploy.

---

## Tests

```bash
npm test
```

15 tests across: proverb selection, odds computation, date math, report formatting, report length constraints.

---

## Proverb Selection Demo

Each proverb is matched to market context — never random:

| Market Scenario | Proverb | Theme |
|---|---|---|
| BTC market, 10 days out | 心急吃不了热豆腐 — can't rush hot tofu | patience |
| High-pool race, closing today | 火候到了，自然熟 — right heat, cooked | timing |
| 90 SOL pool, 90% skewed | 贪多嚼不烂 — bite off too much | risk |
| 50/50 close race | 谋事在人成事在天 — you plan, fate decides | luck |
| Strong position, take profit | 见好就收 — quit while ahead | profit |
| Market resolved | 小小一笼大大缘分 — small steamer, big fate | warmth |

---

*包子虽小，馅儿实在 — the bun is small, but the filling is real.*

**Solana wallet:** `A6M8icBwgDPwYhaWAjhJw267nbtkuivKH2q6sKPZgQEf`
