/**
 * Unit tests for BaoziClient using mocked MCP handlers.
 */
import { jest } from '@jest/globals';

// Mock the MCP server modules before importing BaoziClient
const mockListMarkets = jest.fn<() => Promise<any[]>>();
const mockGetMarket = jest.fn<() => Promise<any>>();
const mockGetQuote = jest.fn<() => Promise<any>>();

jest.unstable_mockModule('@baozi.bet/mcp-server/dist/handlers/markets.js', () => ({
  listMarkets: mockListMarkets,
  getMarket: mockGetMarket,
}));

jest.unstable_mockModule('@baozi.bet/mcp-server/dist/handlers/quote.js', () => ({
  getQuote: mockGetQuote,
}));

jest.unstable_mockModule('@baozi.bet/mcp-server/dist/config.js', () => ({
  PROGRAM_ID: { toBase58: () => 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ' },
  RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
  MARKET_STATUS: { ACTIVE: 0, CLOSED: 1, RESOLVED: 2 },
}));

jest.unstable_mockModule('../src/config', () => ({
  config: {
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    baoziProgramId: 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',
    maxMarketsPerPage: 5,
    baoziBaseUrl: 'https://baozi.bet',
    dataDir: './data',
  },
}));

// Helper to create a mock MCP market
function makeMcpMarket(overrides: Record<string, any> = {}) {
  return {
    publicKey: 'ABC123market',
    marketId: '1',
    question: 'Will BTC hit $120K by March?',
    closingTime: new Date(Date.now() + 2 * 86400000).toISOString(),
    resolutionTime: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'Active',
    statusCode: 0,
    winningOutcome: null,
    currencyType: 'Sol',
    yesPoolSol: 9.5,
    noPoolSol: 5.5,
    totalPoolSol: 15,
    yesPercent: 63.33,
    noPercent: 36.67,
    platformFeeBps: 250,
    layer: 'Official',
    layerCode: 0,
    accessGate: 'Public',
    creator: 'CreatorPubkey123',
    hasBets: true,
    isBettingOpen: true,
    creatorFeeBps: 50,
    ...overrides,
  };
}

const { BaoziClient } = await import('../src/services/baozi-client');

describe('BaoziClient', () => {
  let client: InstanceType<typeof BaoziClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new BaoziClient();
  });

  describe('static methods', () => {
    it('returns the correct program ID', () => {
      expect(BaoziClient.getProgramId()).toBe('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
    });

    it('returns the RPC endpoint', () => {
      expect(BaoziClient.getRpcEndpoint()).toBe('https://api.mainnet-beta.solana.com');
    });
  });

  describe('listMarkets', () => {
    it('returns empty array when no markets found', async () => {
      mockListMarkets.mockResolvedValue([]);
      const markets = await client.listMarkets();
      expect(markets).toEqual([]);
    });

    it('converts MCP markets to internal format', async () => {
      mockListMarkets.mockResolvedValue([makeMcpMarket()]);
      const markets = await client.listMarkets();

      expect(markets.length).toBe(1);
      expect(markets[0].id).toBe('ABC123market');
      expect(markets[0].question).toBe('Will BTC hit $120K by March?');
      expect(markets[0].status).toBe('active');
      expect(markets[0].layer).toBe('official');
      expect(markets[0].totalPool).toBe(15);
      expect(markets[0].outcomes.length).toBe(2);
      expect(markets[0].outcomes[0].label).toBe('Yes');
      expect(markets[0].outcomes[1].label).toBe('No');
    });

    it('calculates correct probabilities from pool sizes', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ yesPoolSol: 75, noPoolSol: 25, totalPoolSol: 100 }),
      ]);
      const markets = await client.listMarkets();
      expect(markets[0].outcomes[0].probability).toBeCloseTo(0.75, 2);
      expect(markets[0].outcomes[1].probability).toBeCloseTo(0.25, 2);
    });

    it('handles 50/50 when pool is zero', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ yesPoolSol: 0, noPoolSol: 0, totalPoolSol: 0 }),
      ]);
      const markets = await client.listMarkets();
      expect(markets[0].outcomes[0].probability).toBe(0.5);
      expect(markets[0].outcomes[1].probability).toBe(0.5);
    });

    it('applies status filter', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ status: 'Active' }),
        makeMcpMarket({ status: 'Resolved', publicKey: 'resolved1' }),
      ]);
      const markets = await client.listMarkets({ status: 'active' });
      expect(markets.every(m => m.status === 'active')).toBe(true);
    });

    it('applies limit', async () => {
      mockListMarkets.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) =>
          makeMcpMarket({ publicKey: `market${i}`, yesPoolSol: 10 - i, noPoolSol: i, totalPoolSol: 10 })
        ),
      );
      const markets = await client.listMarkets({ limit: 3 });
      expect(markets.length).toBe(3);
    });

    it('sorts by pool descending', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ publicKey: 'small', totalPoolSol: 5, yesPoolSol: 3, noPoolSol: 2 }),
        makeMcpMarket({ publicKey: 'large', totalPoolSol: 100, yesPoolSol: 60, noPoolSol: 40 }),
        makeMcpMarket({ publicKey: 'medium', totalPoolSol: 50, yesPoolSol: 25, noPoolSol: 25 }),
      ]);
      const markets = await client.listMarkets({ sortBy: 'pool' });
      expect(markets[0].id).toBe('large');
      expect(markets[1].id).toBe('medium');
      expect(markets[2].id).toBe('small');
    });

    it('sorts by closing time ascending', async () => {
      const now = Date.now();
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ publicKey: 'far', closingTime: new Date(now + 7 * 86400000).toISOString() }),
        makeMcpMarket({ publicKey: 'near', closingTime: new Date(now + 1 * 86400000).toISOString() }),
        makeMcpMarket({ publicKey: 'mid', closingTime: new Date(now + 3 * 86400000).toISOString() }),
      ]);
      const markets = await client.listMarkets({ sortBy: 'closing' });
      expect(markets[0].id).toBe('near');
      expect(markets[1].id).toBe('mid');
      expect(markets[2].id).toBe('far');
    });

    it('applies query filter', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ question: 'Will BTC hit $120K?' }),
        makeMcpMarket({ publicKey: 'eth1', question: 'Will ETH hit $10K?' }),
      ]);
      const markets = await client.listMarkets({ query: 'ETH' });
      expect(markets.length).toBe(1);
      expect(markets[0].question).toContain('ETH');
    });

    it('handles errors gracefully', async () => {
      mockListMarkets.mockRejectedValue(new Error('RPC timeout'));
      const markets = await client.listMarkets();
      expect(markets).toEqual([]);
    });

    it('maps closed/cancelled/paused statuses correctly', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ status: 'Closed', publicKey: 'c1' }),
        makeMcpMarket({ status: 'Cancelled', publicKey: 'c2' }),
        makeMcpMarket({ status: 'Paused', publicKey: 'c3' }),
      ]);
      const markets = await client.listMarkets();
      expect(markets.every(m => m.status === 'closed')).toBe(true);
    });

    it('maps resolved status correctly', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ status: 'Resolved', winningOutcome: 'Yes' }),
      ]);
      const markets = await client.listMarkets();
      expect(markets[0].status).toBe('resolved');
      expect(markets[0].resolution).toBe('Yes');
    });

    it('maps layer values correctly', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ layer: 'Official', publicKey: 'o' }),
        makeMcpMarket({ layer: 'Lab', publicKey: 'l' }),
        makeMcpMarket({ layer: 'Private', publicKey: 'p' }),
      ]);
      const markets = await client.listMarkets();
      expect(markets.find(m => m.id === 'o')?.layer).toBe('official');
      expect(markets.find(m => m.id === 'l')?.layer).toBe('lab');
      expect(markets.find(m => m.id === 'p')?.layer).toBe('private');
    });

    it('applies layer filter', async () => {
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({ layer: 'Official', publicKey: 'o' }),
        makeMcpMarket({ layer: 'Lab', publicKey: 'l' }),
      ]);
      const markets = await client.listMarkets({ layer: 'official' });
      expect(markets.length).toBe(1);
      expect(markets[0].layer).toBe('official');
    });
  });

  describe('getMarket', () => {
    it('returns null for non-existent market', async () => {
      mockGetMarket.mockResolvedValue(null);
      const market = await client.getMarket('nonexistent');
      expect(market).toBeNull();
    });

    it('returns converted market for valid ID', async () => {
      mockGetMarket.mockResolvedValue(makeMcpMarket({ publicKey: 'validMarket' }));
      const market = await client.getMarket('validMarket');
      expect(market).not.toBeNull();
      expect(market?.id).toBe('validMarket');
      expect(market?.question).toBe('Will BTC hit $120K by March?');
    });

    it('handles errors gracefully', async () => {
      mockGetMarket.mockRejectedValue(new Error('Network error'));
      const market = await client.getMarket('broken');
      expect(market).toBeNull();
    });
  });

  describe('getQuote', () => {
    it('returns null for non-existent market', async () => {
      mockGetMarket.mockResolvedValue(null);
      const quote = await client.getQuote('nonexistent');
      expect(quote).toBeNull();
    });

    it('returns market data as quote', async () => {
      mockGetMarket.mockResolvedValue(makeMcpMarket());
      const quote = await client.getQuote('test');
      expect(quote).not.toBeNull();
      expect(quote?.outcomes.length).toBe(2);
    });
  });

  describe('getBetQuote', () => {
    it('calls MCP getQuote with correct parameters', async () => {
      const mockQuoteResult = {
        valid: true,
        market: 'testMarket',
        side: 'Yes' as const,
        betAmountSol: 1,
        expectedPayoutSol: 1.5,
        potentialProfitSol: 0.5,
        impliedOdds: 0.67,
        decimalOdds: 1.5,
        feeSol: 0.025,
        feeBps: 250,
        warnings: [],
        newYesPoolSol: 10.5,
        newNoPoolSol: 5.5,
        currentYesPercent: 63,
        currentNoPercent: 37,
        newYesPercent: 65.6,
        newNoPercent: 34.4,
      };
      mockGetQuote.mockResolvedValue(mockQuoteResult);

      const quote = await client.getBetQuote('testMarket', 'Yes', 1);
      expect(mockGetQuote).toHaveBeenCalledWith('testMarket', 'Yes', 1);
      expect(quote.valid).toBe(true);
      expect(quote.expectedPayoutSol).toBe(1.5);
    });
  });

  describe('getClosingMarkets', () => {
    it('returns empty array when no markets', async () => {
      mockListMarkets.mockResolvedValue([]);
      const markets = await client.getClosingMarkets(24);
      expect(markets).toEqual([]);
    });

    it('filters markets closing within the specified hours', async () => {
      const now = Date.now();
      mockListMarkets.mockResolvedValue([
        makeMcpMarket({
          publicKey: 'closing-soon',
          closingTime: new Date(now + 12 * 3600000).toISOString(),
        }),
        makeMcpMarket({
          publicKey: 'closing-later',
          closingTime: new Date(now + 48 * 3600000).toISOString(),
        }),
      ]);
      const markets = await client.getClosingMarkets(24);
      expect(markets.length).toBe(1);
      expect(markets[0].id).toBe('closing-soon');
    });
  });

  describe('getHotMarkets', () => {
    it('returns empty array when no markets', async () => {
      mockListMarkets.mockResolvedValue([]);
      const markets = await client.getHotMarkets(5);
      expect(markets).toEqual([]);
    });
  });

  describe('getNewMarkets', () => {
    it('returns empty array when no markets', async () => {
      mockListMarkets.mockResolvedValue([]);
      const markets = await client.getNewMarkets();
      expect(markets).toEqual([]);
    });
  });

  describe('getResolvedMarkets', () => {
    it('returns empty array when no markets', async () => {
      mockListMarkets.mockResolvedValue([]);
      const markets = await client.getResolvedMarkets();
      expect(markets).toEqual([]);
    });
  });
});
