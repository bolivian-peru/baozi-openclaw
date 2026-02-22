// Dashboard UI types — mirrors scripts/agent-arena src/api/arena.ts for display only.
// Backend can later feed live data via the same shape.

export interface AgentStats {
  wallet: string;
  name: string;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  pnl: number;
  openPositions: number;
  resolvedPositions: number;
  accuracy: number;
  wins: number;
  losses: number;
  streak: number;
  activeMarkets: unknown[];
  resolvedMarkets: unknown[];
}

export interface MarketArenaView {
  pda: string;
  marketId: string;
  question: string;
  status: string;
  totalPoolSol: number;
  type: "boolean" | "race";
  agents: {
    wallet: string;
    name: string;
    side: string;
    amountSol: number;
    pnlSol: number;
    isWinner: boolean | null;
  }[];
  yesPercent?: number;
  noPercent?: number;
  winningOutcome?: string | null;
  outcomes?: { label: string; pool: number; percent: number }[];
  winnerIndex?: number | null;
}

export interface ArenaReport {
  leaderboard: AgentStats[];
  activeMarkets: MarketArenaView[];
  resolvedMarkets: MarketArenaView[];
  totalAgents: number;
  totalMarkets: number;
  totalVolume: number;
  fetchedAt: string;
}
