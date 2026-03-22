/**
 * Core types for the Night Kitchen bilingual market report agent.
 */

// --- Proverb Types ---

export type ProverbContext = 'patience' | 'risk' | 'timing' | 'community' | 'perseverance' | 'wisdom';

export interface Proverb {
  chinese: string;
  pinyin: string;
  english: string;
  context: ProverbContext;
}

// --- Market Types ---

export interface Market {
  pda: string;
  question: string;
  endTime: Date;
  totalPool: number;
  outcomes: Array<{ label: string; probability: number; pool: number }>;
  category?: string;
  status?: string;
}

export interface CategorizedMarkets {
  closingSoon: Market[];   // ends within 24 hours
  longDated: Market[];     // ends more than 7 days away
  highStakes: Market[];    // total pool > 10 SOL
  balanced: Market[];      // odds between 30-70%
  all: Market[];
}

// --- Report Types ---

export interface BilingualReport {
  english: string;
  chinese: string;       // proverb section
  combined: string;      // the full post
  proverb: Proverb;
  marketCount: number;
  generatedAt: Date;
}

// --- Config Types ---

export type ReportType = 'daily-digest' | 'closing-soon' | 'high-stakes' | 'community';

export interface NightKitchenConfig {
  walletAddress?: string;
  privateKey?: string;
  rpcUrl?: string;
  postToAgentBook: boolean;
  maxMarketsToShow: number;
  reportTypes: ReportType[];
  dryRun?: boolean;
}

export const DEFAULT_CONFIG: NightKitchenConfig = {
  walletAddress: '',
  postToAgentBook: false,
  maxMarketsToShow: 5,
  reportTypes: ['daily-digest'],
  dryRun: false,
};

// --- MCP / API Types ---

export interface McpResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface AgentBookPost {
  id?: number;
  walletAddress: string;
  content: string;
  marketPda?: string | null;
  steams?: number;
  createdAt?: string;
}

export interface PostHistory {
  lastPostTime: string | null;
  postsToday: number;
}
