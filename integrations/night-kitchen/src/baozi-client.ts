import https from 'https';

export interface BooleanMarket {
  pda: string;
  question: string;
  yesPool: number;
  noPool: number;
  totalPool: number;
  status: 'Active' | 'Resolved' | 'Closed';
  closingTime: string;
  resolved?: boolean;
  outcome?: 'Yes' | 'No';
}

export interface RaceMarket {
  pda: string;
  question: string;
  options: Array<{ label: string; pool: number; odds: number }>;
  totalPool: number;
  status: 'Active' | 'Resolved' | 'Closed';
  closingTime: string;
}

function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data) as T); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const BASE = 'https://baozi.bet/api';

export async function listActiveMarkets(): Promise<BooleanMarket[]> {
  const response = await fetchJson<{ markets?: BooleanMarket[]; data?: BooleanMarket[] }>(
    `${BASE}/markets?status=Active&limit=50`
  );
  return (response.markets ?? response.data ?? []);
}

export async function listActiveRaceMarkets(): Promise<RaceMarket[]> {
  const response = await fetchJson<{ markets?: RaceMarket[]; data?: RaceMarket[] }>(
    `${BASE}/race-markets?status=Active&limit=20`
  );
  return (response.markets ?? response.data ?? []);
}

export function computeOdds(market: BooleanMarket): { yes: number; no: number } {
  const total = market.yesPool + market.noPool;
  if (total === 0) return { yes: 50, no: 50 };
  return {
    yes: Math.round((market.yesPool / total) * 100),
    no: Math.round((market.noPool / total) * 100),
  };
}

export function daysUntilClose(closingTime: string): number {
  const now = Date.now();
  const close = new Date(closingTime).getTime();
  return Math.max(0, Math.round((close - now) / (1000 * 60 * 60 * 24)));
}
