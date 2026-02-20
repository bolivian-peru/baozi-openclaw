/**
 * x402 Agent Intel Marketplace
 * 
 * Core marketplace that coordinates:
 * - Analyst registration and profile management
 * - Analysis publishing with x402 paywall
 * - Buyer discovery and purchase flow
 * - Reputation tracking and leaderboards
 * - Affiliate bet placement
 * 
 * This is the central hub that buyer and analyst agents interact with.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  AnalystProfile,
  MarketAnalysis,
  AnalysisPurchase,
  MarketplaceListing,
  MarketplaceFilters,
  AffiliateBet,
  MarketplaceEvent,
} from '../types';
import { X402PaymentProtocol, X402Error } from '../x402';
import { ReputationTracker } from '../reputation';
import { BaoziMCPClient } from '../mcp';

// Validation schemas
const RegisterAnalystSchema = z.object({
  wallet: z.string().min(32, 'Invalid wallet address'),
  displayName: z.string().min(2).max(50),
  affiliateCode: z.string().min(2).max(20).regex(/^[A-Za-z0-9_]+$/),
  bio: z.string().max(500).optional(),
});

const PublishAnalysisSchema = z.object({
  analystId: z.string().uuid(),
  marketPda: z.string().min(1),
  thesis: z.string().min(200).max(2000),
  recommendedSide: z.enum(['YES', 'NO']),
  confidence: z.number().int().min(1).max(100),
  priceSOL: z.number().positive().max(1),
  supportingData: z.array(z.string()).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
});

export class AgentIntelMarketplace {
  private analysts: Map<string, AnalystProfile> = new Map();
  private analyses: Map<string, MarketAnalysis> = new Map();
  private purchases: Map<string, AnalysisPurchase> = new Map();
  private eventLog: MarketplaceEvent[] = [];

  readonly paymentProtocol: X402PaymentProtocol;
  readonly reputationTracker: ReputationTracker;
  readonly baoziClient: BaoziMCPClient;

  constructor(config?: {
    facilitatorWallet?: string;
    baoziConfig?: { endpoint?: string; rpcUrl?: string };
  }) {
    this.paymentProtocol = new X402PaymentProtocol(
      config?.facilitatorWallet || 'FACILITATOR_WALLET_DEFAULT'
    );
    this.reputationTracker = new ReputationTracker();
    this.baoziClient = new BaoziMCPClient(config?.baoziConfig);
  }

  // ─── Analyst Registration ───────────────────────────────────────

  /**
   * Register a new analyst agent.
   */
  async registerAnalyst(params: {
    wallet: string;
    displayName: string;
    affiliateCode: string;
    bio?: string;
  }): Promise<AnalystProfile> {
    const validated = RegisterAnalystSchema.parse(params);

    // Check for duplicate wallet or affiliate code
    for (const analyst of this.analysts.values()) {
      if (analyst.wallet === validated.wallet) {
        throw new Error('Wallet already registered');
      }
      if (analyst.affiliateCode.toLowerCase() === validated.affiliateCode.toLowerCase()) {
        throw new Error('Affiliate code already taken');
      }
    }

    // Register affiliate code on-chain
    await this.baoziClient.registerAffiliate(validated.affiliateCode, validated.wallet);

    const profile: AnalystProfile = {
      id: uuidv4(),
      wallet: validated.wallet,
      displayName: validated.displayName,
      affiliateCode: validated.affiliateCode,
      bio: validated.bio || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.analysts.set(profile.id, profile);
    this.reputationTracker.initializeReputation(profile.id);
    this.emitEvent({ type: 'analyst_registered', data: profile });

    return profile;
  }

  /**
   * Get analyst profile.
   */
  getAnalyst(analystId: string): AnalystProfile | null {
    return this.analysts.get(analystId) ?? null;
  }

  /**
   * Get analyst by wallet address.
   */
  getAnalystByWallet(wallet: string): AnalystProfile | null {
    for (const analyst of this.analysts.values()) {
      if (analyst.wallet === wallet) return analyst;
    }
    return null;
  }

  // ─── Analysis Publishing ────────────────────────────────────────

  /**
   * Publish a market analysis behind x402 paywall.
   */
  async publishAnalysis(params: {
    analystId: string;
    marketPda: string;
    thesis: string;
    recommendedSide: 'YES' | 'NO';
    confidence: number;
    priceSOL: number;
    supportingData?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
  }): Promise<MarketAnalysis> {
    const validated = PublishAnalysisSchema.parse(params);

    const analyst = this.analysts.get(validated.analystId);
    if (!analyst) throw new Error('Analyst not found');

    // Verify market exists and is active
    const market = await this.baoziClient.getMarket(validated.marketPda);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Market already resolved');

    // Check for duplicate analysis on same market by same analyst
    for (const existing of this.analyses.values()) {
      if (
        existing.analystId === validated.analystId &&
        existing.marketPda === validated.marketPda &&
        existing.status === 'active'
      ) {
        throw new Error('Active analysis already exists for this market');
      }
    }

    const analysis: MarketAnalysis = {
      id: uuidv4(),
      analystId: validated.analystId,
      marketPda: validated.marketPda,
      marketTitle: market.title,
      thesis: validated.thesis,
      recommendedSide: validated.recommendedSide,
      confidence: validated.confidence,
      priceSOL: validated.priceSOL,
      createdAt: Date.now(),
      expiresAt: market.expiresAt,
      status: 'active',
      outcome: 'pending',
      purchaseCount: 0,
      supportingData: validated.supportingData,
      riskLevel: validated.riskLevel,
    };

    this.analyses.set(analysis.id, analysis);
    this.reputationTracker.recordAnalysis(analyst.id, analysis);
    this.emitEvent({ type: 'analysis_published', data: analysis });

    return analysis;
  }

  // ─── Buyer Discovery ────────────────────────────────────────────

  /**
   * Browse available analyses in the marketplace.
   * Returns listings with preview (thesis truncated) until purchased.
   */
  browseAnalyses(filters?: MarketplaceFilters): MarketplaceListing[] {
    let analyses = Array.from(this.analyses.values())
      .filter(a => a.status === 'active');

    // Apply filters
    if (filters?.marketPda) {
      analyses = analyses.filter(a => a.marketPda === filters.marketPda);
    }
    if (filters?.side) {
      analyses = analyses.filter(a => a.recommendedSide === filters.side);
    }
    if (filters?.minConfidence) {
      analyses = analyses.filter(a => a.confidence >= filters.minConfidence!);
    }
    if (filters?.maxPrice) {
      analyses = analyses.filter(a => a.priceSOL <= filters.maxPrice!);
    }

    // Build listings with reputation data
    let listings: MarketplaceListing[] = analyses.map(analysis => {
      const analyst = this.analysts.get(analysis.analystId)!;
      const reputation = this.reputationTracker.getReputation(analysis.analystId) || {
        analystId: analysis.analystId,
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
        tier: 'newcomer' as const,
      };

      return {
        analysis,
        analyst,
        reputation,
        preview: analysis.thesis.substring(0, 100) + '...',
      };
    });

    // Filter by analyst reputation
    if (filters?.minAccuracy !== undefined && filters.minAccuracy > 0) {
      listings = listings.filter(l => l.reputation.accuracy >= filters.minAccuracy!);
    }
    if (filters?.analystTier) {
      listings = listings.filter(l => l.reputation.tier === filters.analystTier);
    }

    // Sort
    const sortBy = filters?.sortBy || 'accuracy';
    listings.sort((a, b) => {
      switch (sortBy) {
        case 'accuracy': return b.reputation.accuracy - a.reputation.accuracy;
        case 'confidence': return b.analysis.confidence - a.analysis.confidence;
        case 'price': return a.analysis.priceSOL - b.analysis.priceSOL;
        case 'newest': return b.analysis.createdAt - a.analysis.createdAt;
        default: return 0;
      }
    });

    // Pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;
    return listings.slice(offset, offset + limit);
  }

  // ─── Purchase Flow ──────────────────────────────────────────────

  /**
   * Initiate purchase of an analysis.
   * Returns x402 payment details (HTTP 402 response).
   */
  requestAnalysis(analysisId: string, buyerWallet: string): {
    status: 402;
    headers: { [key: string]: string };
    paymentRequest: {
      payTo: string;
      amount: number;
      currency: string;
      memo: string;
      expiresAt: number;
      resourceId: string;
    };
  } {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    if (analysis.status !== 'active') throw new Error('Analysis no longer available');

    const analyst = this.analysts.get(analysis.analystId);
    if (!analyst) throw new Error('Analyst not found');

    // Check if already purchased
    if (this.paymentProtocol.hasPayment(analysisId, buyerWallet)) {
      throw new Error('Analysis already purchased');
    }

    const x402Headers = this.paymentProtocol.createPaymentHeaders(analysis, analyst.wallet);
    const paymentRequest = this.paymentProtocol.createPaymentRequest(analysis, analyst.wallet);

    // Convert to plain object for compatibility
    const headers: { [key: string]: string } = { ...x402Headers };

    return {
      status: 402,
      headers,
      paymentRequest,
    };
  }

  /**
   * Complete purchase with x402 payment.
   * Buyer submits transaction signature, receives full analysis.
   */
  async purchaseAnalysis(params: {
    analysisId: string;
    buyerWallet: string;
    buyerAgentId: string;
    transactionSignature: string;
  }): Promise<{
    analysis: MarketAnalysis;
    affiliateLink: string;
    purchase: AnalysisPurchase;
  }> {
    const analysis = this.analyses.get(params.analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const analyst = this.analysts.get(analysis.analystId);
    if (!analyst) throw new Error('Analyst not found');

    // Verify x402 payment
    const receipt = await this.paymentProtocol.submitPayment(
      params.analysisId,
      params.buyerWallet,
      params.transactionSignature
    );

    // Record purchase
    const purchase: AnalysisPurchase = {
      id: uuidv4(),
      analysisId: params.analysisId,
      buyerWallet: params.buyerWallet,
      buyerAgentId: params.buyerAgentId,
      analystId: analysis.analystId,
      amountSOL: analysis.priceSOL,
      x402PaymentId: receipt.paymentId,
      purchasedAt: Date.now(),
      affiliateCode: analyst.affiliateCode,
    };

    this.purchases.set(purchase.id, purchase);
    analysis.purchaseCount++;

    // Update analyst reputation
    this.reputationTracker.recordSale(analysis.analystId, analysis.priceSOL);

    // Generate affiliate link for the buyer to bet with
    const affiliateLink = await this.baoziClient.formatAffiliateLink(
      analysis.marketPda,
      analyst.affiliateCode
    );

    this.emitEvent({ type: 'analysis_purchased', data: purchase });

    return {
      analysis, // Full analysis content (thesis revealed)
      affiliateLink,
      purchase,
    };
  }

  // ─── Betting with Affiliate ─────────────────────────────────────

  /**
   * Place a bet using the analyst's affiliate code.
   * The analyst earns 1% lifetime commission on referred bets.
   */
  async placeBetWithAffiliate(params: {
    buyerWallet: string;
    analysisId: string;
    amount: number;
    side?: 'YES' | 'NO'; // Defaults to analyst's recommended side
  }): Promise<{
    success: boolean;
    transactionSignature: string;
    shares: number;
    affiliateCode: string;
  }> {
    const analysis = this.analyses.get(params.analysisId);
    if (!analysis) throw new Error('Analysis not found');

    const analyst = this.analysts.get(analysis.analystId);
    if (!analyst) throw new Error('Analyst not found');

    // Verify buyer has purchased this analysis
    if (!this.paymentProtocol.hasPayment(params.analysisId, params.buyerWallet)) {
      throw new X402Error('NOT_PURCHASED', 'Must purchase analysis before betting');
    }

    const side = params.side || analysis.recommendedSide;

    const betResult = await this.baoziClient.placeBet({
      marketPda: analysis.marketPda,
      side,
      amount: params.amount,
      wallet: params.buyerWallet,
      affiliateCode: analyst.affiliateCode,
    });

    // Record affiliate commission (1% of bet amount)
    const commission = params.amount * 0.01;
    this.reputationTracker.recordAffiliateCommission(analysis.analystId, commission);

    const affiliateBet: AffiliateBet = {
      buyerWallet: params.buyerWallet,
      marketPda: analysis.marketPda,
      side,
      amount: params.amount,
      affiliateCode: analyst.affiliateCode,
      analysisId: params.analysisId,
    };
    this.emitEvent({ type: 'bet_placed', data: affiliateBet });

    return {
      ...betResult,
      affiliateCode: analyst.affiliateCode,
    };
  }

  // ─── Market Resolution ──────────────────────────────────────────

  /**
   * Resolve analyses when a market resolves.
   * Updates analyst accuracy based on outcome.
   */
  async resolveMarketAnalyses(marketPda: string): Promise<Array<{
    analysisId: string;
    analystId: string;
    correct: boolean;
    newAccuracy: number;
  }>> {
    const outcome = await this.baoziClient.getMarketOutcome(marketPda);
    if (!outcome.resolved || !outcome.winningOutcome) {
      throw new Error('Market not yet resolved');
    }

    const results: Array<{
      analysisId: string;
      analystId: string;
      correct: boolean;
      newAccuracy: number;
    }> = [];

    for (const analysis of this.analyses.values()) {
      if (analysis.marketPda === marketPda && analysis.status !== 'resolved') {
        const resolution = this.reputationTracker.resolveAnalysis(
          analysis.analystId,
          analysis.id,
          outcome.winningOutcome
        );

        analysis.status = 'resolved';
        analysis.outcome = resolution.correct ? 'correct' : 'incorrect';

        results.push({
          analysisId: analysis.id,
          analystId: analysis.analystId,
          correct: resolution.correct,
          newAccuracy: resolution.newAccuracy,
        });

        this.emitEvent({
          type: 'analysis_resolved',
          data: { analysisId: analysis.id, outcome: analysis.outcome },
        });
      }
    }

    return results;
  }

  // ─── Leaderboard & Stats ────────────────────────────────────────

  /**
   * Get the analyst leaderboard.
   */
  getLeaderboard(options?: {
    minAnalyses?: number;
    sortBy?: 'accuracy' | 'totalSold' | 'revenue';
    limit?: number;
  }) {
    return this.reputationTracker.getLeaderboard(options);
  }

  /**
   * Get marketplace statistics.
   */
  getMarketplaceStats(): {
    totalAnalysts: number;
    totalAnalyses: number;
    totalPurchases: number;
    activeAnalyses: number;
    paymentStats: { totalPayments: number; totalVolume: number; pendingCount: number };
  } {
    const activeAnalyses = Array.from(this.analyses.values())
      .filter(a => a.status === 'active').length;

    return {
      totalAnalysts: this.analysts.size,
      totalAnalyses: this.analyses.size,
      totalPurchases: this.purchases.size,
      activeAnalyses,
      paymentStats: this.paymentProtocol.getStats(),
    };
  }

  /**
   * Get event log.
   */
  getEvents(limit?: number): MarketplaceEvent[] {
    const events = [...this.eventLog];
    return limit ? events.slice(-limit) : events;
  }

  // ─── Internal ───────────────────────────────────────────────────

  private emitEvent(event: MarketplaceEvent): void {
    this.eventLog.push(event);
  }
}
