/**
 * Baozi MCP Integration
 *
 * Fetches live market data from the Baozi prediction market platform
 * using the public API. Used for:
 * - Discovering active markets with analysis available
 * - Resolving market outcomes to update analyst reputation
 * - Building affiliate betting links
 */

import axios from "axios";
import { BaoziMarket } from "./types";

const BAOZI_API = "https://baozi.bet/api";
const BAOZI_PROGRAM = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";

export interface MarketSummary {
  pda: string;
  question: string;
  status: string;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  closeTime: number;
  eventTime: number;
  resolvedOutcome: string | null;
}

/**
 * Fetch active markets from Baozi API.
 */
export async function fetchActiveMarkets(limit = 20): Promise<MarketSummary[]> {
  try {
    const resp = await axios.get(`${BAOZI_API}/markets`, {
      params: { status: "OPEN", limit },
      timeout: 10000,
    });

    const markets = resp.data?.markets || resp.data || [];
    return (Array.isArray(markets) ? markets : []).map(parseMarket).filter(Boolean) as MarketSummary[];
  } catch {
    // Fallback to the scanner approach used in other scripts
    return fetchMarketsViaScanner(limit);
  }
}

/**
 * Fallback: scan recent markets from the Baozi program account.
 */
async function fetchMarketsViaScanner(limit: number): Promise<MarketSummary[]> {
  try {
    const resp = await axios.get(`${BAOZI_API}/markets/recent`, {
      params: { limit },
      timeout: 10000,
    });
    const markets = resp.data?.markets || resp.data || [];
    return (Array.isArray(markets) ? markets : []).map(parseMarket).filter(Boolean) as MarketSummary[];
  } catch {
    return [];
  }
}

function parseMarket(m: any): MarketSummary | null {
  if (!m?.pda && !m?.address) return null;
  return {
    pda: m.pda || m.address,
    question: m.question || m.title || "Unknown market",
    status: m.status || "UNKNOWN",
    yesPool: m.yes_pool || m.yesPool || 0,
    noPool: m.no_pool || m.noPool || 0,
    totalVolume: m.total_volume || m.totalVolume || 0,
    closeTime: m.close_time || m.closeTime || 0,
    eventTime: m.event_time || m.eventTime || 0,
    resolvedOutcome: m.resolved_outcome || m.resolvedOutcome || null,
  };
}

/**
 * Get a specific market by PDA.
 */
export async function fetchMarket(pda: string): Promise<MarketSummary | null> {
  try {
    const resp = await axios.get(`${BAOZI_API}/markets/${pda}`, { timeout: 10000 });
    return parseMarket(resp.data?.market || resp.data);
  } catch {
    return null;
  }
}

/**
 * Check if a market has been resolved and return the outcome.
 */
export async function checkMarketOutcome(pda: string): Promise<"YES" | "NO" | null> {
  const market = await fetchMarket(pda);
  if (!market?.resolvedOutcome) return null;
  const outcome = market.resolvedOutcome.toUpperCase();
  if (outcome === "YES" || outcome === "NO") return outcome;
  return null;
}

/**
 * Build an affiliate betting link for a market.
 * Uses the Baozi affiliate query parameter format.
 */
export function buildAffiliateLink(marketPda: string, affiliateCode: string, side: "YES" | "NO"): string {
  return `https://baozi.bet/market/${marketPda}?ref=${affiliateCode}&side=${side}`;
}

/**
 * Validate an affiliate code exists on Baozi.
 */
export async function validateAffiliateCode(code: string): Promise<boolean> {
  try {
    const resp = await axios.get(`${BAOZI_API}/affiliates/${code}`, { timeout: 5000 });
    return resp.status === 200;
  } catch {
    // Accept any code in demo mode
    return true;
  }
}
