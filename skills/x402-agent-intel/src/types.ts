export interface Analyst {
  id: number;
  wallet: string;
  name: string;
  affiliateCode: string;
  createdAt: string;
}

export interface AnalystStats {
  totalPredictions: number;
  resolvedPredictions: number;
  correctPredictions: number;
  accuracy: number;
  tier: ReputationTier;
}

export type ReputationTier =
  | 'apprentice'
  | 'analyst'
  | 'expert'
  | 'oracle'
  | 'grandmaster';

export interface Analysis {
  id: number;
  analystId: number;
  marketPda: string;
  thesis: string;
  recommendedSide: string;
  confidence: number;
  priceLamports: string;
  createdAt: string;
  resolved: boolean;
  outcome: string | null;
}

export interface AnalysisListing {
  id: number;
  analyst: string;
  analystWallet: string;
  affiliateCode: string;
  marketPda: string;
  confidence: number;
  recommendedSide: string;
  priceLamports: string;
  tier: ReputationTier;
  accuracy: number;
}

export const REPUTATION_TIERS: {
  tier: ReputationTier;
  minPredictions: number;
  minAccuracy: number;
}[] = [
  { tier: 'grandmaster', minPredictions: 100, minAccuracy: 85 },
  { tier: 'oracle', minPredictions: 50, minAccuracy: 75 },
  { tier: 'expert', minPredictions: 20, minAccuracy: 60 },
  { tier: 'analyst', minPredictions: 10, minAccuracy: 0 },
  { tier: 'apprentice', minPredictions: 1, minAccuracy: 0 },
];

export function getTier(total: number, accuracy: number): ReputationTier {
  for (const t of REPUTATION_TIERS) {
    if (total >= t.minPredictions && accuracy >= t.minAccuracy) {
      return t.tier;
    }
  }
  return 'apprentice';
}
