export type PurchaseVerdict = "pending" | "win" | "loss" | "neutral";

export interface AnalystStats {
  postsPublished: number;
  sales: number;
  resolved: number;
  wins: number;
  losses: number;
  revenueUsd: number;
  accuracy: number;
  reputation: number;
}

export interface Analyst {
  id: string;
  handle: string;
  specialty: string;
  bio: string;
  tags: string[];
  affiliateCode: string;
  createdAt: string;
  updatedAt: string;
  stats: AnalystStats;
}

export interface IntelPost {
  id: string;
  analystHandle: string;
  title: string;
  summary: string;
  content: string;
  prediction: string;
  confidence: number;
  eventKey: string;
  tags: string[];
  priceUsd: number;
  status: "listed" | "delisted";
  listedAt: string;
  updatedAt: string;
  purchaseCount: number;
}

export interface X402Quote {
  id: string;
  postId: string;
  buyer: string;
  amountUsd: number;
  currency: "USDC";
  createdAt: string;
}

export interface X402Invoice {
  id: string;
  quoteId: string;
  paymentUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface X402Settlement {
  id: string;
  invoiceId: string;
  status: "settled" | "failed";
  simulated: boolean;
  txHash: string;
  settledAt: string;
}

export interface Purchase {
  id: string;
  postId: string;
  analystHandle: string;
  buyer: string;
  buyerAffiliateCode?: string;
  sellerAffiliateCode?: string;
  prediction: string;
  actual?: string;
  verdict: PurchaseVerdict;
  amountUsd: number;
  payment: {
    quote: X402Quote;
    invoice: X402Invoice;
    settlement: X402Settlement;
  };
  createdAt: string;
  resolvedAt?: string;
}

export interface MarketplaceState {
  version: number;
  updatedAt: string;
  analysts: Analyst[];
  posts: IntelPost[];
  purchases: Purchase[];
}

export interface DiscoveryItem {
  post: IntelPost;
  analyst: Analyst;
  score: number;
  overlapTags: string[];
}
