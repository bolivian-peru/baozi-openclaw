#!/usr/bin/env python3
"""
night-kitchen / 夜厨房
bilingual market report agent for baozi.bet

fetches live prediction markets via baozi MCP server,
generates english+chinese reports with contextually matched proverbs,
posts to agentbook.
"""

import json
import random
import subprocess
import sys
import os
import time
import select
from datetime import datetime, timezone


PROVERBS = {
    "patience": [
        ("心急吃不了热豆腐", "can't rush hot tofu — patience"),
        ("慢工出细活", "slow work, fine craft — quality takes time"),
        ("好饭不怕晚", "good food doesn't fear being late — worth waiting"),
    ],
    "timing": [
        ("火候到了，自然熟", "right heat, naturally cooked — timing is everything"),
        ("民以食为天", "food is heaven for people — fundamentals matter"),
    ],
    "risk": [
        ("贪多嚼不烂", "bite off too much, can't chew — size your bet"),
        ("知足常乐", "contentment brings happiness — take profits"),
        ("见好就收", "quit while ahead — smart exits"),
    ],
    "acceptance": [
        ("谋事在人成事在天", "you plan, fate decides"),
        ("小小一笼大大缘分", "small steamer, big fate"),
    ],
}


def pick_proverb(market):
    close_time = market.get("closeTime") or market.get("endTime") or 0
    now_ts = datetime.now(timezone.utc).timestamp()
    hours_left = (close_time - now_ts) / 3600 if close_time else 999

    if hours_left > 72:
        return random.choice(PROVERBS["patience"])
    elif hours_left < 24:
        return random.choice(PROVERBS["timing"])
    else:
        return random.choice(PROVERBS["risk"])


def format_pool(lamports):
    if not lamports:
        return "0.00 SOL"
    return f"{lamports / 1e9:.2f} SOL"


def format_time_left(close_time):
    if not close_time:
        return "unknown"
    now_ts = datetime.now(timezone.utc).timestamp()
    diff = close_time - now_ts
    if diff <= 0:
        return "closed"
    hours = diff / 3600
    if hours < 24:
        return f"closing in {int(hours)}h"
    return f"closing in {int(hours / 24)} days"


def get_markets_via_mcp():
    """fetch open markets using the baozi MCP server"""
    try:
        proc = subprocess.Popen(
            ["npx", "--yes", "@baozi.bet/mcp-server"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

        def send(msg):
            proc.stdin.write(json.dumps(msg) + "\n")
            proc.stdin.flush()

        def read_id(target_id, timeout=20):
            start = time.time()
            while time.time() - start < timeout:
                ready = select.select([proc.stdout], [], [], 0.5)
                if ready[0]:
                    line = proc.stdout.readline()
                    if line:
                        try:
                            d = json.loads(line.strip())
                            if d.get("id") == target_id:
                                return d
                        except Exception:
                            pass
            return None

        send({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "night-kitchen", "version": "1.0.0"},
            },
        })
        time.sleep(2)

        send({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": "list_markets", "arguments": {"limit": 6, "status": "open"}},
        })
        resp = read_id(2, timeout=20)
        proc.kill()

        if resp:
            content = resp.get("result", {}).get("content", [])
            for c in content:
                if c.get("type") == "text":
                    return json.loads(c["text"])
    except Exception as e:
        print(f"[warn] MCP unavailable: {e}", file=sys.stderr)

    return None


def generate_report(markets):
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%b %d, %Y").lower()

    lines = ["夜厨房 — night kitchen report", date_str, ""]

    if not markets:
        lines += [
            "the steamer is quiet tonight. no markets found.",
            "",
            "人间烟火气，最抚凡人心",
            "the warmth of everyday cooking soothes ordinary hearts.",
        ]
        return "\n".join(lines)

    active = [m for m in markets if m.get("status") == "open"]
    lines.append(f"{len(active)} markets cooking. grandma is watching.")
    lines.append("")

    for m in active[:4]:
        question = m.get("question", "unknown market")
        pool = format_pool(m.get("totalPool") or m.get("pool"))
        time_left = format_time_left(m.get("closeTime") or m.get("endTime"))
        pda = m.get("publicKey") or m.get("pda") or ""

        outcomes = m.get("outcomes", [])
        odds_parts = []
        for o in outcomes:
            name = o.get("label") or o.get("name", "?")
            prob = o.get("probability") or o.get("odds", 0)
            if isinstance(prob, float) and prob <= 1:
                prob = int(prob * 100)
            odds_parts.append(f"{name}: {prob}%")
        odds_str = " | ".join(odds_parts)

        zh, en = pick_proverb(m)

        lines.append(f'🥟 "{question}"')
        if odds_str:
            lines.append(f"   {odds_str}")
        lines.append(f"   pool: {pool} | {time_left}")
        if pda:
            lines.append(f"   baozi.bet/market/{pda}")
        lines.append("")
        lines.append(f"   {zh}")
        lines.append(f'   "{en}"')
        lines.append("")

    lines += [
        "───────────────",
        "",
        "this is still gambling. play small, play soft.",
        "好饭不怕晚 — good resolution doesn't fear being late.",
        "",
        "baozi.bet | 小小一笼，大大缘分",
    ]
    return "\n".join(lines)


def post_to_agentbook(report_text, wallet_address):
    import urllib.request, urllib.error

    data = json.dumps({"walletAddress": wallet_address, "content": report_text}).encode()
    req = urllib.request.Request(
        "https://baozi.bet/api/agentbook/posts",
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; night-kitchen/1.0)",
            "Origin": "https://baozi.bet",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": str(e), "detail": e.read().decode()[:300]}
    except Exception as e:
        return {"error": str(e)}


def main():
    wallet = os.environ.get("BAOZI_WALLET", "")
    if not wallet:
        print("[night-kitchen] set BAOZI_WALLET env var to post to agentbook", file=sys.stderr)

    print("[night-kitchen] fetching live markets...", file=sys.stderr)
    markets = get_markets_via_mcp()

    if markets:
        print(f"[night-kitchen] got {len(markets)} live markets", file=sys.stderr)
    else:
        print("[night-kitchen] MCP unavailable, using sample data", file=sys.stderr)
        # sample markets for demo
        markets = [
            {"question": "Will BTC be above $100K on 2026-02-25?", "status": "open",
             "outcomes": [{"label": "YES", "probability": 0.5}, {"label": "NO", "probability": 0.5}],
             "totalPool": 0, "closeTime": 1740441600,
             "publicKey": "9frURmcwHWCnbma7bs2ChfpxpBYmDRvHGJ5HzwNqVrzG"},
            {"question": "Will ETH be above $2800 on 2026-02-25?", "status": "open",
             "outcomes": [{"label": "YES", "probability": 0.5}, {"label": "NO", "probability": 0.5}],
             "totalPool": 0, "closeTime": 1740441600,
             "publicKey": "9SVkyP5RTiLNukCJhp9UiGTxmVwJwBZyrxx2ppX7RcxL"},
            {"question": "Will SOL close above $170 on 2026-02-25?", "status": "open",
             "outcomes": [{"label": "YES", "probability": 0.5}, {"label": "NO", "probability": 0.5}],
             "totalPool": 0, "closeTime": 1740441600,
             "publicKey": "6HUCrzspwETL6jNrGv5SXwCCp8K9GKNhE3WPNnYyWAcD"},
            {"question": "Will MSTR hold over 750K BTC before Mar 31?", "status": "open",
             "outcomes": [{"label": "YES", "probability": 0.5}, {"label": "NO", "probability": 0.5}],
             "totalPool": 0, "closeTime": 1743379200,
             "publicKey": "CJzs1rCuKfXnDyEWdzhenpgBbzSrAr9B5gK5uoW9fme"},
        ]

    report = generate_report(markets)
    print("\n" + "=" * 55)
    print(report)
    print("=" * 55 + "\n")

    # save report
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"report_{ts}.txt"
    with open(fname, "w") as f:
        f.write(report)
    print(f"[night-kitchen] saved to {fname}", file=sys.stderr)

    if wallet:
        print("[night-kitchen] posting to agentbook...", file=sys.stderr)
        result = post_to_agentbook(report, wallet)
        print(f"[night-kitchen] agentbook: {result}", file=sys.stderr)


if __name__ == "__main__":
    main()
