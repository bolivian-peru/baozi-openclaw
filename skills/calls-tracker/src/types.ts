/** Market types per pari-mutuel rules v6.3 */
export type MarketType = "A" | "B";

/** Call status lifecycle: pending → active → resolved */
export type CallStatus = "pending" | "active" | "resolved";

/** Resolution outcome */
export type Outcome = "win" | "loss" | "void";

/** Reputation tiers based on confidence score */
export type ReputationTier = "newcomer" | "caller" | "analyst" | "oracle" | "legend";

export interface Call {
  id: number;
  caller_name: string;
  caller_wallet: string;
  prediction_text: string;
  market_question: string;
  market_type: MarketType;
  close_time: string; // ISO 8601
  event_time: string | null;
  measurement_start: string | null;
  data_source: string;
  resolution_criteria: string;
  bet_amount: number; // SOL
  side: "Yes" | "No";
  market_pda: string | null;
  share_card_url: string | null;
  status: CallStatus;
  outcome: Outcome | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CallerStats {
  caller_name: string;
  caller_wallet: string;
  total_calls: number;
  resolved_calls: number;
  correct_calls: number;
  pending_calls: number;
  sol_wagered: number;
  sol_won: number;
  sol_lost: number;
  hit_rate: number;
  current_streak: number;
  best_streak: number;
  confidence_score: number;
  tier: ReputationTier;
}

export interface ParsedPrediction {
  question: string;
  market_type: MarketType;
  close_time: Date;
  event_time: Date | null;
  measurement_start: Date | null;
  data_source: string;
  resolution_criteria: string;
}

export function getTier(score: number): ReputationTier {
  if (score >= 80) return "legend";
  if (score >= 60) return "oracle";
  if (score >= 40) return "analyst";
  if (score >= 20) return "caller";
  return "newcomer";
}
