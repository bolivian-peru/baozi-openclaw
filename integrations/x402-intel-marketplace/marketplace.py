"""
x402 Intel Marketplace - Core Module
Atlas Implementation for Baozi Bounty #40
"""

import json
import hashlib
from datetime import datetime
from typing import Optional, List, Dict
from dataclasses import dataclass, asdict
from pathlib import Path

# ============ Data Models ============

@dataclass
class Analysis:
    """Market analysis with x402 paywall"""
    id: str
    analyst_wallet: str
    analyst_name: str
    affiliate_code: str
    market_pda: str
    thesis: str
    recommended_side: str  # "YES" / "NO" or outcome
    confidence: int  # 1-100
    price_sol: float
    created_at: str
    sold_count: int = 0
    revenue_sol: float = 0.0

@dataclass
class AnalystStats:
    """Analyst reputation tracking"""
    wallet: str
    display_name: str
    affiliate_code: str
    total_analyses: int = 0
    correct_predictions: int = 0
    accuracy: float = 0.0
    avg_confidence: float = 0.0
    total_sold: int = 0
    revenue_x402: float = 0.0
    revenue_affiliate: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "analyst": self.display_name,
            "wallet": self.wallet,
            "affiliateCode": self.affiliate_code,
            "stats": {
                "totalAnalyses": self.total_analyses,
                "correct": self.correct_predictions,
                "accuracy": round(self.accuracy, 3),
                "avgConfidence": round(self.avg_confidence, 1),
                "totalSold": self.total_sold,
                "revenue_x402": round(self.revenue_x402, 4),
                "revenue_affiliate": round(self.revenue_affiliate, 4)
            }
        }

# ============ Database Layer ============

class MarketplaceDB:
    """Simple file-based database for marketplace"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        self.analyses_file = self.data_dir / "analyses.json"
        self.analysts_file = self.data_dir / "analysts.json"
        self.sales_file = self.data_dir / "sales.json"
        
        # Initialize files
        for f in [self.analyses_file, self.analysts_file, self.sales_file]:
            if not f.exists():
                f.write_text("[]")
    
    # Analysis CRUD
    def add_analysis(self, analysis: Analysis) -> str:
        analyses = self._load_analyses()
        analyses.append(asdict(analysis))
        self._save_analyses(analyses)
        return analysis.id
    
    def get_analysis(self, analysis_id: str) -> Optional[Analysis]:
        analyses = self._load_analyses()
        for a in analyses:
            if a["id"] == analysis_id:
                return Analysis(**a)
        return None
    
    def get_market_analyses(self, market_pda: str) -> List[Analysis]:
        """Get all analyses for a specific market"""
        analyses = self._load_analyses()
        return [Analysis(**a) for a in analyses if a["market_pda"] == market_pda]
    
    def get_all_analyses(self) -> List[Analysis]:
        analyses = self._load_analyses()
        return [Analysis(**a) for a in analyses]
    
    def record_sale(self, analysis_id: str, buyer_wallet: str, price_sol: float):
        """Record an x402 sale"""
        sales = self._load_sales()
        sales.append({
            "analysis_id": analysis_id,
            "buyer_wallet": buyer_wallet,
            "price_sol": price_sol,
            "timestamp": datetime.utcnow().isoformat()
        })
        self._save_sales(sales)
        
        # Update analysis sold count
        analyses = self._load_analyses()
        for a in analyses:
            if a["id"] == analysis_id:
                a["sold_count"] += 1
                a["revenue_sol"] += price_sol
                break
        self._save_analyses(analyses)
    
    # Analyst CRUD
    def get_or_create_analyst(self, wallet: str, display_name: str, affiliate_code: str) -> AnalystStats:
        analysts = self._load_analysts()
        for a in analysts:
            if a["wallet"] == wallet:
                return AnalystStats(**a)
        
        # Create new
        new_analyst = AnalystStats(
            wallet=wallet,
            display_name=display_name,
            affiliate_code=affiliate_code
        )
        analysts.append(asdict(new_analyst))
        self._save_analysts(analysts)
        return new_analyst
    
    def update_analyst_stats(self, wallet: str, correct: bool, confidence: int, sold: bool, x402_revenue: float = 0, affiliate_revenue: float = 0):
        """Update analyst statistics after market resolution"""
        analysts = self._load_analysts()
        for a in analysts:
            if a["wallet"] == wallet:
                if correct is not None:
                    a["total_analyses"] += 1
                    if correct:
                        a["correct_predictions"] += 1
                    a["accuracy"] = a["correct_predictions"] / a["total_analyses"]
                
                # Update average confidence
                total_conf = a["avg_confidence"] * (a["total_analyses"] - 1) + confidence
                a["avg_confidence"] = total_conf / a["total_analyses"]
                
                if sold:
                    a["total_sold"] += 1
                
                a["revenue_x402"] += x402_revenue
                a["revenue_affiliate"] += affiliate_revenue
                break
        self._save_analysts(analysts)
    
    def get_analyst_leaderboard(self, limit: int = 10) -> List[dict]:
        """Get top analysts by accuracy"""
        analysts = self._load_analysts()
        # Sort by accuracy (min 5 analyses)
        qualified = [a for a in analysts if a["total_analyses"] >= 5]
        sorted_analysts = sorted(qualified, key=lambda x: x["accuracy"], reverse=True)
        return [AnalystStats(**a).to_dict() for a in sorted_analysts[:limit]]
    
    # File I/O helpers
    def _load_analyses(self) -> List[dict]:
        return json.loads(self.analyses_file.read_text())
    
    def _save_analyses(self, analyses: List[dict]):
        self.analyses_file.write_text(json.dumps(analyses, indent=2))
    
    def _load_analysts(self) -> List[dict]:
        return json.loads(self.analysts_file.read_text())
    
    def _save_analysts(self, analysts: List[dict]):
        self.analysts_file.write_text(json.dumps(analysts, indent=2))
    
    def _load_sales(self) -> List[dict]:
        return json.loads(self.sales_file.read_text())
    
    def _save_sales(self, sales: List[dict]):
        self.sales_file.write_text(json.dumps(sales, indent=2))

# ============ x402 Payment Simulation ============

class X402Payment:
    """
    x402 micropayment handler
    
    Note: Full x402 implementation requires Solana wallet integration.
    This is a working prototype with simulated payment flow.
    """
    
    def __init__(self, db: MarketplaceDB):
        self.db = db
    
    def create_payment_intent(self, analysis: Analysis, buyer_wallet: str) -> dict:
        """Create x402 payment intent"""
        return {
            "type": "x402",
            "analysis_id": analysis.id,
            "from": buyer_wallet,
            "to": analysis.analyst_wallet,
            "amount_sol": analysis.price_sol,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
    
    def process_payment(self, payment_intent: dict) -> bool:
        """
        Process x402 payment
        
        In production: This would interact with Solana blockchain
        For prototype: Simulated successful payment
        """
        # Simulate payment success
        payment_intent["status"] = "completed"
        payment_intent["completed_at"] = datetime.utcnow().isoformat()
        
        # Record sale
        self.db.record_sale(
            payment_intent["analysis_id"],
            payment_intent["from"],
            payment_intent["amount_sol"]
        )
        
        return True

# ============ Marketplace Service ============

class IntelMarketplace:
    """Main marketplace service"""
    
    def __init__(self):
        self.db = MarketplaceDB()
        self.x402 = X402Payment(self.db)
    
    def register_analyst(self, wallet: str, display_name: str, affiliate_code: str) -> AnalystStats:
        """Register new analyst"""
        return self.db.get_or_create_analyst(wallet, display_name, affiliate_code)
    
    def publish_analysis(
        self,
        analyst_wallet: str,
        market_pda: str,
        thesis: str,
        recommended_side: str,
        confidence: int,
        price_sol: float
    ) -> Analysis:
        """Publish paywalled market analysis"""
        analyst = self.db.get_or_create_analyst(analyst_wallet, "Analyst", "ANON")
        
        analysis = Analysis(
            id=self._generate_id(analyst_wallet, market_pda),
            analyst_wallet=analyst_wallet,
            analyst_name=analyst.display_name,
            affiliate_code=analyst.affiliate_code,
            market_pda=market_pda,
            thesis=thesis,
            recommended_side=recommended_side,
            confidence=confidence,
            price_sol=price_sol,
            created_at=datetime.utcnow().isoformat()
        )
        
        self.db.add_analysis(analysis)
        return analysis
    
    def discover_analyses(self, market_pda: Optional[str] = None) -> List[Analysis]:
        """Discover available analyses"""
        if market_pda:
            return self.db.get_market_analyses(market_pda)
        return self.db.get_all_analyses()
    
    def purchase_analysis(self, analysis_id: str, buyer_wallet: str) -> tuple[bool, Optional[Analysis]]:
        """Purchase analysis via x402"""
        analysis = self.db.get_analysis(analysis_id)
        if not analysis:
            return False, None
        
        payment_intent = self.x402.create_payment_intent(analysis, buyer_wallet)
        success = self.x402.process_payment(payment_intent)
        
        if success:
            return True, analysis
        return False, None
    
    def get_leaderboard(self, limit: int = 10) -> List[dict]:
        """Get top analysts"""
        return self.db.get_analyst_leaderboard(limit)
    
    def _generate_id(self, wallet: str, market_pda: str) -> str:
        """Generate unique analysis ID"""
        content = f"{wallet}:{market_pda}:{datetime.utcnow().isoformat()}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

# ============ CLI Interface ============

def main():
    """Test marketplace functionality"""
    import io
    import sys
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    marketplace = IntelMarketplace()
    
    # Register analyst
    print("Registering analyst...")
    analyst = marketplace.register_analyst(
        wallet="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        display_name="Atlas",
        affiliate_code="ATLAS"
    )
    print(f"[OK] Analyst registered: {analyst.to_dict()}")
    
    # Publish analysis
    print("Publishing analysis...")
    analysis = marketplace.publish_analysis(
        analyst_wallet="TNNuTJ1wN5F6WN6K6ZvgpX4q1e3VVKRREs",
        market_pda="BTC_110K_DEC2026",
        thesis="BTC will reach $110k by Dec 2026 based on historical halving cycles and institutional adoption trends.",
        recommended_side="YES",
        confidence=78,
        price_sol=0.01
    )
    print(f"[OK] Analysis published: {analysis.id}")
    
    # Discover
    print("Discovering analyses...")
    analyses = marketplace.discover_analyses()
    for a in analyses:
        print(f"  - {a.id}: {a.recommended_side} @ {a.confidence}% confidence ({a.price_sol} SOL)")
    
    # Purchase
    print("Purchasing analysis...")
    success, purchased = marketplace.purchase_analysis(analysis.id, "BuyerWallet123")
    print(f"[OK] Purchase {'successful' if success else 'failed'}")
    
    # Leaderboard
    print("Leaderboard:")
    for entry in marketplace.get_leaderboard():
        print(f"  {entry['analyst']}: {entry['stats']['accuracy']*100:.1f}% accuracy")

if __name__ == "__main__":
    main()
