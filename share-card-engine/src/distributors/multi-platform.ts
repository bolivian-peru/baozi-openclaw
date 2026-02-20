/**
 * Multi-Platform Distribution Engine
 * 
 * Coordinates card generation and distribution across
 * Twitter, Discord, and Telegram simultaneously.
 */
import type { MarketCardData, ShareCard, BatchDistributionResult, DistributionResult, ShareCardConfig, Platform } from '../types/index.js';
import { generateShareCard } from '../generators/html-card.js';
import { createTwitterDistribution } from './twitter.js';
import { createDiscordDistribution } from './discord.js';
import { createTelegramDistribution } from './telegram.js';

/**
 * Distribute a market card to all platforms
 */
export function distributeToAllPlatforms(
  market: MarketCardData,
  config?: Partial<ShareCardConfig>
): BatchDistributionResult {
  const results: DistributionResult[] = [];

  // Generate platform-specific cards
  const twitterCard = generateShareCard(market, { platform: 'twitter', style: 'compact' }, config);
  const discordCard = generateShareCard(market, { platform: 'discord', style: 'default' }, config);
  const telegramCard = generateShareCard(market, { platform: 'telegram', style: 'default' }, config);

  // Create distribution results
  results.push(createTwitterDistribution(twitterCard));
  results.push(createDiscordDistribution(discordCard));
  results.push(createTelegramDistribution(telegramCard));

  const totalSuccess = results.filter(r => r.success).length;

  return {
    marketId: market.marketId,
    marketQuestion: market.question,
    results,
    totalSuccess,
    totalFailed: results.length - totalSuccess,
  };
}

/**
 * Distribute to specific platforms only
 */
export function distributeToPlatforms(
  market: MarketCardData,
  platforms: Platform[],
  config?: Partial<ShareCardConfig>
): BatchDistributionResult {
  const results: DistributionResult[] = [];

  for (const platform of platforms) {
    const card = generateShareCard(market, { platform }, config);
    switch (platform) {
      case 'twitter':
        results.push(createTwitterDistribution(card));
        break;
      case 'discord':
        results.push(createDiscordDistribution(card));
        break;
      case 'telegram':
        results.push(createTelegramDistribution(card));
        break;
      default:
        results.push({
          platform: 'generic',
          success: true,
          content: card.plainText,
          timestamp: new Date().toISOString(),
        });
    }
  }

  const totalSuccess = results.filter(r => r.success).length;

  return {
    marketId: market.marketId,
    marketQuestion: market.question,
    results,
    totalSuccess,
    totalFailed: results.length - totalSuccess,
  };
}

/**
 * Batch distribute multiple markets to all platforms
 */
export function batchDistribute(
  markets: MarketCardData[],
  config?: Partial<ShareCardConfig>
): BatchDistributionResult[] {
  return markets.map(m => distributeToAllPlatforms(m, config));
}

/**
 * Get all formatted content for a market (useful for preview)
 */
export function previewAllFormats(
  market: MarketCardData,
  config?: Partial<ShareCardConfig>
): Record<Platform, ShareCard> {
  return {
    twitter: generateShareCard(market, { platform: 'twitter', style: 'compact' }, config),
    discord: generateShareCard(market, { platform: 'discord', style: 'default' }, config),
    telegram: generateShareCard(market, { platform: 'telegram', style: 'default' }, config),
    generic: generateShareCard(market, { platform: 'generic', style: 'detailed' }, config),
  };
}
