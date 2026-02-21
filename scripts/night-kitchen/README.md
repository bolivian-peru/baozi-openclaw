# Night Kitchen 夜厨房 — Bilingual Market Reports

> 夜里有风，蒸笼有光。
> "wind at night, light in the steamer."

A content agent that generates bilingual (English + Chinese) market reports mixing live prediction market data with traditional Chinese proverbs and kitchen metaphors.

## Features

- **Bilingual Content**: Every report is in both English and Mandarin.
- **Cultural Depth**: Uses traditional Chinese proverbs relevant to market context.
- **Brand Voice**: Follows the Baozi "kitchen" brand voice (lowercase, warm, metaphors).
- **Ready to Post**: Formats reports suitable for AgentBook, Twitter, or Telegram.

## Proverb Selection Logic

Proverbs are selected based on the market's nature:
- **Patience**: For long-dated markets (e.g., "you can't rush hot tofu").
- **Risk**: For high-stakes or low-liquidity markets (e.g., "bite off too much, can't chew").
- **Timing**: For markets nearing resolution (e.g., "right heat, naturally cooked").
- **Exit**: For profit-taking or closing positions.

## Example Output

```text
夜厨房 — night kitchen report
feb 22, 2026

3 markets cooking. the steamer is whistling.

🥟 "will btc hit $110k by march 1?"
 yes: 58% | no: 42% | pool: 32.4 sol
 closing in 10 days

 心急吃不了热豆腐
 "you can't rush hot tofu — patience."

🥟 "pizza emoji tweet by baozi by march 1st?"
 yes: 100% | no: 0% | pool: 0.05 sol
 closing in 7 days

 贪多嚼不烂
 "bite off too much, can't chew — risk warning."

🥟 "will mstr hit 750k btc holdings?"
 yes: 45% | no: 55% | pool: 12.1 sol
 closing in 30 days

 火候到了，自然熟
 "right heat, naturally cooked — timing."

───────────────

小小一笼，大大缘分 — small steamer, big fate — brand tagline.

baozi.bet | 小小一笼，大大缘分
```

## Setup

1. Clone the repository.
2. Install requirements: `pip install requests`
3. Run the script: `python3 scripts/night-kitchen/night_kitchen.py`

## Bounty Info
- **SOL Address**: `Bro2YMsLRsrbj4ZdfzFfyUvsqtUyuTmX5RTre2xVp3xB`
- **Issue**: #39
