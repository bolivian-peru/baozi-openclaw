#!/usr/bin/env python3
"""
AgentBook Pundit — Baozi.bet AI Market Analyst
Bounty #8 | 0.75 SOL | github.com/bolivian-peru/baozi-openclaw

Posts market analysis to AgentBook 2-4x/day.
Comments on individual markets with actionable takes.
No Solana SDK required — pure HTTP.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import requests

# ── Config ────────────────────────────────────────────────────────────────────
WALLET   = os.environ.get("BAOZI_WALLET", "")
BASE_URL = "https://baozi.bet/api"
POST_COOLDOWN  = 30 * 60   # 30 min between AgentBook posts
COMMENT_COOLDOWN = 60 * 60  # 1 hour between market comments

# LLM config — auto-detect provider from key prefix
_key = os.environ.get("LLM_API_KEY", "")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1", "openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1", "gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1", "llama-3.1-8b-instant"
    return "http://localhost:11434/v1", "llama3.2"

LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL", LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL", LLM_MODEL)

# ── API helpers ────────────────────────────────────────────────────────────────
def get_markets(status="active", limit=20, layer="all"):
    r = requests.get(f"{BASE_URL}/markets", params={"status": status, "limit": limit, "layer": layer}, timeout=10)
    r.raise_for_status()
    d = r.json()
    return d if isinstance(d, list) else d.get("markets", d.get("data", []))

def get_agentbook_posts(limit=10):
    r = requests.get(f"{BASE_URL}/agentbook/posts", params={"limit": limit}, timeout=10)
    r.raise_for_status()
    return r.json().get("posts", [])

def post_to_agentbook(content: str, market_pda: Optional[str] = None):
    """Post to AgentBook (no signature needed, just CreatorProfile on-chain)."""
    if not WALLET:
        raise ValueError("BAOZI_WALLET not set")
    body = {"walletAddress": WALLET, "content": content}
    if market_pda:
        body["marketPda"] = market_pda
    r = requests.post(f"{BASE_URL}/agentbook/posts", json=body, timeout=10)
    return r.json()

def comment_on_market(market_pda: str, content: str, privkey_bytes: Optional[list] = None):
    """Comment on a market. Requires wallet signature."""
    if not privkey_bytes:
        print("  [skip] market comments require wallet keypair (BAOZI_KEYPAIR)")
        return None
    
    import base64, nacl.signing
    keypair = nacl.signing.SigningKey(bytes(privkey_bytes[:32]))
    msg = f"comment:{market_pda}:{int(time.time())}"
    sig = base64.b64encode(keypair.sign(msg.encode()).signature).decode()
    
    headers = {
        "x-wallet-address": WALLET,
        "x-signature": sig,
        "x-message": msg,
    }
    r = requests.post(f"{BASE_URL}/markets/{market_pda}/comments",
                      json={"content": content[:500]}, headers=headers, timeout=10)
    return r.json()

# ── LLM ───────────────────────────────────────────────────────────────────────
def llm(prompt: str, max_tokens=280) -> str:
    """Call LLM, return string response."""
    payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    headers = {"Authorization": f"Bearer {_key or 'ollama'}",
               "Content-Type": "application/json"}
    r = requests.post(f"{LLM_BASE}/chat/completions", json=payload,
                      headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

# ── Analysis modes ─────────────────────────────────────────────────────────────
def analyze_markets(markets: list) -> str:
    """Generate a concise market roundup (max 280 chars for AgentBook)."""
    if not markets:
        return "no active markets right now. check back soon."
    
    # Sort by pool size
    sorted_m = sorted(markets, key=lambda m: float(m.get("totalPool", m.get("pool", 0)) or 0), reverse=True)
    top = sorted_m[:5]
    
    market_summary = "\n".join([
        f"- {m.get('question','?')[:60]} | yes={m.get('yesOdds', m.get('probability', '?'))}% | pool={m.get('totalPool','?')} SOL"
        for m in top
    ])
    
    prompt = f"""You are a sharp prediction market analyst on Baozi.bet. 
Analyze these markets and write ONE punchy 1-3 sentence take (max 260 chars):
{market_summary}

Focus on: mispriced odds, notable volumes, or interesting patterns.
Write like a trader, not a journalist. Be specific. No fluff.
Start directly with the insight, no preamble."""
    
    try:
        take = llm(prompt, max_tokens=100)
        return take[:270]
    except Exception as e:
        # Fallback: rule-based analysis
        m = top[0]
        return f"top market: {m.get('question','?')[:80]} | pool {m.get('totalPool','?')} SOL | {m.get('yesOdds', '?')}% yes odds"

def closing_soon_take(markets: list) -> str:
    """Generate closing-soon alert."""
    now = int(time.time())
    closing = [m for m in markets 
               if m.get("closeTime") and (int(m["closeTime"]) - now) < 86400]
    
    if not closing:
        return None
    
    closing.sort(key=lambda m: int(m.get("closeTime", 0)))
    c = closing[0]
    hrs = max(0, (int(c["closeTime"]) - now) // 3600)
    
    prompt = f"""Market closing in {hrs}h: "{c.get('question','?')}" | yes={c.get('yesOdds','?')}% | pool={c.get('totalPool','?')} SOL
Write a 1-sentence sharp take for traders (max 200 chars). Be direct about the edge or lack of it."""
    
    try:
        return f"closing in {hrs}h: {llm(prompt, max_tokens=60)[:180]}"
    except:
        return f"closing in {hrs}h: {c.get('question','?')[:100]} | {c.get('yesOdds','?')}% yes"

# ── Modes ──────────────────────────────────────────────────────────────────────
def run_morning(dry_run=False):
    """Morning roundup — top active markets by volume."""
    print(f"[{datetime.now(timezone.utc).isoformat()}] morning roundup")
    markets = get_markets(limit=20)
    take = analyze_markets(markets)
    
    print(f"  take ({len(take)} chars): {take[:100]}...")
    if not dry_run:
        result = post_to_agentbook(f"🌅 morning roundup: {take}")
        print(f"  post result: {result}")
    else:
        print(f"  [dry-run] would post: 🌅 morning roundup: {take}")

def run_evening(dry_run=False):
    """Evening — closing soon alerts."""
    print(f"[{datetime.now(timezone.utc).isoformat()}] closing soon check")
    markets = get_markets(limit=50)
    take = closing_soon_take(markets)
    
    if not take:
        print("  no markets closing in 24h")
        return
    
    print(f"  take: {take[:100]}...")
    if not dry_run:
        result = post_to_agentbook(f"⏰ closing soon: {take}")
        print(f"  post result: {result}")
    else:
        print(f"  [dry-run] would post: ⏰ closing soon: {take}")

def run_comment(dry_run=False):
    """Comment on top market with analysis."""
    markets = get_markets(limit=10)
    if not markets:
        print("no markets to comment on")
        return
    
    top = sorted(markets, key=lambda m: float(m.get("totalPool", 0) or 0), reverse=True)
    m = top[0]
    pda = m.get("publicKey", m.get("id", ""))
    
    prompt = f"""Market: "{m.get('question','?')}" | yes={m.get('yesOdds','?')}% | pool={m.get('totalPool','?')} SOL
Write a sharp 1-2 sentence market comment (max 280 chars). Be a trader: what is your edge, what would make you bet yes/no, what is the key variable?"""
    
    try:
        comment = llm(prompt, max_tokens=80)[:280]
    except:
        comment = f"current odds {m.get('yesOdds','?')}% yes on {m.get('totalPool','?')} SOL pool. key variable: {m.get('question','?')[:60]}"
    
    print(f"  comment on {pda[:16]}: {comment[:80]}...")
    if not dry_run:
        keypair = json.loads(os.environ.get("BAOZI_KEYPAIR", "[]"))
        result = comment_on_market(pda, comment, keypair if keypair else None)
        print(f"  result: {result}")
    else:
        print(f"  [dry-run] would comment: {comment}")

def run_all(dry_run=False):
    run_morning(dry_run)
    time.sleep(2)
    run_evening(dry_run)
    time.sleep(2)
    run_comment(dry_run)

# ── CLI ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgentBook Pundit — Baozi AI market analyst")
    parser.add_argument("--morning",  action="store_true", help="Post morning market roundup")
    parser.add_argument("--evening",  action="store_true", help="Post closing-soon alert")
    parser.add_argument("--comment",  action="store_true", help="Comment on top market")
    parser.add_argument("--all",      action="store_true", help="Run all modes")
    parser.add_argument("--dry-run",  action="store_true", help="Print without posting")
    args = parser.parse_args()

    if not WALLET and not args.dry_run:
        print("Error: set BAOZI_WALLET env var (your Solana wallet address)")
        sys.exit(1)

    if args.morning:  run_morning(args.dry_run)
    elif args.evening: run_evening(args.dry_run)
    elif args.comment: run_comment(args.dry_run)
    elif args.all:    run_all(args.dry_run)
    else:             run_all(dry_run=True)  # default: dry-run demo
