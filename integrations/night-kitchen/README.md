# 夜厨房 Night Kitchen

> bilingual market report agent with chinese wisdom

generates warm, lowercase, bilingual (english + mandarin) prediction market reports from live [baozi.bet](https://baozi.bet) data. weaves traditional chinese proverbs matched to market context — patience for long-dated markets, risk warnings for high-stakes pools, luck for close races.

## what it does

1. fetches active markets from baozi via `@baozi.bet/mcp-server`
2. selects top markets by pool size
3. matches chinese proverbs to market context (closing soon → patience proverbs, tight race → luck proverbs, etc.)
4. generates bilingual reports in baozi brand voice (lowercase, warm, kitchen metaphors)
5. posts to AgentBook (optional, requires on-chain CreatorProfile)

## example output

```
夜厨房 — night kitchen report
feb 21, 2026

5 markets cooking. grandma is watching the steam.

🥟 "Will BTC hit $110k by March 1?"
   YES: 58% | NO: 42% | Pool: 32.4 SOL
   closing in 10 days

   心急吃不了热豆腐
   "can't rush hot tofu — patience."

🥟 "Who wins NBA All-Star MVP?"
   LeBron: 35% | Tatum: 28% | Jokic: 22% | Other: 15%
   Pool: 18.7 SOL | closing in 2 days

   谋事在人，成事在天
   "you plan, fate decides — you make your bet, the market decides."

───────────────

2 markets featured. 5 total. pool: 51.1 SOL

好饭不怕晚 — good food doesn't fear being late.

baozi.bet | 小小一笼，大大缘分

this is still gambling. play small, play soft.
```

## setup

```bash
cd integrations/night-kitchen
npm install
```

## usage

```bash
# generate report (print to stdout)
npm run dev

# generate short report (AgentBook-sized, under 2000 chars)
npx tsx src/cli.ts report --short

# dry run (no posting)
npx tsx src/cli.ts report --dry-run

# post to AgentBook (requires WALLET_ADDRESS with CreatorProfile)
WALLET_ADDRESS=your_wallet npx tsx src/cli.ts post
```

## proverb matching

proverbs are selected based on market context:

| context | trigger | example proverbs |
|---------|---------|-----------------|
| patience | long-dated markets (>7 days) | 心急吃不了热豆腐, 慢工出细活 |
| risk | high-stakes pools (>20 SOL) | 贪多嚼不烂, 民以食为天 |
| luck | close races (<10% spread) | 谋事在人成事在天, 不入虎穴焉得虎子 |
| closing | markets closing within 24h | 火候到了自然熟, 心急吃不了热豆腐 |
| warmth | resolved markets, milestones | 人间烟火气最抚凡人心, 好饭不怕晚 |
| profit | taking gains | 知足常乐, 见好就收 |

## brand voice rules

- lowercase always
- short lines, lots of breaks
- kitchen metaphors (steaming, cooking, fire, bamboo)
- honest about risk ("this is still gambling. play small, play soft.")
- never hype ("moon", "pump", "100x")

## architecture

```
src/
├── cli.ts          # CLI entry point (commander)
├── index.ts        # main pipeline: fetch → generate → post
├── mcp-client.ts   # direct imports from @baozi.bet/mcp-server
├── proverbs.ts     # 12 proverbs with contextual matching
├── report-gen.ts   # bilingual report + short report generators
└── agentbook.ts    # AgentBook API client (post, cooldown check)
```

## license

MIT
