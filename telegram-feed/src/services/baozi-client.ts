/**
 * Baozi on-chain data client.
 *
 * Uses the @baozi.bet/mcp-server handlers directly to fetch real market data
 * from Solana mainnet. This ensures we use the exact same deserialization
 * logic and program ID as the official MCP tools.
 */
import {
  listMarkets as mcpListMarkets,
  getMarket as mcpGetMarket,
  type Market as McpMarket,
} from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import {
  getQuote as mcpGetQuote,
  type Quote as McpQuote,
} from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import {
  PROGRAM_ID,
  RPC_ENDPOINT,
  MARKET_STATUS,
} from '@baozi.bet/mcp-server/dist/config.js';
import { config } from '../config';
import { Market, MarketFilter, MarketOutcome } from '../types';

/**
 * Convert an MCP Market into our internal Market type used by the bot.
 */
function toInternalMarket(m: McpMarket): Market {
  const totalPool = m.totalPoolSol;
  const yesProb = totalPool > 0 ? m.yesPoolSol / totalPool : 0.5;
  const noProb = totalPool > 0 ? m.noPoolSol / totalPool : 0.5;

  const outcomes: MarketOutcome[] = [
    { index: 0, label: 'Yes', pool: m.yesPoolSol, probability: yesProb },
    { index: 1, label: 'No', pool: m.noPoolSol, probability: noProb },
  ];

  // Map status string to our enum
  const statusLower = m.status.toLowerCase();
  let status: Market['status'] = 'active';
  if (statusLower === 'resolved' || statusLower === 'resolved_pending') {
    status = 'resolved';
  } else if (statusLower === 'closed' || statusLower === 'cancelled' || statusLower === 'paused') {
    status = 'closed';
  }

  // Map layer
  const layerLower = m.layer.toLowerCase();
  let layer: Market['layer'] = 'lab';
  if (layerLower === 'official') layer = 'official';
  else if (layerLower === 'private') layer = 'private';

  return {
    id: m.publicKey,
    question: m.question,
    status,
    layer,
    totalPool,
    outcomes,
    closingTime: m.closingTime,
    createdAt: m.closingTime, // MCP doesn't expose createdAt, use closingTime as proxy
    isRace: false,
    resolution: m.winningOutcome ?? undefined,
    volume24h: undefined, // Not available from MCP market data
  };
}

export class BaoziClient {
  /**
   * Returns the program ID used by the MCP server (for verification).
   */
  static getProgramId(): string {
    return PROGRAM_ID.toBase58();
  }

  /**
   * Returns the RPC endpoint used by the MCP server.
   */
  static getRpcEndpoint(): string {
    return RPC_ENDPOINT;
  }

  /**
   * Fetch all markets matching the given filter.
   * Uses the MCP server's listMarkets handler directly.
   */
  async listMarkets(filter: MarketFilter = {}): Promise<Market[]> {
    try {
      // Map our status filter to MCP's expected format
      let mcpStatus: string | undefined;
      if (filter.status === 'active') mcpStatus = 'Active';
      else if (filter.status === 'closed') mcpStatus = 'Closed';
      // 'all' or undefined = no filter

      const mcpMarkets = await mcpListMarkets(mcpStatus);
      let markets = mcpMarkets.map(toInternalMarket);

      // Apply additional filters
      markets = this.applyFilters(markets, filter);

      // Sort
      markets = this.sortMarkets(markets, filter.sortBy || 'pool');

      // Limit
      const limit = filter.limit || config.maxMarketsPerPage;
      return markets.slice(0, limit);
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  /**
   * Get a single market by public key.
   */
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const mcpMarket = await mcpGetMarket(marketId);
      if (!mcpMarket) return null;
      return toInternalMarket(mcpMarket);
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      return null;
    }
  }

  /**
   * Get quote/odds for a specific market.
   * Returns market data with current odds.
   */
  async getQuote(marketId: string): Promise<Market | null> {
    return this.getMarket(marketId);
  }

  /**
   * Get a detailed quote for a bet (amount + side).
   */
  async getBetQuote(marketId: string, side: 'Yes' | 'No', amountSol: number): Promise<McpQuote> {
    return mcpGetQuote(marketId, side, amountSol);
  }

  /**
   * Get markets closing within the specified hours.
   */
  async getClosingMarkets(withinHours: number = 24): Promise<Market[]> {
    const markets = await this.listMarkets({ status: 'active', limit: 50 });
    const cutoff = Date.now() + withinHours * 60 * 60 * 1000;

    return markets
      .filter(m => {
        const closeTime = new Date(m.closingTime).getTime();
        return closeTime > Date.now() && closeTime <= cutoff;
      })
      .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());
  }

  /**
   * Get markets sorted by volume/pool (hottest markets).
   */
  async getHotMarkets(limit: number = 5): Promise<Market[]> {
    return this.listMarkets({ status: 'active', sortBy: 'pool', limit });
  }

  /**
   * Get recently created markets.
   */
  async getNewMarkets(limit: number = 5): Promise<Market[]> {
    return this.listMarkets({ status: 'active', sortBy: 'created', limit });
  }

  /**
   * Get recently resolved markets.
   */
  async getResolvedMarkets(limit: number = 5): Promise<Market[]> {
    return this.listMarkets({ status: 'closed', sortBy: 'created', limit });
  }

  private applyFilters(markets: Market[], filter: MarketFilter): Market[] {
    return markets.filter(m => {
      if (filter.status && filter.status !== 'all' && m.status !== filter.status) return false;
      if (filter.layer && filter.layer !== 'all' && m.layer !== filter.layer) return false;
      if (filter.category && m.category?.toLowerCase() !== filter.category.toLowerCase()) return false;
      if (filter.query) {
        const q = filter.query.toLowerCase();
        if (!m.question.toLowerCase().includes(q) && !m.category?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  private sortMarkets(markets: Market[], sortBy: string): Market[] {
    return [...markets].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return (b.volume24h || 0) - (a.volume24h || 0);
        case 'closing':
          return new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'pool':
        default:
          return b.totalPool - a.totalPool;
      }
    });
  }
}
