import random
from datetime import datetime

# Night Kitchen — Bilingual Market Report Agent
# Bounty #39 Submission

PROVERBS = [
    {"cn": "心急吃不了热豆腐", "en": "can't rush hot tofu", "theme": "patience"},
    {"cn": "慢工出细活", "en": "slow work, fine craft", "theme": "quality"},
    {"cn": "好饭不怕晚", "en": "good food doesn't fear being late", "theme": "waiting"},
    {"cn": "火候到了，自然熟", "en": "right heat, naturally cooked", "theme": "timing"},
    {"cn": "民以食为天", "en": "food is heaven for people", "theme": "fundamentals"},
    {"cn": "贪多嚼不烂", "en": "bite off too much, can't chew", "theme": "risk"},
    {"cn": "知足常乐", "en": "contentment brings happiness", "theme": "profits"},
    {"cn": "见好就收", "en": "quit while ahead", "theme": "exit"},
    {"cn": "谋事在人成事在天", "en": "you plan, fate decides", "theme": "acceptance"},
    {"cn": "小小一笼大大缘分", "en": "small steamer, big fate", "theme": "tagline"}
]

def get_proverb(market):
    # Select proverb based on days left
    days = market.get('days_left', 0)
    if days > 7:
        return PROVERBS[0] # patience
    elif days < 2:
        return PROVERBS[3] # timing
    else:
        return random.choice(PROVERBS[5:8]) # risk/profit/exit

def generate_report(markets):
    report = "夜厨房 — night kitchen report\n"
    report += datetime.now().strftime("%b %d, %Y").lower() + "\n\n"
    report += f"{len(markets)} markets cooking. grandma checked the evidence.\n\n"
    
    for m in markets:
        proverb = get_proverb(m)
        report += f"🥟 \"{m['question']}\"\n"
        report += f"   YES: {m['yes_prob']}% | NO: {m['no_prob']}% | Pool: {m['pool']} SOL\n"
        report += f"   closing in {m['days_left']} days\n\n"
        report += f"   {proverb['cn']}\n"
        report += f"   \"{proverb['en']}\"\n\n"
    
    report += "───────────────\n\n"
    report += f"{len(markets)} markets cooking. total pool: {sum(m['pool'] for m in markets):.1f} SOL\n\n"
    report += "好饭不怕晚 — good resolution doesn't fear being late.\n\n"
    report += "baozi.bet | 小小一笼，大大缘分\n"
    
    return report

if __name__ == "__main__":
    # In a real scenario, we'd fetch from the API
    # Using real-looking data for the demo
    SAMPLE_MARKETS = [
        {"question": "Will BTC hit $110k by March 1?", "yes_prob": 58, "no_prob": 42, "pool": 32.4, "days_left": 10},
        {"question": "Who wins NBA All-Star MVP?", "yes_prob": 35, "no_prob": 65, "pool": 18.7, "days_left": 2},
        {"question": "Will ETH reach $4k this week?", "yes_prob": 20, "no_prob": 80, "pool": 5.2, "days_left": 5}
    ]
    
    print(generate_report(SAMPLE_MARKETS))
