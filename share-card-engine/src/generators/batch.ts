/**
 * Batch card generation — generate cards for multiple markets at once
 */
import type { MarketCardData, ShareCard, CardGenerationOptions, ShareCardConfig } from '../types/index.js';
import { generateShareCard } from './html-card.js';
import { fetchActiveMarkets, fetchTopMarkets, fetchTrendingMarkets } from '../utils/market-fetcher.js';

/**
 * Generate cards for all active markets
 */
export async function generateCardsForActiveMarkets(
  options?: Partial<CardGenerationOptions>,
  config?: Partial<ShareCardConfig>
): Promise<ShareCard[]> {
  const markets = await fetchActiveMarkets();
  return markets.map(m => generateShareCard(m, options, config));
}

/**
 * Generate cards for top markets by pool size
 */
export async function generateCardsForTopMarkets(
  limit: number = 10,
  options?: Partial<CardGenerationOptions>,
  config?: Partial<ShareCardConfig>
): Promise<ShareCard[]> {
  const markets = await fetchTopMarkets(limit);
  return markets.map(m => generateShareCard(m, options, config));
}

/**
 * Generate cards for trending markets
 */
export async function generateCardsForTrendingMarkets(
  limit: number = 5,
  options?: Partial<CardGenerationOptions>,
  config?: Partial<ShareCardConfig>
): Promise<ShareCard[]> {
  const markets = await fetchTrendingMarkets(limit);
  return markets.map(m => generateShareCard(m, options, config));
}

/**
 * Generate cards for a specific list of market public keys
 */
export function generateCardsForMarkets(
  markets: MarketCardData[],
  options?: Partial<CardGenerationOptions>,
  config?: Partial<ShareCardConfig>
): ShareCard[] {
  return markets.map(m => generateShareCard(m, options, config));
}

/**
 * Generate platform-specific cards for a single market
 * Returns one card per platform
 */
export function generateMultiPlatformCards(
  market: MarketCardData,
  config?: Partial<ShareCardConfig>
): Record<string, ShareCard> {
  return {
    twitter: generateShareCard(market, { platform: 'twitter', style: 'compact' }, config),
    discord: generateShareCard(market, { platform: 'discord', style: 'default' }, config),
    telegram: generateShareCard(market, { platform: 'telegram', style: 'default' }, config),
    generic: generateShareCard(market, { platform: 'generic', style: 'detailed' }, config),
  };
}
