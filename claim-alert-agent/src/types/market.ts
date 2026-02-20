/**
 * Market and position types from Baozi prediction markets
 */

export interface MarketOutcome {
  /** Outcome index (0 = Yes/first, 1 = No/second, etc.) */
  index: number;
  /** Outcome label */
  label: string;
  /** Pool amount in SOL */
  pool: number;
  /** Implied probability (0-1) */
  probability: number;
}

export interface Market {
  /** Market ID (base58 public key) */
  id: string;
  /** Market question */
  question: string;
  /** Market status */
  status: 'active' | 'closed' | 'resolved' | 'disputed';
  /** Closing time (ISO string) */
  closingTime: string;
  /** Outcomes with pools and probabilities */
  outcomes: MarketOutcome[];
  /** Total pool in SOL */
  totalPool: number;
  /** Resolved outcome index (if resolved) */
  resolvedOutcome?: number;
  /** Market layer */
  layer: 'official' | 'lab' | 'private';
  /** Creation time */
  createdAt?: string;
}

export interface Position {
  /** Market ID */
  marketId: string;
  /** Market question */
  marketQuestion: string;
  /** Outcome index the user bet on */
  outcomeIndex: number;
  /** Outcome label */
  outcomeLabel: string;
  /** Amount staked in SOL */
  stake: number;
  /** Current implied probability of the chosen outcome */
  currentProbability: number;
  /** Market status */
  marketStatus: 'active' | 'closed' | 'resolved' | 'disputed';
  /** Market closing time */
  closingTime: string;
}

export interface ClaimableWinning {
  /** Market ID */
  marketId: string;
  /** Market question */
  marketQuestion: string;
  /** Amount claimable in SOL */
  amount: number;
  /** Outcome that won */
  winningOutcome: string;
}

export interface ResolutionStatus {
  /** Market ID */
  marketId: string;
  /** Market question */
  marketQuestion: string;
  /** Whether the market is resolved */
  resolved: boolean;
  /** Winning outcome index */
  winningOutcomeIndex?: number;
  /** Winning outcome label */
  winningOutcomeLabel?: string;
  /** Resolution time */
  resolvedAt?: string;
}
