/**
 * Marketplace Store
 *
 * Persists listings, analyst profiles, and purchase history
 * to data/marketplace.json.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { MarketplaceStore, IntelListing, AnalystProfile, Purchase } from '../types/index.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '../../data');
const STORE_PATH = join(DATA_DIR, 'marketplace.json');

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function empty(): MarketplaceStore {
  return { listings: [], analysts: [], purchases: [], lastUpdated: new Date().toISOString() };
}

export class MarketplaceStoreService {
  private data: MarketplaceStore;

  constructor() {
    ensureDir();
    if (existsSync(STORE_PATH)) {
      try { this.data = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as MarketplaceStore; }
      catch { this.data = empty(); }
    } else {
      this.data = empty();
    }
  }

  // Listings
  addListing(listing: IntelListing): void {
    this.data.listings.push(listing);
    this.save();
  }

  getListing(id: string): IntelListing | undefined {
    return this.data.listings.find(l => l.id === id);
  }

  getListingsForMarket(marketPda: string): IntelListing[] {
    return this.data.listings.filter(l => l.marketPda === marketPda);
  }

  getAllListings(): IntelListing[] { return this.data.listings; }

  incrementPurchase(id: string): void {
    const l = this.getListing(id);
    if (l) { l.purchaseCount++; this.save(); }
  }

  // Analysts
  upsertAnalyst(profile: AnalystProfile): void {
    const idx = this.data.analysts.findIndex(a => a.walletAddress === profile.walletAddress);
    if (idx >= 0) { this.data.analysts[idx] = profile; }
    else { this.data.analysts.push(profile); }
    this.save();
  }

  getAnalyst(walletAddress: string): AnalystProfile | undefined {
    return this.data.analysts.find(a => a.walletAddress === walletAddress);
  }

  getLeaderboard(limit = 10): AnalystProfile[] {
    return [...this.data.analysts]
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, limit);
  }

  // Purchases
  recordPurchase(purchase: Purchase): void {
    this.data.purchases.push(purchase);
    this.incrementPurchase(purchase.listingId);
    this.save();
  }

  hasPurchased(buyerWallet: string, listingId: string): boolean {
    return this.data.purchases.some(
      p => p.buyerWallet === buyerWallet && p.listingId === listingId,
    );
  }

  private save(): void {
    this.data.lastUpdated = new Date().toISOString();
    writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
