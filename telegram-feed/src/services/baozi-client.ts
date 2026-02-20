import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config';
import { Market, MarketFilter, MarketOutcome } from '../types';

/**
 * Baozi on-chain data client.
 *
 * Reads market data directly from Solana via RPC using the Baozi program's
 * account structure. This is the same data source used by the MCP tools
 * (list_markets, get_quote, etc.) but accessed directly for the bot.
 *
 * Account layout based on Baozi program IDL:
 * - Market accounts: question, outcomes, pool data, timing, status
 * - Race market accounts: multi-outcome variant
 */
export class BaoziClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(rpcUrl?: string, programId?: string) {
    this.connection = new Connection(rpcUrl || config.solanaRpcUrl, 'confirmed');
    this.programId = new PublicKey(programId || config.baoziProgramId);
  }

  /**
   * Fetch all markets matching the given filter.
   * Uses getProgramAccounts with memcmp filters where possible.
   */
  async listMarkets(filter: MarketFilter = {}): Promise<Market[]> {
    try {
      const accounts = await this.connection.getProgramAccounts(this.programId, {
        commitment: 'confirmed',
        filters: [
          // Filter by account size to get market accounts (min size heuristic)
          { dataSize: undefined as unknown as number }, // We'll filter post-fetch
        ].filter(f => f.dataSize !== undefined),
      });

      let markets: Market[] = [];

      for (const { pubkey, account } of accounts) {
        try {
          const market = this.deserializeMarket(pubkey.toBase58(), account.data);
          if (market) {
            markets.push(market);
          }
        } catch {
          // Skip accounts that don't match market layout
          continue;
        }
      }

      // Apply filters
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
   * Get a single market by ID.
   */
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const pubkey = new PublicKey(marketId);
      const accountInfo = await this.connection.getAccountInfo(pubkey, 'confirmed');

      if (!accountInfo || !accountInfo.owner.equals(this.programId)) {
        return null;
      }

      return this.deserializeMarket(marketId, accountInfo.data);
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      return null;
    }
  }

  /**
   * Get quote/odds for a specific market.
   */
  async getQuote(marketId: string): Promise<Market | null> {
    // Quote data is embedded in the market account itself (pari-mutuel)
    return this.getMarket(marketId);
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

  /**
   * Deserialize a market account buffer into a Market object.
   *
   * Baozi market account layout (approximate, based on Anchor conventions):
   * - 8 bytes: discriminator
   * - 32 bytes: authority pubkey
   * - 4 + N bytes: question (borsh string: 4-byte len + UTF-8)
   * - 1 byte: status (0=active, 1=closed, 2=resolved)
   * - 1 byte: layer (0=official, 1=lab, 2=private)
   * - 8 bytes: closing_time (i64, unix timestamp)
   * - 8 bytes: created_at (i64, unix timestamp)
   * - 1 byte: is_race
   * - 4 bytes: num_outcomes
   * - For each outcome:
   *   - 4 + N bytes: label (borsh string)
   *   - 8 bytes: pool (u64, lamports)
   * - 4 + N bytes: category (borsh string, optional)
   * - 8 bytes: total_volume (u64, lamports)
   */
  private deserializeMarket(id: string, data: Buffer): Market | null {
    try {
      if (data.length < 60) return null; // Too small for a market

      let offset = 8; // Skip discriminator

      // Skip authority (32 bytes)
      offset += 32;

      // Read question
      const questionLen = data.readUInt32LE(offset);
      offset += 4;
      if (questionLen > 500 || questionLen === 0) return null;
      const question = data.subarray(offset, offset + questionLen).toString('utf-8');
      offset += questionLen;

      if (offset + 2 > data.length) return null;

      // Status
      const statusByte = data.readUInt8(offset);
      offset += 1;
      const statusMap: Record<number, Market['status']> = {
        0: 'active',
        1: 'closed',
        2: 'resolved',
      };
      const status = statusMap[statusByte] || 'active';

      // Layer
      const layerByte = data.readUInt8(offset);
      offset += 1;
      const layerMap: Record<number, Market['layer']> = {
        0: 'official',
        1: 'lab',
        2: 'private',
      };
      const layer = layerMap[layerByte] || 'lab';

      // Closing time (i64 as seconds)
      if (offset + 8 > data.length) return null;
      const closingTimeSec = Number(data.readBigInt64LE(offset));
      offset += 8;
      const closingTime = new Date(closingTimeSec * 1000).toISOString();

      // Created at
      if (offset + 8 > data.length) return null;
      const createdAtSec = Number(data.readBigInt64LE(offset));
      offset += 8;
      const createdAt = new Date(createdAtSec * 1000).toISOString();

      // Is race
      if (offset + 1 > data.length) return null;
      const isRace = data.readUInt8(offset) === 1;
      offset += 1;

      // Num outcomes
      if (offset + 4 > data.length) return null;
      const numOutcomes = data.readUInt32LE(offset);
      offset += 4;

      if (numOutcomes < 2 || numOutcomes > 20) return null;

      // Read outcomes
      const outcomes: MarketOutcome[] = [];
      let totalPool = 0;

      for (let i = 0; i < numOutcomes; i++) {
        if (offset + 4 > data.length) return null;
        const labelLen = data.readUInt32LE(offset);
        offset += 4;

        if (labelLen > 200 || offset + labelLen + 8 > data.length) return null;
        const label = data.subarray(offset, offset + labelLen).toString('utf-8');
        offset += labelLen;

        // Pool in lamports
        const poolLamports = Number(data.readBigUInt64LE(offset));
        offset += 8;
        const pool = poolLamports / 1e9; // Convert to SOL
        totalPool += pool;

        outcomes.push({
          index: i,
          label: label || (i === 0 ? 'Yes' : 'No'),
          pool,
          probability: 0, // Calculated below
        });
      }

      // Calculate probabilities (pari-mutuel)
      for (const outcome of outcomes) {
        outcome.probability = totalPool > 0 ? outcome.pool / totalPool : 1 / outcomes.length;
      }

      // Try to read category (optional)
      let category: string | undefined;
      if (offset + 4 <= data.length) {
        try {
          const catLen = data.readUInt32LE(offset);
          if (catLen > 0 && catLen < 100 && offset + 4 + catLen <= data.length) {
            offset += 4;
            category = data.subarray(offset, offset + catLen).toString('utf-8');
            offset += catLen;
          }
        } catch {
          // No category
        }
      }

      // Try to read volume
      let volume24h: number | undefined;
      if (offset + 8 <= data.length) {
        try {
          const volLamports = Number(data.readBigUInt64LE(offset));
          volume24h = volLamports / 1e9;
        } catch {
          // No volume data
        }
      }

      return {
        id,
        question,
        status,
        layer,
        category,
        totalPool,
        outcomes,
        closingTime,
        createdAt,
        isRace,
        volume24h,
      };
    } catch {
      return null;
    }
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
