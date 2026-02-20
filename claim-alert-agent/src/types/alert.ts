/**
 * Alert types for notification system
 */

export type AlertType = 'market_resolved' | 'unclaimed_winnings' | 'closing_soon' | 'odds_shift' | 'new_market';

export interface BaseAlert {
  type: AlertType;
  wallet: string;
  timestamp: string;
  /** Human-readable message */
  message: string;
}

export interface MarketResolvedAlert extends BaseAlert {
  type: 'market_resolved';
  marketId: string;
  marketQuestion: string;
  userOutcome: string;
  winningOutcome: string;
  won: boolean;
  claimAmount?: number;
}

export interface UnclaimedWinningsAlert extends BaseAlert {
  type: 'unclaimed_winnings';
  totalAmount: number;
  marketCount: number;
  markets: Array<{
    marketId: string;
    question: string;
    amount: number;
  }>;
}

export interface ClosingSoonAlert extends BaseAlert {
  type: 'closing_soon';
  marketId: string;
  marketQuestion: string;
  closingTime: string;
  hoursRemaining: number;
  userOutcome: string;
  userStake: number;
  currentProbability: number;
}

export interface OddsShiftAlert extends BaseAlert {
  type: 'odds_shift';
  marketId: string;
  marketQuestion: string;
  outcomeLabel: string;
  previousProbability: number;
  currentProbability: number;
  shiftPercentage: number;
  userOutcome: string;
  userStake: number;
}

export interface NewMarketAlert extends BaseAlert {
  type: 'new_market';
  marketId: string;
  marketQuestion: string;
  matchedKeywords: string[];
  closingTime: string;
  totalPool: number;
}

export type Alert =
  | MarketResolvedAlert
  | UnclaimedWinningsAlert
  | ClosingSoonAlert
  | OddsShiftAlert
  | NewMarketAlert;
