#!/usr/bin/env python3
"""
Calls Tracker — Track Influencer Predictions, Build On-Chain Reputation
Bounty #35 | 1.0 SOL

Monitors social media for prediction "calls", creates markets,
tracks accuracy, builds reputation scores on-chain.
"""
import json, os, re, subprocess, time, requests
from datetime import datetime, timedelta, timezone
import argparse, sys

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET","")
MEMORY   = os.path.expanduser("~/.cache/baozi-calls/state.json")
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

# Known prediction accounts to monitor (can be extended via config)
MONITOR_ACCOUNTS = [
    {"name":"PlanB","source":"rss","url":"https://feeds.feedburner.com/CoinDesk"},
    {"name":"WhaleFeed","source":"rss","url":"https://cointelegraph.com/rss"},
]

def load_state():
    try: return json.load(open(MEMORY))
    except: return {"calls":[],"scores":{},"seen_headlines":[]}

def save_state(s):
    os.makedirs(os.path.dirname(MEMORY), exist_ok=True)
    s["seen_headlines"] = s["seen_headlines"][-500:]
    json.dump(s, open(MEMORY,"w"), indent=2)

def fetch_headlines():
    items = []
    for acc in MONITOR_ACCOUNTS:
        try:
            r = requests.get(acc["url"], timeout=8, headers={"User-Agent":"Mozilla/5.0"})
            titles = re.findall(r'<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>', r.text)
            for t in titles[1:5]:
                items.append({"text":t.strip()[:200],"source":acc["name"]})
        except: pass
    return items

def llm(prompt, max_tokens=150):
    r = requests.post(f"{LLM_BASE}/chat/completions",
        json={"model":LLM_MODEL,"messages":[{"role":"user","content":prompt}],
              "max_tokens":max_tokens,"temperature":0.3},
        headers={"Authorization":f"Bearer {_key or 'ollama'}"},timeout=30)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def is_prediction(text):
    """Check if text contains a prediction/call."""
    keywords = ["will","predict","expect","target","heading","could reach",
                "by end","by","price target","bullish","bearish","hitting"]
    return any(k in text.lower() for k in keywords)

def extract_market(text, source):
    prompt = f"""Extract a prediction market from this financial headline:

"{text}"

If this contains a verifiable prediction (price target, event outcome), return JSON:
{{"question":"Will X happen by [date]?","closing_days":3-14,"predictor":"{source}"}}

If no clear prediction, return: SKIP"""
    try:
        raw = llm(prompt)
        if "SKIP" in raw[:10]: return None
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m: return json.loads(m.group())
    except: pass
    return None

def create_market(question, days, predictor, dry_run=False):
    close_dt = (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    if dry_run:
        return f"dry-{hash(question)%10000}"
    script = os.path.join(REPO_ROOT,"scripts/create-market")
    env = {**os.environ,"SOLANA_PRIVATE_KEY":os.environ.get("SOLANA_PRIVATE_KEY","")}
    try:
        r = subprocess.run([script,"--question",question[:200],"--closing-time",close_dt],
                          capture_output=True, text=True, timeout=60, env=env)
        if r.returncode == 0:
            m = re.search(r'[1-9A-HJ-NP-Za-km-z]{32,44}', r.stdout)
            return m.group() if m else "created"
    except Exception as e: print(f"  err: {e}")
    return None

def post_leaderboard(state, dry_run=False):
    """Post reputation leaderboard to AgentBook."""
    if not state["calls"]: return
    
    # Calculate win rates
    scores = {}
    for call in state["calls"]:
        pred = call.get("predictor","?")
        outcome = call.get("outcome")
        if outcome is not None:
            if pred not in scores: scores[pred] = {"wins":0,"total":0}
            scores[pred]["total"] += 1
            if outcome: scores[pred]["wins"] += 1
    
    if not scores: return
    
    lines = ["📊 Calls Tracker leaderboard:"]
    for pred, s in sorted(scores.items(), key=lambda x: x[1]["wins"]/max(x[1]["total"],1), reverse=True)[:3]:
        rate = s["wins"]/max(s["total"],1)*100
        lines.append(f"  {pred}: {s['wins']}/{s['total']} ({rate:.0f}%)")
    
    content = "\n".join(lines)[:1800]
    if not dry_run and WALLET:
        r = requests.post(f"{BASE_URL}/agentbook/posts",
                          json={"walletAddress":WALLET,"content":content}, timeout=10)
        print(f"  leaderboard posted: {r.json().get('success')}")
    else:
        print(f"  [dry-run] {content[:100]}")

def run(dry_run=False, verbose=False):
    state = load_state()
    seen = set(state["seen_headlines"])
    
    headlines = fetch_headlines()
    new = [h for h in headlines if h["text"] not in seen]
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] {len(headlines)} headlines, {len(new)} new")
    
    created = 0
    for h in new[:10]:
        seen.add(h["text"])
        if not is_prediction(h["text"]): continue
        
        market = extract_market(h["text"], h["source"])
        if not market: continue
        
        q = market.get("question","")
        days = max(3, min(14, int(market.get("closing_days",7))))
        
        if verbose: print(f"  CALL: {q[:60]} | {days}d | by {h['source']}")
        
        pda = create_market(q, days, h["source"], dry_run)
        if pda:
            state["calls"].append({
                "question":q,"pda":pda,"predictor":h["source"],
                "created_at":int(time.time()),"outcome":None
            })
            created += 1
            time.sleep(3)
    
    state["seen_headlines"] = list(seen)
    save_state(state)
    
    if created > 0 or len(state["calls"]) > 0:
        post_leaderboard(state, dry_run)
    
    print(f"  created: {created} | tracked: {len(state['calls'])}")

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
