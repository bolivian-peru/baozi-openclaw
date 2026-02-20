/**
 * Type definitions for Market Metadata Enricher
 */

// Re-export Market type from MCP server
export type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';

/**
 * Category tags for market classification
 */
export type MarketCategory =
  | 'crypto'
  | 'politics'
  | 'sports'
  | 'entertainment'
  | 'technology'
  | 'finance'
  | 'science'
  | 'world-events'
  | 'meme'
  | 'weather'
  | 'gaming'
  | 'culture'
  | 'other';

/**
 * Timing analysis result
 */
export interface TimingAnalysis {
  /** Total duration from now until closing in hours */
  hoursUntilClose: number;
  /** Total duration from now until resolution in hours */
  hoursUntilResolution: number;
  /** Whether the market is closing soon (< 24 hours) */
  isClosingSoon: boolean;
  /** Whether the market has a long duration (> 30 days) */
  isLongTerm: boolean;
  /** Whether the market is short-term (< 3 days) */
  isShortTerm: boolean;
  /** Whether resolution time seems reasonable relative to closing time */
  hasReasonableResolution: boolean;
  /** Human-readable timing summary */
  timingSummary: string;
  /** Urgency level: low, medium, high */
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Quality score breakdown
 */
export interface QualityScore {
  /** Overall score 0-100 */
  overall: number;
  /** Question clarity score 0-100 */
  questionClarity: number;
  /** Timing appropriateness 0-100 */
  timingScore: number;
  /** Market liquidity score 0-100 (based on pool size) */
  liquidityScore: number;
  /** Category relevance 0-100 */
  categoryRelevance: number;
  /** Description of quality assessment */
  qualitySummary: string;
  /** Identified issues */
  issues: string[];
  /** Improvement suggestions */
  suggestions: string[];
}

/**
 * Full enrichment result for a market
 */
export interface MarketEnrichment {
  /** Market public key */
  marketPda: string;
  /** Market ID */
  marketId: string;
  /** Original question */
  question: string;
  /** Generated description */
  description: string;
  /** Category tags */
  categories: MarketCategory[];
  /** Timing analysis */
  timing: TimingAnalysis;
  /** Quality score */
  quality: QualityScore;
  /** Timestamp of enrichment */
  enrichedAt: string;
  /** Whether this was posted to AgentBook */
  postedToAgentBook: boolean;
}

/**
 * AgentBook post request body
 */
export interface AgentBookPostRequest {
  walletAddress: string;
  content: string;
  marketPda: string;
}

/**
 * AgentBook post response
 */
export interface AgentBookPost {
  id: string;
  walletAddress: string;
  content: string;
  steams: number;
  marketPda: string;
  createdAt: string;
}

/**
 * AgentBook GET response
 */
export interface AgentBookGetResponse {
  success: boolean;
  posts: AgentBookPost[];
}

/**
 * Configuration for the enricher agent
 */
export interface EnricherConfig {
  /** Wallet address for AgentBook posts */
  walletAddress: string;
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
  /** Whether to auto-post to AgentBook */
  autoPost: boolean;
  /** Minimum quality score to post (0-100) */
  minQualityToPost: number;
  /** AgentBook API base URL */
  agentBookBaseUrl: string;
}
