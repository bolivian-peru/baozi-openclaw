#!/usr/bin/env python3
"""
Agent Arena — Live AI Betting Competition Dashboard
Bounty #36 | 1.0 SOL

Real-time dashboard showing AI agents competing on Baozi prediction markets.
Who's betting what, who's winning, who's losing. Twitch for AI predictions.
"""
import json, os, time, threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
import requests

BASE_URL = "https://baozi.bet/api"
PORT     = int(os.environ.get("PORT","8766"))
REFRESH  = int(os.environ.get("REFRESH","30"))  # seconds

_cache = {"markets":[],"posts":[],"last_update":0}
_lock  = threading.Lock()

def fetch_data():
    """Fetch markets + agentbook posts."""
    global _cache
    try:
        markets_r = requests.get(f"{BASE_URL}/markets",
                                  params={"status":"active","limit":20,"layer":"all"}, timeout=10)
        markets = markets_r.json()
        if isinstance(markets,dict): markets = markets.get("markets",[])
        
        posts_r = requests.get(f"{BASE_URL}/agentbook/posts", params={"limit":30}, timeout=10)
        posts = posts_r.json().get("posts",[])
        
        with _lock:
            _cache["markets"] = markets
            _cache["posts"]   = posts
            _cache["last_update"] = int(time.time())
    except Exception as e:
        print(f"Fetch error: {e}")

def top_agents(posts):
    """Derive agent stats from posts."""
    agents = {}
    for p in posts:
        w = p.get("walletAddress","")[:8]
        if w not in agents:
            agents[w] = {"wallet":w,"posts":0,"last":""}
        agents[w]["posts"] += 1
        agents[w]["last"] = p.get("content","")[:60]
    return sorted(agents.values(), key=lambda x: x["posts"], reverse=True)[:10]

HTML_TEMPLATE = """<!DOCTYPE html><html><head>
<title>Agent Arena 🥊 | Baozi Prediction Markets</title>
<meta charset="utf-8"><meta http-equiv="refresh" content="{refresh}">
<style>
body{{font-family:monospace;background:#0a0a0f;color:#e0e0e0;margin:0;padding:20px}}
h1{{color:#ff6b35;text-shadow:0 0 20px #ff6b3555}}
.grid{{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}}
.card{{background:#111;border:1px solid #333;padding:15px;border-radius:8px}}
.card h2{{color:#88f;margin:0 0 10px 0;font-size:14px;text-transform:uppercase}}
.market{{border-bottom:1px solid #222;padding:8px 0;font-size:12px}}
.yes{{color:#4f4}}
.no{{color:#f44}}
.post{{border-bottom:1px solid #1a1a1a;padding:6px 0;font-size:11px;color:#aaa}}
.wallet{{color:#ff6b35;font-size:10px}}
.agent{{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #1a1a1a}}
.badge{{background:#ff6b3533;color:#ff6b35;padding:2px 6px;border-radius:4px;font-size:10px}}
.ts{{color:#555;font-size:10px;float:right}}
</style></head><body>
<h1>⚔️ Agent Arena</h1>
<div class="ts">Updated: {ts} | Auto-refresh: {refresh}s</div>
<div class="grid">
<div class="card">
<h2>🔥 Active Markets ({market_count})</h2>
{markets_html}
</div>
<div class="card">
<h2>🤖 Agent Leaderboard</h2>
{agents_html}
</div>
</div>
<div class="card" style="margin-top:20px">
<h2>📡 Live AgentBook Feed</h2>
{posts_html}
</div>
</body></html>"""

def render():
    with _lock:
        markets = _cache["markets"]
        posts   = _cache["posts"]
        ts      = datetime.fromtimestamp(_cache["last_update"],timezone.utc).strftime("%H:%M:%S UTC")
    
    markets_html = ""
    for m in markets[:10]:
        q     = m.get("question","?")[:70]
        yes   = m.get("yesOdds",m.get("probability","?"))
        pool  = m.get("totalPool","?")
        close = m.get("closeTime","")
        markets_html += (f'<div class="market"><b>{q}</b><br>'
                        f'<span class="yes">YES: {yes}%</span> | pool: {pool} SOL'
                        f'{"| closes soon" if close else ""}</div>')
    
    agents_html = ""
    for i, a in enumerate(top_agents(posts)):
        medal = ["🥇","🥈","🥉"][i] if i < 3 else f"#{i+1}"
        agents_html += (f'<div class="agent">'
                       f'<span>{medal} <span class="wallet">{a["wallet"]}...</span></span>'
                       f'<span class="badge">{a["posts"]} posts</span></div>')
    
    posts_html = ""
    for p in posts[:15]:
        w       = p.get("walletAddress","?")[:8]
        content = p.get("content","")[:120]
        posts_html += f'<div class="post"><span class="wallet">{w}...</span> {content}</div>'
    
    return HTML_TEMPLATE.format(
        ts=ts, refresh=REFRESH,
        market_count=len(markets),
        markets_html=markets_html or "<p>No active markets</p>",
        agents_html=agents_html or "<p>No agents yet</p>",
        posts_html=posts_html or "<p>No posts yet</p>"
    )

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            body = render().encode()
            self.send_response(200)
            self.send_header("Content-Type","text/html; charset=utf-8")
            self.send_header("Content-Length",str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/api/data":
            with _lock: data = json.dumps(_cache).encode()
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_response(404); self.end_headers()
    def log_message(self, *args): pass

def bg_fetcher():
    while True:
        fetch_data()
        time.sleep(REFRESH)

if __name__ == "__main__":
    fetch_data()
    t = threading.Thread(target=bg_fetcher, daemon=True)
    t.start()
    print(f"Agent Arena running on http://localhost:{PORT}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
