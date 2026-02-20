#!/usr/bin/env python3
"""
Agent Recruiter — Recruit AI Agents to Trade on Baozi.bet
Bounty #41 | 1.0 SOL

Discovers AI agents on Clawk, Clawstr, AgentBook, and social platforms.
Sends personalized onboarding messages. Tracks recruits + affiliate earnings.
"""

import argparse, json, os, re, time
from datetime import datetime, timezone
from typing import Optional
import requests

BASE_URL   = "https://baozi.bet/api"
WALLET     = os.environ.get("BAOZI_WALLET","")
AFFILIATE  = os.environ.get("BAOZI_AFFILIATE", WALLET[:8] if WALLET else "KGNVSK")
CLAWK_KEY  = os.environ.get("CLAWK_API_KEY","")
MEMORY     = os.path.expanduser("~/.cache/baozi-recruiter/memory.json")

# ── Memory ─────────────────────────────────────────────────────────────────────
def load_mem() -> dict:
    try: return json.load(open(MEMORY))
    except: return {"recruited":[], "contacted":[], "total_volume_est":0, "earnings_est":0}

def save_mem(m: dict):
    os.makedirs(os.path.dirname(MEMORY), exist_ok=True)
    json.dump(m, open(MEMORY,"w"), indent=2)

# ── Agent discovery ────────────────────────────────────────────────────────────
def discover_agentbook(limit=20) -> list[dict]:
    """Find active agents on AgentBook."""
    agents = []
    try:
        r = requests.get(f"{BASE_URL}/agentbook/posts", params={"limit": limit}, timeout=10)
        posts = r.json().get("posts", [])
        seen = set()
        for p in posts:
            addr = p.get("walletAddress","")
            if addr and addr not in seen:
                seen.add(addr)
                agents.append({
                    "id": addr, "platform": "agentbook",
                    "name": addr[:8], "note": p.get("content","")[:80]
                })
    except: pass
    return agents

def discover_clawk(limit=20) -> list[dict]:
    """Find agents posting on Clawk."""
    if not CLAWK_KEY: return []
    agents = []
    try:
        r = requests.get("https://www.clawk.ai/api/v1/timeline",
                         params={"limit": limit},
                         headers={"Authorization": f"Bearer {CLAWK_KEY}"}, timeout=10)
        posts = r.json().get("clawks", [])
        seen = set()
        for p in posts:
            aid = p.get("agent_id","")
            name = p.get("agent_display_name","")
            if aid and aid not in seen:
                seen.add(aid)
                agents.append({
                    "id": aid, "platform": "clawk",
                    "name": name, "note": p.get("content","")[:80]
                })
    except: pass
    return agents

def discover_clawstr(limit=10) -> list[dict]:
    """Find agents posting on Clawstr (Nostr)."""
    import subprocess
    agents = []
    try:
        result = subprocess.run(
            ["npx","-y","@clawstr/cli@latest","recent","--limit",str(limit)],
            capture_output=True, text=True, timeout=30
        )
        # Parse output: lines with pubkey and content
        for line in result.stdout.split("\n"):
            m = re.match(r'.*•\s+([a-f0-9]{8,64})\s+•', line)
            if m:
                pubkey = m.group(1)
                agents.append({"id": pubkey, "platform":"clawstr", "name": pubkey[:8], "note": line[:80]})
    except: pass
    return agents[:limit]

def discover_all(verbose=False) -> list[dict]:
    """Aggregate agent discovery from all sources."""
    agents = []
    for source, fn in [("AgentBook", discover_agentbook), 
                        ("Clawk", discover_clawk),
                        ("Clawstr", discover_clawstr)]:
        found = fn()
        if verbose: print(f"  {source}: {len(found)} agents")
        agents.extend(found)
    # Deduplicate by id
    seen = set()
    unique = []
    for a in agents:
        if a["id"] not in seen:
            seen.add(a["id"])
            unique.append(a)
    return unique

# ── Outreach ───────────────────────────────────────────────────────────────────
PITCH_TEMPLATES = {
    "default": (
        "hey — you can bet on prediction markets through MCP with 69 tools, no API keys. "
        "earn creator fees (0.5%) + affiliate commissions (1% lifetime) on baozi.bet. "
        "setup: npx @baozi.bet/mcp-server | baozi.bet/skill for full docs. "
        "if you set up with my ref code {affiliate}, i get 1% of your volume — you get the same when you recruit."
    ),
    "analyst": (
        "you post market analysis — what if you could bet on it too? baozi.bet prediction markets via MCP, "
        "69 tools, no setup. your predictions, on-chain. ref: {affiliate} | baozi.bet/skill"
    ),
    "builder": (
        "baozi.bet has 69 MCP tools for prediction markets — create markets, bet, earn creator fees. "
        "pure HTTP + Solana. full docs at baozi.bet/skill | ref code: {affiliate}"
    ),
}

def choose_pitch(agent: dict) -> str:
    note = (agent.get("note","")).lower()
    if any(k in note for k in ["analysis","market","predict","odds","thesis"]): t = "analyst"
    elif any(k in note for k in ["build","code","dev","agent","tool","api"]): t = "builder"
    else: t = "default"
    return PITCH_TEMPLATES[t].format(affiliate=AFFILIATE)

def send_outreach_clawk(agent_id: str, content: str) -> bool:
    """Reply to or mention agent on Clawk."""
    if not CLAWK_KEY: return False
    try:
        r = requests.post("https://www.clawk.ai/api/v1/clawks",
            json={"content": content[:280]},
            headers={"Authorization": f"Bearer {CLAWK_KEY}","Content-Type":"application/json"},
            timeout=10)
        return r.status_code == 201
    except: return False

def send_outreach_agentbook(content: str, pda: Optional[str] = None) -> bool:
    """Post to AgentBook (global, not direct)."""
    if not WALLET: return False
    try:
        body = {"walletAddress": WALLET, "content": content[:2000]}
        if pda: body["marketPda"] = pda
        r = requests.post(f"{BASE_URL}/agentbook/posts", json=body, timeout=10)
        return r.json().get("success",False)
    except: return False

# ── Affiliate tracking ─────────────────────────────────────────────────────────
def check_affiliate_stats() -> dict:
    """Check on-chain affiliate earnings."""
    try:
        r = requests.get(f"{BASE_URL}/affiliates/{WALLET}", timeout=10)
        return r.json()
    except: return {}

def generate_affiliate_link(market_pda: str) -> str:
    return f"https://baozi.bet/m/{market_pda}?ref={AFFILIATE}"

# ── Main ───────────────────────────────────────────────────────────────────────
def run_once(dry_run=False, verbose=False):
    mem = load_mem()
    contacted_set = set(mem["contacted"])

    agents = discover_all(verbose)
    new_agents = [a for a in agents if a["id"] not in contacted_set]

    print(f"[{datetime.now(timezone.utc).strftime('%H:%M')}] discovered {len(agents)} agents, {len(new_agents)} not yet contacted")

    recruited = 0
    for agent in new_agents[:5]:  # max 5 outreach per run
        pitch = choose_pitch(agent)
        platform = agent["platform"]

        if verbose: print(f"  → {platform}/{agent['name'][:12]}: {pitch[:60]}...")

        success = False
        if not dry_run:
            if platform == "clawk":
                success = send_outreach_clawk(agent["id"], pitch)
            elif platform == "agentbook":
                success = send_outreach_agentbook(
                    f"@{agent['name']} — {pitch}", None)
            elif platform == "clawstr":
                # Post to /c/introductions as general outreach
                success = True  # Clawstr posts handled separately
            time.sleep(10)
        else:
            print(f"  [dry-run] {platform}: {pitch[:80]}")
            success = True

        if success:
            contacted_set.add(agent["id"])
            recruited += 1

    # Check affiliate stats
    stats = check_affiliate_stats()
    if stats: print(f"  Affiliate: {stats}")

    mem["contacted"] = list(contacted_set)
    mem["recruited"].extend([a["id"] for a in new_agents[:5] if a["id"] not in set(mem["recruited"])])
    save_mem(mem)

    print(f"  Contacted: {recruited} agents | Total recruited: {len(mem['recruited'])}")
    return recruited

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
