#!/usr/bin/env python3
"""
Trending Market Machine — Auto-Create Labs Markets from Trends
Bounty #42 | 1.0 SOL

Monitors trending topics (Google Trends, Reddit, crypto feeds),
generates prediction markets, creates them on Baozi Lab.
"""
import json, os, re, subprocess, time, requests
from datetime import datetime, timedelta, timezone
import argparse, sys

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET","")
MEMORY   = os.path.expanduser("~/.cache/baozi-trending/state.json")
REPO_ROOT= os.path.join(os.path.dirname(__file__), "../../")

_key = os.environ.get("LLM_API_KEY","")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1","openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1","gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1","llama-3.1-8b-instant"
    return "http://localhost:11434/v1","llama3.2"
LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL", LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL", LLM_MODEL)

def load_state():
    try: return json.load(open(MEMORY))
    except: return {"seen":[],"created":[]}

def save_state(s):
    os.makedirs(os.path.dirname(MEMORY), exist_ok=True)
    s["seen"] = s["seen"][-1000:]
    json.dump(s, open(MEMORY,"w"), indent=2)

def fetch_crypto_trending():
    """CoinGecko trending coins."""
    topics = []
    try:
        r = requests.get("https://api.coingecko.com/api/v3/search/trending", timeout=8)
        for coin in r.json().get("coins",[])[:5]:
            c = coin.get("item",{})
            topics.append({"topic": f"{c.get('name','')} ({c.get('symbol','')})",
                           "source":"coingecko","score":c.get("score",0)})
    except: pass
    return topics

def fetch_reddit_trending():
    """Reddit r/CryptoCurrency hot posts."""
    topics = []
    try:
        r = requests.get("https://www.reddit.com/r/CryptoCurrency/hot.json?limit=5",
                         headers={"User-Agent":"Mozilla/5.0"}, timeout=8)
        for post in r.json().get("data",{}).get("children",[]):
            p = post.get("data",{})
            topics.append({"topic": p.get("title","")[:100], "source":"reddit",
                          "score": p.get("score",0)})
    except: pass
    return topics

def fetch_rss_trending():
    """RSS news headlines."""
    topics = []
    for url in ["https://feeds.feedburner.com/CoinDesk", "https://cointelegraph.com/rss"]:
        try:
            r = requests.get(url, timeout=6, headers={"User-Agent":"Mozilla/5.0"})
            titles = re.findall(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', r.text)
            for t in titles[1:4]:
                topics.append({"topic":t.strip()[:100],"source":"rss","score":50})
        except: pass
    return topics

def llm(prompt, max_tokens=150):
    r = requests.post(f"{LLM_BASE}/chat/completions",
        json={"model":LLM_MODEL,"messages":[{"role":"user","content":prompt}],
              "max_tokens":max_tokens,"temperature":0.4},
        headers={"Authorization":f"Bearer {_key or 'ollama'}"},timeout=30)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def topic_to_market(topic):
    prompt = f"""Convert this trending topic into a Baozi.bet prediction market question.

Topic: "{topic}"

Rules: YES/NO question, 10-200 chars, objectively verifiable, resolves within 7 days.
If cannot make a good market, respond: SKIP

Respond in JSON:
{{"question":"Will X by [date]?","closing_days":1-7,"category":"crypto|sports|tech|finance|other"}}"""
    try:
        raw = llm(prompt, 120)
        if "SKIP" in raw[:10]: return None
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m: return json.loads(m.group())
    except: pass
    return None

def existing_markets():
    try:
        r = requests.get(f"{BASE_URL}/markets", params={"layer":"lab","limit":100}, timeout=10)
        d = r.json()
        return d if isinstance(d,list) else d.get("markets",[])
    except: return []

def is_duplicate(question, existing):
    q_words = set(re.findall(r'\w{4,}', question.lower()))
    for m in existing:
        m_words = set(re.findall(r'\w{4,}', m.get("question","").lower()))
        if len(q_words & m_words) / max(len(q_words),1) > 0.55: return True
    return False

def create_market(question, days, dry_run=False):
    close_dt = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    script = os.path.join(REPO_ROOT, "scripts/create-market")
    if dry_run:
        print(f"  [dry-run] create: {question[:60]} | close:{close_dt}")
        return "dry-run-pda"
    env = {**os.environ, "SOLANA_PRIVATE_KEY": os.environ.get("SOLANA_PRIVATE_KEY","")}
    try:
        r = subprocess.run([script,"--question",question[:200],"--closing-time",close_dt],
                           capture_output=True, text=True, timeout=60, env=env)
        if r.returncode == 0:
            m = re.search(r'[1-9A-HJ-NP-Za-km-z]{32,44}', r.stdout)
            return m.group() if m else "created"
        print(f"  err: {r.stderr[:80]}")
    except Exception as e: print(f"  err: {e}")
    return None

def run(dry_run=False, verbose=False):
    state = load_state()
    seen = set(state["seen"])
    existing = existing_markets()

    all_topics = fetch_crypto_trending() + fetch_reddit_trending() + fetch_rss_trending()
    new = [t for t in all_topics if t["topic"] not in seen]
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] {len(all_topics)} topics, {len(new)} new")

    created = 0
    for t in new[:8]:
        seen.add(t["topic"])
        market = topic_to_market(t["topic"])
        if not market:
            if verbose: print(f"  skip: {t['topic'][:50]}")
            continue
        q = market.get("question","")
        if not q or is_duplicate(q, existing + [{"question":x} for x in state["created"]]):
            if verbose: print(f"  dupe: {q[:50]}")
            continue
        days = max(1, min(7, int(market.get("closing_days",3))))
        pda = create_market(q, days, dry_run)
        if pda:
            state["created"].append(q)
            created += 1
            time.sleep(3)

    state["seen"] = list(seen)
    save_state(state)
    print(f"  created: {created} | total: {len(state['created'])}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--verbose", action="store_true")
    p.add_argument("--daemon", action="store_true")
    args = p.parse_args()
    if not WALLET and not args.dry_run: print("set BAOZI_WALLET"); sys.exit(1)
    if args.daemon:
        while True: run(args.dry_run, args.verbose); time.sleep(30*60)
    else: run(args.dry_run, args.verbose)
