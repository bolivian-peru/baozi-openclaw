/**
 * Baozi Share Card Viral Engine
 * 
 * Every bet becomes a billboard — auto-generate and distribute
 * share cards for Baozi prediction markets across platforms.
 * 
 * @module @baozi/share-card-engine
 */

// Core types
export type {
  MarketCardData,
  ShareCard,
  ShareCardConfig,
  CardGenerationOptions,
  CardEmbed,
  EmbedField,
  EmbedFooter,
  Platform,
  DistributionResult,
  BatchDistributionResult,
  CardStyle,
  QuoteSnapshot,
} from './types/index.js';

// Card generators
export { generateShareCard } from './generators/html-card.js';
export {
  generateCardsForActiveMarkets,
  generateCardsForTopMarkets,
  generateCardsForTrendingMarkets,
  generateCardsForMarkets,
  generateMultiPlatformCards,
} from './generators/batch.js';

// Platform distributors
export {
  formatTweet,
  formatMarketTweet,
  formatTweetThread,
  formatMarketsRoundup,
  validateTweetLength,
} from './distributors/twitter.js';

export {
  formatDiscordEmbed,
  createDiscordEmbed,
  formatDiscordMarkdown,
  formatDiscordMarketList,
} from './distributors/discord.js';

export {
  formatTelegramHtml,
  formatMarketTelegramHtml,
  formatTelegramMarkdown,
  generateTelegramKeyboard,
  formatTelegramMarketList,
} from './distributors/telegram.js';

export {
  distributeToAllPlatforms,
  distributeToPlatforms,
  batchDistribute,
  previewAllFormats,
} from './distributors/multi-platform.js';

// Utilities
export {
  DEFAULT_CONFIG,
  DEFAULT_OPTIONS,
  buildMarketUrl,
  mergeConfig,
  mergeOptions,
} from './utils/config.js';

export {
  formatSol,
  formatPercent,
  formatCountdown,
  truncateQuestion,
  asciiOddsBar,
  htmlOddsBar,
  formatStatus,
  formatLayer,
  escapeHtml,
  oddsEmoji,
} from './utils/formatting.js';

export {
  fetchActiveMarkets,
  fetchAllMarkets,
  fetchMarket,
  fetchQuote,
  fetchTopMarkets,
  fetchTrendingMarkets,
  PROGRAM_ID,
  DISCRIMINATORS,
  RPC_ENDPOINT,
} from './utils/market-fetcher.js';
