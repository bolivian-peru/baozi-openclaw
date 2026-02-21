/** Agent being tracked in the arena */
export interface TrackedAgent {
  wallet: string;
  name: string;
  avatar_url: string | null;
  added_at: string;
}

/** A position an agent holds on a market */
export interface AgentPosition {
  market_pda: string;
  market_question: string;
  side: "Yes" | "No" | string;
  amount: number; // SOL
  current_odds: number; // 0-1
  implied_value: number; // amount * odds
}

/** Agent stats computed from positions and resolved markets */
export interface AgentStats {
  wallet: string;
  name: string;
  total_markets: number;
  active_positions: number;
  resolved_markets: number;
  correct_predictions: number;
  accuracy: number; // 0-1
  sol_wagered: number;
  sol_won: number;
  sol_lost: number;
  net_pnl: number;
  current_streak: number;
  best_streak: number;
  score: number; // composite score for ranking
}

/** Market state with agent positions overlay */
export interface ArenaMarket {
  pda: string;
  question: string;
  close_time: string;
  status: "active" | "closed" | "resolved";
  total_pool: number;
  yes_pool: number;
  no_pool: number;
  yes_odds: number;
  no_odds: number;
  agent_positions: {
    agent_name: string;
    agent_wallet: string;
    side: string;
    amount: number;
  }[];
  outcome: string | null;
}

/** Full arena snapshot */
export interface ArenaSnapshot {
  timestamp: string;
  agents: AgentStats[];
  markets: ArenaMarket[];
  total_agents: number;
  total_active_markets: number;
  total_sol_in_play: number;
}
