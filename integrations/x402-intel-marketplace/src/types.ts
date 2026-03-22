/**
 * x402 Intel Marketplace — Core Types
 *
 * Type definitions for analysts, analyses, payments, and reputation tracking.
 */

// ─── Analyst ────────────────────────────────────────────────────────────────

/** Analyst registration tiers based on prediction accuracy. */
export type ReputationTier =
  | "novice"       // 0–9 resolved predictions
  | "apprentice"   // 10–24 resolved, <50% accuracy
  | "journeyman"   // 10–24 resolved, >=50% accuracy
  | "expert"       // 25–99 resolved, >=60% accuracy
  | "master"       // 100–499 resolved, >=65% accuracy
  | "oracle";      // 500+ resolved, >=70% accuracy

export interface AnalystProfile {
  /** Solana wallet address (base58). */
  wallet: string;
  /** Display name shown to buyers. */
  displayName: string;
  /** Baozi affiliate code for commission tracking. */
  affiliateCode: string;
  /** ISO timestamp of registration. */
  registeredAt: string;
  /** Reputation tier computed from prediction history. */
  tier: ReputationTier;
  /** Total predictions submitted. */
  totalPredictions: number;
  /** Number of correctly resolved predictions. */
  correctPredictions: number;
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Total SOL earned from analysis sales (simulated). */
  totalEarnings: number;
  /** Total affiliate commissions accumulated. */
  affiliateEarnings: number;
}

// ─── Analysis ───────────────────────────────────────────────────────────────

/** A paywalled analysis published by an analyst. */
export interface MarketIntel {
  /** Unique identifier (UUID). */
  id: string;
  /** Analyst wallet address. */
  analystWallet: string;
  /** Baozi market PDA (base58). */
  marketPda: string;
  /** Short market question for display. */
  marketQuestion: string;
  /** Predicted outcome label (e.g. "Yes", "No", or race option name). */
  predictedOutcome: string;
  /** Confidence score: 1–100. */
  confidence: number;
  /** Price to unlock the full thesis, in SOL. */
  priceSOL: number;
  /** Brief teaser visible without payment (max 100 chars). */
  teaser: string;
  /**
   * Full thesis — only visible after successful x402 payment.
   * Length: 200–2000 characters.
   */
  thesis?: string;
  /** ISO timestamp of publication. */
  publishedAt: string;
  /** ISO timestamp when the market resolves (for reputation tracking). */
  marketClosingAt: string;
  /** Number of buyers who have purchased this intel. */
  salesCount: number;
  /** Total SOL earned from sales of this analysis. */
  totalRevenue: number;
  /** Resolved outcome label (populated after resolution). */
  resolvedOutcome?: string;
  /** Whether the prediction was correct (populated after resolution). */
  correct?: boolean;
  /** Baozi affiliate code embedded in buy-links generated from this intel. */
  affiliateCode: string;
}

// ─── x402 Payment ───────────────────────────────────────────────────────────

/**
 * x402 is an HTTP-native micropayment protocol built on Solana.
 * Requests that require payment return HTTP 402 with payment details.
 * The client pays and retries with an x-payment header.
 */

export interface X402PaymentRequest {
  /** Intel ID being purchased. */
  intelId: string;
  /** Analyst's wallet address (payment recipient). */
  recipient: string;
  /** Amount in SOL. */
  amount: number;
  /** Payment network ("solana-mainnet" | "solana-devnet"). */
  network: "solana-mainnet" | "solana-devnet";
  /** Nonce to prevent replays (UUID). */
  nonce: string;
  /** Expiry: Unix timestamp (seconds). Payment requests expire in 10 minutes. */
  expiresAt: number;
}

export interface X402PaymentProof {
  /** Transaction signature on Solana. */
  txSignature: string;
  /** The original payment request (for verification). */
  request: X402PaymentRequest;
  /** ISO timestamp when payment was made. */
  paidAt: string;
  /** Whether this is a simulated payment (no real on-chain tx). */
  simulated: boolean;
}

export interface X402PaymentResult {
  success: boolean;
  proof?: X402PaymentProof;
  error?: string;
}

// ─── Purchase Record ─────────────────────────────────────────────────────────

export interface PurchaseRecord {
  /** Unique purchase ID. */
  id: string;
  /** Intel ID purchased. */
  intelId: string;
  /** Buyer wallet address. */
  buyerWallet: string;
  /** Payment proof (x402). */
  paymentProof: X402PaymentProof;
  /** ISO timestamp of purchase. */
  purchasedAt: string;
}

// ─── Marketplace Listing ─────────────────────────────────────────────────────

/** Publicly visible listing (no thesis). */
export interface IntelListing {
  id: string;
  analystWallet: string;
  analystName: string;
  analystTier: ReputationTier;
  analystAccuracy: number;
  marketPda: string;
  marketQuestion: string;
  predictedOutcome: string;
  confidence: number;
  priceSOL: number;
  teaser: string;
  publishedAt: string;
  marketClosingAt: string;
  salesCount: number;
  affiliateCode: string;
}

// ─── Reputation ──────────────────────────────────────────────────────────────

export interface ReputationUpdate {
  analystWallet: string;
  intelId: string;
  marketPda: string;
  predictedOutcome: string;
  resolvedOutcome: string;
  correct: boolean;
  updatedAt: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface MarketplaceConfig {
  /** Path to JSON data store directory. */
  dataDir: string;
  /** Baozi API base URL. */
  baoziApiUrl: string;
  /** x402 facilitator URL (empty = simulate). */
  x402FacilitatorUrl: string;
  /** Whether x402 payments are simulated. */
  simulatePayments: boolean;
  /** Minimum thesis length in characters. */
  minThesisLength: number;
  /** Maximum thesis length in characters. */
  maxThesisLength: number;
  /** Minimum price in SOL. */
  minPriceSOL: number;
  /** Maximum price in SOL. */
  maxPriceSOL: number;
}

export const DEFAULT_CONFIG: MarketplaceConfig = {
  dataDir: "./data",
  baoziApiUrl: "https://baozi.bet",
  x402FacilitatorUrl: "",
  simulatePayments: true,
  minThesisLength: 200,
  maxThesisLength: 2000,
  minPriceSOL: 0.001,
  maxPriceSOL: 1.0,
};
