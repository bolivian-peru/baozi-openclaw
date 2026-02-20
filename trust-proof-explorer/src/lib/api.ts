import { useState, useEffect } from 'react';

export interface MarketResolution {
  pda: string;
  source: string;
  outcome: string;
  evidence: string;
  question: string;
}

export interface ProofBatch {
  id: number;
  date: string;
  slug: string;
  title: string;
  layer: 'official' | 'labs';
  tier: number;
  category: string;
  markets: MarketResolution[];
  rawMarkdown: string | null;
  sourceUrls: string[];
  resolvedBy: string;
  createdAt: string;
}

export interface OracleStats {
  totalProofs: number;
  totalMarkets: number;
  byLayer: {
    official: number;
    labs: number;
  };
}

export interface ApiResponse {
  success: boolean;
  oracle: any;
  proofs: ProofBatch[];
  stats: OracleStats;
}

export function useProofs() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('https://baozi.bet/api/agents/proofs');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}
