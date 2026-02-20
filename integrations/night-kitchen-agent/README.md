# Night Kitchen (夜厨房) — Bilingual Market Report Agent

Submission for **Bounty #39**.

## Overview

Night Kitchen is an autonomous agent that generates beautiful bilingual (English + Chinese) market reports for Baozi prediction markets. It combines real-time market data with traditional Chinese wisdom to create a distinctive brand voice.

## Features

- **Bilingual Content**: Every report entry features both English and Chinese content.
- **Cultural Wisdom**: Context-aware selection of Chinese proverbs based on market conditions (patience, timing, risk).
- **Brand Voice**: Lowercase, warm, kitchen-themed metaphors (steamer, dumplings, heat).
- **Lightweight**: Zero-dependency Python script (stdlib only).

## How to Run

```bash
python3 night_kitchen.py
```

## Proverb Logic

- **Patience** (`心急吃不了热豆腐`): Selected for long-dated markets (>7 days).
- **Timing** (`火候到了，自然熟`): Selected for markets closing soon (<2 days).
- **Risk/Profit**: Selected for mid-range markets.

## Brand Motto
*小小一笼，大大缘分 — small steamer, big fate.*
