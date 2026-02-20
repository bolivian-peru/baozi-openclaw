/**
 * Market data fetcher — imports directly from @baozi.bet/mcp-server
 * 
 * CRITICAL: Uses direct handler imports, NOT MCP client stubs
 */
import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { PROGRAM_ID, DISCRIMINATORS, RPC_ENDPOINT } from '@baozi.bet/mcp-server/dist/config.js';
import type { MarketCardData, QuoteSnapshot } from '../types/index.js';

// Re-export for convenience
export { PROGRAM_ID, DISCRIMINATORS, RPC_ENDPOINT };

/**
 * Fetch all active markets and convert to card data
 */
export async function fetchActiveMarkets(): Promise<MarketCardData[]> {
  const markets = await listMarkets('Active');
  return markets.map(marketToCardData);
}

/**
 * Fetch all markets (any status) and convert to card data
 */
export async function fetchAllMarkets(status?: string): Promise<MarketCardData[]> {
  const markets = await listMarkets(status);
  return markets.map(marketToCardData);
}

/**
 * Fetch a single market by public key
 */
export async function fetchMarket(publicKey: string): Promise<MarketCardData | null> {
  const market = await getMarket(publicKey);
  if (!market) return null;
  return marketToCardData(market);
}

/**
 * Fetch a quote for a market
 */
export async function fetchQuote(
  marketPubkey: string,
  side: 'Yes' | 'No',
  amountSol: number
): Promise<QuoteSnapshot | null> {
  try {
    const quote = await getQuote(marketPubkey, side, amountSol);
    if (!quote.valid) return null;
    return {
      side: quote.side,
      betAmountSol: quote.betAmountSol,
      expectedPayoutSol: quote.expectedPayoutSol,
      potentialProfitSol: quote.potentialProfitSol,
      impliedOdds: quote.impliedOdds,
      decimalOdds: quote.decimalOdds,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch top markets by pool size (most liquid)
 */
export async function fetchTopMarkets(limit: number = 10): Promise<MarketCardData[]> {
  const markets = await fetchActiveMarkets();
  return markets
    .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
    .slice(0, limit);
}

/**
 * Fetch trending markets (most recent bets + high volume)
 */
export async function fetchTrendingMarkets(limit: number = 5): Promise<MarketCardData[]> {
  const markets = await fetchActiveMarkets();
  // Score by pool size and betting activity
  return markets
    .filter(m => m.hasBets && m.isBettingOpen)
    .sort((a, b) => b.totalPoolSol - a.totalPoolSol)
    .slice(0, limit);
}

/**
 * Convert MCP Market to MarketCardData
 */
function marketToCardData(market: {
  publicKey: string;
  marketId: string;
  question: string;
  yesPercent: number;
  noPercent: number;
  yesPoolSol: number;
  noPoolSol: number;
  totalPoolSol: number;
  status: string;
  closingTime: string;
  layer: string;
  currencyType: string;
  hasBets: boolean;
  isBettingOpen: boolean;
  creator: string;
}): MarketCardData {
  return {
    publicKey: market.publicKey,
    marketId: market.marketId,
    question: market.question,
    yesPercent: market.yesPercent,
    noPercent: market.noPercent,
    yesPoolSol: market.yesPoolSol,
    noPoolSol: market.noPoolSol,
    totalPoolSol: market.totalPoolSol,
    status: market.status,
    closingTime: market.closingTime,
    layer: market.layer,
    currencyType: market.currencyType,
    hasBets: market.hasBets,
    isBettingOpen: market.isBettingOpen,
    creator: market.creator,
  };
}
