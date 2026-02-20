#!/usr/bin/env python3
"""
Night Kitchen (夜厨房) — Bilingual Market Report Agent
Bounty #39 | 0.5 SOL

Generates beautiful bilingual (English + Chinese) market reports
mixing live Baozi data with Chinese proverbs. Posts to AgentBook.
"""
import json, os, random, time, requests
from datetime import datetime, timezone

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET","")

_key = os.environ.get("LLM_API_KEY","")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1","openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1","gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1","llama-3.1-8b-instant"
    return "http://localhost:11434/v1","llama3.2"
LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL", LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL", LLM_MODEL)

PROVERBS = [
    ("水滴石穿", "Water drips through stone"),
    ("千里之行，始于足下", "A journey of a thousand li begins with a single step"),
    ("不入虎穴，焉得虎子", "Nothing ventured, nothing gained"),
    ("塞翁失马，焉知非福", "A loss may turn out to be a gain"),
    ("欲速则不达", "Haste makes waste"),
    ("知己知彼，百战不殆", "Know yourself and your enemy, win every battle"),
    ("众人拾柴火焰高", "Many hands make light work"),
    ("机不可失，时不再来", "Opportunity knocks but once"),
]

def get_markets():
    r = requests.get(f"{BASE_URL}/markets", params={"limit":20,"status":"active"}, timeout=10)
    d = r.json()
    return d if isinstance(d,list) else d.get("markets",d.get("data",[]))

def llm(prompt, max_tokens=250):
    r = requests.post(f"{LLM_BASE}/chat/completions",
        json={"model":LLM_MODEL,"messages":[{"role":"user","content":prompt}],
              "max_tokens":max_tokens,"temperature":0.7},
        headers={"Authorization":f"Bearer {_key or 'ollama'}"},timeout=30)
    return r.json()["choices"][0]["message"]["content"].strip()

def generate_report(markets, dry_run=False):
    if not markets:
        return None

    sorted_m = sorted(markets, key=lambda m: float(m.get("totalPool",0) or 0), reverse=True)
    top3 = sorted_m[:3]
    proverb_zh, proverb_en = random.choice(PROVERBS)

    market_data = "\n".join([
        f"- {m.get('question','?')[:70]} | {m.get('yesOdds','?')}% yes | {m.get('totalPool','?')} SOL"
        for m in top3
    ])

    prompt = f"""You write poetic bilingual prediction market reports mixing data with Chinese wisdom.

Top markets:
{market_data}

Chinese proverb to weave in: "{proverb_zh}" ({proverb_en})

Write a short market report (120-200 chars) that:
- Names 1-2 specific markets with insight
- Weaves in the proverb naturally  
- Alternates between English and Chinese phrases
- Feels wise, not robotic
- Uses 夜厨房 (Night Kitchen) metaphors if natural

Example style: "SOL at 65% yes — 欲速则不达. The kitchen never rushes the broth. BTC market: pool growing, odds still fair."

Write only the report, no explanation."""

    try:
        report = llm(prompt, 200)
        return report[:1800]
    except:
        # Fallback
        m = top3[0]
        return f"夜厨房 report: {m.get('question','?')[:80]} | {m.get('yesOdds','?')}% yes, {m.get('totalPool','?')} SOL pool. {proverb_zh} — {proverb_en}."

def run(dry_run=False):
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] Night Kitchen generating report...")
    markets = get_markets()
    report = generate_report(markets, dry_run)

    if not report:
        print("  no markets"); return

    print(f"  report ({len(report)} chars): {report[:100]}...")

    if not dry_run:
        r = requests.post(f"{BASE_URL}/agentbook/posts",
            json={"walletAddress":WALLET,"content":f"夜厨房 | {report}"},timeout=10)
        print(f"  post: {r.json()}")
    else:
        print(f"  [dry-run] 夜厨房 | {report}")

import argparse, sys
if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--daemon", action="store_true")
    args = p.parse_args()
    if not WALLET and not args.dry_run: print("set BAOZI_WALLET"); sys.exit(1)
    if args.daemon:
        while True: run(args.dry_run); time.sleep(6*3600)
    else: run(args.dry_run)
