/**
 * Market Metadata Enricher
 *
 * An agent that monitors newly created Lab markets on Baozi
 * and enriches them with quality metadata:
 * - Generated descriptions
 * - Category tags
 * - Timing analysis
 * - Quality scores
 *
 * Posts suggestions via AgentBook API.
 */

import { PROGRAM_ID } from '@baozi.bet/mcp-server/dist/config.js';
import { MarketMonitor } from './services/market-monitor.js';
import { enrichAndPost, DEFAULT_CONFIG } from './enrichers/index.js';
import type { EnricherConfig, MarketEnrichment } from './types/index.js';

export { enrichMarket, enrichAndPost, enrichMarkets, DEFAULT_CONFIG } from './enrichers/index.js';
export { categorizeMarket, getPrimaryCategory } from './enrichers/categorizer.js';
export { analyzeMarketTiming, getTimingScore } from './enrichers/timing-analyzer.js';
export { generateDescription, generateOneLiner } from './enrichers/description-generator.js';
export { scoreMarketQuality, scoreQuestionClarity } from './enrichers/quality-scorer.js';
export { AgentBookService } from './services/agentbook.js';
export { MarketMonitor, fetchActiveLabMarkets, fetchAllActiveMarkets } from './services/market-monitor.js';
export type * from './types/index.js';

/**
 * Start the enricher agent with continuous polling
 */
export async function startEnricher(
  config: Partial<EnricherConfig> = {},
): Promise<void> {
  const fullConfig: EnricherConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔍 Market Metadata Enricher — Starting');
  console.log(`  📡 Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`  💰 Wallet: ${fullConfig.walletAddress}`);
  console.log(`  ⏱️  Poll interval: ${fullConfig.pollIntervalMs / 1000}s`);
  console.log(`  📝 Auto-post: ${fullConfig.autoPost}`);
  console.log(`  📊 Min quality to post: ${fullConfig.minQualityToPost}`);
  console.log('═══════════════════════════════════════════════════════════');

  const monitor = new MarketMonitor();
  await monitor.initialize();

  const poll = async () => {
    try {
      const newMarkets = await monitor.poll();

      if (newMarkets.length > 0) {
        console.log(`\n🆕 Found ${newMarkets.length} new Lab market(s):`);

        for (const market of newMarkets) {
          console.log(`\n  Processing: "${market.question}" (${market.publicKey})`);

          const enrichment = await enrichAndPost(market, fullConfig);
          monitor.markEnriched(market.publicKey);

          console.log(`    📊 Quality: ${enrichment.quality.overall}/100`);
          console.log(`    🏷️  Categories: ${enrichment.categories.join(', ')}`);
          console.log(`    ⏰ Timing: ${enrichment.timing.urgency} urgency`);
          console.log(`    📝 Posted to AgentBook: ${enrichment.postedToAgentBook ? 'Yes' : 'No'}`);

          if (enrichment.quality.issues.length > 0) {
            console.log(`    ⚠️  Issues: ${enrichment.quality.issues.join('; ')}`);
          }
        }
      }

      const stats = monitor.getStats();
      console.log(`[${new Date().toISOString()}] Known: ${stats.knownMarkets} | Enriched: ${stats.enrichedMarkets}`);
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  // Initial poll
  await poll();

  // Continuous polling
  setInterval(poll, fullConfig.pollIntervalMs);
}

// CLI entrypoint
if (process.argv[1]?.includes('market-metadata-enricher')) {
  const config: Partial<EnricherConfig> = {};

  if (process.env.WALLET_ADDRESS) config.walletAddress = process.env.WALLET_ADDRESS;
  if (process.env.POLL_INTERVAL_MS) config.pollIntervalMs = Number(process.env.POLL_INTERVAL_MS);
  if (process.env.AUTO_POST === 'false') config.autoPost = false;
  if (process.env.MIN_QUALITY) config.minQualityToPost = Number(process.env.MIN_QUALITY);

  startEnricher(config).catch(console.error);
}
