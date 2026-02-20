#!/usr/bin/env python3
"""
Market Metadata Enricher — Baozi.bet Lab Market Curation
Bounty #12 | 0.75 SOL

Monitors new Lab markets, generates metadata (category/tags/description/quality),
posts suggestions to AgentBook. Runs every 30 min.
"""

import argparse, json, os, sys, time
from datetime import datetime, timezone
from typing import Optional
import requests

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET", "")

_key = os.environ.get("LLM_API_KEY", "")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1","openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1","gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1","llama-3.1-8b-instant"
    return "http://localhost:11434/v1","llama3.2"
LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL", LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL", LLM_MODEL)

SEEN_FILE = os.path.expanduser("~/.cache/baozi-enricher-seen.json")
CATEGORIES = ["crypto","sports","politics","entertainment","weather","technology","finance","other"]

# ── Helpers ────────────────────────────────────────────────────────────────────

def load_seen() -> set:
    try: return set(json.load(open(SEEN_FILE)))
    except: return set()

def save_seen(seen: set):
    os.makedirs(os.path.dirname(SEEN_FILE), exist_ok=True)
    json.dump(list(seen), open(SEEN_FILE, "w"))

def get_markets(layer="lab", limit=50) -> list:
    r = requests.get(f"{BASE_URL}/markets", params={"layer": layer, "limit": limit}, timeout=10)
    r.raise_for_status()
    d = r.json()
    return d if isinstance(d, list) else d.get("markets", d.get("data", []))

def post_to_agentbook(content: str, market_pda: Optional[str] = None) -> dict:
    if not WALLET: raise ValueError("BAOZI_WALLET not set")
    body = {"walletAddress": WALLET, "content": content[:2000]}
    if market_pda: body["marketPda"] = market_pda
    r = requests.post(f"{BASE_URL}/agentbook/posts", json=body, timeout=10)
    return r.json()

def llm(prompt: str, max_tokens=200) -> str:
    r = requests.post(f"{LLM_BASE}/chat/completions",
        json={"model": LLM_MODEL, "messages": [{"role":"user","content":prompt}],
              "max_tokens": max_tokens, "temperature": 0.3},
        headers={"Authorization": f"Bearer {_key or 'ollama'}"},
        timeout=30)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

# ── Metadata generation ────────────────────────────────────────────────────────

def classify_market(question: str) -> dict:
    """Generate category, tags, description, quality score, timing notes."""
    q = question.strip()

    prompt = f"""Analyze this prediction market question for Baozi.bet:

"{q}"

Respond in JSON only (no explanation):
{{
  "category": one of {CATEGORIES},
  "tags": [3-5 keywords],
  "description": "1-2 sentence plain English summary",
  "quality": 1-5 (1=vague/bad, 5=clear/excellent),
  "issues": ["list any problems: vague wording, missing data source, subjective outcome, etc"]
}}"""

    try:
        raw = llm(prompt, max_tokens=200)
        # Extract JSON
        import re
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if m: return json.loads(m.group())
    except Exception as e:
        pass

    # Fallback: rule-based
    q_lower = q.lower()
    cat = "other"
    for c, kws in [
        ("crypto", ["btc","eth","sol","bitcoin","ethereum","solana","crypto","token","price"]),
        ("sports", ["nba","nfl","team","game","score","championship","player","win","season"]),
        ("politics", ["president","election","vote","congress","senate","law","policy","government"]),
        ("technology", ["ai","model","gpt","release","launch","api","software","app"]),
        ("finance", ["stock","market","index","rate","fed","inflation","gdp"]),
    ]:
        if any(kw in q_lower for kw in kws): cat = c; break

    stars = 3
    issues = []
    if len(q) < 20: stars -= 1; issues.append("question too short")
    if "?" not in q: issues.append("not a question")
    if not any(c.isdigit() for c in q): issues.append("no specific target/date")

    return {"category": cat, "tags": [], "description": q, "quality": stars, "issues": issues}

def analyze_timing(market: dict) -> tuple[str, list]:
    """Check if closing time is reasonable."""
    close_ts = int(market.get("closeTime", 0) or 0)
    now = int(time.time())
    issues = []
    note = ""

    if not close_ts:
        issues.append("no closing time set")
        return "⚠️ no close time", issues

    delta_h = (close_ts - now) / 3600
    if delta_h < 1:
        issues.append("closes in <1 hour (info advantage risk)")
        note = "⚠️ closing very soon"
    elif delta_h < 24:
        note = f"⏰ closes in {int(delta_h)}h"
    elif delta_h > 14 * 24:
        issues.append("lockup >14 days (may reduce participation)")
        note = f"📅 closes in {int(delta_h/24)}d (long)"
    else:
        note = f"✅ closes in {int(delta_h/24)}d"

    return note, issues

def format_post(market: dict, meta: dict, timing_note: str, timing_issues: list) -> str:
    """Format AgentBook post (max 2000 chars)."""
    q = market.get("question", "?")[:120]
    stars = "★" * meta["quality"] + "☆" * (5 - meta["quality"])
    cat = meta.get("category","?")
    tags = " ".join(f"#{t}" for t in meta.get("tags",[])[:4])
    desc = meta.get("description","")[:200]
    issues = meta.get("issues",[]) + timing_issues
    issue_str = " | ".join(issues[:2]) if issues else "looks good"

    post = f'new lab market: "{q}"\n'
    post += f"category: {cat} | quality: {stars}\n"
    post += f"timing: {timing_note}\n"
    if desc and desc != q: post += f"summary: {desc[:150]}\n"
    if issues: post += f"note: {issue_str}\n"
    if tags: post += tags

    return post.strip()[:2000]

# ── Main loop ─────────────────────────────────────────────────────────────────

def run_once(dry_run=False, verbose=False):
    seen = load_seen()
    markets = get_markets(layer="lab", limit=50)
    new = [m for m in markets if m.get("publicKey","") not in seen]

    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] lab markets: {len(markets)} total, {len(new)} new")

    posted = 0
    for m in new[:10]:  # max 10 per run
        pda = m.get("publicKey","")
        q   = m.get("question","")
        if not q: continue

        meta = classify_market(q)
        timing_note, timing_issues = analyze_timing(m)
        post = format_post(m, meta, timing_note, timing_issues)

        if verbose: print(f"\n  Market: {q[:60]}\n  Post: {post[:200]}")

        if not dry_run:
            try:
                result = post_to_agentbook(post, pda)
                if result.get("success") or "id" in str(result):
                    print(f"  ✅ posted for: {q[:50]}")
                    posted += 1
                    time.sleep(35)  # 30min cooldown is for same wallet total; between posts wait 35s
                else:
                    print(f"  ⚠️ {result}")
            except Exception as e:
                print(f"  ❌ {e}")
        else:
            print(f"  [dry-run] would post:\n{post}\n")
            posted += 1

        seen.add(pda)

    save_seen(seen)
    print(f"  Done: {posted} markets enriched")
    return posted

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--daemon", action="store_true", help="Run every 30 min")
    args = parser.parse_args()

    if not WALLET and not args.dry_run:
        print("Error: set BAOZI_WALLET"); sys.exit(1)

    if args.daemon:
        print("Starting daemon (30 min interval)...")
        while True:
            run_once(args.dry_run, args.verbose)
            time.sleep(30 * 60)
    else:
        run_once(args.dry_run, args.verbose)
