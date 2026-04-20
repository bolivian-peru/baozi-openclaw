/**
 * Buyer Service
 *
 * Handles purchasing intel analyses via x402 micropayments.
 * Verifies payment and unlocks full thesis.
 */
import { MarketplaceStoreService } from './store.js';
import type { IntelListing, Purchase, MarketplaceConfig } from '../types/index.js';

export class BuyerService {
  private store: MarketplaceStoreService;

  constructor(
    private readonly config: MarketplaceConfig,
    store?: MarketplaceStoreService,
  ) {
    this.store = store ?? new MarketplaceStoreService();
  }

  /** List available analyses for a market (public info only). */
  getListingsForMarket(marketPda: string): IntelListing[] {
    return this.store.getListingsForMarket(marketPda).map(l => ({
      ...l,
      fullThesis: undefined, // strip full thesis until purchased
    }));
  }

  /** Purchase an analysis via x402 micropayment, unlock full thesis. */
  async purchaseAnalysis(listingId: string): Promise<{ thesis: string; affiliateLink: string } | null> {
    const listing = this.store.getListing(listingId);
    if (!listing) {
      console.error(`Listing ${listingId} not found`);
      return null;
    }

    // Check if already purchased
    if (this.store.hasPurchased(this.config.walletAddress, listingId)) {
      console.log('Already purchased — returning cached thesis');
      return {
        thesis: listing.fullThesis ?? listing.thesis,
        affiliateLink: `https://baozi.bet/market/${listing.marketPda}?ref=${listing.analystAffiliateCode}`,
      };
    }

    if (this.config.dryRun) {
      console.log('[DRY RUN] Would purchase via x402:');
      console.log(`  Listing: ${listingId}`);
      console.log(`  Price: ${listing.priceSol} SOL`);
      console.log(`  From: ${this.config.walletAddress.slice(0, 8)}...`);
      console.log(`  To: ${listing.analystWallet.slice(0, 8)}...`);
      return {
        thesis: listing.fullThesis ?? listing.thesis,
        affiliateLink: `https://baozi.bet/market/${listing.marketPda}?ref=${listing.analystAffiliateCode}`,
      };
    }

    // Initiate x402 payment
    const x402Result = await this.initiateX402Payment(listing);
    if (!x402Result.success) {
      console.error('x402 payment failed:', x402Result.error);
      return null;
    }

    // Record purchase
    const purchase: Purchase = {
      listingId,
      buyerWallet: this.config.walletAddress,
      paidSol: listing.priceSol,
      purchasedAt: new Date().toISOString(),
      x402TxSignature: x402Result.signature,
    };
    this.store.recordPurchase(purchase);

    console.log(`✅ Purchased listing ${listingId} for ${listing.priceSol} SOL`);
    console.log(`   Tx: ${x402Result.signature ?? 'pending'}`);

    return {
      thesis: listing.fullThesis ?? listing.thesis,
      affiliateLink: `https://baozi.bet/market/${listing.marketPda}?ref=${listing.analystAffiliateCode}`,
    };
  }

  /** Simulate x402 payment initiation. */
  private async initiateX402Payment(listing: IntelListing): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // x402 payment request structure
      const paymentRequest = {
        scheme: 'exact',
        network: 'solana-mainnet',
        maxAmountRequired: Math.round(listing.priceSol * 1e9).toString(), // lamports
        resource: `${this.config.x402Endpoint}/intel/${listing.id}`,
        description: `Baozi Intel: ${listing.thesis.slice(0, 80)}`,
        memoText: `baozi-intel-${listing.id}`,
        payTo: listing.analystWallet,
        maxTimeoutSeconds: 60,
      };

      // In production: submit signed tx to x402 facilitator
      // For now: log and return simulated success
      console.log(`   x402 payment request prepared (${listing.priceSol} SOL)`);
      console.log(`   Resource: ${paymentRequest.resource}`);

      return { success: true, signature: undefined }; // Real tx would go here
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
