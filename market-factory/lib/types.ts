/**
 * Market Factory Type Definitions
 */

import type { MarketCategory } from './config.js';

// =============================================================================
// Event Detection
// =============================================================================

/** A detected event from a news/data source */
export interface DetectedEvent {
  /** Unique ID for dedup (e.g., "crypto:sol:200" or "sports:ufc:302") */
  eventId: string;
  /** Human-readable title */
  title: string;
  /** Source of the detection */
  source: EventSource;
  /** Category for tracking */
  category: MarketCategory;
  /** When the event happens (or measurement time) */
  eventTime: Date;
  /** Suggested market question */
  suggestedQuestion: string;
  /** Market type */
  marketType: 'boolean' | 'race';
  /** Outcomes for race markets */
  outcomes?: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Resolution source description */
  resolutionSource: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type EventSource =
  | 'rss-crypto'
  | 'rss-sports'
  | 'rss-tech'
  | 'coingecko'
  | 'espn'
  | 'ufc'
  | 'esports-calendar'
  | 'product-launches'
  | 'custom';

// =============================================================================
// Market Creation
// =============================================================================

/** Parameters for creating a market on Baozi */
export interface MarketCreateParams {
  question: string;
  closingTime: Date;
  resolutionTime: Date;
  category: MarketCategory;
  eventId: string;
  marketType: 'boolean' | 'race';
  outcomes?: string[];
  resolutionSource: string;
}

/** Result of a market creation attempt */
export interface MarketCreateResult {
  success: boolean;
  marketId?: string;
  marketAddress?: string;
  txSignature?: string;
  error?: string;
}

// =============================================================================
// Existing Market (for duplicate detection)
// =============================================================================

export interface ExistingMarket {
  publicKey: string;
  marketId: string;
  question: string;
  closingTime: string;
  status: string;
  layer: string;
  totalPoolSol: number;
}

// =============================================================================
// Memory / Tracking
// =============================================================================

/** Record of a created market */
export interface MarketRecord {
  eventId: string;
  marketId: string;
  marketAddress: string;
  question: string;
  category: MarketCategory;
  createdAt: string; // ISO 8601
  closingTime: string;
  resolutionTime: string;
  resolutionSource: string;
  txSignature: string;
  status: 'active' | 'closed' | 'resolved' | 'cancelled' | 'disputed';
  resolvedOutcome?: string;
  volumeSol: number;
  feesEarnedSol: number;
}

/** Category performance tracking */
export interface CategoryStats {
  category: MarketCategory;
  marketsCreated: number;
  totalVolumeSol: number;
  totalFeesEarnedSol: number;
  avgVolumePerMarket: number;
  resolutions: {
    correct: number;
    incorrect: number;
    pending: number;
  };
}

/** Factory state persisted to memory */
export interface FactoryState {
  /** Markets we've created */
  markets: MarketRecord[];
  /** Category performance stats */
  categoryStats: Record<string, CategoryStats>;
  /** Event IDs we've already processed (to avoid dupes) */
  processedEventIds: string[];
  /** Last scan timestamps */
  lastScans: Record<string, string>; // source -> ISO 8601
  /** Total fees earned */
  totalFeesEarnedSol: number;
  /** Total markets created */
  totalMarketsCreated: number;
}

// =============================================================================
// Resolution
// =============================================================================

export interface ResolutionResult {
  marketId: string;
  marketAddress: string;
  outcome: 'yes' | 'no' | number; // number for race market outcome index
  evidence: string;
  source: string;
  resolved: boolean;
  txSignature?: string;
  error?: string;
}
