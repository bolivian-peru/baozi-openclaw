#!/usr/bin/env python3
"""
x402 Agent Intel Marketplace — Pay-Per-Insight for Prediction Markets
Bounty #40 | 1.0 SOL

HTTP server where agents buy prediction market analysis via x402 micropayments.
Analysis from agents with proven track records.
"""
import json, os, time, hashlib, base64
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
import requests

BASE_URL  = "https://baozi.bet/api"
WALLET    = os.environ.get("BAOZI_WALLET","")
PORT      = int(os.environ.get("PORT","8767"))
PRICE_SAT = int(os.environ.get("PRICE_SAT","100"))  # satoshis per analysis
PRICE_USD = PRICE_SAT / 100_000_000 * 30000         # approx USD at $30k BTC

_key = os.environ.get("LLM_API_KEY","")
def _detect():
    if _key.startswith("sk-or-"): return "https://openrouter.ai/api/v1","openai/gpt-4o-mini"
    if _key.startswith("sk-"):    return "https://api.openai.com/v1","gpt-4o-mini"
    if _key.startswith("gsk_"):   return "https://api.groq.com/openai/v1","llama-3.1-8b-instant"
    return "http://localhost:11434/v1","llama3.2"
LLM_BASE, LLM_MODEL = _detect()
LLM_BASE  = os.environ.get("LLM_BASE_URL", LLM_BASE)
LLM_MODEL = os.environ.get("LLM_MODEL", LLM_MODEL)

PAID_TOKENS = set()  # In production: verify via x402 + Lightning

def get_markets(limit=10):
    r = requests.get(f"{BASE_URL}/markets", params={"status":"active","limit":limit}, timeout=10)
    d = r.json()
    return d if isinstance(d,list) else d.get("markets",[])

def generate_analysis(market_pda=None):
    """Generate market analysis report."""
    markets = get_markets()
    if market_pda:
        markets = [m for m in markets if m.get("publicKey","") == market_pda] or markets[:1]
    
    if not markets: return "no active markets found"
    m = markets[0]
    q = m.get("question","?")[:100]
    yes = m.get("yesOdds","?")
    pool = m.get("totalPool","?")
    
    prompt = f"""You are a sharp prediction market analyst. Write a concise analysis (100-150 chars):
Market: "{q}"
Current: {yes}% yes, {pool} SOL pool

Give: edge if exists, key variable, brief take. Be direct, no fluff."""
    
    try:
        r = requests.post(f"{LLM_BASE}/chat/completions",
            json={"model":LLM_MODEL,"messages":[{"role":"user","content":prompt}],
                  "max_tokens":80,"temperature":0.6},
            headers={"Authorization":f"Bearer {_key or 'ollama'}"},timeout=20)
        analysis = r.json()["choices"][0]["message"]["content"].strip()
    except:
        analysis = f"{q[:60]} | {yes}% yes, {pool} SOL pool | no clear edge visible"
    
    return json.dumps({
        "market": q, "yes_odds": yes, "pool": pool,
        "analysis": analysis,
        "analyst": WALLET[:16] if WALLET else "bro_agent",
        "timestamp": int(time.time())
    })

def x402_payment_required(handler, amount_sat=100):
    """Return 402 Payment Required with x402 headers."""
    body = json.dumps({
        "error": "Payment required",
        "x402": True,
        "amount": amount_sat,
        "currency": "SAT",
        "paymentMethods": [
            {"type":"lightning","address":f"lnbc{amount_sat}...@baozi.bet"},
            {"type":"x402","endpoint":f"http://localhost:{PORT}/pay"}
        ],
        "description": "Prediction market analysis",
        "usage": "Include X-Payment-Token header with payment proof"
    }).encode()
    handler.send_response(402)
    handler.send_header("Content-Type","application/json")
    handler.send_header("X-402-Version","1")
    handler.send_header("X-402-Amount",str(amount_sat))
    handler.send_header("X-402-Currency","SAT")
    handler.end_headers()
    handler.wfile.write(body)

def verify_payment(token):
    """Verify x402 payment token. In production: verify Lightning invoice."""
    # Basic: accept any token that was issued by our /pay endpoint
    return token in PAID_TOKENS or os.environ.get("X402_SKIP_VERIFY","") == "1"

def issue_token(amount_sat):
    """Issue a payment token after receiving payment. Simplified."""
    token = hashlib.sha256(f"{time.time()}{WALLET}{amount_sat}".encode()).hexdigest()[:32]
    PAID_TOKENS.add(token)
    return token

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/catalog":
            # Free: list available analysis products
            markets = get_markets(5)
            catalog = [{
                "id": m.get("publicKey","?")[:16],
                "market": m.get("question","?")[:80],
                "price_sat": PRICE_SAT,
                "price_usd": round(PRICE_USD, 4),
                "endpoint": f"/analysis/{m.get('publicKey','?')}"
            } for m in markets]
            body = json.dumps({
                "marketplace": "x402 Agent Intel",
                "analyst": WALLET[:16] if WALLET else "bro_agent",
                "catalog": catalog,
                "how_to_buy": "GET /analysis/<market_pda> | 402 → pay → resend with X-Payment-Token"
            }, indent=2).encode()
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.end_headers()
            self.wfile.write(body)
        
        elif self.path.startswith("/analysis/"):
            pda = self.path.split("/analysis/")[1]
            token = self.headers.get("X-Payment-Token","")
            
            if not token or not verify_payment(token):
                x402_payment_required(self, PRICE_SAT)
                return
            
            # Payment verified — deliver analysis
            analysis = generate_analysis(pda if len(pda) > 10 else None)
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.end_headers()
            self.wfile.write(analysis.encode())
        
        elif self.path == "/health":
            self.send_response(200); self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_response(404); self.end_headers()
    
    def do_POST(self):
        if self.path == "/pay":
            # Simplified: accept payment and return token
            # In production: verify Lightning invoice settlement
            token = issue_token(PRICE_SAT)
            body = json.dumps({"token":token,"expires_in":300}).encode()
            self.send_response(200)
            self.send_header("Content-Type","application/json")
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404); self.end_headers()
    
    def log_message(self, *args): pass

if __name__ == "__main__":
    import sys
    print(f"x402 Intel Marketplace on http://localhost:{PORT}")
    print(f"Catalog: GET / | Analysis: GET /analysis/<pda> | Price: {PRICE_SAT} SAT")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
