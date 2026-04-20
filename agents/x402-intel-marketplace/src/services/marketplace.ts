/**
 * Marketplace Service
 *
 * Orchestrates the marketplace: reads Baozi markets, shows listings,
 * manages analyst leaderboard.
 */
import { MarketplaceStoreService } from './store.js';
import { AnalystService } from './analyst.js';
import { BuyerService } from './buyer.js';
import type { MarketplaceConfig, IntelListing, AnalystProfile } from '../types/index.js';

async function fetchBaoziMarkets(): Promise<any[]> {
  try {
    const mod = await import('@baozi.bet/mcp-server/dist/handlers/markets.js' as any) as any;
    return await mod.listMarkets('active') as any[];
  } catch {
    return [];
  }
}

export class Marketplace {
  private store: MarketplaceStoreService;
  analyst: AnalystService;
  buyer: BuyerService;

  constructor(private readonly config: MarketplaceConfig) {
    this.store   = new MarketplaceStoreService();
    this.analyst = new AnalystService(config, this.store);
    this.buyer   = new BuyerService(config, this.store);
  }

  /** Print the analyst leaderboard. */
  async showLeaderboard(): Promise<void> {
    const leaders = this.store.getLeaderboard(10);
    console.log('\n📊 INTEL MARKETPLACE — Analyst Leaderboard');
    console.log('─'.repeat(60));

    if (leaders.length === 0) {
      console.log('  No analysts yet. Be the first: npm run publish');
      return;
    }

    leaders.forEach((a, i) => {
      const acc = a.accuracy ? `${a.accuracy}% accuracy` : 'unverified';
      console.log(`  ${(i + 1).toString().padStart(2)}. ${a.walletAddress.slice(0, 12)}... | score: ${a.reputationScore} | ${a.listingCount} analyses | ${acc}`);
    });
    console.log('─'.repeat(60));
  }

  /** Show all listings for a market. */
  showMarketListings(marketPda: string): void {
    const listings = this.buyer.getListingsForMarket(marketPda);
    if (listings.length === 0) {
      console.log(`  No intel listings for market ${marketPda.slice(0, 16)}...`);
      return;
    }
    console.log(`\n💡 Intel listings for ${marketPda.slice(0, 16)}...`);
    listings.forEach(l => {
      console.log(`  [${l.id}] ${l.recommendedSide} | conf: ${l.confidenceScore}% | ${l.priceSol} SOL | ${l.thesis.slice(0, 60)}`);
    });
  }

  /** Run a demo cycle: fetch live markets, show how publishing would work. */
  async runDemo(): Promise<void> {
    console.log('\n🎭 x402 INTEL MARKETPLACE — Demo Mode');
    console.log('   No wallet or x402 payments needed for demo\n');

    const markets = await fetchBaoziMarkets();
    console.log(`📡 Fetched ${markets.length} live Baozi markets`);

    if (markets.length === 0) {
      console.log('   (Could not reach Baozi API — try again with network access)');
      return;
    }

    const sample = markets.slice(0, 3);
    for (const m of sample) {
      const pda  = m.pda ?? m.publicKey ?? 'unknown';
      const q    = m.question ?? m.name ?? 'Unknown market';
      const pool = m.pool?.total ?? 0;
      console.log(`\n  Market: ${q.slice(0, 60)}`);
      console.log(`  PDA:    ${pda.slice(0, 20)}...`);
      console.log(`  Pool:   ${pool.toFixed(2)} SOL`);
      console.log(`  → If you had 75% confidence, you could sell analysis for 0.01 SOL`);
      console.log(`  → Buyer bets → you earn 1% affiliate commission on their wager`);
    }

    console.log('\n✅ To publish real analysis:');
    console.log('   WALLET_ADDRESS=<wallet> npm run publish -- --market <PDA> --thesis "..." --side YES --confidence 80');
  }
}
