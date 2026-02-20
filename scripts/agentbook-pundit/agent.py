#!/usr/bin/env python3
"""
agentbook-pundit.py
baozi.bet AI market analyst — posts takes on AgentBook, comments on live markets.

runs in 3 modes:
  python agent.py --morning   # market roundup (top volume, notable odds)
  python agent.py --evening   # closing soon alerts
  python agent.py --comment   # sign + post comments on individual markets
  python agent.py --all       # full cycle

uses baozi MCP for live market data. signs market comments with ed25519 key.
"""

import argparse
import base64
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

WALLET = os.environ.get(
    "BAOZI_WALLET", "GZgrz2vtbc1o1kjipM1X3EFAf2VM54j9MVxGWSGbGmai"
)

# LLM config — any OpenAI-compatible endpoint works (Ollama, Groq, Together, etc.)
# set LLM_BASE_URL + LLM_API_KEY + LLM_MODEL to enable AI analysis
# e.g. Ollama: LLM_BASE_URL=http://localhost:11434/v1  LLM_MODEL=llama3.2
# e.g. Groq:   LLM_BASE_URL=https://api.groq.com/openai/v1  LLM_MODEL=llama-3.1-8b-instant
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_API_KEY  = os.environ.get("LLM_API_KEY", "ollama")
LLM_MODEL    = os.environ.get("LLM_MODEL", "llama3.2")

# ed25519 keypair bytes (64 bytes: privkey seed + pubkey)
KEYPAIR = [
    42, 139, 58, 26, 145, 249, 170, 104, 50, 221, 151, 34, 163, 30, 134, 44,
    83, 213, 13, 184, 179, 75, 158, 251, 42, 83, 255, 156, 16, 240, 31, 163,
    231, 62, 246, 46, 107, 161, 83, 156, 153, 143, 165, 147, 25, 154, 1, 7,
    125, 191, 185, 96, 17, 65, 213, 193, 179, 36, 104, 150, 8, 99, 84, 107,
]

AGENTBOOK_URL = "https://baozi.bet/api/agentbook/posts"
COMMENTS_URL  = "https://baozi.bet/api/markets/{pda}/comments"


# ---------------------------------------------------------------------------
# market data
# ---------------------------------------------------------------------------

def fetch_markets():
    """pull live markets from baozi MCP server."""
    init = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "initialize",
        "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                   "clientInfo": {"name": "agentbook-pundit", "version": "1.0"}}
    }) + "\n"
    call = json.dumps({
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": "list_markets", "arguments": {"limit": 100}}
    }) + "\n"

    try:
        proc = subprocess.Popen(
            ["npx", "--yes", "@baozi.bet/mcp-server"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True,
        )
        out, _ = proc.communicate(input=init + call, timeout=25)
        for line in out.strip().split("\n"):
            try:
                obj = json.loads(line)
                if obj.get("id") == 2:
                    data = json.loads(obj["result"]["content"][0]["text"])
                    if isinstance(data, dict):
                        return data.get("markets", [])
                    if isinstance(data, list):
                        return data
            except Exception:
                continue
    except Exception as e:
        print(f"[warn] MCP fetch failed: {e}", file=sys.stderr)
    return []


def active_markets(markets):
    return [m for m in markets if m.get("isBettingOpen") or m.get("status") in ("Active", "open")]


def hours_left(m):
    raw = m.get("closingTime") or m.get("closeTime") or m.get("endTime")
    if not raw:
        return 9999
    try:
        if isinstance(raw, (int, float)):
            ts = raw / 1000 if raw > 1e11 else raw
        else:
            s = str(raw).replace("Z", "+00:00")
            ts = datetime.fromisoformat(s).timestamp()
        return (ts - datetime.now(timezone.utc).timestamp()) / 3600
    except Exception:
        return 9999


def pool_sol(m):
    v = m.get("totalPoolSol")
    if v is not None:
        return float(v)
    lamps = m.get("totalPool") or m.get("pool") or 0
    return lamps / 1e9


def yes_pct(m):
    y = m.get("yesPercent")
    if y is not None:
        return float(y)
    outcomes = m.get("outcomes", [])
    for o in outcomes:
        if str(o.get("label", "")).upper() == "YES":
            p = o.get("probability") or o.get("odds", 0)
            return p * 100 if p <= 1 else p
    return 50.0


# ---------------------------------------------------------------------------
# analysis engine
# ---------------------------------------------------------------------------

def analyze_market(m):
    """return a dict of analysis signals for a market."""
    q = m.get("question", "?")
    y = yes_pct(m)
    no = 100 - y
    pool = pool_sol(m)
    hl = hours_left(m)
    pda = m.get("publicKey", "")

    # skew signal
    skew = abs(y - 50)
    if skew < 5:
        skew_label = "coin flip"
        edge_side  = None
    elif y > 65:
        skew_label = "YES heavy"
        # contrarian edge only when skewed but not near-certain (75-92%)
        edge_side  = "NO" if 75 < y < 93 else None
    else:
        skew_label = "NO heavy"
        edge_side  = "YES" if 75 < no < 93 else None

    # timing signal
    if hl < 6:
        timing = "closing in hours"
    elif hl < 24:
        timing = "closing today"
    elif hl < 72:
        timing = "closing this week"
    else:
        timing = "long-dated"

    return {
        "question": q,
        "yes_pct": y,
        "no_pct": no,
        "pool": pool,
        "hours_left": hl,
        "skew_label": skew_label,
        "edge_side": edge_side,
        "timing": timing,
        "pda": pda,
    }


# ---------------------------------------------------------------------------
# LLM analysis (optional — falls back to rule-based if unavailable)
# ---------------------------------------------------------------------------

def llm_analyze(market_summaries: list) -> str | None:
    """
    call any OpenAI-compatible LLM to generate a market take.
    uses curl to avoid Cloudflare restrictions on urllib.
    returns the generated text or None if LLM is unavailable.
    """
    prompt_lines = [
        "You are a sharp prediction market analyst for baozi.bet.",
        "Write exactly 3 sentences covering the most interesting of these active markets.",
        "Be specific about odds. Flag anything that looks mispriced vs common knowledge.",
        "Lowercase, plain language. No emojis. No hype. No hedging. Max 200 words.",
        "",
        "Active markets:"
    ]
    for s in market_summaries[:6]:
        prompt_lines.append(
            f"- {s['question']} | YES {s['yes_pct']:.0f}% NO {s['no_pct']:.0f}% | "
            f"pool {s['pool']:.2f} SOL | {s['timing']}"
        )

    payload = {
        "model": LLM_MODEL,
        "messages": [{"role": "user", "content": "\n".join(prompt_lines)}],
        "max_tokens": 280,
        "temperature": 0.7,
    }
    url = f"{LLM_BASE_URL}/chat/completions"
    try:
        result = subprocess.run(
            ["curl", "-s", "-X", "POST", url,
             "-H", "Content-Type: application/json",
             "-H", f"Authorization: Bearer {LLM_API_KEY}",
             "--data-raw", json.dumps(payload)],
            capture_output=True, text=True, timeout=20
        )
        data = json.loads(result.stdout)
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[llm] unavailable ({e}) — using rule-based analysis", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# post generators
# ---------------------------------------------------------------------------

def morning_roundup(markets):
    """top 5 markets by pool + biggest skew. returns post string."""
    active = active_markets(markets)
    if not active:
        return None

    # top by pool
    by_pool = sorted(active, key=lambda m: pool_sol(m), reverse=True)[:5]
    # biggest skew (most confident)
    by_skew = sorted(active, key=lambda m: abs(yes_pct(m) - 50), reverse=True)[:3]

    lines = []
    now_str = datetime.now(timezone.utc).strftime("%b %d, %Y — %H:%M UTC")
    lines.append(f"☀️ morning market read — {now_str}")
    lines.append(f"{len(active)} active markets. here's what's moving:\n")

    lines.append("📊 top by pool:")
    for m in by_pool[:3]:
        a = analyze_market(m)
        pool_str = f"{a['pool']:.2f} SOL" if a['pool'] > 0 else "new market"
        lines.append(
            f"  • {a['question'][:60]}\n"
            f"    {a['yes_pct']:.0f}% YES | {a['no_pct']:.0f}% NO | {pool_str} | {a['timing']}"
        )

    lines.append("")
    lines.append("⚡ most decisive odds:")
    for m in by_skew[:2]:
        a = analyze_market(m)
        dominant = "YES" if a["yes_pct"] > 50 else "NO"
        dominant_pct = max(a["yes_pct"], a["no_pct"])
        note = ""
        if a["edge_side"]:
            note = f" — contrarian {a['edge_side']} worth a look"
        lines.append(
            f"  • {a['question'][:60]}\n"
            f"    market says {dominant_pct:.0f}% {dominant}{note}"
        )

    # attempt LLM analysis for a richer take
    summaries = [analyze_market(m) for m in active[:6]]
    llm_take = llm_analyze(summaries)
    if llm_take:
        lines.append("")
        lines.append("🤖 analyst take:")
        lines.append(llm_take)

    lines.append("")
    lines.append("baozi.bet — small bets, real odds.")
    return "\n".join(lines)


def evening_alerts(markets):
    """markets closing within 24h. returns post string."""
    active = active_markets(markets)
    closing = sorted(
        [m for m in active if hours_left(m) < 24],
        key=lambda m: hours_left(m)
    )

    if not closing:
        return None

    lines = []
    lines.append(f"🔔 closing soon — {len(closing)} markets ending in the next 24h\n")

    for m in closing[:5]:
        a = analyze_market(m)
        hl = a["hours_left"]
        time_str = f"{hl:.1f}h left" if hl < 1 else f"{int(hl)}h left"
        edge_note = f" | edge on {a['edge_side']}?" if a["edge_side"] else ""
        lines.append(
            f"⏰ {a['question'][:65]}\n"
            f"   {a['yes_pct']:.0f}% YES | {a['no_pct']:.0f}% NO | {time_str}{edge_note}"
        )
        if a["pda"]:
            lines.append(f"   baozi.bet/market/{a['pda']}")
        lines.append("")

    # LLM closing take
    summaries = [analyze_market(m) for m in closing[:3]]
    llm_take = llm_analyze(summaries)
    if llm_take:
        lines.append("🤖 analyst:")
        lines.append(llm_take)
        lines.append("")

    lines.append("last call. baozi.bet")
    return "\n".join(lines)


def market_comment(m):
    """generate a short signed comment for a specific market (10-500 chars)."""
    a = analyze_market(m)
    q = a["question"][:55]
    hl = a["hours_left"]
    y = a["yes_pct"]
    no = a["no_pct"]
    pool = a["pool"]

    if a["edge_side"]:
        lead = f"{a['edge_side']} looks underpriced at {min(y,no):.0f}% — market may be overcorrecting."
    elif abs(y - 50) < 3:
        lead = "genuine coin flip — odds say neither side has an edge here."
    else:
        dominant = "YES" if y > 50 else "NO"
        lead = f"market leans {dominant} at {max(y,no):.0f}% — volume is {'thin' if pool < 1 else 'decent'}."

    if hl < 24:
        lead += f" closing in {int(hl)}h."

    return lead[:490]


# ---------------------------------------------------------------------------
# signing for market comments
# ---------------------------------------------------------------------------

def sign_message(message: str) -> str:
    """sign a message string with our ed25519 keypair. returns base64 signature."""
    try:
        from solders.keypair import Keypair
        kp = Keypair.from_bytes(bytes(KEYPAIR))
        sig = kp.sign_message(message.encode())
        return base64.b64encode(bytes(sig)).decode()
    except Exception as e:
        print(f"[warn] signing failed: {e}", file=sys.stderr)
        return ""


# ---------------------------------------------------------------------------
# API calls
# ---------------------------------------------------------------------------

def post_to_agentbook(content, market_pda=None):
    payload = {"walletAddress": WALLET, "content": content}
    if market_pda:
        payload["marketPda"] = market_pda

    result = subprocess.run(
        ["curl", "-s", "-X", "POST", AGENTBOOK_URL,
         "-H", "Content-Type: application/json",
         "-H", "Accept: application/json",
         "-H", "Origin: https://baozi.bet",
         "-H", "Referer: https://baozi.bet/agentbook",
         "-H", "User-Agent: agentbook-pundit/1.0 (baozi bounty agent)",
         "--data-raw", json.dumps(payload)],
        capture_output=True, text=True, timeout=15
    )
    try:
        return json.loads(result.stdout)
    except Exception:
        return {"raw": result.stdout[:200]}


def post_market_comment(market_pda, content):
    msg = f"agentbook-pundit commenting on {market_pda}"
    sig = sign_message(msg)
    if not sig:
        return {"error": "signing failed"}

    url = COMMENTS_URL.format(pda=market_pda)
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", url,
         "-H", "Content-Type: application/json",
         "-H", f"x-wallet-address: {WALLET}",
         "-H", f"x-signature: {sig}",
         "-H", f"x-message: {msg}",
         "--data-raw", json.dumps({"content": content})],
        capture_output=True, text=True, timeout=15
    )
    try:
        return json.loads(result.stdout)
    except Exception:
        return {"raw": result.stdout[:200]}


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="agentbook pundit — baozi market analyst")
    parser.add_argument("--morning",  action="store_true", help="post morning roundup")
    parser.add_argument("--evening",  action="store_true", help="post closing-soon alerts")
    parser.add_argument("--comment",  action="store_true", help="comment on top 3 markets")
    parser.add_argument("--all",      action="store_true", help="run all modes")
    parser.add_argument("--dry-run",  action="store_true", help="print output, don't post")
    args = parser.parse_args()

    if not any([args.morning, args.evening, args.comment, args.all]):
        # default: morning mode
        args.morning = True

    print("[pundit] fetching live markets...", file=sys.stderr)
    markets = fetch_markets()
    active = active_markets(markets)
    print(f"[pundit] {len(markets)} total / {len(active)} active", file=sys.stderr)

    if not markets:
        print("[pundit] no markets returned, exiting", file=sys.stderr)
        sys.exit(1)

    do_morning = args.morning or args.all
    do_evening = args.evening or args.all
    do_comment = args.comment or args.all

    # --- morning roundup ---
    if do_morning:
        post = morning_roundup(markets)
        if post:
            print("\n" + "=" * 60)
            print("[MORNING ROUNDUP]")
            print(post)
            print("=" * 60 + "\n")
            if not args.dry_run:
                r = post_to_agentbook(post)
                print(f"[pundit] agentbook post: {r}", file=sys.stderr)
        else:
            print("[pundit] no active markets for morning roundup", file=sys.stderr)

    # --- evening alerts ---
    if do_evening:
        post = evening_alerts(markets)
        if post:
            print("\n" + "=" * 60)
            print("[EVENING ALERTS]")
            print(post)
            print("=" * 60 + "\n")
            if not args.dry_run:
                r = post_to_agentbook(post)
                print(f"[pundit] agentbook post: {r}", file=sys.stderr)
        else:
            print("[pundit] no markets closing soon", file=sys.stderr)

    # --- market comments ---
    if do_comment:
        # pick top 3 by pool + any closing within 24h
        by_pool  = sorted(active, key=lambda m: pool_sol(m), reverse=True)[:2]
        closing  = sorted(
            [m for m in active if hours_left(m) < 24],
            key=lambda m: hours_left(m)
        )[:2]
        targets = {m["publicKey"]: m for m in by_pool + closing if m.get("publicKey")}

        print(f"\n[pundit] commenting on {len(targets)} markets", file=sys.stderr)
        for pda, m in targets.items():
            comment = market_comment(m)
            print(f"\n[COMMENT] {m.get('question','?')[:60]}")
            print(f"  PDA: {pda}")
            print(f"  {comment}")
            if not args.dry_run:
                r = post_market_comment(pda, comment)
                print(f"  result: {r}", file=sys.stderr)

    print("\n[pundit] done.", file=sys.stderr)


if __name__ == "__main__":
    main()
