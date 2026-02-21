/**
 * Shared TypeScript interfaces for Agent Arena.
 */

// ---------------------------------------------------------------------------
// Market data
// ---------------------------------------------------------------------------

export type MarketStatus = 'active' | 'closed' | 'resolved' | 'disputed';
export type MarketLayer = 'official' | 'lab' | 'private';
export type MarketSide = 'YES' | 'NO';

export interface MarketInfo {
  /** On-chain PDA address (base58) */
  pda: string;
  question: string;
  status: MarketStatus;
  layer: MarketLayer;
  /** Total pool in SOL */
  totalPool: number;
  yesPool: number;
  noPool: number;
  /** Implied probability 0-1 for YES */
  yesOdds: number;
  /** Implied probability 0-1 for NO */
  noOdds: number;
  closingTime: Date;
  /** Payout multiplier for YES side (before fees) */
  yesQuote: number;
  /** Payout multiplier for NO side (before fees) */
  noQuote: number;
  resolvedOutcome?: 'YES' | 'NO';
}

export interface RaceOutcome {
  label: string;
  pool: number;
  odds: number;
}

export interface RaceMarketInfo {
  pda: string;
  question: string;
  status: MarketStatus;
  layer: MarketLayer;
  totalPool: number;
  outcomes: RaceOutcome[];
  closingTime: Date;
  resolvedOutcomeIndex?: number;
}

// ---------------------------------------------------------------------------
// Agent / wallet data
// ---------------------------------------------------------------------------

export interface AgentPosition {
  marketPda: string;
  marketQuestion: string;
  side: MarketSide;
  /** Amount bet in SOL */
  amount: number;
  /** Unrealised P&L in SOL (current_odds * amount - amount) */
  unrealisedPnl: number;
  /** Current odds for this side (0-1 probability) */
  currentOdds: number;
  timestamp: Date;
}

export interface ResolvedBet {
  marketPda: string;
  marketQuestion: string;
  side: MarketSide;
  amount: number;
  /** Actual payout received (0 if lost) */
  payout: number;
  won: boolean;
  resolvedAt: Date;
}

export interface AgentStats {
  wallet: string;
  /** Display name — e.g. "Agent-A3b" */
  label: string;
  currentPositions: AgentPosition[];
  resolvedBets: ResolvedBet[];
  /** Sum of all resolved P&L (payout - amount) */
  realisedPnl: number;
  /** Sum of unrealised P&L from open positions */
  unrealisedPnl: number;
  totalPnl: number;
  totalBets: number;
  wins: number;
  losses: number;
  /** 0-100 */
  winRate: number;
  /** Total SOL wagered across all bets */
  volume: number;
  /** Count of consecutive wins (positive) or losses (negative) */
  streak: number;
  /** Unix timestamp of last update */
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export type LeaderboardSortKey = 'score' | 'pnl' | 'winRate' | 'volume' | 'streak';

export interface LeaderboardEntry {
  rank: number;
  agent: AgentStats;
  /** Composite score = winRate * max(0, totalPnl + 1) */
  score: number;
}

// ---------------------------------------------------------------------------
// Arena state — the root state object shared between modules
// ---------------------------------------------------------------------------

export interface ArenaState {
  markets: MarketInfo[];
  agents: Map<string, AgentStats>;
  leaderboard: LeaderboardEntry[];
  lastMarketRefresh: Date;
  lastAgentRefresh: Date;
  cycleCount: number;
}
