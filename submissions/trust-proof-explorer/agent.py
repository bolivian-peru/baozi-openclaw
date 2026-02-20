#!/usr/bin/env python3
"""
Trust Proof Explorer — Baozi Oracle Transparency Dashboard

Fetches oracle resolution proofs from Baozi and displays them
in a verifiable, rich terminal UI.

Usage:
    python agent.py                    # full dashboard (all proofs)
    python agent.py --tier 2           # filter by tier
    python agent.py --category Sports  # filter by category
    python agent.py --layer official   # filter by layer
    python agent.py --search "BTC"     # search market questions
    python agent.py --stats            # oracle stats only
    python agent.py --compare          # show comparison table
"""

import argparse
import sys

from proofs import fetch_proofs, filter_proofs, compute_stats
from display import (
    console,
    render_dashboard,
    render_header,
    render_stats,
    render_comparison,
    render_empty_results,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Trust Proof Explorer \u2014 Baozi Oracle Transparency Dashboard"
    )
    parser.add_argument(
        "--tier", type=int, choices=[1, 2, 3],
        help="Filter by resolution tier (1=Trustless, 2=Verified, 3=AI Research)",
    )
    parser.add_argument(
        "--category", type=str,
        help="Filter by category (case-insensitive contains match)",
    )
    parser.add_argument(
        "--layer", type=str, choices=["official", "labs"],
        help="Filter by layer (official or labs)",
    )
    parser.add_argument(
        "--search", type=str,
        help="Search in market questions (case-insensitive)",
    )
    parser.add_argument(
        "--date", type=str,
        help="Filter by resolution date (YYYY-MM-DD format, e.g. 2026-02-19)",
    )
    parser.add_argument(
        "--stats", action="store_true",
        help="Show oracle stats only",
    )
    parser.add_argument(
        "--compare", action="store_true",
        help="Show Baozi vs competition comparison table",
    )

    args = parser.parse_args()

    response = fetch_proofs()

    if args.stats and not args.compare:
        # Apply any active filters before computing stats
        filtered_for_stats = filter_proofs(
            response.proofs,
            tier=args.tier,
            category=args.category,
            layer=args.layer,
            search=args.search,
            date=args.date,
        )
        render_header(response, filtered_count=len(filtered_for_stats))
        console.print()
        stats = compute_stats(filtered_for_stats)
        render_stats(stats, oracle_tiers=response.oracle.tiers)
        console.print()
        return

    if args.compare and not any([args.tier, args.category, args.layer, args.search, args.date]):
        if args.stats:
            render_header(response)
            console.print()
            stats = compute_stats(response.proofs)
            render_stats(stats, oracle_tiers=response.oracle.tiers)
        render_comparison()
        console.print()
        return

    filtered = filter_proofs(
        response.proofs,
        tier=args.tier,
        category=args.category,
        layer=args.layer,
        search=args.search,
        date=args.date,
    )

    stats = compute_stats(filtered)
    render_dashboard(response, filtered, stats, show_compare=args.compare)


if __name__ == "__main__":
    main()
