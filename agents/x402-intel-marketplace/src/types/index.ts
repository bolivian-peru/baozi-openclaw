/**
 * Core types for the x402 Intel Marketplace.
 */

export interface IntelListing {
  id: string;
  analystWallet: string;
  analystAffiliateCode: string;
  marketPda: string;
  marketQuestion: string;
  thesis: string;           // public teaser (first 100 chars)
  fullThesis?: string;      // full content (behind paywall)
  recommendedSide: 'YES' | 'NO' | string;
  confidenceScore: number;  // 1-100
  priceSol: number;
  createdAt: string;
  expiresAt: string;
  purchaseCount: number;
}

export interface AnalystProfile {
  walletAddress: string;
  affiliateCode: string;
  listingCount: number;
  totalPurchases: number;
  accuracy?: number;        // 0-100 if enough resolved markets
  reputationScore: number;  // composite score
  createdAt: string;
}

export interface Purchase {
  listingId: string;
  buyerWallet: string;
  paidSol: number;
  purchasedAt: string;
  x402TxSignature?: string;
}

export interface MarketplaceStore {
  listings: IntelListing[];
  analysts: AnalystProfile[];
  purchases: Purchase[];
  lastUpdated: string;
}

export interface MarketplaceConfig {
  walletAddress: string;
  affiliateCode: string;
  defaultPriceSol: number;
  dryRun: boolean;
  x402Endpoint: string;
  solanaPrivateKey?: string;
}

export const DEFAULT_CONFIG: Partial<MarketplaceConfig> = {
  defaultPriceSol: 0.01,
  dryRun: false,
  x402Endpoint: 'https://x402.org/facilitate',
};
