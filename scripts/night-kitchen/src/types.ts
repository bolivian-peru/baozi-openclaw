export interface ProofMarket {
  pda: string;
  question: string;
  outcome: string;
  evidence: string;
  source: string;
}

export interface ProofBatch {
  id: number;
  date: string;
  title: string;
  layer: string;
  tier: number;
  category: string;
  markets: ProofMarket[];
}

export interface ProofApiResponse {
  success: boolean;
  proofs: ProofBatch[];
}

export interface MarketSnapshot {
  question: string;
  yesPercent: number;
  noPercent: number;
  poolSol: number;
  closingLabel: string;
  category: string;
}

export interface Proverb {
  zh: string;
  en: string;
  mode: "patience" | "risk" | "luck" | "warmth";
}
