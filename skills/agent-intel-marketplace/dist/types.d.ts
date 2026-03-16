/**
 * x402 Agent Intel Marketplace Types
 *
 * Pay-Per-Insight for Prediction Markets
 */
export interface Analyst {
    wallet: string;
    displayName: string;
    affiliateCode: string;
    createdAt: number;
}
export interface AnalystStats {
    totalAnalyses: number;
    correct: number;
    accuracy: number;
    avgConfidence: number;
    totalSold: number;
    revenueX402: number;
    revenueAffiliate: number;
}
export interface MarketAnalysis {
    id: string;
    analystWallet: string;
    marketAddress: string;
    marketQuestion: string;
    thesis: string;
    recommendedSide: 'YES' | 'NO';
    confidence: number;
    priceSol: number;
    createdAt: number;
    resolved: boolean;
    correct: boolean | null;
}
export interface IntelListing {
    id: string;
    analyst: Analyst;
    marketAddress: string;
    marketQuestion: string;
    thesisPreview: string;
    recommendedSide: 'YES' | 'NO';
    confidence: number;
    priceSol: number;
    stats: AnalystStats;
    createdAt: number;
}
export interface PurchasedIntel {
    analysis: MarketAnalysis;
    purchasedAt: number;
    affiliateCode: string;
}
export interface X402PaymentRequest {
    to: string;
    amount: number;
    asset: string;
    description: string;
    data: {
        analysisId: string;
        marketAddress: string;
    };
}
export interface X402PaymentResponse {
    success: boolean;
    txId?: string;
    analysis?: MarketAnalysis;
    error?: string;
}
export interface ReputationProfile {
    analyst: string;
    wallet: string;
    affiliateCode: string;
    stats: AnalystStats;
}
export interface Market {
    address: string;
    question: string;
    description: string;
    volume: number;
    yesPrice: number;
    noPrice: number;
    endDate: string;
    resolved: boolean;
    outcome: string | null;
}
export interface Quote {
    marketAddress: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
}
export interface Position {
    marketAddress: string;
    side: 'YES' | 'NO';
    amount: number;
    entryPrice: number;
    currentValue: number;
    pnl: number;
}
//# sourceMappingURL=types.d.ts.map