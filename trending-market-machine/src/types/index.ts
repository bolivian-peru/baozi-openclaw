/**
 * Core types for the Trending Market Machine
 */

/** Trend source identifiers */
export type TrendSource =
  | "google-trends"
  | "coingecko"
  | "hackernews"
  | "espn"
  | "techcrunch";

/** Market timing classification per Baozi v6.3 rules */
export type MarketType = "A" | "B";

/** Market categories on Baozi */
export type MarketCategory =
  | "crypto"
  | "sports"
  | "technology"
  | "entertainment"
  | "finance"
  | "politics"
  | "science"
  | "other";

/** A raw trending topic from any source */
export interface TrendingTopic {
  /** Unique identifier for dedup (source + normalized title hash) */
  id: string;
  /** The trending topic / headline */
  title: string;
  /** Brief description or context */
  description: string;
  /** Which source detected this trend */
  source: TrendSource;
  /** Category classification */
  category: MarketCategory;
  /** Relative trend score (0-100) */
  trendScore: number;
  /** When the trend was detected */
  detectedAt: Date;
  /** Optional URL for more context */
  url?: string;
  /** Related keywords for duplicate detection */
  keywords: string[];
}

/** A classified and structured market proposal */
export interface MarketProposal {
  /** The trending topic that generated this proposal */
  topic: TrendingTopic;
  /** Market question (10-200 chars, objective, verifiable) */
  question: string;
  /** Detailed market description */
  description: string;
  /** Market timing type */
  marketType: MarketType;
  /** When the market closes (ISO 8601) */
  closeTime: string;
  /** When the measurement period starts (ISO 8601, required for Type B) */
  measurementStart?: string;
  /** When the event occurs (ISO 8601, required for Type A) */
  eventTime?: string;
  /** Official data source for resolution */
  dataSource: string;
  /** Resolution criteria */
  resolutionCriteria: string;
  /** Category for Baozi metadata */
  category: MarketCategory;
  /** Tags for discovery */
  tags: string[];
  /** Whether this is a race market (multi-outcome) */
  isRaceMarket: boolean;
  /** Outcomes for race markets */
  outcomes?: string[];
}

/** Result of market validation */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** A created market record */
export interface CreatedMarket {
  /** Baozi market ID (on-chain public key) */
  marketId: string;
  /** The proposal that was used */
  proposal: MarketProposal;
  /** Transaction signature */
  txSignature: string;
  /** Share card URL if generated */
  shareCardUrl?: string;
  /** AgentBook post ID */
  agentBookPostId?: string;
  /** When the market was created */
  createdAt: Date;
}

/** Configuration for the trending market machine */
export interface MachineConfig {
  /** Solana RPC URL */
  solanaRpcUrl: string;
  /** Solana private key (base58, 64-byte) */
  solanaPrivateKey: string;
  /** Baozi API base URL */
  baoziBaseUrl: string;
  /** Which trend sources to monitor */
  sources: TrendSource[];
  /** Minimum trend score to consider (0-100) */
  minTrendScore: number;
  /** Maximum markets to create per cycle */
  maxMarketsPerCycle: number;
  /** Minimum hours until market close */
  minHoursUntilClose: number;
  /** Maximum days until market close */
  maxDaysUntilClose: number;
  /** Affiliate wallet address (optional) */
  affiliateWallet?: string;
  /** Creator fee in basis points (0-200 = 0-2%) */
  creatorFeeBps: number;
  /** Dry run mode — validate but don't create */
  dryRun: boolean;
}

/** MCP tool execution result */
export interface McpResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** State persisted between runs for dedup and tracking */
export interface MachineState {
  /** Previously created market topic IDs to avoid duplicates */
  createdTopicIds: string[];
  /** Previously created market questions (normalized) for fuzzy dedup */
  createdQuestions: string[];
  /** Markets created with their metadata */
  markets: CreatedMarket[];
  /** Last run timestamp */
  lastRunAt: string;
  /** Total markets created */
  totalCreated: number;
}
