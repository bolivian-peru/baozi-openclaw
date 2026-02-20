import { BaoziClient } from '../src/services/baozi-client';

// Mock config
jest.mock('../src/config', () => ({
  config: {
    solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
    baoziProgramId: 'BAoZirE2cAXqyjRap2GiGdAFkSB2nQJrPMBb6KMFj2gn',
    maxMarketsPerPage: 5,
  },
}));

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => {
  const mockPublicKey = jest.fn().mockImplementation((key: string) => ({
    toBase58: () => key,
    equals: (other: any) => key === other.toBase58(),
  }));

  return {
    Connection: jest.fn().mockImplementation(() => ({
      getProgramAccounts: jest.fn().mockResolvedValue([]),
      getAccountInfo: jest.fn().mockResolvedValue(null),
    })),
    PublicKey: mockPublicKey,
  };
});

describe('BaoziClient', () => {
  let client: BaoziClient;

  beforeEach(() => {
    client = new BaoziClient();
  });

  describe('listMarkets', () => {
    it('returns empty array when no markets found', async () => {
      const markets = await client.listMarkets();
      expect(markets).toEqual([]);
    });

    it('accepts filter parameters', async () => {
      const markets = await client.listMarkets({
        status: 'active',
        category: 'crypto',
        limit: 3,
      });
      expect(Array.isArray(markets)).toBe(true);
    });
  });

  describe('getMarket', () => {
    it('returns null for non-existent market', async () => {
      const market = await client.getMarket('11111111111111111111111111111111');
      expect(market).toBeNull();
    });
  });

  describe('getQuote', () => {
    it('returns null for non-existent market', async () => {
      const quote = await client.getQuote('11111111111111111111111111111111');
      expect(quote).toBeNull();
    });
  });

  describe('getClosingMarkets', () => {
    it('returns empty array when no markets', async () => {
      const markets = await client.getClosingMarkets(24);
      expect(markets).toEqual([]);
    });
  });

  describe('getHotMarkets', () => {
    it('returns empty array when no markets', async () => {
      const markets = await client.getHotMarkets(5);
      expect(markets).toEqual([]);
    });
  });

  describe('getNewMarkets', () => {
    it('returns empty array when no markets', async () => {
      const markets = await client.getNewMarkets();
      expect(markets).toEqual([]);
    });
  });

  describe('getResolvedMarkets', () => {
    it('returns empty array when no markets', async () => {
      const markets = await client.getResolvedMarkets();
      expect(markets).toEqual([]);
    });
  });
});
