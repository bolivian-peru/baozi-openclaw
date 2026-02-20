#!/usr/bin/env python3
"""
Market Factory — Auto-Create Baozi Lab Markets from News
Bounty #3 | 1.25 SOL

Monitors RSS feeds + crypto milestones, generates prediction markets,
creates them on-chain via baozi CLI, tracks creator fees.
"""

import argparse, hashlib, json, os, re, subprocess, sys, time
from datetime import datetime, timedelta, timezone
from typing import Optional
import requests

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET","")
MEMORY   = os.path.expanduser("~/.cache/baozi-factory/memory.json")

_key = os.environ.get("LLM_API_KEY","")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1","openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1","gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1","llama-3.1-8b-instant"
    return "http://localhost:11434/v1","llama3.2"
LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL",LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL",LLM_MODEL)

RSS_FEEDS = [
    "https://feeds.feedburner.com/CoinDesk",
    "https://cointelegraph.com/rss",
    "https://feeds.Reuters.com/reuters/technologyNews",
    "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
]
BLOCKED_TERMS = ["impeach","assassination","death","die","killed","murder","genocide"]

# ── Memory ─────────────────────────────────────────────────────────────────────
def load_mem() -> dict:
    try: return json.load(open(MEMORY))
    except: return {"created":[],"seen_headlines":[],"fees_earned":0,"category_stats":{}}

def save_mem(m: dict):
    os.makedirs(os.path.dirname(MEMORY),exist_ok=True)
    # Keep last 500 seen headlines
    m["seen_headlines"] = m["seen_headlines"][-500:]
    json.dump(m, open(MEMORY,"w"), indent=2)

# ── News fetching ──────────────────────────────────────────────────────────────
def fetch_headlines() -> list[dict]:
    headlines = []
    for url in RSS_FEEDS:
        try:
            r = requests.get(url, timeout=8, headers={"User-Agent":"Mozilla/5.0"})
            r.raise_for_status()
            items = re.findall(r'<item>.*?</item>', r.text, re.DOTALL)
            for item in items[:5]:
                title = re.findall(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', item)
                link  = re.findall(r'<link>(.*?)</link>', item)
                if title:
                    headlines.append({"title": title[0][:200], "url": link[0] if link else "", "source": url})
        except: pass
    return headlines

def fetch_crypto_milestones() -> list[dict]:
    """Check BTC/ETH/SOL price for round-number milestones."""
    events = []
    try:
        r = requests.get("https://api.coingecko.com/api/v3/simple/price",
                         params={"ids":"bitcoin,ethereum,solana","vs_currencies":"usd"}, timeout=8)
        prices = r.json()
        for coin, cid in [("BTC","bitcoin"),("ETH","ethereum"),("SOL","solana")]:
            p = float(prices.get(cid,{}).get("usd",0))
            if not p: continue
            # Find nearest round milestone
            for milestone in [50000,60000,70000,80000,90000,100000,200000] if coin=="BTC" else \
                             [2000,3000,4000,5000] if coin=="ETH" else [150,200,250,300,400,500]:
                if abs(p - milestone) / milestone < 0.05:  # within 5%
                    events.append({"title": f"{coin} approaching ${milestone:,} milestone (currently ${p:,.0f})",
                                   "url": "", "source": "coingecko", "coin": coin, "milestone": milestone})
    except: pass
    return events

# ── Market generation ──────────────────────────────────────────────────────────
def headline_to_market(headline: str) -> Optional[dict]:
    """Convert a headline to a prediction market question."""
    # Block terms
    if any(t in headline.lower() for t in BLOCKED_TERMS): return None

    prompt = f"""Convert this news headline into a prediction market question for Baozi.bet.

Headline: "{headline}"

Rules:
- Question must be YES/NO (boolean)
- 10-200 characters
- Objectively verifiable (not opinions)
- Include specific date/metric if possible
- Must resolve within 30 days

If the headline cannot form a good prediction market, respond: SKIP

Otherwise respond in JSON:
{{
  "question": "Will X happen by [date]?",
  "category": one of [crypto,sports,politics,entertainment,technology,finance],
  "closing_days": 3-30,
  "resolution_source": "where to verify the outcome"
}}"""

    try:
        raw = llm(prompt, 150)
        if "SKIP" in raw[:20]: return None
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m: return json.loads(m.group())
    except: pass
    return None

def llm(prompt: str, max_tokens=200) -> str:
    r = requests.post(f"{LLM_BASE}/chat/completions",
        json={"model":LLM_MODEL,"messages":[{"role":"user","content":prompt}],
              "max_tokens":max_tokens,"temperature":0.4},
        headers={"Authorization":f"Bearer {_key or 'ollama'}"},timeout=30)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

# ── Duplicate detection ────────────────────────────────────────────────────────
def is_duplicate(question: str, existing: list) -> bool:
    """Simple keyword overlap check against existing market questions."""
    q_words = set(re.findall(r'\w{4,}', question.lower()))
    for m in existing:
        m_words = set(re.findall(r'\w{4,}', m.get("question","").lower()))
        overlap = len(q_words & m_words) / max(len(q_words), 1)
        if overlap > 0.6: return True
    return False

# ── Market creation ────────────────────────────────────────────────────────────
def create_market(question: str, closing_days: int, dry_run=False) -> Optional[str]:
    """Create market via CLI script. Returns PDA or None."""
    close_dt = (datetime.now(timezone.utc) + timedelta(days=closing_days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    repo_root = os.path.join(os.path.dirname(__file__), "../../")
    script = os.path.join(repo_root, "scripts/create-market")

    cmd = [script, "--question", question[:200], "--closing-time", close_dt]
    print(f"  cmd: {' '.join(cmd[:3])} ...")

    if dry_run:
        fake_pda = hashlib.sha256(question.encode()).hexdigest()[:44]
        print(f"  [dry-run] would create: {question[:60]}")
        return fake_pda

    env = os.environ.copy()
    env["SOLANA_PRIVATE_KEY"] = os.environ.get("SOLANA_PRIVATE_KEY","")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode == 0:
            # Extract PDA from output
            pda_m = re.search(r'[1-9A-HJ-NP-Za-km-z]{32,44}', result.stdout)
            return pda_m.group() if pda_m else "created"
        else:
            print(f"  ❌ {result.stderr[:100]}")
    except Exception as e:
        print(f"  ❌ {e}")
    return None

# ── Main ───────────────────────────────────────────────────────────────────────
def run_once(dry_run=False, verbose=False):
    mem = load_mem()
    seen_set = set(mem["seen_headlines"])

    # Fetch existing markets (for duplicate check)
    try:
        existing = requests.get(f"{BASE_URL}/markets",
                                params={"layer":"lab","limit":100}, timeout=10).json()
        if isinstance(existing, dict): existing = existing.get("markets",[])
    except: existing = []

    # Gather news
    all_news = fetch_headlines() + fetch_crypto_milestones()
    new_news  = [n for n in all_news if n["title"] not in seen_set]
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] {len(all_news)} headlines, {len(new_news)} new")

    created = 0
    for news in new_news[:20]:
        title = news["title"]
        seen_set.add(title)

        market = headline_to_market(title)
        if not market:
            if verbose: print(f"  SKIP: {title[:60]}")
            continue

        q = market.get("question","")
        if not q or is_duplicate(q, existing + [{"question":x["question"]} for x in mem["created"]]):
            if verbose: print(f"  DUPE: {q[:60]}")
            continue

        days = max(1, min(30, int(market.get("closing_days", 7))))
        if verbose: print(f"  CREATE: {q[:60]} | {days}d")

        pda = create_market(q, days, dry_run)
        if pda:
            entry = {"question": q, "pda": pda, "category": market.get("category","?"),
                     "created_at": int(time.time()), "source": title[:80]}
            mem["created"].append(entry)
            cat = market.get("category","other")
            mem["category_stats"][cat] = mem["category_stats"].get(cat,0) + 1
            created += 1
            time.sleep(5)

    mem["seen_headlines"] = list(seen_set)
    save_mem(mem)

    print(f"  Created: {created} markets | Total: {len(mem['created'])} | Fees pending: {len(mem['created'])*0.005:.3f} SOL est")
    return created

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--daemon",  action="store_true")
    args = parser.parse_args()

    if args.daemon:
        while True:
            run_once(args.dry_run, args.verbose)
            time.sleep(30 * 60)
    else:
        run_once(args.dry_run, args.verbose)
