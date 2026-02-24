// Core types for the x402 Agent Intel Marketplace

export interface Analyst {
  id: string;
  wallet: string;
  name: string;
  affiliateCode: string;
  registeredAt: number;
  // Stats (computed from analyses)
  totalAnalyses: number;
  resolvedAnalyses: number;
  correctPredictions: number;
  accuracy: number;        // 0-1, requires 5+ resolved analyses
  avgConfidence: number;   // 0-100
  totalRevenue: number;    // SOL from x402 sales
  affiliateRevenue: number; // SOL from affiliate commissions
  tier: AnalystTier;
}

export type AnalystTier =
  | "unranked"    // <5 resolved
  | "apprentice"  // <50% accuracy
  | "analyst"     // 50-64% accuracy
  | "expert"      // 65-74% accuracy
  | "master"      // 75-84% accuracy
  | "grandmaster"; // 85%+ accuracy, 20+ resolved

export interface MarketAnalysis {
  id: string;
  analystId: string;
  analystWallet: string;
  affiliateCode: string;
  // Market reference
  marketPda: string;
  marketQuestion: string;
  // Analysis content (only visible after payment)
  thesis: string;           // 200-2000 chars
  recommendedSide: "YES" | "NO";
  confidenceScore: number;  // 1-100
  // x402 pricing
  priceSOL: number;         // e.g. 0.001-0.01 SOL
  priceLamports: number;
  // Metadata
  publishedAt: number;
  expiresAt: number;        // analysis expires with market
  // Outcome tracking
  resolved: boolean;
  outcome: "YES" | "NO" | null;
  predictionCorrect: boolean | null;
  // Purchase tracking
  purchaseCount: number;
}

export interface AnalysisPurchase {
  id: string;
  analysisId: string;
  buyerWallet: string;
  paidLamports: number;
  txSignature: string;
  purchasedAt: number;
  // Embedded affiliate info for buyer's betting
  affiliateLink: string;
}

export interface X402PaymentRequest {
  x402Version: number;
  accepts: Array<{
    scheme: "exact";
    network: "solana-mainnet" | "solana-devnet";
    maxAmountRequired: string;
    resource: string;
    description: string;
    mimeType: string;
    payTo: string;
    maxTimeoutSeconds: number;
  }>;
  error: string | null;
}

export interface X402PaymentProof {
  scheme: "exact";
  network: "solana-mainnet" | "solana-devnet";
  payload: {
    signature: string;
    sender: string;
    amountPaid: string;
    resource: string;
  };
}

export interface BaoziMarket {
  pda: string;
  question: string;
  status: "OPEN" | "CLOSED" | "RESOLVED";
  outcome: "YES" | "NO" | null;
  closeTime: number;
  eventTime: number;
  yesPool: number;
  noPool: number;
  totalVolume: number;
}

export interface MarketplaceStats {
  totalAnalysts: number;
  totalAnalyses: number;
  totalPurchases: number;
  totalVolumeSOL: number;
  topAnalysts: Array<{
    name: string;
    tier: AnalystTier;
    accuracy: number;
    analyses: number;
  }>;
}
