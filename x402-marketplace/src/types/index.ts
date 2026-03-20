/**
 * Core types for the x402 Agent Intel Marketplace
 */

// ── Analyst ─────────────────────────────────────────────────────────────────

export interface Analyst {
  id: string;
  walletAddress: string;
  name: string;
  description: string;
  registeredAt: string;
  affiliateCode: string;    // unique referral code this analyst can share
  referredBy?: string;      // affiliate code of whoever referred this analyst
  isActive: boolean;
}

export interface RegisterAnalystParams {
  walletAddress: string;
  name: string;
  description: string;
  referredBy?: string;
}

// ── Analysis ─────────────────────────────────────────────────────────────────

export type PredictedSide = "YES" | "NO";

export interface Analysis {
  id: string;
  analystId: string;
  analystWallet: string;
  marketPda: string;
  marketTitle?: string;     // cached from MCP
  title: string;
  preview: string;          // free teaser (max 280 chars)
  thesis: string;           // full thesis behind x402 paywall
  predictedSide: PredictedSide;
  confidence: number;       // 0-100
  priceInSol: number;       // x402 price to unlock
  publishedAt: string;
  expiresAt?: string;
  tags: string[];
  purchaseCount: number;
  isActive: boolean;
}

export interface PublishAnalysisParams {
  analystId: string;
  marketPda: string;
  title: string;
  preview: string;
  thesis: string;
  predictedSide: PredictedSide;
  confidence: number;
  priceInSol: number;
  expiresAt?: string;
  tags?: string[];
}

export interface AnalysisListing {
  id: string;
  analystId: string;
  analystName: string;
  analystReputation: number;  // 0-100 score
  marketPda: string;
  marketTitle?: string;
  title: string;
  preview: string;
  predictedSide: PredictedSide;
  confidence: number;
  priceInSol: number;
  publishedAt: string;
  expiresAt?: string;
  tags: string[];
  purchaseCount: number;
}

// ── Payment (x402) ───────────────────────────────────────────────────────────

export interface PaymentRequest {
  analysisId: string;
  analystWallet: string;
  buyerWallet: string;
  amountSol: number;
  platformFee: number;
  affiliateCommission: number;
  affiliateWallet?: string;
  memo: string;
}

export interface PaymentResult {
  success: boolean;
  txSignature?: string;
  error?: string;
  simulated: boolean;
}

export interface Purchase {
  id: string;
  analysisId: string;
  buyerWallet: string;
  analystWallet: string;
  amountSol: number;
  platformFee: number;
  affiliateCode?: string;
  affiliateCommission: number;
  txSignature: string;
  simulated: boolean;
  purchasedAt: string;
}

// ── Reputation ───────────────────────────────────────────────────────────────

export interface ReputationRecord {
  id: string;
  analystId: string;
  analysisId: string;
  marketPda: string;
  predictedSide: PredictedSide;
  confidence: number;
  actualOutcome?: string;   // "YES" | "NO" | null (pending)
  wasCorrect?: boolean;
  resolvedAt?: string;
}

export interface AnalystStats {
  analystId: string;
  analystName: string;
  walletAddress: string;
  totalAnalyses: number;
  resolvedAnalyses: number;
  correctPredictions: number;
  winRate: number;           // 0-1
  totalEarnings: number;     // SOL
  totalPurchases: number;
  avgConfidence: number;
  reputationScore: number;   // 0-100 composite
  affiliateCode: string;
}

// ── Affiliate ────────────────────────────────────────────────────────────────

export interface AffiliateRecord {
  id: string;
  affiliateCode: string;
  affiliateWallet: string;
  referredAnalystId?: string;
  purchaseId?: string;
  commission: number;
  earnedAt: string;
}

export interface AffiliateStats {
  affiliateCode: string;
  walletAddress: string;
  totalReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
}

// ── Marketplace ──────────────────────────────────────────────────────────────

export interface MarketplaceConfig {
  dbPath: string;
  platformFeeRate: number;     // 0.05 = 5%
  affiliateCommissionRate: number;  // 0.10 = 10%
  operatorWallet: string;
  x402Simulate: boolean;
}

export interface DiscoveryFilters {
  tags?: string[];
  minConfidence?: number;
  maxPrice?: number;
  minReputation?: number;
  predictedSide?: PredictedSide;
  marketPda?: string;
  analystId?: string;
}
