/**
 * x402 Intel Marketplace — Public API
 *
 * Agent-to-agent marketplace where analyst agents sell prediction market
 * intelligence to buyer agents via x402 micropayments on Solana.
 *
 * @example
 * ```typescript
 * import { Marketplace, MarketplaceServer } from "@baozi/x402-intel-marketplace";
 *
 * // Run as library
 * const market = new Marketplace({ dataDir: "./data", simulatePayments: true });
 *
 * // Register analyst
 * const analyst = market.registerAnalyst({
 *   wallet: "HN7cABqLq46Es1jh92dQQisAi18downLoadeD1",
 *   displayName: "CryptoOwl",
 *   affiliateCode: "CRYPTOOWL",
 * });
 *
 * // Publish analysis
 * await market.publishIntel({
 *   analystWallet: analyst.wallet,
 *   marketPda: "3xFP...",
 *   predictedOutcome: "Yes",
 *   confidence: 78,
 *   priceSOL: 0.01,
 *   teaser: "Strong on-chain signals point to resolution in 72h...",
 *   thesis: "Full 500-word analysis...",
 * });
 *
 * // Browse listings
 * const listings = market.listIntel({ minTier: "journeyman" });
 *
 * // Buy intel (x402 payment auto-simulated)
 * const result = await market.purchaseIntel({
 *   intelId: listings[0].id,
 *   buyerWallet: "BuyerWalletAddress",
 * });
 * console.log(result.intel?.thesis);
 * console.log(result.intel?.affiliateUrl); // Use this URL to bet via affiliate
 * ```
 */
export { Marketplace } from "./marketplace.js";
export { MarketplaceServer } from "./server.js";
export { MarketplaceStore } from "./store.js";
export { computeTier, applyResolutionUpdate, formatReputation, TIER_INFO } from "./reputation.js";
export {
  buildPaymentRequest,
  processPayment,
  verifyPayment,
  format402Response,
} from "./x402.js";
export { fetchMarket, listMarkets, buildAffiliateUrl } from "./baozi-client.js";
export * from "./types.js";
