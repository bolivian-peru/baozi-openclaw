/**
 * Market Enrichment Pipeline
 * Combines all enrichers to produce a full enrichment result
 */

import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { MarketEnrichment, EnricherConfig } from '../types/index.js';
import { categorizeMarket } from './categorizer.js';
import { analyzeMarketTiming } from './timing-analyzer.js';
import { generateDescription, generateAgentBookContent } from './description-generator.js';
import { scoreMarketQuality } from './quality-scorer.js';
import { AgentBookService } from '../services/agentbook.js';

export { categorizeMarket, getPrimaryCategory, isInCategory } from './categorizer.js';
export { analyzeMarketTiming, isRecentlyCreated, getTimingScore } from './timing-analyzer.js';
export { generateDescription, generateOneLiner, generateAgentBookContent } from './description-generator.js';
export { scoreMarketQuality, scoreQuestionClarity, scoreLiquidity, scoreCategoryRelevance } from './quality-scorer.js';

/**
 * Default enricher configuration
 */
export const DEFAULT_CONFIG: EnricherConfig = {
  walletAddress: '0x59c7D3E9926403FBfdA678503827eFF0c5390D83',
  pollIntervalMs: 60_000, // 1 minute
  autoPost: true,
  minQualityToPost: 30,
  agentBookBaseUrl: 'https://baozi.bet/api/agentbook',
};

/**
 * Enrich a single market with all metadata
 */
export function enrichMarket(market: Market): MarketEnrichment {
  const categories = categorizeMarket(market);
  const timing = analyzeMarketTiming(market);
  const quality = scoreMarketQuality(market);
  const description = generateDescription(market);

  return {
    marketPda: market.publicKey,
    marketId: market.marketId,
    question: market.question,
    description,
    categories,
    timing,
    quality,
    enrichedAt: new Date().toISOString(),
    postedToAgentBook: false,
  };
}

/**
 * Enrich a market and optionally post to AgentBook
 */
export async function enrichAndPost(
  market: Market,
  config: EnricherConfig = DEFAULT_CONFIG,
): Promise<MarketEnrichment> {
  const enrichment = enrichMarket(market);

  if (config.autoPost && enrichment.quality.overall >= config.minQualityToPost) {
    const agentBook = new AgentBookService(config.agentBookBaseUrl);

    // Check if already posted
    const alreadyPosted = await agentBook.hasExistingEnrichment(
      enrichment.marketPda,
      config.walletAddress,
    );

    if (!alreadyPosted) {
      const content = generateAgentBookContent(
        market,
        enrichment.categories,
        enrichment.timing,
        enrichment.quality.overall,
      );

      const post = await agentBook.postEnrichment({
        walletAddress: config.walletAddress,
        content,
        marketPda: enrichment.marketPda,
      });

      enrichment.postedToAgentBook = post !== null;
    }
  }

  return enrichment;
}

/**
 * Batch enrich multiple markets
 */
export function enrichMarkets(markets: Market[]): MarketEnrichment[] {
  return markets.map(enrichMarket);
}
