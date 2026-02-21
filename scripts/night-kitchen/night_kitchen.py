import requests
import json
import random
from datetime import datetime

# Proverb Library
PROVERBS = [
    {"cn": "心急吃不了热豆腐", "en": "you can't rush hot tofu — patience.", "cat": "patience"},
    {"cn": "慢工出细活", "en": "slow work, fine craft — quality takes time.", "cat": "patience"},
    {"cn": "好饭不怕晚", "en": "good food doesn't fear being late — worth waiting.", "cat": "patience"},
    {"cn": "火候到了，自然熟", "en": "right heat, naturally cooked — timing.", "cat": "timing"},
    {"cn": "民以食为天", "en": "food is heaven for people — fundamentals.", "cat": "fundamentals"},
    {"cn": "贪多嚼不烂", "en": "bite off too much, can't chew — risk warning.", "cat": "risk"},
    {"cn": "知足常乐", "en": "contentment brings happiness — take profits.", "cat": "exit"},
    {"cn": "见好就收", "en": "quit while ahead — smart exits.", "cat": "exit"},
    {"cn": "谋事在人，成事在天", "en": "you plan, fate decides — acceptance.", "cat": "fate"},
    {"cn": "小小一笼，大大缘分", "en": "small steamer, big fate — brand tagline.", "cat": "brand"}
]

KITCHEN_PHRASES = [
    "grandma checked the evidence.",
    "the steamer is whistling.",
    "bamboo baskets are stacked high.",
    "the fire is just right.",
    "smells like a winning recipe.",
    "careful, the broth is hot."
]

class NightKitchenAgent:
    def __init__(self):
        self.api_base = "https://baozi.bet/api"
        self.agentbook_endpoint = f"{self.api_base}/agentbook/posts"

    def fetch_mock_markets(self):
        # In real scenario, use MCP tools list_markets
        # Here using data from recent AgentBook posts
        return [
            {
                "question": "Will BTC hit $110k by March 1?",
                "odds": "YES: 58% | NO: 42%",
                "pool": "32.4 SOL",
                "days_left": 10,
                "cat": "patience"
            },
            {
                "question": "Pizza emoji tweet by Baozi by March 1st?",
                "odds": "YES: 100% | NO: 0%",
                "pool": "0.05 SOL",
                "days_left": 7,
                "cat": "risk"
            },
            {
                "question": "Will MSTR hit 750k BTC holdings?",
                "odds": "YES: 45% | NO: 55%",
                "pool": "12.1 SOL",
                "days_left": 30,
                "cat": "timing"
            }
        ]

    def select_proverb(self, context_cat):
        eligible = [p for p in PROVERBS if p['cat'] == context_cat]
        if not eligible:
            eligible = PROVERBS
        return random.choice(eligible)

    def generate_report(self, markets):
        date_str = datetime.now().strftime("%b %d, %2026").lower()
        report = f"夜厨房 — night kitchen report\n{date_str}\n\n"
        report += f"{len(markets)} markets cooking. {random.choice(KITCHEN_PHRASES)}\n\n"
        
        for m in markets:
            proverb = self.select_proverb(m['cat'])
            report += f"🥟 \"{m['question']}\"\n"
            report += f" {m['odds']} | Pool: {m['pool']}\n"
            report += f" closing in {m['days_left']} days\n\n"
            report += f" {proverb['cn']}\n"
            report += f" \"{proverb['en']}\"\n\n"
        
        report += "───────────────\n\n"
        footer_proverb = self.select_proverb("brand")
        report += f"{footer_proverb['cn']} — {footer_proverb['en']}\n\n"
        report += "baozi.bet | 小小一笼，大大缘分"
        
        return report.lower()

    def post_to_agentbook(self, wallet, content):
        payload = {
            "walletAddress": wallet,
            "content": content
        }
        # try:
        #     resp = requests.post(self.agentbook_endpoint, json=payload)
        #     return resp.json()
        # except Exception as e:
        #     return {"success": False, "error": str(e)}
        return {"success": True, "message": "Demo: Content generated and ready for post."}

if __name__ == "__main__":
    agent = NightKitchenAgent()
    markets = agent.fetch_mock_markets()
    report = agent.generate_report(markets)
    print("--- GENERATED REPORT ---")
    print(report)
    print("------------------------")
    
    # Use Hu's Solana wallet for the bounty
    wallet = "Bro2YMsLRsrbj4ZdfzFfyUvsqtUyuTmX5RTre2xVp3xB"
    result = agent.post_to_agentbook(wallet, report)
    print(f"Post Result: {result}")
