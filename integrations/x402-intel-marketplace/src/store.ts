/**
 * Marketplace Store
 *
 * JSON file-based persistence for analysts, intel, and purchases.
 * In production this would be replaced by a database or on-chain program.
 */
import fs from "fs";
import path from "path";
import type {
  AnalystProfile,
  MarketIntel,
  PurchaseRecord,
} from "./types.js";

interface StoreData {
  analysts: Record<string, AnalystProfile>;
  intel: Record<string, MarketIntel>;
  purchases: Record<string, PurchaseRecord>;
}

export class MarketplaceStore {
  private dataDir: string;
  private filePath: string;
  private data: StoreData;

  constructor(dataDir: string = "./data") {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, "marketplace.json");
    this.data = { analysts: {}, intel: {}, purchases: {} };
    this.load();
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  private load(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      // Start fresh if file is corrupt
      this.data = { analysts: {}, intel: {}, purchases: {} };
    }
  }

  private save(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  // ─── Analysts ──────────────────────────────────────────────────────────────

  getAnalyst(wallet: string): AnalystProfile | undefined {
    return this.data.analysts[wallet];
  }

  listAnalysts(): AnalystProfile[] {
    return Object.values(this.data.analysts);
  }

  upsertAnalyst(profile: AnalystProfile): void {
    this.data.analysts[profile.wallet] = profile;
    this.save();
  }

  // ─── Intel ─────────────────────────────────────────────────────────────────

  getIntel(id: string): MarketIntel | undefined {
    return this.data.intel[id];
  }

  listIntel(filters: {
    analystWallet?: string;
    marketPda?: string;
    resolved?: boolean;
  } = {}): MarketIntel[] {
    let items = Object.values(this.data.intel);

    if (filters.analystWallet) {
      items = items.filter((i) => i.analystWallet === filters.analystWallet);
    }
    if (filters.marketPda) {
      items = items.filter((i) => i.marketPda === filters.marketPda);
    }
    if (filters.resolved !== undefined) {
      items = items.filter((i) =>
        filters.resolved ? i.resolvedOutcome !== undefined : i.resolvedOutcome === undefined
      );
    }

    return items.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  saveIntel(intel: MarketIntel): void {
    this.data.intel[intel.id] = intel;
    this.save();
  }

  updateIntel(id: string, updates: Partial<MarketIntel>): MarketIntel | undefined {
    const existing = this.data.intel[id];
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.data.intel[id] = updated;
    this.save();
    return updated;
  }

  // ─── Purchases ─────────────────────────────────────────────────────────────

  getPurchase(id: string): PurchaseRecord | undefined {
    return this.data.purchases[id];
  }

  getPurchasesByBuyer(buyerWallet: string): PurchaseRecord[] {
    return Object.values(this.data.purchases).filter(
      (p) => p.buyerWallet === buyerWallet
    );
  }

  getPurchasesByIntel(intelId: string): PurchaseRecord[] {
    return Object.values(this.data.purchases).filter(
      (p) => p.intelId === intelId
    );
  }

  hasPurchased(buyerWallet: string, intelId: string): boolean {
    return Object.values(this.data.purchases).some(
      (p) => p.buyerWallet === buyerWallet && p.intelId === intelId
    );
  }

  savePurchase(purchase: PurchaseRecord): void {
    this.data.purchases[purchase.id] = purchase;
    this.save();
  }
}
