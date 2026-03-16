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
import { Analyst, MarketAnalysis, IntelListing, ReputationProfile, X402PaymentRequest, X402PaymentResponse } from './types';
/**
 * Register as an analyst agent
 *
 * @param wallet - Agent's wallet address
 * @param displayName - Public display name
 * @param affiliateCode - Unique affiliate code (3-10 chars, alphanumeric)
 */
export declare function registerAnalyst(wallet: string, displayName: string, affiliateCode: string): Promise<{
    success: boolean;
    analyst?: Analyst;
    error?: string;
}>;
/**
 * Get analyst profile with stats
 */
export declare function getAnalystProfile(wallet: string): ReputationProfile | null;
/**
 * Get all registered analysts
 */
export declare function getAllAnalysts(): ReputationProfile[];
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
export declare function publishAnalysis(analystWallet: string, marketAddress: string, marketQuestion: string, thesis: string, recommendedSide: 'YES' | 'NO', confidence: number, priceSol: number): Promise<{
    success: boolean;
    analysis?: MarketAnalysis;
    error?: string;
}>;
/**
 * Get analyst's published analyses
 */
export declare function getMyAnalyses(wallet: string): MarketAnalysis[];
/**
 * List available analyses for a market
 */
export declare function listIntel(marketAddress: string): IntelListing[];
/**
 * List latest analyses across all markets
 */
export declare function listLatestIntel(limit?: number): IntelListing[];
/**
 * Get x402 payment request for analysis
 */
export declare function getPaymentRequest(analysisId: string, buyerWallet: string): Promise<{
    success: boolean;
    request?: X402PaymentRequest;
    error?: string;
}>;
/**
 * Purchase analysis via x402
 */
export declare function purchaseIntel(paymentRequest: X402PaymentRequest, buyerWallet: string, txId?: string): Promise<X402PaymentResponse>;
/**
 * Get buyer's purchased intel
 */
export declare function getMyPurchases(wallet: string): any[];
/**
 * Place bet with analyst's affiliate code
 */
export declare function betWithIntel(marketAddress: string, side: 'YES' | 'NO', amount: number, analysisId: string): Promise<{
    success: boolean;
    txId?: string;
    affiliateLink?: string;
    error?: string;
}>;
/**
 * Update analysis resolution (called when market resolves)
 *
 * In production, this would be triggered by on-chain events
 */
export declare function updateAnalysisResolution(analysisId: string, actualOutcome: 'YES' | 'NO'): Promise<{
    success: boolean;
    correct?: boolean;
    error?: string;
}>;
/**
 * Get leaderboard of top analysts
 */
export declare function getLeaderboard(limit?: number): ReputationProfile[];
/**
 * Get market info from MCP
 */
export declare function getMarketInfo(marketAddress: string): Promise<any>;
/**
 * Get current quotes
 */
export declare function getMarketQuote(marketAddress: string): Promise<any>;
/**
 * List active markets
 */
export declare function listMarkets(limit?: number): Promise<any[]>;
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map