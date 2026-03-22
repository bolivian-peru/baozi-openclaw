/**
 * Market Reader
 *
 * Parses raw MCP responses into typed Market objects and
 * categorizes them by market conditions.
 */
import { listMarkets } from './mcp-client.js';
import type { Market, CategorizedMarkets } from '../types/index.js';
import { hoursUntil, daysUntil } from '../utils/helpers.js';

/**
 * Parse a raw market object from the MCP server into a typed Market.
 */
export function parseMarket(raw: any): Market | null {
  try {
    // The MCP server returns markets with closingTime and pool fields
    const endTime = new Date(raw.closingTime || raw.endTime || raw.end_time || 0);
    const totalPool = raw.pool?.total ?? raw.totalPool ?? 0;

    const outcomes: Market['outcomes'] = (raw.outcomes || []).map((o: any) => ({
      label: o.label || o.name || `outcome ${o.index ?? 0}`,
      probability: typeof o.probability === 'number' ? o.probability : 0,
      pool: typeof o.pool === 'number' ? o.pool : 0,
    }));

    return {
      pda: raw.pda || raw.publicKey || raw.id || '',
      question: raw.question || raw.title || 'unknown market',
      endTime,
      totalPool,
      outcomes,
      category: raw.category,
      status: raw.status,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch and parse all active markets from the MCP server.
 */
export async function fetchActiveMarkets(): Promise<Market[]> {
  const result = await listMarkets({ status: 'active' });
  if (!result.success || !result.data) {
    console.error('night-kitchen: failed to fetch markets:', result.error);
    return [];
  }

  const raw = Array.isArray(result.data) ? result.data : result.data.markets ?? [];
  const parsed: Market[] = [];

  for (const item of raw) {
    const market = parseMarket(item);
    if (market && market.pda) {
      parsed.push(market);
    }
  }

  return parsed;
}

/**
 * Categorize markets by condition.
 *
 * - closingSoon: ends within 24 hours
 * - longDated: ends more than 7 days away
 * - highStakes: total pool > 10 SOL
 * - balanced: at least one outcome between 30-70% probability
 */
export function categorizeMarkets(markets: Market[]): CategorizedMarkets {
  const closingSoon: Market[] = [];
  const longDated: Market[] = [];
  const highStakes: Market[] = [];
  const balanced: Market[] = [];

  for (const m of markets) {
    const hours = hoursUntil(m.endTime);
    const days = daysUntil(m.endTime);

    if (hours > 0 && hours <= 24) {
      closingSoon.push(m);
    }
    if (days > 7) {
      longDated.push(m);
    }
    if (m.totalPool > 10) {
      highStakes.push(m);
    }

    const hasBalancedOdds = m.outcomes.some((o) => {
      const pct = o.probability <= 1 ? o.probability * 100 : o.probability;
      return pct >= 30 && pct <= 70;
    });
    if (hasBalancedOdds) {
      balanced.push(m);
    }
  }

  // Sort closing soon by soonest first
  closingSoon.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

  // Sort high stakes by largest pool first
  highStakes.sort((a, b) => b.totalPool - a.totalPool);

  return { closingSoon, longDated, highStakes, balanced, all: markets };
}

/**
 * Fetch and categorize markets in one call.
 */
export async function fetchAndCategorize(): Promise<CategorizedMarkets> {
  const markets = await fetchActiveMarkets();
  return categorizeMarkets(markets);
}
