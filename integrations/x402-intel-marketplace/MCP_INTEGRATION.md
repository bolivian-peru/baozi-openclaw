# x402 Intel Marketplace - MCP Integration

## MCP Tools

```python
# Register as analyst
@MCP.tool()
async def register_analyst(display_name: str, affiliate_code: str) -> dict:
    """Register as market analyst"""
    wallet = get_wallet_address()  # User's SOL wallet
    marketplace = IntelMarketplace()
    analyst = marketplace.register_analyst(wallet, display_name, affiliate_code)
    return analyst.to_dict()

# Publish analysis
@MCP.tool()
async def publish_analysis(
    market_pda: str,
    thesis: str,
    recommended_side: str,
    confidence: int,
    price_sol: float
) -> dict:
    """Publish paywalled market analysis"""
    wallet = get_wallet_address()
    marketplace = IntelMarketplace()
    analysis = marketplace.publish_analysis(
        analyst_wallet=wallet,
        market_pda=market_pda,
        thesis=thesis,
        recommended_side=recommended_side,
        confidence=confidence,
        price_sol=price_sol
    )
    return asdict(analysis)

# Discover analyses
@MCP.tool()
async def discover_analyses(market_pda: Optional[str] = None) -> List[dict]:
    """Discover available market analyses"""
    marketplace = IntelMarketplace()
    analyses = marketplace.discover_analyses(market_pda)
    return [asdict(a) for a in analyses]

# Purchase analysis
@MCP.tool()
async def purchase_analysis(analysis_id: str) -> dict:
    """Purchase analysis via x402 micropayment"""
    wallet = get_wallet_address()
    marketplace = IntelMarketplace()
    success, analysis = marketplace.purchase_analysis(analysis_id, wallet)
    return {"success": success, "analysis": asdict(analysis) if analysis else None}

# Get leaderboard
@MCP.tool()
async def get_analyst_leaderboard(limit: int = 10) -> List[dict]:
    """Get top analysts by accuracy"""
    marketplace = IntelMarketplace()
    return marketplace.get_leaderboard(limit)
```

## Integration with Baozi MCP

```python
# Combined flow: Buy analysis -> Place bet
async def analyze_and_bet(market_pda: str):
    # 1. Discover analyses for this market
    analyses = await discover_analyses(market_pda)
    
    # 2. Find best analyst (high accuracy, reasonable price)
    leaderboard = await get_analyst_leaderboard()
    top_analyst_wallets = [e["wallet"] for e in leaderboard[:3]]
    
    recommended = [a for a in analyses if a["analyst_wallet"] in top_analyst_wallets]
    if not recommended:
        recommended = analyses[:1]  # Fallback to first
    
    # 3. Purchase best analysis
    best = recommended[0]
    success, analysis = await purchase_analysis(best["id"])
    
    if not success:
        return {"error": "Purchase failed"}
    
    # 4. Place bet using analysis recommendation
    from baozi_mcp import build_bet_transaction
    
    bet_tx = await build_bet_transaction(
        market_pda=market_pda,
        side=analysis["recommended_side"],
        amount_sol=0.1,  # Bet amount
        affiliate_code=analysis["affiliate_code"]  # Analyst gets 1%
    )
    
    return {
        "analysis": analysis,
        "bet_transaction": bet_tx,
        "message": f"Bet placed on {analysis['recommended_side']} with {analysis['confidence']}% confidence"
    }
```

## Revenue Model

| Stream | How It Works | Analyst Earns |
|--------|--------------|---------------|
| **x402 Sales** | Buyer pays SOL to unlock analysis | 100% of sale price |
| **Affiliate** | Buyer uses analyst's code when betting | 1% of bet volume (lifetime) |
| **Market Creation** | Analyst creates their own markets | Up to 2% of market volume |

**Example:**
```
Analyst "CryptoSage" publishes BTC analysis:
- Price: 0.01 SOL
- Sold 50 times = 0.5 SOL revenue

Buyers use code "SAGE" to bet:
- Total bet volume: 100 SOL
- Affiliate commission: 1 SOL (1%)

Total: 1.5 SOL passive income
```

## Setup

```bash
# Install dependencies
pip install aiohttp solana web3

# Configure wallet
export SOLANA_WALLET="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs"

# Run marketplace server
python server.py
```

## Testing

```bash
# Run test suite
python test_marketplace.py

# Test with real Baozi markets
python demo.py --mainnet
```

---

*Part of Baozi Bounty #40 submission by Atlas*
