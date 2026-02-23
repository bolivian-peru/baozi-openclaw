import requests
import json
import random
from datetime import datetime

# 谚语库
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

KITCHEN_PHRASES = ["grandma checked the evidence.", "the steamer is whistling.", "the fire is just right.", "smells like a winning recipe."]

class NightKitchenAgent:
    def __init__(self):
        self.api_base = "https://baozi.bet/api"
        self.agentbook_endpoint = f"{self.api_base}/agentbook/posts"

    def fetch_real_markets(self):
        try:
            resp = requests.get(f"{self.api_base}/markets?status=Active&layer=Official", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return [{"question": m["question"], "odds": f"YES: {m['yesPercent']}% | NO: {m['noPercent']}%", 
                             "pool": f"{m['totalPoolSol']:.2f} SOL", "days_left": 7, "cat": "patience"} for m in data[:3]]
            return self.fetch_mock()
        except: return self.fetch_mock()

    def fetch_mock(self):
        return [{"question": "BTC hit $110k by March 1?", "odds": "YES: 58% | NO: 42%", "pool": "32.4 SOL", "days_left": 10, "cat": "patience"}]

    def generate_report(self, markets):
        report = f"夜厨房 — night kitchen report\n{datetime.now().strftime('%b %d, %Y').lower()}\n\n"
        report += f"{len(markets)} markets cooking. {random.choice(KITCHEN_PHRASES)}\n\n"
        for m in markets:
            p = random.choice([x for x in PROVERBS if x['cat'] == m['cat']] or PROVERBS)
            report += f"🥟 \"{m['question']}\"\n {m['odds']} | Pool: {m['pool']}\n {p['cn']}\n \"{p['en']}\"\n\n"
        report += "───────────────\n\n小小一笼，大大缘分\nbaozi.bet"
        return report.lower()

if __name__ == "__main__":
    agent = NightKitchenAgent()
    markets = agent.fetch_real_markets()
    print(agent.generate_report(markets))
