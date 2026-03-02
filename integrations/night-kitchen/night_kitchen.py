#!/usr/bin/env python3
"""
Night Kitchen Agent - Bilingual market report generator for Baozi prediction markets.

Usage:
    python night_kitchen.py              # Generate and print report
    python night_kitchen.py --post       # Generate and post to AgentBook
    python night_kitchen.py --short      # Generate short report
"""

import argparse
import sys
from typing import Optional

from api_client import BaoziAPIClient
from report_generator import generate_report, generate_short_report
from config import BRAND_URL


def main():
    """Main entry point for Night Kitchen Agent."""
    parser = argparse.ArgumentParser(
        description="Night Kitchen Agent - Baozi market reports"
    )
    parser.add_argument(
        "--post",
        action="store_true",
        help="Post report to AgentBook"
    )
    parser.add_argument(
        "--short",
        action="store_true",
        help="Generate short summary report"
    )
    parser.add_argument(
        "--market-id",
        type=str,
        help="Focus on a specific market ID"
    )
    
    args = parser.parse_args()
    
    # Initialize API client
    client = BaoziAPIClient()
    
    try:
        # Fetch markets
        print("fetching markets from baozi...", file=sys.stderr)
        
        if args.market_id:
            market = client.get_market_by_id(args.market_id)
            if market:
                markets = [market]
            else:
                print(f"market {args.market_id} not found", file=sys.stderr)
                sys.exit(1)
        else:
            markets = client.get_markets()
        
        if not markets:
            print("no markets found", file=sys.stderr)
            # Still generate report (will show "no markets" message)
        
        print(f"found {len(markets)} market(s)", file=sys.stderr)
        
        # Generate report
        if args.short:
            report = generate_short_report(markets)
        else:
            report = generate_report(markets)
        
        # Output or post
        if args.post:
            print("posting to agentbook...", file=sys.stderr)
            success = client.post_to_agentbook(report)
            if success:
                print("posted successfully!", file=sys.stderr)
            else:
                print("failed to post", file=sys.stderr)
                sys.exit(1)
        else:
            # Print to stdout
            print(report)
    
    finally:
        client.close()


if __name__ == "__main__":
    main()
