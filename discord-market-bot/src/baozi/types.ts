/**
 * Baozi market types
 */

export interface Market {
  publicKey: string;
  marketId: string;
  question: string;
  closingTime: string;
  resolutionTime: string;
  status: string;
  statusCode: number;
  winningOutcome: string | null;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  yesPercent: number;
  noPercent: number;
  platformFeeBps: number;
  layer: string;
  layerCode: number;
  creator: string;
  hasBets: boolean;
  isBettingOpen: boolean;
}

export interface RaceOutcome {
  index: number;
  label: string;
  poolSol: number;
  percent: number;
}

export interface RaceMarket {
  publicKey: string;
  marketId: string;
  question: string;
  outcomes: RaceOutcome[];
  closingTime: string;
  resolutionTime: string;
  status: string;
  statusCode: number;
  winningOutcomeIndex: number | null;
  totalPoolSol: number;
  layer: string;
  layerCode: number;
  creator: string;
  platformFeeBps: number;
  isBettingOpen: boolean;
}

export interface Position {
  publicKey: string;
  user: string;
  marketId: string;
  yesAmountSol: number;
  noAmountSol: number;
  totalAmountSol: number;
  side: 'Yes' | 'No' | 'Both';
  claimed: boolean;
  // Enriched
  marketPda?: string;
  marketQuestion?: string;
  marketStatus?: string;
  marketOutcome?: string | null;
}

export interface PositionSummary {
  wallet: string;
  totalPositions: number;
  totalBetSol: number;
  activePositions: number;
  winningPositions: number;
  losingPositions: number;
  pendingPositions: number;
  positions: Position[];
}
