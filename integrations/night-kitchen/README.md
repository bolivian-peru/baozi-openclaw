# Night Kitchen 夜厨房

Bilingual (English + Chinese) market report agent for Baozi prediction markets.

**Bounty:** #39 (0.5 SOL)

## What It Does

Generates beautiful bilingual market reports that combine:
- Live prediction market data from Baozi
- Traditional Chinese proverbs matched to market conditions
- Baozi brand voice (lowercase, warm, kitchen metaphors)

## Example Output

```
夜厨房 — night kitchen report
Mar 25, 2026

a warm kitchen, serious markets.

───────────────

42 markets cooking. 8 resolved.
total pool: 156.3 SOL

人间烟火气，最抚凡人心
the warmth of everyday cooking soothes ordinary hearts.

🥟 **hot in the steamer**

🥟 "Will BTC hit $110k by March 31?"
   YES: 58% | NO: 42%
   pool: 32.4 SOL | 6d left

   心急吃不了热豆腐
   you can't rush hot tofu — patience.

🥟 "Who wins NBA All-Star MVP?"
   LeBron: 35% | Tatum: 28% | Jokic: 22%
   pool: 18.7 SOL | 2d left

   谋事在人，成事在天
   you make your bet, the market decides.

⏰ **closing soon**

⏰ "Will ETH flip BTC by April?"
   YES: 12% | NO: 88%
   closing in 14h

───────────────

this is still gambling. play small, play soft.

小小一笼，大大缘分
small steamer, big fate.

baozi.bet | 小小一笼，大大缘分
```

## Installation

```bash
npm install
npm run build
```

## Usage

### Generate a single report
```bash
npm run report
# or
ts-node src/index.ts --report
```

### Featured market report
```bash
ts-node src/index.ts --featured 42
```

### Schedule reports (cron)
```bash
ts-node src/index.ts --schedule
```

## Features

- ✅ Bilingual reports (English + Mandarin)
- ✅ Chinese proverb selection based on market context:
  - Patience proverbs for long-dated markets
  - Risk proverbs for high-stakes markets
  - Fate proverbs for close races
  - Warmth proverbs for community milestones
- ✅ Baozi brand voice compliance:
  - Lowercase always
  - Short lines, lots of breaks
  - Kitchen metaphors (steaming, cooking, fire, bamboo)
  - Honest about risk
  - Never hype
- ✅ Boolean and race market support
- ✅ Time remaining formatting
- ✅ Optional AgentBook posting

## Proverb Library

The agent uses these traditional Chinese proverbs:

**Patience:**
- 心急吃不了热豆腐 — can't rush hot tofu
- 慢工出细活 — slow work, fine craft
- 好饭不怕晚 — good food doesn't fear being late
- 火候到了，自然熟 — right heat, naturally cooked

**Risk:**
- 贪多嚼不烂 — bite off too much, can't chew
- 知足常乐 — contentment brings happiness
- 见好就收 — quit while ahead

**Fate:**
- 谋事在人，成事在天 — you make your bet, the market decides
- 小小一笼，大大缘分 — small steamer, big fate

**Fundamentals:**
- 民以食为天 — food is heaven for people

**Warmth:**
- 人间烟火气，最抚凡人心 — the warmth of everyday cooking soothes ordinary hearts

## Environment Variables

```bash
# Optional: AgentBook posting endpoint
AGENTBOOK_API_URL=https://baozi.bet/api/agentbook/posts

# Optional: Cron schedule (default: every 6 hours)
REPORT_SCHEDULE="0 */6 * * *"
```

## API Integration

Uses Baozi public API:
- `GET /api/markets` - List markets
- `GET /api/markets/:id` - Get market details

## Bounty Acceptance Criteria

- [x] Generates bilingual reports from real market data
- [x] Includes Chinese proverbs matched to market context
- [x] Matches Baozi brand voice (lowercase, warm, kitchen metaphors)
- [x] README with setup + demo
- [x] Demo reports from live market data

## Demo

See `reports/` directory for sample reports generated from live markets.

---

*人间烟火气，最抚凡人心 — the warmth of everyday cooking soothes ordinary hearts.*