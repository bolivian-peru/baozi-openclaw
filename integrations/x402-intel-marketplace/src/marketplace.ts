/**
 * Marketplace Service
 *
 * Core business logic for the x402 Intel Marketplace:
 *   - Analyst registration
 *   - Intel publishing (paywalled analysis)
 *   - Buyer discovery and listing
 *   - x402 payment processing and content access
 *   - Reputation update after market resolution
 */
import { randomUUID } from "crypto";
import type {
  AnalystProfile,
  MarketIntel,
  IntelListing,
  PurchaseRecord,
  X402PaymentProof,
  MarketplaceConfig,
} from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { MarketplaceStore } from "./store.js";
import { computeTier, applyResolutionUpdate, TIER_INFO } from "./reputation.js";
import {
  buildPaymentRequest,
  processPayment,
  verifyPayment,
  format402Response,
} from "./x402.js";
import { fetchMarket, buildAffiliateUrl } from "./baozi-client.js";

export class Marketplace {
  private store: MarketplaceStore;
  private config: MarketplaceConfig;

  constructor(config: Partial<MarketplaceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.store = new MarketplaceStore(this.config.dataDir);
  }

  // ─── Analyst Registration ──────────────────────────────────────────────────

  /**
   * Register a new analyst or update an existing profile.
   */
  registerAnalyst(params: {
    wallet: string;
    displayName: string;
    affiliateCode: string;
  }): AnalystProfile {
    const existing = this.store.getAnalyst(params.wallet);

    if (existing) {
      // Update mutable fields
      const updated: AnalystProfile = {
        ...existing,
        displayName: params.displayName,
        affiliateCode: params.affiliateCode,
      };
      this.store.upsertAnalyst(updated);
      return updated;
    }

    const profile: AnalystProfile = {
      wallet: params.wallet,
      displayName: params.displayName,
      affiliateCode: params.affiliateCode,
      registeredAt: new Date().toISOString(),
      tier: "novice",
      totalPredictions: 0,
      correctPredictions: 0,
      accuracy: 0,
      totalEarnings: 0,
      affiliateEarnings: 0,
    };

    this.store.upsertAnalyst(profile);
    return profile;
  }

  getAnalyst(wallet: string): AnalystProfile | undefined {
    return this.store.getAnalyst(wallet);
  }

  listAnalysts(): AnalystProfile[] {
    return this.store
      .listAnalysts()
      .sort((a, b) => b.accuracy - a.accuracy || b.totalPredictions - a.totalPredictions);
  }

  // ─── Publishing ────────────────────────────────────────────────────────────

  /**
   * Publish a new paywalled market analysis.
   */
  async publishIntel(params: {
    analystWallet: string;
    marketPda: string;
    predictedOutcome: string;
    confidence: number;
    priceSOL: number;
    teaser: string;
    thesis: string;
  }): Promise<{ success: boolean; intel?: MarketIntel; error?: string }> {
    // Validate analyst
    const analyst = this.store.getAnalyst(params.analystWallet);
    if (!analyst) {
      return {
        success: false,
        error: "Analyst not registered. Call registerAnalyst() first.",
      };
    }

    // Validate confidence
    if (params.confidence < 1 || params.confidence > 100) {
      return {
        success: false,
        error: "Confidence must be between 1 and 100.",
      };
    }

    // Validate price
    if (
      params.priceSOL < this.config.minPriceSOL ||
      params.priceSOL > this.config.maxPriceSOL
    ) {
      return {
        success: false,
        error: `Price must be between ${this.config.minPriceSOL} and ${this.config.maxPriceSOL} SOL.`,
      };
    }

    // Validate thesis length
    if (
      params.thesis.length < this.config.minThesisLength ||
      params.thesis.length > this.config.maxThesisLength
    ) {
      return {
        success: false,
        error: `Thesis must be between ${this.config.minThesisLength} and ${this.config.maxThesisLength} characters (got ${params.thesis.length}).`,
      };
    }

    // Validate teaser
    if (params.teaser.length > 100) {
      return {
        success: false,
        error: "Teaser must be 100 characters or fewer.",
      };
    }

    // Fetch market info from Baozi
    let marketQuestion = `Market ${params.marketPda.slice(0, 8)}...`;
    let marketClosingAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const market = await fetchMarket(params.marketPda);
    if (market) {
      marketQuestion = market.question;
      marketClosingAt = market.closingTime;
    }

    const intel: MarketIntel = {
      id: randomUUID(),
      analystWallet: params.analystWallet,
      marketPda: params.marketPda,
      marketQuestion,
      predictedOutcome: params.predictedOutcome,
      confidence: params.confidence,
      priceSOL: params.priceSOL,
      teaser: params.teaser,
      thesis: params.thesis,
      publishedAt: new Date().toISOString(),
      marketClosingAt,
      salesCount: 0,
      totalRevenue: 0,
      affiliateCode: analyst.affiliateCode,
    };

    this.store.saveIntel(intel);
    return { success: true, intel };
  }

  // ─── Discovery & Listing ───────────────────────────────────────────────────

  /**
   * List available intel for purchase (without the thesis — buyers see teasers only).
   */
  listIntel(filters: {
    analystWallet?: string;
    marketPda?: string;
    minConfidence?: number;
    minTier?: string;
    limit?: number;
  } = {}): IntelListing[] {
    let items = this.store.listIntel({ resolved: false });

    if (filters.analystWallet) {
      items = items.filter((i) => i.analystWallet === filters.analystWallet);
    }
    if (filters.marketPda) {
      items = items.filter((i) => i.marketPda === filters.marketPda);
    }
    if (filters.minConfidence !== undefined) {
      items = items.filter((i) => i.confidence >= filters.minConfidence!);
    }

    const listings: IntelListing[] = items
      .map((intel) => {
        const analyst = this.store.getAnalyst(intel.analystWallet);
        if (!analyst) return null;

        if (filters.minTier) {
          const tierOrder = [
            "novice",
            "apprentice",
            "journeyman",
            "expert",
            "master",
            "oracle",
          ];
          const analystTierIdx = tierOrder.indexOf(analyst.tier);
          const minTierIdx = tierOrder.indexOf(filters.minTier);
          if (analystTierIdx < minTierIdx) return null;
        }

        return {
          id: intel.id,
          analystWallet: intel.analystWallet,
          analystName: analyst.displayName,
          analystTier: analyst.tier,
          analystAccuracy: analyst.accuracy,
          marketPda: intel.marketPda,
          marketQuestion: intel.marketQuestion,
          predictedOutcome: intel.predictedOutcome,
          confidence: intel.confidence,
          priceSOL: intel.priceSOL,
          teaser: intel.teaser,
          publishedAt: intel.publishedAt,
          marketClosingAt: intel.marketClosingAt,
          salesCount: intel.salesCount,
          affiliateCode: intel.affiliateCode,
        } satisfies IntelListing;
      })
      .filter((l): l is IntelListing => l !== null);

    return filters.limit ? listings.slice(0, filters.limit) : listings;
  }

  // ─── Purchasing (x402 Flow) ────────────────────────────────────────────────

  /**
   * Request to purchase intel.
   *
   * If the buyer hasn't paid yet:
   *   Returns a 402 payment request (x402 flow).
   * If the buyer has already paid:
   *   Returns the full thesis immediately.
   */
  requestIntel(
    intelId: string,
    buyerWallet: string
  ):
    | { status: 200; intel: MarketIntel & { affiliateUrl: string } }
    | { status: 402; payment: ReturnType<typeof format402Response> }
    | { status: 404; error: string } {
    const intel = this.store.getIntel(intelId);
    if (!intel) {
      return { status: 404, error: `Intel ${intelId} not found` };
    }

    // Check if already purchased
    if (this.store.hasPurchased(buyerWallet, intelId)) {
      const analyst = this.store.getAnalyst(intel.analystWallet);
      const affiliateUrl = buildAffiliateUrl(
        intel.marketPda,
        intel.affiliateCode
      );
      return {
        status: 200,
        intel: { ...intel, affiliateUrl },
      };
    }

    // Return 402 payment request
    const paymentRequest = buildPaymentRequest(
      intelId,
      intel.analystWallet,
      intel.priceSOL
    );
    return { status: 402, payment: format402Response(paymentRequest) };
  }

  /**
   * Process payment and unlock intel content.
   *
   * Verifies x402 payment proof and grants access to the thesis.
   */
  async purchaseIntel(params: {
    intelId: string;
    buyerWallet: string;
    paymentProof?: X402PaymentProof;
    buyerPrivateKey?: string;
  }): Promise<{
    success: boolean;
    intel?: MarketIntel & { affiliateUrl: string };
    error?: string;
    paymentRequest?: ReturnType<typeof format402Response>;
  }> {
    const intel = this.store.getIntel(params.intelId);
    if (!intel) {
      return { success: false, error: `Intel ${params.intelId} not found` };
    }

    // Already purchased — return cached access
    if (this.store.hasPurchased(params.buyerWallet, params.intelId)) {
      const affiliateUrl = buildAffiliateUrl(intel.marketPda, intel.affiliateCode);
      return { success: true, intel: { ...intel, affiliateUrl } };
    }

    // If no proof provided, initiate payment
    if (!params.paymentProof) {
      if (!params.buyerPrivateKey && !this.config.simulatePayments) {
        const paymentRequest = buildPaymentRequest(
          params.intelId,
          intel.analystWallet,
          intel.priceSOL
        );
        return {
          success: false,
          error: "Payment required",
          paymentRequest: format402Response(paymentRequest),
        };
      }

      // Process payment (simulated or via facilitator)
      const paymentRequest = buildPaymentRequest(
        params.intelId,
        intel.analystWallet,
        intel.priceSOL
      );
      const paymentResult = await processPayment(
        paymentRequest,
        params.buyerPrivateKey,
        this.config.x402FacilitatorUrl || undefined
      );

      if (!paymentResult.success || !paymentResult.proof) {
        return {
          success: false,
          error: paymentResult.error ?? "Payment failed",
        };
      }

      return this.grantAccess(intel, params.buyerWallet, paymentResult.proof);
    }

    // Verify the provided proof
    const verifyResult = await verifyPayment(
      params.paymentProof,
      params.intelId,
      intel.analystWallet,
      intel.priceSOL
    );

    if (!verifyResult.valid) {
      return { success: false, error: verifyResult.error };
    }

    return this.grantAccess(intel, params.buyerWallet, params.paymentProof);
  }

  private grantAccess(
    intel: MarketIntel,
    buyerWallet: string,
    proof: X402PaymentProof
  ): { success: true; intel: MarketIntel & { affiliateUrl: string } } {
    // Record the purchase
    const purchase: PurchaseRecord = {
      id: randomUUID(),
      intelId: intel.id,
      buyerWallet,
      paymentProof: proof,
      purchasedAt: new Date().toISOString(),
    };
    this.store.savePurchase(purchase);

    // Update analytics on the intel record
    const updatedIntel = this.store.updateIntel(intel.id, {
      salesCount: intel.salesCount + 1,
      totalRevenue: intel.totalRevenue + intel.priceSOL,
    });

    // Credit earnings to analyst
    const analyst = this.store.getAnalyst(intel.analystWallet);
    if (analyst) {
      this.store.upsertAnalyst({
        ...analyst,
        totalEarnings: analyst.totalEarnings + intel.priceSOL,
      });
    }

    const final = updatedIntel ?? intel;
    const affiliateUrl = buildAffiliateUrl(intel.marketPda, intel.affiliateCode);
    return { success: true, intel: { ...final, affiliateUrl } };
  }

  // ─── Reputation Updates ────────────────────────────────────────────────────

  /**
   * Resolve an intel item: update analyst reputation based on prediction accuracy.
   *
   * Call this when a Baozi market resolves. Pass the resolved outcome and
   * this method will compute whether the analyst's prediction was correct.
   */
  resolveIntel(
    intelId: string,
    resolvedOutcome: string
  ): {
    success: boolean;
    correct?: boolean;
    analyst?: AnalystProfile;
    error?: string;
  } {
    const intel = this.store.getIntel(intelId);
    if (!intel) {
      return { success: false, error: `Intel ${intelId} not found` };
    }

    if (intel.resolvedOutcome !== undefined) {
      return { success: false, error: "Intel already resolved" };
    }

    const correct =
      intel.predictedOutcome.trim().toLowerCase() ===
      resolvedOutcome.trim().toLowerCase();

    const updatedAnalyst = applyResolutionUpdate(this.store, {
      analystWallet: intel.analystWallet,
      intelId,
      marketPda: intel.marketPda,
      predictedOutcome: intel.predictedOutcome,
      resolvedOutcome,
      correct,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, correct, analyst: updatedAnalyst ?? undefined };
  }
}
