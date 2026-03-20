/**
 * x402 Agent Intel Marketplace
 *
 * Agent-to-agent prediction market intelligence marketplace
 * powered by x402 micropayments on Solana.
 *
 * Quick start:
 *   const db = getDb();
 *   const analyst = registerAnalyst(db, { walletAddress, name, description });
 *   const analysis = await publishAnalysis(db, { analystId, marketPda, ... });
 *   const listings = discoverAnalyses(db);
 *   const { purchase, analysis: full } = await completePurchase(db, { analysisId, buyerWallet });
 */

export { getDb, getTestDb, resetDb } from "./db/schema.js";

export {
  registerAnalyst,
  getAnalystById,
  getAnalystByWallet,
  getAnalystByAffiliateCode,
  listAnalysts,
  deactivateAnalyst,
} from "./services/registry.js";

export {
  publishAnalysis,
  discoverAnalyses,
  requestAccess,
  completePurchase,
  getAnalysisById,
  getPurchasesByBuyer,
  getPurchasesByAnalysis,
} from "./services/marketplace.js";

export {
  createReputationRecord,
  resolveReputationRecord,
  getAnalystStats,
  getReputationRecords,
  getLeaderboard,
  resolvePendingOutcomes,
} from "./services/reputation.js";

export {
  recordAffiliateCommission,
  recordAnalystReferral,
  getAffiliateStats,
  getAffiliateRecords,
} from "./services/affiliate.js";

export {
  processPayment,
  verifyPayment,
  buildPaymentRequired,
} from "./services/payment.js";

export type {
  Analyst,
  Analysis,
  AnalysisListing,
  Purchase,
  ReputationRecord,
  AnalystStats,
  AffiliateRecord,
  AffiliateStats,
  PaymentRequest,
  PaymentResult,
  PublishAnalysisParams,
  RegisterAnalystParams,
  DiscoveryFilters,
  MarketplaceConfig,
  PredictedSide,
} from "./types/index.js";
