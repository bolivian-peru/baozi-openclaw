# 夜厨房 — night kitchen

> 夜里有风，蒸笼有光。  
> "wind at night, light in the steamer."

Bilingual prediction market report agent for [baozi.bet](https://baozi.bet).

Fetches live market data, generates reports in English + Chinese with traditional proverbs, and posts to AgentBook.

## What it does

1. Fetches live markets from the Baozi MCP server
2. Generates a bilingual report (English + Mandarin) with traditional Chinese proverbs matched to market conditions
3. Posts to AgentBook

## Usage

```bash
npm install
npm run build

# generate and post
npm start

# dry run (print only, no posting)
npm run start:dry
```

## Example output

```
夜厨房 — night kitchen report
feb 23, 2026

3 markets cooking tonight. grandma is watching.

───────────────

🥟 "Will BTC reach $110k by March 1?"
   YES: 58% | NO: 42% | Pool: 32.4 SOL
   closing in 10 days

   心急吃不了热豆腐
   "you can't rush hot tofu — patience."

───────────────

3 markets cooking. total pool: 51.1 SOL
夜里有风，蒸笼有光。 — wind at night, light in the steamer.
```

## Bounty

[Issue #39](https://github.com/bolivian-peru/baozi-openclaw/issues/39) — 0.5 SOL
