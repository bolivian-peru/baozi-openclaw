"""
HTTP API client for Baozi prediction markets.
"""

import requests
from typing import Optional, List, Dict, Any
from datetime import datetime

from config import (
    MARKETS_ENDPOINT,
    AGENTBOOK_ENDPOINT,
    REQUEST_TIMEOUT,
    BAOZI_API_KEY,
    DEMO_MODE
)


# Sample market data for demo/testing
SAMPLE_MARKETS = [
    {
        "id": "btc-110k-march",
        "question": "Will BTC hit $110k by March 1?",
        "odds": {"YES": 58, "NO": 42},
        "totalPool": 32.4,
        "endTime": "2026-03-01T23:59:59Z"
    },
    {
        "id": "eth-5k-q1",
        "question": "Will ETH break $5k in Q1 2026?",
        "odds": {"YES": 34, "NO": 66},
        "totalPool": 18.2,
        "endTime": "2026-03-31T23:59:59Z"
    },
    {
        "id": "sol-alltime-high",
        "question": "Will SOL reach new ATH by April?",
        "odds": {"YES": 72, "NO": 28},
        "totalPool": 45.7,
        "endTime": "2026-04-30T23:59:59Z"
    }
]


class BaoziAPIClient:
    """Client for interacting with Baozi API."""
    
    def __init__(self, timeout: int = REQUEST_TIMEOUT, api_key: Optional[str] = None):
        self.timeout = timeout
        self.api_key = api_key or BAOZI_API_KEY
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "User-Agent": "NightKitchen-Agent/1.0"
        })
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"
    
    def get_markets(self) -> List[Dict[str, Any]]:
        """
        Fetch all markets from Baozi API.
        
        Returns:
            List of market dictionaries
        """
        # Use demo data if in demo mode or no API key
        if DEMO_MODE or not self.api_key:
            print("note: using demo data (set BAOZI_API_KEY for live data)", )
            return SAMPLE_MARKETS
        
        try:
            response = self.session.get(
                MARKETS_ENDPOINT,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Handle different response formats
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Check for error response
                if not data.get("success", True):
                    error = data.get("error", {})
                    print(f"api error: {error.get('message', 'unknown error')}")
                    return []
                # Might be nested under 'markets' or 'data' key
                return data.get("markets", data.get("data", []))
            else:
                return []
                
        except requests.exceptions.RequestException as e:
            print(f"error fetching markets: {e}")
            return []
    
    def get_market_by_id(self, market_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a specific market by ID.
        
        Args:
            market_id: The market identifier
        
        Returns:
            Market dictionary or None if not found
        """
        markets = self.get_markets()
        for market in markets:
            if market.get("id") == market_id or market.get("marketId") == market_id:
                return market
        return None
    
    def post_to_agentbook(
        self,
        content: str,
        market_id: Optional[str] = None
    ) -> bool:
        """
        Post content to AgentBook.
        
        Args:
            content: The content to post
            market_id: Optional market ID to associate
        
        Returns:
            True if successful, False otherwise
        """
        if DEMO_MODE or not self.api_key:
            print("note: demo mode - skipping post (set BAOZI_API_KEY for real posting)")
            return True  # Simulate success in demo mode
        
        payload = {
            "content": content
        }
        if market_id:
            payload["marketId"] = market_id
        
        try:
            response = self.session.post(
                AGENTBOOK_ENDPOINT,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            print(f"error posting to agentbook: {e}")
            return False
    
    def close(self):
        """Close the session."""
        self.session.close()


def format_pool_amount(amount: Any) -> str:
    """Format pool amount for display."""
    if isinstance(amount, (int, float)):
        return f"{amount:.1f} SOL"
    return str(amount)


def format_odds_percentage(value: Any) -> str:
    """Format odds as percentage."""
    if isinstance(value, (int, float)):
        return f"{int(value)}"
    return str(value)
