/**
 * Reputation Tracker
 * 
 * Tracks analyst prediction accuracy and calculates reputation scores.
 * Reputation is based on verifiable on-chain market outcomes.
 * 
 * Tier system:
 *   newcomer    → < 5 resolved analyses
 *   apprentice  → 5+ resolved, < 60% accuracy
 *   analyst     → 10+ resolved, 60%+ accuracy
 *   expert      → 25+ resolved, 70%+ accuracy
 *   oracle      → 50+ resolved, 80%+ accuracy
 *   legend      → 100+ resolved, 85%+ accuracy
 */

import {
  AnalystReputation,
  ReputationTier,
  MarketAnalysis,
} from '../types';

export class ReputationTracker {
  private reputations: Map<string, AnalystReputation> = new Map();
  private analysisHistory: Map<string, MarketAnalysis[]> = new Map();

  /**
   * Initialize reputation for a new analyst.
   */
  initializeReputation(analystId: string): AnalystReputation {
    const reputation: AnalystReputation = {
      analystId,
      totalAnalyses: 0,
      resolvedAnalyses: 0,
      correctPredictions: 0,
      accuracy: 0,
      avgConfidence: 0,
      totalSold: 0,
      revenueX402: 0,
      revenueAffiliate: 0,
      streak: 0,
      bestStreak: 0,
      tier: 'newcomer',
    };
    this.reputations.set(analystId, reputation);
    this.analysisHistory.set(analystId, []);
    return reputation;
  }

  /**
   * Record a new analysis publication.
   */
  recordAnalysis(analystId: string, analysis: MarketAnalysis): void {
    const rep = this.getOrCreateReputation(analystId);
    rep.totalAnalyses++;
    
    const history = this.analysisHistory.get(analystId) || [];
    history.push(analysis);
    this.analysisHistory.set(analystId, history);
    
    this.recalculateStats(analystId);
    this.reputations.set(analystId, rep);
  }

  /**
   * Record an analysis sale.
   */
  recordSale(analystId: string, amountSOL: number): void {
    const rep = this.getOrCreateReputation(analystId);
    rep.totalSold++;
    rep.revenueX402 += amountSOL;
    this.reputations.set(analystId, rep);
  }

  /**
   * Record affiliate commission earned.
   */
  recordAffiliateCommission(analystId: string, commission: number): void {
    const rep = this.getOrCreateReputation(analystId);
    rep.revenueAffiliate += commission;
    this.reputations.set(analystId, rep);
  }

  /**
   * Resolve an analysis outcome based on market resolution.
   * This is the key function that updates accuracy.
   */
  resolveAnalysis(
    analystId: string,
    analysisId: string,
    marketOutcome: 'YES' | 'NO'
  ): { correct: boolean; newAccuracy: number } {
    const rep = this.getOrCreateReputation(analystId);
    const history = this.analysisHistory.get(analystId) || [];
    
    const analysis = history.find(a => a.id === analysisId);
    if (!analysis) {
      throw new Error(`Analysis ${analysisId} not found for analyst ${analystId}`);
    }

    if (analysis.outcome !== 'pending' && analysis.outcome !== undefined) {
      throw new Error(`Analysis ${analysisId} already resolved`);
    }

    const correct = analysis.recommendedSide === marketOutcome;
    analysis.outcome = correct ? 'correct' : 'incorrect';
    analysis.status = 'resolved';

    rep.resolvedAnalyses++;
    if (correct) {
      rep.correctPredictions++;
      rep.streak++;
      if (rep.streak > rep.bestStreak) {
        rep.bestStreak = rep.streak;
      }
    } else {
      rep.streak = 0;
    }

    rep.accuracy = rep.resolvedAnalyses > 0
      ? rep.correctPredictions / rep.resolvedAnalyses
      : 0;

    rep.tier = this.calculateTier(rep);
    this.recalculateStats(analystId);
    this.reputations.set(analystId, rep);

    return { correct, newAccuracy: rep.accuracy };
  }

  /**
   * Get reputation for an analyst.
   */
  getReputation(analystId: string): AnalystReputation | null {
    return this.reputations.get(analystId) ?? null;
  }

  /**
   * Get all reputations, optionally filtered and sorted.
   */
  getLeaderboard(options?: {
    minAnalyses?: number;
    minAccuracy?: number;
    tier?: ReputationTier;
    sortBy?: 'accuracy' | 'totalSold' | 'revenue';
    limit?: number;
  }): AnalystReputation[] {
    let results = Array.from(this.reputations.values());

    if (options?.minAnalyses) {
      results = results.filter(r => r.resolvedAnalyses >= options.minAnalyses!);
    }
    if (options?.minAccuracy) {
      results = results.filter(r => r.accuracy >= options.minAccuracy!);
    }
    if (options?.tier) {
      results = results.filter(r => r.tier === options.tier);
    }

    const sortBy = options?.sortBy || 'accuracy';
    results.sort((a, b) => {
      switch (sortBy) {
        case 'accuracy': return b.accuracy - a.accuracy;
        case 'totalSold': return b.totalSold - a.totalSold;
        case 'revenue': return (b.revenueX402 + b.revenueAffiliate) - (a.revenueX402 + a.revenueAffiliate);
        default: return b.accuracy - a.accuracy;
      }
    });

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get analysis history for an analyst.
   */
  getAnalysisHistory(analystId: string): MarketAnalysis[] {
    return this.analysisHistory.get(analystId) || [];
  }

  /**
   * Calculate the reputation tier based on volume and accuracy.
   */
  private calculateTier(rep: AnalystReputation): ReputationTier {
    if (rep.resolvedAnalyses >= 100 && rep.accuracy >= 0.85) return 'legend';
    if (rep.resolvedAnalyses >= 50 && rep.accuracy >= 0.80) return 'oracle';
    if (rep.resolvedAnalyses >= 25 && rep.accuracy >= 0.70) return 'expert';
    if (rep.resolvedAnalyses >= 10 && rep.accuracy >= 0.60) return 'analyst';
    if (rep.resolvedAnalyses >= 5) return 'apprentice';
    return 'newcomer';
  }

  /**
   * Recalculate average confidence from analysis history.
   */
  private recalculateStats(analystId: string): void {
    const rep = this.reputations.get(analystId);
    const history = this.analysisHistory.get(analystId);
    if (!rep || !history || history.length === 0) return;

    const totalConfidence = history.reduce((sum, a) => sum + a.confidence, 0);
    rep.avgConfidence = totalConfidence / history.length;
  }

  /**
   * Get or create reputation for an analyst.
   */
  private getOrCreateReputation(analystId: string): AnalystReputation {
    let rep = this.reputations.get(analystId);
    if (!rep) {
      rep = this.initializeReputation(analystId);
    }
    return rep;
  }
}
