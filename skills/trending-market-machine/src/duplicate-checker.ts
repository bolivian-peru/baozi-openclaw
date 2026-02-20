/**
 * Duplicate Checker — Cross-references proposals against existing Baozi markets
 *
 * Checks both our local DB and the live Baozi REST API to prevent duplicates.
 */
import axios from 'axios';
import { config } from './config';
import { isDuplicate as isLocalDuplicate } from './tracker';

interface BaoziMarket {
  publicKey: string;
  question: string;
  status: string;
  isBettingOpen: boolean;
}

let cachedMarkets: BaoziMarket[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all markets from Baozi REST API
 */
async function fetchBaoziMarkets(): Promise<BaoziMarket[]> {
  if (Date.now() - cacheTimestamp < CACHE_TTL && cachedMarkets.length > 0) {
    return cachedMarkets;
  }

  try {
    const response = await axios.get(`${config.apiUrl}/markets`, { timeout: 10000 });
    if (response.data.success) {
      const binary = (response.data.data.binary || []).map((m: any) => ({
        publicKey: m.publicKey,
        question: m.question,
        status: m.status,
        isBettingOpen: m.isBettingOpen,
      }));
      const race = (response.data.data.race || []).map((m: any) => ({
        publicKey: m.publicKey,
        question: m.question,
        status: m.status,
        isBettingOpen: true,
      }));
      cachedMarkets = [...binary, ...race];
      cacheTimestamp = Date.now();
      return cachedMarkets;
    }
  } catch (err: any) {
    console.error(`Failed to fetch Baozi markets: ${err.message}`);
  }
  return cachedMarkets; // Return stale cache if fetch fails
}

/**
 * Normalize a question for comparison
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 */
function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return 1.0;

  // Check containment
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  // Word overlap (Jaccard)
  const wordsA = new Set(normA.split(' '));
  const wordsB = new Set(normB.split(' '));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

/**
 * Check if a proposed question is too similar to any existing market
 */
export async function isMarketDuplicate(question: string): Promise<{
  isDuplicate: boolean;
  reason?: string;
  similarMarket?: string;
}> {
  // 1. Check local DB first (fast)
  if (isLocalDuplicate(question)) {
    return { isDuplicate: true, reason: 'Exists in local database' };
  }

  // 2. Check live Baozi markets
  const markets = await fetchBaoziMarkets();
  for (const market of markets) {
    const sim = similarity(question, market.question);
    if (sim > 0.7) {
      return {
        isDuplicate: true,
        reason: `Similar to existing market (${(sim * 100).toFixed(0)}% match)`,
        similarMarket: market.question,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Filter proposals, removing duplicates
 */
export async function filterDuplicates(
  proposals: Array<{ question: string; [key: string]: any }>
): Promise<Array<{ question: string; [key: string]: any }>> {
  const filtered = [];
  for (const p of proposals) {
    const check = await isMarketDuplicate(p.question);
    if (!check.isDuplicate) {
      filtered.push(p);
    } else {
      console.log(`  🔄 Skipping duplicate: "${p.question}" — ${check.reason}`);
    }
  }
  return filtered;
}
