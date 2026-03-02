"""
Proverb selection logic for Night Kitchen Agent.
Selects appropriate Chinese proverbs based on market conditions.
"""

from dataclasses import dataclass
from typing import Optional
import random


@dataclass
class Proverb:
    chinese: str
    english: str
    context: str  # When to use this proverb


# Proverb library with context rules
PROVERB_LIBRARY = [
    Proverb(
        chinese="心急吃不了热豆腐",
        english="patience — you can't rush hot tofu.",
        context="patience"
    ),
    Proverb(
        chinese="慢工出细活",
        english="fine work takes time.",
        context="quality_time"
    ),
    Proverb(
        chinese="好饭不怕晚",
        english="good food doesn't fear being late.",
        context="worth_waiting"
    ),
    Proverb(
        chinese="火候到了，自然熟",
        english="when the fire is right, it will be done.",
        context="timing"
    ),
    Proverb(
        chinese="贪多嚼不烂",
        english="bite off more than you can chew.",
        context="risk_warning"
    ),
    Proverb(
        chinese="知足常乐",
        english="contentment brings happiness.",
        context="take_profits"
    ),
    Proverb(
        chinese="见好就收",
        english="quit while you're ahead.",
        context="smart_exits"
    ),
    Proverb(
        chinese="谋事在人成事在天",
        english="man proposes, heaven disposes.",
        context="acceptance"
    ),
]

BRAND_TAGLINE = Proverb(
    chinese="小小一笼，大大缘分",
    english="small basket, big connection.",
    context="brand"
)


def select_proverb_for_market(market_data: dict) -> Proverb:
    """
    Select an appropriate proverb based on market conditions.
    
    Args:
        market_data: Market dict with keys like 'endTime', 'totalPool', 'odds'
    
    Returns:
        Selected Proverb
    """
    # Analyze market conditions
    end_time = market_data.get("endTime")
    total_pool = market_data.get("totalPool", 0)
    odds = market_data.get("odds", {})
    
    # Extract odds values
    yes_odds = odds.get("YES", 50)
    no_odds = odds.get("NO", 50)
    
    # Determine context based on conditions
    
    # High-stakes market (large pool)
    if total_pool and total_pool > 50:
        candidates = [p for p in PROVERB_LIBRARY if p.context in ["risk_warning", "smart_exits", "take_profits"]]
        if candidates:
            return random.choice(candidates)
    
    # Close to resolution (end time within 7 days)
    if end_time:
        from datetime import datetime, timezone
        try:
            if isinstance(end_time, str):
                end_dt = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
            else:
                end_dt = end_time
            
            now = datetime.now(timezone.utc)
            days_remaining = (end_dt - now).days
            
            if days_remaining <= 7:
                candidates = [p for p in PROVERB_LIBRARY if p.context in ["timing", "acceptance", "smart_exits"]]
                if candidates:
                    return random.choice(candidates)
            elif days_remaining > 30:
                candidates = [p for p in PROVERB_LIBRARY if p.context in ["patience", "quality_time", "worth_waiting"]]
                if candidates:
                    return random.choice(candidates)
        except Exception:
            pass
    
    # Close odds (uncertain outcome)
    if abs(yes_odds - no_odds) < 10:
        candidates = [p for p in PROVERB_LIBRARY if p.context in ["acceptance", "timing"]]
        if candidates:
            return random.choice(candidates)
    
    # Default: random from all
    return random.choice(PROVERB_LIBRARY)


def format_proverb(proverb: Proverb) -> str:
    """Format a proverb for display in report."""
    return f'{proverb.chinese}\n   "{proverb.english}"'


def get_closing_proverb() -> Proverb:
    """Get the closing proverb for the report footer."""
    return BRAND_TAGLINE
