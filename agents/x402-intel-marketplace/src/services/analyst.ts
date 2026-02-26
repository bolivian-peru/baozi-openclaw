/**
 * Analyst Service
 *
 * Handles publishing market analyses with x402 micropayment paywalls.
 * Manages analyst profiles and reputation tracking.
 */
import { MarketplaceStoreService } from './store.js';
import type { IntelListing, AnalystProfile, MarketplaceConfig } from '../types/index.js';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface PublishOptions {
  marketPda: string;
  marketQuestion: string;
  thesis: string;
  recommendedSide: 'YES' | 'NO' | string;
  confidenceScore: number;
  priceSol?: number;
}

export class AnalystService {
  private store: MarketplaceStoreService;

  constructor(
    private readonly config: MarketplaceConfig,
    store?: MarketplaceStoreService,
  ) {
    this.store = store ?? new MarketplaceStoreService();
  }

  /** Publish a new market analysis with x402 paywall. */
  async publishAnalysis(opts: PublishOptions): Promise<IntelListing> {
    const priceSol = opts.priceSol ?? this.config.defaultPriceSol;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const listing: IntelListing = {
      id: generateId(),
      analystWallet: this.config.walletAddress,
      analystAffiliateCode: this.config.affiliateCode,
      marketPda: opts.marketPda,
      marketQuestion: opts.marketQuestion,
      // Public teaser: first 100 chars only
      thesis: opts.thesis.slice(0, 100) + (opts.thesis.length > 100 ? '...' : ''),
      // Full thesis behind paywall
      fullThesis: opts.thesis,
      recommendedSide: opts.recommendedSide,
      confidenceScore: Math.min(100, Math.max(1, opts.confidenceScore)),
      priceSol,
      createdAt: new Date().toISOString(),
      expiresAt,
      purchaseCount: 0,
    };

    if (this.config.dryRun) {
      console.log('[DRY RUN] Would publish listing:');
      console.log(`  Market: ${opts.marketQuestion.slice(0, 60)}`);
      console.log(`  Side: ${opts.recommendedSide} | Confidence: ${opts.confidenceScore}%`);
      console.log(`  Price: ${priceSol} SOL via x402`);
      console.log(`  Teaser: ${listing.thesis}`);
      return listing;
    }

    this.store.addListing(listing);
    this.upsertAnalystProfile();

    console.log(`✅ Analysis published: ${listing.id}`);
    console.log(`   Market: ${opts.marketQuestion.slice(0, 60)}`);
    console.log(`   Side: ${listing.recommendedSide} | Confidence: ${listing.confidenceScore}%`);
    console.log(`   Price: ${listing.priceSol} SOL | Expires: ${listing.expiresAt.slice(0, 10)}`);
    console.log(`   Affiliate: ${listing.analystAffiliateCode}`);
    console.log(`   x402 endpoint: ${this.config.x402Endpoint}`);

    return listing;
  }

  private upsertAnalystProfile(): void {
    const existing = this.store.getAnalyst(this.config.walletAddress);
    const profile: AnalystProfile = existing ?? {
      walletAddress: this.config.walletAddress,
      affiliateCode: this.config.affiliateCode,
      listingCount: 0,
      totalPurchases: 0,
      reputationScore: 0,
      createdAt: new Date().toISOString(),
    };
    profile.listingCount = (profile.listingCount || 0) + 1;
    profile.reputationScore = this.calculateReputation(profile);
    this.store.upsertAnalyst(profile);
  }

  private calculateReputation(profile: AnalystProfile): number {
    // Base: listing count + purchase volume + accuracy bonus
    const base = Math.min(50, profile.listingCount * 2);
    const purchases = Math.min(30, profile.totalPurchases);
    const accuracy = profile.accuracy ? (profile.accuracy / 100) * 20 : 0;
    return Math.round(base + purchases + accuracy);
  }

  getMyListings(): IntelListing[] {
    return this.store.getAllListings().filter(
      l => l.analystWallet === this.config.walletAddress,
    );
  }
}
