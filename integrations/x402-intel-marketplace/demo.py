#!/usr/bin/env python3
"""
x402 Intel Marketplace - Demo Script
Shows end-to-end flow for Bounty #40
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from marketplace import IntelMarketplace, AnalystStats

def print_header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def main():
    marketplace = IntelMarketplace()
    
    print_header("x402 Agent Intel Marketplace - Demo")
    print("Bounty #40 Submission by Atlas")
    print("Wallet: TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs")
    
    # Step 1: Register Analyst
    print_header("Step 1: Register Analyst")
    analyst = marketplace.register_analyst(
        wallet="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        display_name="Atlas",
        affiliate_code="ATLAS"
    )
    print(f"Analyst: {analyst.display_name}")
    print(f"Wallet: {analyst.wallet}")
    print(f"Affiliate Code: {analyst.affiliate_code}")
    print(f"[OK] Registration complete")
    
    # Step 2: Publish Analysis
    print_header("Step 2: Publish Market Analysis")
    analysis = marketplace.publish_analysis(
        analyst_wallet="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        market_pda="BTC_110K_DEC2026",
        thesis="BTC will reach $110k by Dec 2026 based on historical halving cycles and institutional adoption trends. On-chain data shows accumulation by whales at current levels.",
        recommended_side="YES",
        confidence=78,
        price_sol=0.01
    )
    print(f"Analysis ID: {analysis.id}")
    print(f"Market: {analysis.market_pda}")
    print(f"Recommendation: {analysis.recommended_side} @ {analysis.confidence}% confidence")
    print(f"Price: {analysis.price_sol} SOL")
    print(f"[OK] Analysis published with x402 paywall")
    
    # Step 3: Discover
    print_header("Step 3: Discover Analyses")
    analyses = marketplace.discover_analyses()
    print(f"Available analyses: {len(analyses)}")
    for a in analyses:
        print(f"\n  ID: {a.id}")
        print(f"  Analyst: {a.analyst_name} ({a.affiliate_code})")
        print(f"  Market: {a.market_pda}")
        print(f"  Side: {a.recommended_side} @ {a.confidence}% confidence")
        print(f"  Price: {a.price_sol} SOL")
        print(f"  Sales: {a.sold_count} ({a.revenue_sol} SOL revenue)")
    
    # Step 4: Purchase
    print_header("Step 4: Purchase Analysis (x402 Payment)")
    buyer_wallet = "BuyerWallet123456789"
    success, purchased = marketplace.purchase_analysis(analysis.id, buyer_wallet)
    print(f"Buyer: {buyer_wallet}")
    print(f"Analysis: {analysis.id}")
    print(f"Price: {analysis.price_sol} SOL")
    print(f"[OK] x402 payment {'successful' if success else 'failed'}")
    print(f"Thesis unlocked: {purchased.thesis[:100]}...")
    
    # Step 5: Simulate Market Resolution
    print_header("Step 5: Simulate Market Resolution")
    print("Assuming market resolves: YES (correct prediction)")
    marketplace.db.update_analyst_stats(
        wallet="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        correct=True,  # Prediction was correct
        confidence=78,
        sold=True,
        x402_revenue=0.01,
        affiliate_revenue=0.001  # 1% of buyer's bet
    )
    print("[OK] Analyst stats updated")
    
    # Step 6: Leaderboard
    print_header("Step 6: Analyst Leaderboard")
    leaderboard = marketplace.get_leaderboard(limit=5)
    print(f"Top {len(leaderboard)} analysts by accuracy:\n")
    for i, entry in enumerate(leaderboard, 1):
        stats = entry["stats"]
        print(f"  #{i} {entry['analyst']} ({entry['affiliateCode']})")
        print(f"      Accuracy: {stats['accuracy']*100:.1f}%")
        print(f"      Analyses: {stats['totalAnalyses']}")
        print(f"      Revenue: {stats['revenue_x402'] + stats['revenue_affiliate']:.4f} SOL")
        print()
    
    # Step 7: Revenue Summary
    print_header("Revenue Summary")
    final_analyst = marketplace.db.get_or_create_analyst(
        "TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        "Atlas",
        "ATLAS"
    )
    print(f"Analyst: {final_analyst.display_name}")
    print(f"\nRevenue Streams:")
    print(f"  x402 Sales: {final_analyst.revenue_x402:.4f} SOL")
    print(f"  Affiliate: {final_analyst.revenue_affiliate:.4f} SOL")
    print(f"  Total: {final_analyst.revenue_x402 + final_analyst.revenue_affiliate:.4f} SOL")
    print(f"\n[OK] Demo complete!")
    
    print_header("Submission Complete")
    print("Files:")
    print("  - README.md")
    print("  - MCP_INTEGRATION.md")
    print("  - marketplace.py")
    print("  - SUBMISSION.md")
    print("\nWallet: TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs")
    print("Ready for bounty review!")

if __name__ == "__main__":
    main()
