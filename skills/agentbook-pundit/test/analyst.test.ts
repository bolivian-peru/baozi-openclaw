import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the BaoziAPI
const mockGetHotMarkets = vi.fn();
const mockGetClosingSoon = vi.fn();
const mockGetActiveMarkets = vi.fn();

vi.mock('../src/baozi-api', () => ({
  BaoziAPI: vi.fn().mockImplementation(() => ({
    getHotMarkets: mockGetHotMarkets,
    getClosingSoon: mockGetClosingSoon,
    getActiveMarkets: mockGetActiveMarkets,
  })),
}));

// Mock fetch for OpenAI
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { Analyst } from '../src/analyst';
import { BaoziAPI } from '../src/baozi-api';

const MOCK_MARKET = {
  publicKey: 'ABC123def456',
  marketId: 1,
  question: 'Will BTC reach $100k by March 2026?',
  status: 'Active',
  layer: 'Main',
  outcome: 'Unresolved',
  yesPercent: 65,
  noPercent: 35,
  totalPoolSol: 2.5,
  closingTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  isBettingOpen: true,
  category: 'crypto',
  creator: 'wallet123',
  platformFeeBps: 200,
};

const MOCK_TIGHT_MARKET = {
  ...MOCK_MARKET,
  publicKey: 'TIGHT123',
  question: 'Will ETH flip BTC in market cap?',
  yesPercent: 48,
  noPercent: 52,
  totalPoolSol: 1.2,
};

const MOCK_CLOSING_MARKET = {
  ...MOCK_MARKET,
  publicKey: 'CLOSING123',
  question: 'Will SOL reach $200 this week?',
  closingTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  yesPercent: 30,
  noPercent: 70,
};

describe('Analyst', () => {
  let analyst: Analyst;

  beforeEach(() => {
    vi.clearAllMocks();
    const api = new BaoziAPI();
    analyst = new Analyst(api);
    // Default: no OpenAI key = use fallback templates
    delete process.env.OPENAI_API_KEY;
  });

  describe('generateRoundup', () => {
    it('returns fallback when no markets exist', async () => {
      mockGetHotMarkets.mockResolvedValue([]);
      mockGetClosingSoon.mockResolvedValue([]);

      const result = await analyst.generateRoundup();
      expect(result.content).toContain('No active markets');
    });

    it('generates roundup with hot markets', async () => {
      mockGetHotMarkets.mockResolvedValue([MOCK_MARKET, MOCK_TIGHT_MARKET]);
      mockGetClosingSoon.mockResolvedValue([MOCK_CLOSING_MARKET]);

      const result = await analyst.generateRoundup();
      expect(result.content).toBeTruthy();
      expect(result.content.length).toBeLessThanOrEqual(2000);
    });

    it('uses LLM when OPENAI_API_KEY is set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockGetHotMarkets.mockResolvedValue([MOCK_MARKET]);
      mockGetClosingSoon.mockResolvedValue([]);

      mockFetch.mockResolvedValue({
        json: async () => ({
          choices: [{ message: { content: 'AI-generated roundup analysis' } }],
        }),
      });

      const result = await analyst.generateRoundup();
      expect(result.content).toBe('AI-generated roundup analysis');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to template when LLM fails', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockGetHotMarkets.mockResolvedValue([MOCK_MARKET]);
      mockGetClosingSoon.mockResolvedValue([]);

      mockFetch.mockRejectedValue(new Error('API timeout'));

      const result = await analyst.generateRoundup();
      expect(result.content).toContain('Hot Markets');
    });
  });

  describe('generateOddsAnalysis', () => {
    it('returns null when no active markets', async () => {
      mockGetActiveMarkets.mockResolvedValue([]);
      const result = await analyst.generateOddsAnalysis();
      expect(result).toBeNull();
    });

    it('picks most contentious market (closest to 50/50)', async () => {
      mockGetActiveMarkets.mockResolvedValue([MOCK_MARKET, MOCK_TIGHT_MARKET]);

      const result = await analyst.generateOddsAnalysis();
      expect(result).toBeTruthy();
      expect(result!.marketPda).toBe('TIGHT123');
    });

    it('generates analysis with LLM', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      mockGetActiveMarkets.mockResolvedValue([MOCK_MARKET]);

      mockFetch.mockResolvedValue({
        json: async () => ({
          choices: [{ message: { content: 'Deep market analysis here' } }],
        }),
      });

      const result = await analyst.generateOddsAnalysis();
      expect(result!.content).toContain('Deep market analysis here');
      expect(result!.content).toContain('baozi.bet/market/');
    });

    it('respects 2000 char limit', async () => {
      mockGetActiveMarkets.mockResolvedValue([MOCK_MARKET]);

      const result = await analyst.generateOddsAnalysis();
      expect(result!.content.length).toBeLessThanOrEqual(2000);
    });
  });

  describe('generateClosingAlert', () => {
    it('returns null when no markets closing soon', async () => {
      mockGetClosingSoon.mockResolvedValue([]);
      const result = await analyst.generateClosingAlert();
      expect(result).toBeNull();
    });

    it('generates closing alert with market link', async () => {
      mockGetClosingSoon.mockResolvedValue([MOCK_CLOSING_MARKET]);

      const result = await analyst.generateClosingAlert();
      expect(result).toBeTruthy();
      expect(result!.content).toContain('baozi.bet/market/');
      expect(result!.marketPda).toBe('CLOSING123');
    });
  });

  describe('generateMarketComment', () => {
    it('handles empty pool market', async () => {
      const emptyPool = { ...MOCK_MARKET, totalPoolSol: 0, yesPercent: 50, noPercent: 50 };
      const comment = await analyst.generateMarketComment(emptyPool);
      expect(comment).toBeTruthy();
      expect(comment.length).toBeLessThanOrEqual(500);
    });

    it('handles strong consensus market', async () => {
      const strongYes = { ...MOCK_MARKET, yesPercent: 90, noPercent: 10 };
      const comment = await analyst.generateMarketComment(strongYes);
      expect(comment.length).toBeLessThanOrEqual(500);
    });

    it('uses LLM when available', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      mockFetch.mockResolvedValue({
        json: async () => ({
          choices: [{ message: { content: 'Insightful AI comment' } }],
        }),
      });

      const comment = await analyst.generateMarketComment(MOCK_MARKET);
      expect(comment).toBe('Insightful AI comment');
    });
  });
});
