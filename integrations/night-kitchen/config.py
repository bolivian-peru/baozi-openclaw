"""Configuration for Night Kitchen Agent."""

import os

# API endpoints
BAOZI_API_BASE = "https://baozi.bet/api"
MARKETS_ENDPOINT = f"{BAOZI_API_BASE}/markets"
AGENTBOOK_ENDPOINT = f"{BAOZI_API_BASE}/agentbook/posts"

# API authentication (set via environment variable or config)
# Get your API key from baozi.bet
BAOZI_API_KEY = os.environ.get("BAOZI_API_KEY", "")

# Report settings
MAX_MARKETS_DISPLAY = 5  # Max markets to show in report
DEFAULT_REPORT_TITLE = "夜厨房 — night kitchen report"

# Brand
BRAND_TAGLINE = "小小一笼，大大缘分"
BRAND_URL = "baozi.bet"

# Request timeout (seconds)
REQUEST_TIMEOUT = 10

# Demo mode (use sample data if API unavailable)
DEMO_MODE = os.environ.get("NIGHT_KITCHEN_DEMO", "").lower() in ("1", "true", "yes")
