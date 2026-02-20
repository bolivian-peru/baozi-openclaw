/**
 * Market Monitor Service
 * Monitors for new Lab markets and triggers enrichment
 */

import { listMarkets } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';

/**
 * Fetch all active Lab markets from the Baozi program
 */
export async function fetchActiveLabMarkets(): Promise<Market[]> {
  const allMarkets = await listMarkets('Active');
  // Filter for Lab layer only
  return allMarkets.filter(m => m.layer === 'Lab');
}

/**
 * Fetch all active markets (any layer)
 */
export async function fetchAllActiveMarkets(): Promise<Market[]> {
  return listMarkets('Active');
}

/**
 * Detect new markets by comparing current vs previously known set
 */
export function detectNewMarkets(
  current: Market[],
  knownPdas: Set<string>,
): Market[] {
  return current.filter(m => !knownPdas.has(m.publicKey));
}

/**
 * Market Monitor class that tracks state across polls
 */
export class MarketMonitor {
  private knownMarketPdas: Set<string> = new Set();
  private enrichedMarketPdas: Set<string> = new Set();

  /**
   * Initialize with current markets (to avoid enriching old ones on first run)
   */
  async initialize(): Promise<void> {
    const current = await fetchActiveLabMarkets();
    for (const market of current) {
      this.knownMarketPdas.add(market.publicKey);
    }
    console.log(`[MarketMonitor] Initialized with ${this.knownMarketPdas.size} existing Lab markets`);
  }

  /**
   * Poll for new markets and return any newly detected ones
   */
  async poll(): Promise<Market[]> {
    const current = await fetchActiveLabMarkets();
    const newMarkets = detectNewMarkets(current, this.knownMarketPdas);

    // Update known set
    for (const market of current) {
      this.knownMarketPdas.add(market.publicKey);
    }

    return newMarkets;
  }

  /**
   * Mark a market as enriched
   */
  markEnriched(marketPda: string): void {
    this.enrichedMarketPdas.add(marketPda);
  }

  /**
   * Check if a market has been enriched
   */
  isEnriched(marketPda: string): boolean {
    return this.enrichedMarketPdas.has(marketPda);
  }

  /**
   * Get counts
   */
  getStats() {
    return {
      knownMarkets: this.knownMarketPdas.size,
      enrichedMarkets: this.enrichedMarketPdas.size,
    };
  }
}
