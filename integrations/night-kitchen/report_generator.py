"""
Report formatting for Night Kitchen Agent.
Generates bilingual market reports in Baozi brand voice.
"""

from datetime import datetime
from typing import List, Dict, Any

from config import (
    DEFAULT_REPORT_TITLE,
    MAX_MARKETS_DISPLAY,
    BRAND_TAGLINE,
    BRAND_URL
)
from proverbs import (
    select_proverb_for_market,
    format_proverb,
    get_closing_proverb
)
from api_client import format_pool_amount, format_odds_percentage


def generate_report(markets: List[Dict[str, Any]]) -> str:
    """
    Generate a bilingual market report.
    
    Args:
        markets: List of market data from API
    
    Returns:
        Formatted report string
    """
    lines = []
    
    # Header
    lines.append(DEFAULT_REPORT_TITLE)
    
    # Date
    now = datetime.now()
    date_str = now.strftime("%b %d, %Y").lower()
    lines.append(date_str)
    lines.append("")
    
    # Market count
    market_count = len(markets)
    if market_count == 0:
        lines.append("no markets cooking right now.")
        lines.append("")
    else:
        lines.append(f"{market_count} market{'s' if market_count != 1 else ''} cooking.")
        lines.append("")
    
    # Display markets (limit to max)
    display_markets = markets[:MAX_MARKETS_DISPLAY]
    
    for market in display_markets:
        market_block = format_market_block(market)
        lines.append(market_block)
        lines.append("")
    
    # Separator
    lines.append("─" * 15)
    lines.append("")
    
    # Closing proverb
    closing = get_closing_proverb()
    lines.append(f"{closing.chinese} — {closing.english}")
    lines.append("")
    
    # Footer
    lines.append(f"{BRAND_URL} | {BRAND_TAGLINE}")
    
    return "\n".join(lines)


def format_market_block(market: Dict[str, Any]) -> str:
    """
    Format a single market for display.
    
    Args:
        market: Market data dictionary
    
    Returns:
        Formatted market block string
    """
    lines = []
    
    # Market emoji and question
    question = market.get("question") or market.get("title") or "unknown market"
    lines.append(f'🥟 "{question}"')
    
    # Odds
    odds = market.get("odds", {})
    if not odds and "yesOdds" in market:
        # Handle alternative format
        odds = {
            "YES": market.get("yesOdds", 50),
            "NO": market.get("noOdds", 50)
        }
    
    yes_pct = format_odds_percentage(odds.get("YES", 50))
    no_pct = format_odds_percentage(odds.get("NO", 50))
    
    # Pool
    pool = market.get("totalPool") or market.get("poolSize") or 0
    pool_str = format_pool_amount(pool)
    
    lines.append(f"   YES: {yes_pct}% | NO: {no_pct}% | Pool: {pool_str}")
    lines.append("")
    
    # Proverb for this market
    proverb = select_proverb_for_market(market)
    proverb_text = format_proverb(proverb)
    lines.append(f"   {proverb_text}")
    
    return "\n".join(lines)


def generate_short_report(markets: List[Dict[str, Any]]) -> str:
    """
    Generate a shorter, summary-style report.
    
    Args:
        markets: List of market data
    
    Returns:
        Short formatted report
    """
    if not markets:
        return "no markets cooking right now."
    
    count = len(markets)
    lines = [
        f"{count} market{'s' if count != 1 else ''} cooking.",
        ""
    ]
    
    # Just show top 3 with minimal info
    for market in markets[:3]:
        question = market.get("question") or market.get("title") or "market"
        odds = market.get("odds", {})
        yes_pct = format_odds_percentage(odds.get("YES", 50))
        lines.append(f'• "{question[:50]}..." YES: {yes_pct}%')
    
    lines.append("")
    lines.append(f"full report: {BRAND_URL}")
    
    return "\n".join(lines)
