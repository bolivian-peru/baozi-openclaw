/**
 * x402 Agent Intel Marketplace
 * 
 * Pay-Per-Insight for Prediction Markets
 * 
 * This skill enables:
 * - Analyst agents to publish market analysis behind x402 paywall
 * - Buyer agents to pay via x402 for access to insights
 * - Reputation tracking based on prediction accuracy
 * - Affiliate integration for recurring revenue
 */

import { 
  Analyst, 
  AnalystStats, 
  MarketAnalysis, 
  IntelListing,
  ReputationProfile,
  X402PaymentRequest,
  X402PaymentResponse
} from './types';
import * as db from './database';
import * as x402 from './x402';
import * as mcp from './mcp-client';

// ============================================================================
// ANALYST OPERATIONS
// ============================================================================

/**
 * Register as an analyst agent
 * 
 * @param wallet - Agent's wallet address
 * @param displayName - Public display name
 * @param affiliateCode - Unique affiliate code (3-10 chars, alphanumeric)
 */
export async function registerAnalyst(
  wallet: string, 
  displayName: string, 
  affiliateCode: string
): Promise<{ success: boolean; analyst?: Analyst; error?: string }> {
  // Validate affiliate code
  if (!/^[A-Z0-9]{3,10}$/i.test(affiliateCode)) {
    return { success: false, error: 'Affiliate code must be 3-10 alphanumeric characters' };
  }
  
  // Check if code is already taken
  const existing = db.getAnalystByCode(affiliateCode);
  if (existing && existing.wallet !== wallet) {
    return { success: false, error: 'Affiliate code already in use' };
  }
  
  // Register the analyst
  const analyst = db.registerAnalyst(wallet, displayName, affiliateCode);
  
  // Optionally register with baozi affiliate system
  await mcp.registerAffiliate(wallet, affiliateCode);
  
  return { success: true, analyst };
}

/**
 * Get analyst profile with stats
 */
export function getAnalystProfile(wallet: string): ReputationProfile | null {
  const analyst = db.getAnalyst(wallet);
  if (!analyst) return null;
  
  const stats = db.getAnalystStats(wallet);
  
  return {
    analyst: analyst.displayName,
    wallet: analyst.wallet,
    affiliateCode: analyst.affiliateCode,
    stats
  };
}

/**
 * Get all registered analysts
 */
export function getAllAnalysts(): ReputationProfile[] {
  const analysts = db.getAllAnalysts();
  return analysts.map(analyst => ({
    analyst: analyst.displayName,
    wallet: analyst.wallet,
    affiliateCode: analyst.affiliateCode,
    stats: db.getAnalystStats(analyst.wallet)
  }));
}

// ============================================================================
// PUBLISH ANALYSIS
// ============================================================================

/**
 * Publish market analysis behind x402 paywall
 * 
 * @param analystWallet - Wallet of publishing analyst
 * @param marketAddress - Target market address
 * @param marketQuestion - Market question for display
 * @param thesis - Full analysis text (200-2000 chars)
 * @param recommendedSide - YES or NO
 * @param confidence - Confidence score 1-100
 * @param priceSol - Price in SOL for access
 */
export async function publishAnalysis(
  analystWallet: string,
  marketAddress: string,
  marketQuestion: string,
  thesis: string,
  recommendedSide: 'YES' | 'NO',
  confidence: number,
  priceSol: number
): Promise<{ success: boolean; analysis?: MarketAnalysis; error?: string }> {
  // Validate analyst
  const analyst = db.getAnalyst(analystWallet);
  if (!analyst) {
    return { success: false, error: 'Analyst not registered. Call registerAnalyst first.' };
  }
  
  // Validate inputs
  if (thesis.length < 200 || thesis.length > 2000) {
    return { success: false, error: 'Thesis must be 200-2000 characters' };
  }
  
  if (confidence < 1 || confidence > 100) {
    return { success: false, error: 'Confidence must be between 1 and 100' };
  }
  
  if (priceSol < 0.001 || priceSol > 10) {
    return { success: false, error: 'Price must be between 0.001 and 10 SOL' };
  }
  
  // Create analysis
  const analysis: MarketAnalysis = {
    id: generateId(),
    analystWallet,
    marketAddress,
    marketQuestion,
    thesis,
    recommendedSide,
    confidence,
    priceSol,
    createdAt: Date.now(),
    resolved: false,
    correct: null
  };
  
  db.createAnalysis(analysis);
  
  return { success: true, analysis };
}

/**
 * Get analyst's published analyses
 */
export function getMyAnalyses(wallet: string): MarketAnalysis[] {
  return db.getAnalystAnalyses(wallet);
}

// ============================================================================
// DISCOVER & PURCHASE INTEL
// ============================================================================

/**
 * List available analyses for a market
 */
export function listIntel(marketAddress: string): IntelListing[] {
  const analyses = db.getAnalysesByMarket(marketAddress);
  
  return analyses.map(analysis => {
    const analyst = db.getAnalyst(analysis.analystWallet)!;
    const stats = db.getAnalystStats(analyst.wallet);
    
    return {
      id: analysis.id,
      analyst,
      marketAddress: analysis.marketAddress,
      marketQuestion: analysis.marketQuestion,
      thesisPreview: analysis.thesis.substring(0, 100) + '...',
      recommendedSide: analysis.recommendedSide,
      confidence: analysis.confidence,
      priceSol: analysis.priceSol,
      stats,
      createdAt: analysis.createdAt
    };
  });
}

/**
 * List latest analyses across all markets
 */
export function listLatestIntel(limit = 20): IntelListing[] {
  // This would need a separate query in production
  // For now, just return empty or implement pagination
  return [];
}

/**
 * Get x402 payment request for analysis
 */
export async function getPaymentRequest(
  analysisId: string,
  buyerWallet: string
): Promise<{ success: boolean; request?: X402PaymentRequest; error?: string }> {
  const analysis = db.getAnalysis(analysisId);
  if (!analysis) {
    return { success: false, error: 'Analysis not found' };
  }
  
  const request = await x402.createPaymentRequest(analysis, buyerWallet);
  return { success: true, request };
}

/**
 * Purchase analysis via x402
 */
export async function purchaseIntel(
  paymentRequest: X402PaymentRequest,
  buyerWallet: string,
  txId?: string
): Promise<X402PaymentResponse> {
  return x402.processPayment(paymentRequest, buyerWallet, txId);
}

/**
 * Get buyer's purchased intel
 */
export function getMyPurchases(wallet: string): any[] {
  return db.getPurchasesByBuyer(wallet);
}

// ============================================================================
// BETTING WITH AFFILIATE
// ============================================================================

/**
 * Place bet with analyst's affiliate code
 */
export async function betWithIntel(
  marketAddress: string,
  side: 'YES' | 'NO',
  amount: number,
  analysisId: string
): Promise<{ success: boolean; txId?: string; affiliateLink?: string; error?: string }> {
  const analysis = db.getAnalysis(analysisId);
  if (!analysis) {
    return { success: false, error: 'Analysis not found' };
  }
  
  const analyst = db.getAnalyst(analysis.analystWallet);
  if (!analyst) {
    return { success: false, error: 'Analyst not found' };
  }
  
  // Place bet with affiliate code
  const result = await mcp.placeBet(
    marketAddress,
    side,
    amount,
    analyst.affiliateCode
  );
  
  if (!result.success) {
    return { success: false, error: 'Failed to place bet' };
  }
  
  // Generate affiliate link
  const affiliateLink = mcp.formatAffiliateLink(analyst.affiliateCode, marketAddress);
  
  return {
    success: true,
    txId: result.txId,
    affiliateLink
  };
}

// ============================================================================
// REPUTATION & TRACKING
// ============================================================================

/**
 * Update analysis resolution (called when market resolves)
 * 
 * In production, this would be triggered by on-chain events
 */
export async function updateAnalysisResolution(
  analysisId: string,
  actualOutcome: 'YES' | 'NO'
): Promise<{ success: boolean; correct?: boolean; error?: string }> {
  const analysis = db.getAnalysis(analysisId);
  if (!analysis) {
    return { success: false, error: 'Analysis not found' };
  }
  
  if (analysis.resolved) {
    return { success: false, error: 'Analysis already resolved' };
  }
  
  const correct = analysis.recommendedSide === actualOutcome;
  db.updateAnalysisResolution(analysisId, correct);
  
  return { success: true, correct };
}

/**
 * Get leaderboard of top analysts
 */
export function getLeaderboard(limit = 10): ReputationProfile[] {
  const allAnalysts = getAllAnalysts();
  
  // Sort by accuracy (min 5 analyses required)
  const ranked = allAnalysts
    .filter(a => a.stats.totalAnalyses >= 5)
    .sort((a, b) => b.stats.accuracy - a.stats.accuracy)
    .slice(0, limit);
  
  return ranked;
}

/**
 * Get market info from MCP
 */
export async function getMarketInfo(marketAddress: string): Promise<any> {
  return mcp.getMarket(marketAddress);
}

/**
 * Get current quotes
 */
export async function getMarketQuote(marketAddress: string): Promise<any> {
  return mcp.getQuote(marketAddress);
}

/**
 * List active markets
 */
export async function listMarkets(limit = 20): Promise<any[]> {
  return mcp.listMarkets(limit);
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
  return 'intel_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Initialize database on load
db.initDatabase();

// Export version
export const VERSION = '1.0.0';
