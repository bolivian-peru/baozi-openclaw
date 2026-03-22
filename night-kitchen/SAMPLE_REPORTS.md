# 🥟 sample reports

three realistic examples showing how night kitchen adapts its bilingual output to different market conditions.

---

## sample 1 — daily digest (patience proverb)

> triggered when: top markets are long-dated (weeks away from resolution), balanced odds, moderate pools

```
🥟 night kitchen report — march 22, 2026

what's steaming in the market kitchen tonight:

1. will bitcoin reach $100k before march 2026?
  48% / 52%
  pool: 47.3 sol

2. will the fed cut rates in q1 2026?
  61% / 39%
  pool: 31.8 sol

3. will solana flip ethereum by market cap in 2026?
  22% / 78%
  pool: 28.4 sol

4. will the us enter a recession in 2026?
  34% / 66%
  pool: 19.1 sol

5. will ai replace 10% of software jobs by end of 2026?
  41% / 59%
  pool: 12.7 sol

---
古语有云 (gǔ yǔ yǒu yún — "as the old saying goes"):
好饭不怕晚
hǎo fàn bù pà wǎn
"a good meal is worth waiting for — good resolution doesn't fear being late"

trade carefully. the kitchen never sleeps. 🥟
```

**proverb logic**: the fed and bitcoin markets are weeks out. no extreme odds. the kitchen is simmering on low heat — `好饭不怕晚` fits perfectly. patience.

---

## sample 2 — closing soon report (timing proverb)

> triggered when: markets resolving in under 24 hours

```
🥟 night kitchen — closing soon report — march 22, 2026

these markets are coming off the fire soon. last call:

1. will the s&p 500 close above 5,200 today?
  67% / 33%
  pool: 8.2 sol
  closes in: 6h

2. will jerome powell mention "inflation" in today's speech?
  79% / 21%
  pool: 5.4 sol
  closes in: 9h

3. will btc close above $88k tonight (utc)?
  44% / 56%
  pool: 14.6 sol
  closes in: 14h

---
古语有云 (gǔ yǔ yǒu yún — "as the old saying goes"):
趁热打铁
chèn rè dǎ tiě
"strike while the iron is hot — the fire won't wait"

the timer is running. nobody knows for sure. 🥟
```

**proverb logic**: three markets closing within 14 hours. the iron is hot. `趁热打铁` — classic timing proverb. the agent sees `hoursUntil < 24` and routes to the `timing` context.

---

## sample 3 — high stakes report (risk proverb)

> triggered when: pool > 10 SOL or extreme odds (>85%)

```
🥟 night kitchen — high stakes report — march 22, 2026

the big pots are on the stove. where the real fire is:

1. will donald trump be impeached in 2026?
  8% / 92%
  pool: 312.0 sol

2. will the us ban tiktok by june 2026?
  14% / 86%
  pool: 184.5 sol

3. will solana flip ethereum by market cap in 2026?
  22% / 78%
  pool: 87.3 sol

4. will crypto spot etfs get sec approval in q1 2026?
  71% / 29%
  pool: 63.9 sol

5. will a major us bank fail in 2026?
  11% / 89%
  pool: 41.2 sol

---
古语有云 (gǔ yǔ yǒu yún — "as the old saying goes"):
小心驶得万年船
xiǎo xīn shǐ dé wàn nián chuán
"caution keeps the ship sailing for ten thousand years"

large pools, real consequences. the market disagrees with itself. 🥟
```

**proverb logic**: trump market has 312 sol pool and 92% no odds — extreme by both measures. the agent flags `totalPool > 10` AND extreme odds `> 85%`. routes to `risk` context. `小心驶得万年船` is the caution proverb — exactly right for a market where the crowd is highly confident but the stakes are enormous.

---

## how context determines the proverb

| market condition | context | example proverb |
|---|---|---|
| closes within 24h | `timing` | 趁热打铁 — strike while hot |
| pool > 10 sol | `risk` | 小心驶得万年船 — caution |
| odds > 85% either way | `risk` | 不入虎穴，焉得虎子 — nothing ventured |
| closes > 7 days away | `patience` | 慢慢来，比较快 — go slow to go fast |
| community/milestone | `community` | 众人拾柴火焰高 — many hands |
| default | `wisdom` | 知之为知之... — know what you know |

the selection is always random within the matched context, so reports feel fresh even for similar market conditions.
