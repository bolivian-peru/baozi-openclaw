// Configuration for the Trending Market Machine

export const CONFIG = {
  // Baozi API
  BAOZI_API: "https://baozi.bet/api",
  BAOZI_PROGRAM_ID: "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ",
  BAOZI_VALIDATE_URL: "https://baozi.bet/api/markets/validate",

  // Solana
  RPC_URL: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",

  // Trend sources
  COINGECKO_API: "https://api.coingecko.com/api/v3",
  HN_API: "https://hacker-news.firebaseio.com/v0",

  // Market creation defaults
  MIN_HOURS_UNTIL_CLOSE: 48,
  MAX_DAYS_UNTIL_CLOSE: 14,
  DEFAULT_RESOLUTION_BUFFER_SECONDS: 300,
  LAB_CREATION_FEE_SOL: 0.01,
  MAX_CREATOR_FEE_BPS: 200, // 2%

  // Machine settings
  POLL_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
  MAX_MARKETS_PER_HOUR: 3,
  DRY_RUN: process.env.DRY_RUN === "true",

  // Categories (Baozi standard: crypto, sports, music, streaming, economic, weather, elections)
  CATEGORIES: ["crypto", "sports", "music", "streaming", "economic", "weather", "elections", "technology"] as const,
} as const;

export type Category = typeof CONFIG.CATEGORIES[number];

export interface TrendingTopic {
  id: string;
  title: string;
  source: string;
  category: Category;
  url?: string;
  score: number; // 0-100 relevance/virality score
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

export interface MarketQuestion {
  question: string;
  description: string;
  marketType: "boolean" | "race";
  category: Category;
  closingTime: Date;
  resolutionTime: Date;
  dataSource: string;
  dataSourceUrl: string;
  tags: string[];
  trendSource: TrendingTopic;
  // v7.0: Only Type A (event-based) markets allowed. Type B is banned.
  timingType: "A";
  // When the event happens (must be 24h+ after closingTime)
  eventTime: Date;
  // Backup data source for resolution
  backupSource?: string;
}

export interface ValidationResult {
  approved: boolean;
  violations: Array<{
    severity: "critical" | "warning" | "info";
    rule: string;
    message: string;
  }>;
}

export interface CreatedMarket {
  marketPda: string;
  txSignature: string;
  question: string;
  closingTime: Date;
  createdAt: Date;
  trendId: string;
  shareCardUrl?: string;
}
