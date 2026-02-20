#!/usr/bin/env python3
"""
Share Card Viral Engine — Auto-Post Market Cards Across Social Platforms
Bounty #37 | 0.75 SOL

Generates text-based share cards for trending markets and posts them
to Clawk, Clawstr, and AgentBook to drive viral market discovery.
"""
import json, os, time, requests
from datetime import datetime, timezone
import argparse, sys

BASE_URL   = "https://baozi.bet/api"
WALLET     = os.environ.get("BAOZI_WALLET","")
CLAWK_KEY  = os.environ.get("CLAWK_API_KEY","")
MEMORY     = os.path.expanduser("~/.cache/baozi-sharecards/seen.json")

def load_seen():
    try: return set(json.load(open(MEMORY)))
    except: return set()

def save_seen(s):
    os.makedirs(os.path.dirname(MEMORY), exist_ok=True)
    json.dump(list(s), open(MEMORY,"w"))

def get_hot_markets(limit=20):
    r = requests.get(f"{BASE_URL}/markets", params={"status":"active","limit":limit}, timeout=10)
    d = r.json()
    markets = d if isinstance(d,list) else d.get("markets",[])
    # Sort by pool size
    return sorted(markets, key=lambda m: float(m.get("totalPool",0) or 0), reverse=True)

def generate_card(market):
    """Generate a viral share card (text-based, works everywhere)."""
    q = market.get("question","?")
    yes = market.get("yesOdds", market.get("probability","?"))
    pool = market.get("totalPool","?")
    pda = market.get("publicKey","")
    
    # Progress bar for odds
    try:
        yes_pct = int(float(str(yes).replace("%","")))
        bar_yes = "█" * (yes_pct // 10)
        bar_no  = "░" * (10 - yes_pct // 10)
        bar = f"{bar_yes}{bar_no} {yes}%"
    except:
        bar = f"{yes}% yes"
    
    link = f"baozi.bet/m/{pda[:16]}" if pda else "baozi.bet"
    
    card = f"""📊 {q[:80]}

YES [{bar}]
NO  [{'░'*10} {100-int(float(str(yes).replace('%','')))}%] 

💰 Pool: {pool} SOL
🔗 {link}"""
    
    return card.strip()

def post_to_agentbook(content):
    if not WALLET: return False
    r = requests.post(f"{BASE_URL}/agentbook/posts",
                      json={"walletAddress":WALLET,"content":content[:2000]}, timeout=10)
    return r.json().get("success",False)

def post_to_clawk(content):
    if not CLAWK_KEY: return False
    r = requests.post("https://www.clawk.ai/api/v1/clawks",
                      json={"content": content[:280]},
                      headers={"Authorization":f"Bearer {CLAWK_KEY}","Content-Type":"application/json"},
                      timeout=10)
    return r.status_code == 201

def post_to_clawstr(content):
    import subprocess
    try:
        r = subprocess.run(
            ["npx","-y","@clawstr/cli@latest","post","/c/agent-economy",content[:1000]],
            capture_output=True, text=True, timeout=30
        )
        return r.returncode == 0
    except: return False

def run(dry_run=False, verbose=False):
    seen = load_seen()
    markets = get_hot_markets()
    new = [m for m in markets if m.get("publicKey","") not in seen]
    
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] {len(markets)} markets, {len(new)} unseen")
    
    posted = 0
    for m in new[:3]:  # max 3 per run
        pda = m.get("publicKey","")
        card = generate_card(m)
        
        if verbose: print(f"\n{card}\n")
        
        if not dry_run:
            results = []
            results.append(("AgentBook", post_to_agentbook(card)))
            time.sleep(8)
            results.append(("Clawk", post_to_clawk(card)))
            time.sleep(8)
            results.append(("Clawstr", post_to_clawstr(card)))
            
            for platform, ok in results:
                print(f"  {platform}: {'✅' if ok else '❌'}")
            
            time.sleep(30)
        else:
            print(f"  [dry-run] would post card for: {m.get('question','')[:50]}")
        
        seen.add(pda)
        posted += 1
    
    save_seen(seen)
    print(f"  cards: {posted}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--verbose", action="store_true")
    p.add_argument("--daemon", action="store_true")
    args = p.parse_args()
    if args.daemon:
        while True: run(args.dry_run, args.verbose); time.sleep(60*60)
    else: run(args.dry_run, args.verbose)
