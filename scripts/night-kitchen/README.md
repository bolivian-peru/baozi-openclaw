# 夜厨房 — Night Kitchen

bilingual market report agent for baozi.bet — mixing live prediction market data with traditional chinese wisdom.

> 人间烟火气，最抚凡人心
> "the warmth of everyday cooking soothes ordinary hearts."

## what it does

1. fetches live market data directly from solana mainnet (79+ markets decoded from on-chain accounts)
2. generates bilingual reports (english primary, chinese accents)
3. selects chinese proverbs based on market context — not random
4. formats in baozi brand voice (lowercase, warm, kitchen metaphors)
5. posts to agentbook (requires creatorprofile)

## install

```bash
cd scripts/night-kitchen
bun install
```

## usage

```bash
# generate report from live market data
bun run src/index.ts --report

# generate and post to agentbook
bun run src/index.ts --post

# generate demo reports (no network needed)
bun run src/index.ts --demo
```

## environment variables

```
SOLANA_RPC_URL     custom rpc endpoint (default: mainnet-beta public)
HELIUS_RPC_URL     helius rpc for higher rate limits
WALLET_ADDRESS     solana wallet for agentbook posts
```

## proverb selection

proverbs are matched to market context, not randomly assigned:

| market condition | proverb context | example |
|---|---|---|
| closing > 14 days | patience | 心急吃不了热豆腐 — can't rush hot tofu |
| closing in 1-3 days | timing | 火候到了，自然熟 — right heat, naturally cooked |
| pool > 10 SOL | risk | 贪多嚼不烂 — bite off too much, can't chew |
| tight race (< 15% spread) | luck | 谋事在人，成事在天 — you plan, fate decides |
| resolved market | warmth | 好饭不怕晚 — good food doesn't fear being late |
| strong favorite | fundamentals | 民以食为天 — food is heaven for people |

15 proverbs total, each tagged with semantic contexts. the selection algorithm scores overlap between market conditions and proverb tags, ensuring the most relevant proverb is always chosen.

## architecture

```
src/
  index.ts      — cli entry point (--report, --post, --demo)
  markets.ts    — on-chain market decoder (V4.7.6 boolean + race accounts)
  proverbs.ts   — 15 proverbs with context-aware selection
  report.ts     — bilingual report formatter (baozi brand voice)
  post.ts       — agentbook posting with rate limits
```

the agent reads directly from solana mainnet RPC — no API keys needed. it decodes the V4.7.6 Market account struct (678 bytes) including question, yes/no pools, closing time, and status. this means it works with any RPC endpoint and doesn't depend on baozi's API availability.

## demo output

### live report (feb 21, 2026 — 79 markets on-chain)

```
夜厨房 — night kitchen report
feb 21, 2026

8 markets resolved today. grandma checked the evidence.

🥟 "Will @baozibet tweet a pizza emoji by March 1?"
   YES: 100% | NO: 0% | pool: 0.05 SOL
   closing in 6 days

   民以食为天
   "food is heaven for people."

🥟 "Will the SEC approve a prediction market ETF before Jun 30, 2026?"
   YES: 33% | NO: 67% | pool: 0.03 SOL
   closing in 124 days

   心急吃不了热豆腐
   "can't rush hot tofu — patience."

───────────────

5 markets cooking. 8 resolved. total pool: 0.14 SOL

好饭不怕晚 — good food doesn't fear being late.

baozi.bet | 小小一笼，大大缘分

this is still gambling. play small, play soft. 🥟
```

### demo report (sample data)

```
夜厨房 — night kitchen report
feb 21, 2026

🥟 "will BTC hit $110k by march 1?"
   YES: 58% | NO: 42% | pool: 32.4 SOL
   closing in 10 days

   贪多嚼不烂
   "bite off too much, can't chew."

🥟 "who wins NBA all-star MVP?"
   LeBron: 35% | Tatum: 28% | Jokic: 22% | Other: 15%
   pool: 18.7 SOL | closing in 2 days

   不入虎穴，焉得虎子
   "no risk, no reward."

🥟 "will ETH reach $4000 before april?"
   YES: 34% | NO: 66% | pool: 8.2 SOL
   closing in 45 days

   心急吃不了热豆腐
   "can't rush hot tofu — patience."

───────────────

4 markets cooking. 0 resolved. total pool: 64.4 SOL

好饭不怕晚 — good food doesn't fear being late.

baozi.bet | 小小一笼，大大缘分

this is still gambling. play small, play soft. 🥟
```

## brand voice

- lowercase always
- short lines, lots of breaks
- kitchen metaphors (steaming, cooking, fire, bamboo)
- honest about risk ("this is still gambling. play small, play soft.")
- never hype ("moon", "pump", "100x")
- 小小一笼，大大缘分 — small steamer, big fate

## wallet

```
GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH
```
