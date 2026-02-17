export interface Market {
  publicKey: string;
  marketId: string;
  question: string;
  closingTime: Date;
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
  closingTime: Date;
  status: string;
  statusCode: number;
  winningOutcomeIndex: number | null;
  totalPoolSol: number;
  layer: string;
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
}

export interface RacePosition {
  publicKey: string;
  user: string;
  raceMarketPda: string;
  marketId: string;
  outcomeIndex: number;
  amountSol: number;
  claimed: boolean;
}
