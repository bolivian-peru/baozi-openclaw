/**
 * Market Factory Configuration
 * 
 * Environment variables:
 * - SOLANA_RPC_URL: Solana RPC endpoint (Helius/QuickNode recommended)
 * - SOLANA_PRIVATE_KEY: Base58-encoded keypair for market creation
 * - NEWS_API_KEY: (optional) NewsAPI.org API key
 * - COINGECKO_API_KEY: (optional) CoinGecko Pro API key
 */

// =============================================================================
// Network
// =============================================================================

export const SOLANA_RPC_URL = process.env.HELIUS_RPC_URL
  || process.env.SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';

export const BAOZI_PROGRAM_ID = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';

export const BAOZI_API_BASE = 'https://baozi.bet/api';

// =============================================================================
// API Keys (optional - graceful degradation if absent)
// =============================================================================

export const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
export const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';

// =============================================================================
// Market Creation Defaults
// =============================================================================

export const MARKET_DEFAULTS = {
  /** Minimum hours before event to close betting */
  MIN_CLOSE_BUFFER_HOURS: 1,
  /** Default hours before event to close betting */
  DEFAULT_CLOSE_BUFFER_HOURS: 2,
  /** Resolution buffer after closing (hours) */
  RESOLUTION_BUFFER_HOURS: 24,
  /** Minimum market duration (hours) */
  MIN_DURATION_HOURS: 2,
  /** Maximum market duration (days) */
  MAX_DURATION_DAYS: 90,
  /** Lab creation fee (SOL) */
  CREATION_FEE_SOL: 0.01,
  /** Creator fee basis points */
  CREATOR_FEE_BPS: 50, // 0.5%
};

// =============================================================================
// Scan Intervals
// =============================================================================

export const SCAN_INTERVALS = {
  /** News feed scan interval (minutes) */
  NEWS_SCAN_MINUTES: 30,
  /** Event calendar check interval (hours) */
  EVENT_SCAN_HOURS: 6,
  /** Daily review time (hour in UTC) */
  DAILY_REVIEW_HOUR_UTC: 6,
  /** Crypto milestone check interval (minutes) */
  CRYPTO_SCAN_MINUTES: 15,
};

// =============================================================================
// Quality Filters
// =============================================================================

export const QUALITY_FILTERS = {
  /** Minimum question length */
  MIN_QUESTION_LENGTH: 10,
  /** Maximum question length */
  MAX_QUESTION_LENGTH: 200,
  /** Blocked terms in market questions */
  BLOCKED_TERMS: [
    // Slurs and offensive content (abbreviated patterns)
    'assassination', 'death of', 'suicide',
    'terrorist', 'terrorism',
  ],
  /** Minimum hours in the future for closing time */
  MIN_FUTURE_HOURS: 1,
  /** Maximum markets to create per scan cycle */
  MAX_MARKETS_PER_CYCLE: 5,
};

// =============================================================================
// Categories
// =============================================================================

export const CATEGORIES = [
  'crypto',
  'sports',
  'esports',
  'entertainment',
  'ai-tech',
  'politics',
  'weather',
  'business',
] as const;

export type MarketCategory = typeof CATEGORIES[number];
