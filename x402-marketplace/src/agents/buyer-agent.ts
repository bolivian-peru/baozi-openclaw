/**
 * Buyer Agent
 * 
 * An autonomous agent that:
 * 1. Discovers market analyses on the marketplace
 * 2. Evaluates analyst reputation and value
 * 3. Purchases high-quality analyses via x402 micropayment
 * 4. Places bets based on purchased analysis (with affiliate code)
 * 5. Tracks portfolio performance
 * 
 * The buyer agent is the demand side of the marketplace.
 * It seeks alpha by purchasing analysis from proven analysts.
 */

import { AgentIntelMarketplace } from '../marketplace';
import { generateMockSignature } from '../x402';
import {
  MarketplaceListing,
  MarketAnalysis,
  AnalysisPurchase,
  AnalystReputation,
} from '../types';

export interface BuyerAgentConfig {
  wallet: string;
  agentId: string;
  /** Maximum price willing to pay per analysis (SOL) */
  maxPriceSOL?: number;
  /** Minimum analyst accuracy to consider */
  minAnalystAccuracy?: number;
  /** Minimum confidence score to act on */
  minConfidence?: number;
  /** Maximum bet amount per trade */
  maxBetAmount?: number;
  /** Preferred analyst tiers */
  preferredTiers?: string[];
  /** Auto-bet after purchasing analysis */
  autoBet?: boolean;
  /** Bet amount as fraction of analysis confidence */
  betSizingStrategy?: 'fixed' | 'kelly' | 'proportional';
}

export class BuyerAgent {
  private config: BuyerAgentConfig;
  private marketplace: AgentIntelMarketplace;
  private purchasedAnalyses: Map<string, {
    analysis: MarketAnalysis;
    affiliateLink: string;
    purchase: AnalysisPurchase;
  }> = new Map();
  private bets: Array<{
    analysisId: string;
    marketPda: string;
    side: 'YES' | 'NO';
    amount: number;
    shares: number;
    affiliateCode: string;
  }> = [];

  constructor(config: BuyerAgentConfig, marketplace: AgentIntelMarketplace) {
    this.config = config;
    this.marketplace = marketplace;
  }

  /**
   * Browse the marketplace for analyses matching criteria.
   */
  browseMarketplace(filters?: {
    marketPda?: string;
    minAccuracy?: number;
    maxPrice?: number;
  }): MarketplaceListing[] {
    return this.marketplace.browseAnalyses({
      marketPda: filters?.marketPda,
      minAccuracy: filters?.minAccuracy ?? this.config.minAnalystAccuracy ?? 0.6,
      maxPrice: filters?.maxPrice ?? this.config.maxPriceSOL ?? 0.1,
      minConfidence: this.config.minConfidence ?? 60,
      sortBy: 'accuracy',
    });
  }

  /**
   * Evaluate whether an analysis is worth purchasing.
   * Returns a score from 0-100 based on:
   *   - Analyst accuracy & tier
   *   - Confidence score
   *   - Price vs expected value
   *   - Market liquidity
   */
  evaluateListing(listing: MarketplaceListing): {
    score: number;
    recommendation: 'buy' | 'skip' | 'watchlist';
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 50; // Start at neutral

    // Analyst accuracy
    const accuracy = listing.reputation.accuracy;
    if (accuracy >= 0.80) {
      score += 25;
      reasons.push(`High accuracy analyst (${(accuracy * 100).toFixed(1)}%)`);
    } else if (accuracy >= 0.65) {
      score += 15;
      reasons.push(`Good accuracy (${(accuracy * 100).toFixed(1)}%)`);
    } else if (accuracy >= 0.50) {
      score += 5;
      reasons.push(`Moderate accuracy (${(accuracy * 100).toFixed(1)}%)`);
    } else if (listing.reputation.resolvedAnalyses > 5) {
      score -= 10;
      reasons.push(`Low accuracy (${(accuracy * 100).toFixed(1)}%)`);
    }

    // Analyst tier
    const tierBonus: Record<string, number> = {
      legend: 20, oracle: 15, expert: 10, analyst: 5, apprentice: 0, newcomer: -5,
    };
    score += tierBonus[listing.reputation.tier] || 0;
    reasons.push(`Tier: ${listing.reputation.tier}`);

    // Confidence
    if (listing.analysis.confidence >= 80) {
      score += 10;
      reasons.push(`High confidence (${listing.analysis.confidence}%)`);
    } else if (listing.analysis.confidence >= 65) {
      score += 5;
      reasons.push(`Moderate confidence (${listing.analysis.confidence}%)`);
    }

    // Volume of past analyses
    if (listing.reputation.totalAnalyses >= 25) {
      score += 10;
      reasons.push(`Experienced analyst (${listing.reputation.totalAnalyses} analyses)`);
    } else if (listing.reputation.totalAnalyses >= 10) {
      score += 5;
      reasons.push(`Moderate experience (${listing.reputation.totalAnalyses} analyses)`);
    }

    // Price value assessment
    const expectedEdge = accuracy * (listing.analysis.confidence / 100);
    const priceValue = expectedEdge / listing.analysis.priceSOL;
    if (priceValue > 5) {
      score += 10;
      reasons.push('Excellent price-to-value ratio');
    } else if (priceValue > 2) {
      score += 5;
      reasons.push('Good price-to-value ratio');
    }

    // Streak bonus
    if (listing.reputation.streak >= 5) {
      score += 5;
      reasons.push(`On a ${listing.reputation.streak}-win streak`);
    }

    // Cap score
    score = Math.max(0, Math.min(100, score));

    let recommendation: 'buy' | 'skip' | 'watchlist';
    if (score >= 70) {
      recommendation = 'buy';
    } else if (score >= 50) {
      recommendation = 'watchlist';
    } else {
      recommendation = 'skip';
    }

    return { score, recommendation, reasons };
  }

  /**
   * Purchase an analysis via x402 payment.
   */
  async purchaseAnalysis(analysisId: string): Promise<{
    analysis: MarketAnalysis;
    affiliateLink: string;
    purchase: AnalysisPurchase;
  }> {
    // Step 1: Request analysis (get 402 payment details)
    const paymentDetails = this.marketplace.requestAnalysis(analysisId, this.config.wallet);

    // Step 2: Create and submit payment
    // In production: create Solana transfer transaction
    const signature = generateMockSignature();

    // Step 3: Complete purchase with payment proof
    const result = await this.marketplace.purchaseAnalysis({
      analysisId,
      buyerWallet: this.config.wallet,
      buyerAgentId: this.config.agentId,
      transactionSignature: signature,
    });

    this.purchasedAnalyses.set(analysisId, result);
    return result;
  }

  /**
   * Full flow: discover, evaluate, purchase, and optionally bet.
   * This is the main entry point for the autonomous buyer agent.
   */
  async discoverAndAct(marketPda?: string): Promise<{
    evaluated: number;
    purchased: number;
    betsPlaced: number;
    actions: Array<{
      analysisId: string;
      action: 'purchased' | 'bet' | 'skipped';
      details: string;
    }>;
  }> {
    const listings = this.browseMarketplace({ marketPda });
    const actions: Array<{
      analysisId: string;
      action: 'purchased' | 'bet' | 'skipped';
      details: string;
    }> = [];

    let purchased = 0;
    let betsPlaced = 0;

    for (const listing of listings) {
      const evaluation = this.evaluateListing(listing);

      if (evaluation.recommendation === 'buy') {
        try {
          // Purchase the analysis
          const purchase = await this.purchaseAnalysis(listing.analysis.id);
          purchased++;
          actions.push({
            analysisId: listing.analysis.id,
            action: 'purchased',
            details: `Score: ${evaluation.score}, Reasons: ${evaluation.reasons.join(', ')}`,
          });

          // Auto-bet if configured
          if (this.config.autoBet) {
            const betAmount = this.calculateBetSize(listing, evaluation.score);
            if (betAmount > 0) {
              const betResult = await this.marketplace.placeBetWithAffiliate({
                buyerWallet: this.config.wallet,
                analysisId: listing.analysis.id,
                amount: betAmount,
              });

              this.bets.push({
                analysisId: listing.analysis.id,
                marketPda: listing.analysis.marketPda,
                side: listing.analysis.recommendedSide,
                amount: betAmount,
                shares: betResult.shares,
                affiliateCode: betResult.affiliateCode,
              });

              betsPlaced++;
              actions.push({
                analysisId: listing.analysis.id,
                action: 'bet',
                details: `Bet ${betAmount} SOL on ${listing.analysis.recommendedSide} via affiliate ${betResult.affiliateCode}`,
              });
            }
          }
        } catch (err: any) {
          actions.push({
            analysisId: listing.analysis.id,
            action: 'skipped',
            details: `Error: ${err.message}`,
          });
        }
      } else {
        actions.push({
          analysisId: listing.analysis.id,
          action: 'skipped',
          details: `${evaluation.recommendation}: score ${evaluation.score}`,
        });
      }
    }

    return {
      evaluated: listings.length,
      purchased,
      betsPlaced,
      actions,
    };
  }

  /**
   * Calculate bet size based on strategy.
   */
  private calculateBetSize(listing: MarketplaceListing, evaluationScore: number): number {
    const maxBet = this.config.maxBetAmount || 1.0;
    const strategy = this.config.betSizingStrategy || 'proportional';

    switch (strategy) {
      case 'fixed':
        return maxBet;

      case 'kelly':
        // Simplified Kelly criterion
        const p = listing.reputation.accuracy;
        const q = 1 - p;
        const b = 1 / listing.analysis.confidence * 100 - 1; // Simplified odds
        const kellyFraction = Math.max(0, (b * p - q) / b);
        return Math.min(maxBet, maxBet * kellyFraction * 0.5); // Half-Kelly for safety

      case 'proportional':
      default:
        // Bet proportional to evaluation score
        const fraction = evaluationScore / 100;
        return Math.min(maxBet, maxBet * fraction);
    }
  }

  /**
   * Get all purchased analyses.
   */
  getPurchasedAnalyses(): Map<string, {
    analysis: MarketAnalysis;
    affiliateLink: string;
    purchase: AnalysisPurchase;
  }> {
    return this.purchasedAnalyses;
  }

  /**
   * Get all bets placed.
   */
  getBets() {
    return [...this.bets];
  }

  /**
   * Get portfolio summary.
   */
  getPortfolioSummary(): {
    totalSpentOnAnalyses: number;
    totalBetAmount: number;
    analysesCount: number;
    betsCount: number;
    uniqueMarkets: number;
    uniqueAnalysts: number;
  } {
    let totalSpent = 0;
    const analysts = new Set<string>();
    const markets = new Set<string>();

    for (const p of this.purchasedAnalyses.values()) {
      totalSpent += p.analysis.priceSOL;
      analysts.add(p.analysis.analystId);
      markets.add(p.analysis.marketPda);
    }

    const totalBet = this.bets.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalSpentOnAnalyses: totalSpent,
      totalBetAmount: totalBet,
      analysesCount: this.purchasedAnalyses.size,
      betsCount: this.bets.length,
      uniqueMarkets: markets.size,
      uniqueAnalysts: analysts.size,
    };
  }
}
