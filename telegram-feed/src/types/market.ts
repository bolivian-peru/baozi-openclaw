/**
 * Core types for Baozi prediction market data.
 */

export interface MarketOutcome {
  /** Outcome index (0 = Yes/first, 1 = No/second, etc.) */
  index: number;
  /** Display label */
  label: string;
  /** Pool size in SOL */
  pool: number;
  /** Implied probability (0-1) */
  probability: number;
}

export interface Market {
  /** On-chain PDA (base58) */
  id: string;
  /** Market question */
  question: string;
  /** Market status */
  status: 'active' | 'closed' | 'resolved';
  /** Layer: official, lab, private */
  layer: 'official' | 'lab' | 'private';
  /** Category tag */
  category?: string;
  /** Total pool size in SOL */
  totalPool: number;
  /** Outcomes with probabilities */
  outcomes: MarketOutcome[];
  /** Closing timestamp (ISO 8601) */
  closingTime: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Whether this is a race (multi-outcome) market */
  isRace: boolean;
  /** 24h volume in SOL */
  volume24h?: number;
  /** Resolution result (if resolved) */
  resolution?: string;
}

export interface MarketQuote {
  marketId: string;
  outcomes: MarketOutcome[];
  totalPool: number;
  /** Fee rate in basis points */
  feeBps: number;
}

export interface GroupConfig {
  /** Telegram chat ID */
  chatId: number;
  /** Whether daily roundup is enabled */
  roundupEnabled: boolean;
  /** Cron expression for daily roundup (default: "0 9 * * *") */
  roundupCron: string;
  /** Timezone for roundup scheduling */
  timezone: string;
  /** Category filters (empty = all) */
  categories: string[];
}

export interface MarketFilter {
  status?: 'active' | 'closed' | 'all';
  layer?: 'official' | 'lab' | 'private' | 'all';
  category?: string;
  query?: string;
  limit?: number;
  sortBy?: 'volume' | 'closing' | 'created' | 'pool';
}
