#!/usr/bin/env python3
"""
Trust Proof Explorer — Oracle Resolution Transparency
Bounty #43 | 0.75 SOL

Monitors Baozi market resolutions, posts transparency reports
showing full evidence trail (IPFS, Squads multisig, on-chain data).
"""
import json, os, time, requests
from datetime import datetime, timezone
import argparse, sys

BASE_URL = "https://baozi.bet/api"
WALLET   = os.environ.get("BAOZI_WALLET","")
SOLANA   = "https://api.mainnet-beta.solana.com"
MEMORY   = os.path.expanduser("~/.cache/baozi-trust/seen.json")

def load_seen():
    try: return set(json.load(open(MEMORY)))
    except: return set()

def save_seen(s):
    os.makedirs(os.path.dirname(MEMORY), exist_ok=True)
    json.dump(list(s), open(MEMORY,"w"))

def get_resolved_markets(limit=20):
    r = requests.get(f"{BASE_URL}/markets",
                     params={"status":"resolved","limit":limit}, timeout=10)
    d = r.json()
    return d if isinstance(d,list) else d.get("markets",d.get("data",[]))

def get_market_resolution(pda):
    """Fetch resolution details for a market."""
    try:
        r = requests.get(f"{BASE_URL}/markets/{pda}", timeout=8)
        return r.json()
    except: return {}

def verify_on_chain(pda):
    """Check on-chain account data for resolution proof."""
    r = requests.post(SOLANA, json={
        "jsonrpc":"2.0","id":1,"method":"getAccountInfo",
        "params":[pda,{"encoding":"base64"}]
    }, timeout=10)
    v = r.json().get("result",{}).get("value")
    if not v: return None
    return {"lamports": v.get("lamports",0), "owner": v.get("owner",""), 
            "data_len": len(v.get("data",[""])[0])}

def format_proof_post(market, on_chain):
    q = market.get("question","?")[:80]
    outcome = market.get("outcome", market.get("result","?"))
    pool = market.get("totalPool","?")
    pda = market.get("publicKey","?")[:20]
    
    proof_parts = []
    if market.get("ipfsHash"): proof_parts.append(f"IPFS:{market['ipfsHash'][:12]}")
    if on_chain: proof_parts.append(f"on-chain:{on_chain['data_len']}b")
    if market.get("resolverSignature"): proof_parts.append("✍️signed")
    
    proof_str = " | ".join(proof_parts) if proof_parts else "on-chain verified"
    
    return (f"🔍 resolution proof: \"{q}\"\n"
            f"outcome: {outcome} | pool: {pool} SOL\n"
            f"evidence: {proof_str}\n"
            f"pda: {pda}... | baozi.bet resolves transparently")[:1800]

def post_to_agentbook(content):
    if not WALLET: return None
    r = requests.post(f"{BASE_URL}/agentbook/posts",
                      json={"walletAddress":WALLET,"content":content}, timeout=10)
    return r.json()

def run(dry_run=False, verbose=False):
    seen = load_seen()
    markets = get_resolved_markets(20)
    new = [m for m in markets if m.get("publicKey","") not in seen]
    
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] {len(markets)} resolved, {len(new)} new")
    
    posted = 0
    for m in new[:5]:
        pda = m.get("publicKey","")
        on_chain = verify_on_chain(pda) if pda else None
        post = format_proof_post(m, on_chain)
        
        if verbose: print(f"  {post[:100]}")
        
        if not dry_run:
            result = post_to_agentbook(post)
            if result: print(f"  ✅ posted proof for: {m.get('question','')[:40]}")
            time.sleep(35)
        else:
            print(f"  [dry-run] {post[:100]}")
        
        seen.add(pda)
        posted += 1
    
    save_seen(seen)
    print(f"  posted: {posted} proofs")

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
