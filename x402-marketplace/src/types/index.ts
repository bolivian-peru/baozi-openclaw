/**
 * x402 Agent Intel Marketplace — Core Type Definitions
 */

/** Analyst agent profile */
export interface AnalystProfile {
  id: string;
  wallet: string;
  displayName: string;
  affiliateCode: string;
  bio: string;
  createdAt: number;
  updatedAt: number;
}

/** Analyst reputation stats */
export interface AnalystReputation {
  analystId: string;
  totalAnalyses: number;
  resolvedAnalyses: number;
  correctPredictions: number;
  accuracy: number;
  avgConfidence: number;
  totalSold: number;
  revenueX402: number;
  revenueAffiliate: number;
  streak: number;
  bestStreak: number;
  tier: ReputationTier;
}

/** Reputation tiers based on accuracy + volume */
export type ReputationTier =
  | 'newcomer'
  | 'apprentice'
  | 'analyst'
  | 'expert'
  | 'oracle'
  | 'legend';

/** Published market analysis */
export interface MarketAnalysis {
  id: string;
  analystId: string;
  marketPda: string;
  marketTitle: string;
  thesis: string;
  recommendedSide: 'YES' | 'NO';
  confidence: number;
  priceSOL: number;
  createdAt: number;
  expiresAt: number;
  status: AnalysisStatus;
  outcome?: 'correct' | 'incorrect' | 'pending';
  purchaseCount: number;
  supportingData?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
}

export type AnalysisStatus = 'active' | 'expired' | 'resolved';

/** Purchase record */
export interface AnalysisPurchase {
  id: string;
  analysisId: string;
  buyerWallet: string;
  buyerAgentId: string;
  analystId: string;
  amountSOL: number;
  x402PaymentId: string;
  purchasedAt: number;
  affiliateCode: string;
}

/** x402 payment request */
export interface X402PaymentRequest {
  payTo: string;
  amount: number;
  currency: 'SOL';
  memo: string;
  expiresAt: number;
  resourceId: string;
  resourceType: 'analysis';
}

/** x402 payment receipt */
export interface X402PaymentReceipt {
  paymentId: string;
  from: string;
  to: string;
  amount: number;
  currency: 'SOL';
  signature: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  resourceId: string;
}

/** x402 HTTP headers for paywall */
export interface X402Headers {
  'X-Payment-Required': 'true';
  'X-Payment-Amount': string;
  'X-Payment-Currency': string;
  'X-Payment-Address': string;
  'X-Payment-Resource': string;
  'X-Payment-Expires': string;
}

/** Market data from Baozi MCP */
export interface BaoziMarket {
  pda: string;
  title: string;
  description: string;
  category: string;
  outcomes: string[];
  currentPrices: number[];
  volume: number;
  liquidity: number;
  expiresAt: number;
  resolved: boolean;
  winningOutcome?: number;
}

/** Affiliate registration */
export interface AffiliateRegistration {
  analystId: string;
  affiliateCode: string;
  wallet: string;
  registeredAt: number;
  totalReferrals: number;
  totalCommission: number;
}

/** Marketplace listing for discovery */
export interface MarketplaceListing {
  analysis: MarketAnalysis;
  analyst: AnalystProfile;
  reputation: AnalystReputation;
  preview: string;
}

/** Filter options for browsing marketplace */
export interface MarketplaceFilters {
  marketPda?: string;
  minAccuracy?: number;
  maxPrice?: number;
  minConfidence?: number;
  analystTier?: ReputationTier;
  side?: 'YES' | 'NO';
  sortBy?: 'accuracy' | 'confidence' | 'price' | 'newest';
  limit?: number;
  offset?: number;
}

/** Bet placement via affiliate link */
export interface AffiliateBet {
  buyerWallet: string;
  marketPda: string;
  side: 'YES' | 'NO';
  amount: number;
  affiliateCode: string;
  analysisId: string;
}

/** Event types for marketplace */
export type MarketplaceEvent =
  | { type: 'analysis_published'; data: MarketAnalysis }
  | { type: 'analysis_purchased'; data: AnalysisPurchase }
  | { type: 'analysis_resolved'; data: { analysisId: string; outcome: 'correct' | 'incorrect' } }
  | { type: 'analyst_registered'; data: AnalystProfile }
  | { type: 'bet_placed'; data: AffiliateBet }
  | { type: 'reputation_updated'; data: AnalystReputation };
