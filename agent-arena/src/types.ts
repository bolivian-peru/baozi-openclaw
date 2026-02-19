/**
 * Agent Arena — Type definitions
 */

export interface AgentConfig {
  wallet: string;
  name: string;
  emoji: string;
  avatar?: string;
}

export interface AgentPosition {
  marketPda: string;
  marketQuestion: string;
  marketStatus: string;
  side: 'Yes' | 'No' | 'Both';
  yesAmountSol: number;
  noAmountSol: number;
  totalAmountSol: number;
  claimed: boolean;
  marketOutcome: string | null;
  potentialPayout: number;
}

export interface AgentStats {
  wallet: string;
  name: string;
  emoji: string;
  totalPositions: number;
  activePositions: number;
  winningPositions: number;
  losingPositions: number;
  pendingPositions: number;
  totalBetSol: number;
  totalWonSol: number;
  totalLostSol: number;
  netPnlSol: number;
  accuracy: number; // percentage
  streak: number; // consecutive correct
  positions: AgentPosition[];
}

export interface MarketState {
  publicKey: string;
  marketId: string;
  question: string;
  status: string;
  layer: string;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  closingTime: string;
  isBettingOpen: boolean;
  winningOutcome: string | null;
  agentPositions: {
    agent: AgentConfig;
    side: string;
    amount: number;
    potentialPayout: number;
  }[];
}

export interface RaceMarketState {
  publicKey: string;
  marketId: string;
  question: string;
  status: string;
  totalPoolSol: number;
  closingTime: string;
  isBettingOpen: boolean;
  outcomes: {
    index: number;
    label: string;
    poolSol: number;
    percent: number;
  }[];
  winningOutcomeIndex: number | null;
}

export interface ArenaSnapshot {
  timestamp: string;
  agents: AgentStats[];
  markets: MarketState[];
  raceMarkets: RaceMarketState[];
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  name: string;
  emoji: string;
  accuracy: number;
  netPnlSol: number;
  totalBetSol: number;
  totalPositions: number;
  winningPositions: number;
  streak: number;
}

export interface ActivityFeedItem {
  timestamp: string;
  agent: string;
  emoji: string;
  action: string;
  market: string;
  side?: string;
  amount?: number;
}
