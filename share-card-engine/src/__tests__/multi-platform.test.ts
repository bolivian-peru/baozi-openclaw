/**
 * Tests for multi-platform distribution
 */
import { describe, it, expect } from 'vitest';
import {
  distributeToAllPlatforms,
  distributeToPlatforms,
  batchDistribute,
  previewAllFormats,
} from '../distributors/multi-platform.js';
import type { MarketCardData } from '../types/index.js';

const mockMarket: MarketCardData = {
  publicKey: 'MultiPlatTestKey',
  marketId: '101',
  question: 'Will there be a recession in 2026?',
  yesPercent: 40.0,
  noPercent: 60.0,
  yesPoolSol: 80.0,
  noPoolSol: 120.0,
  totalPoolSol: 200.0,
  status: 'Active',
  closingTime: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  layer: 'Official',
  currencyType: 'Sol',
  hasBets: true,
  isBettingOpen: true,
  creator: 'MultiCreator',
};

describe('distributeToAllPlatforms', () => {
  it('generates results for all 3 platforms', () => {
    const result = distributeToAllPlatforms(mockMarket);
    expect(result.results).toHaveLength(3);
    expect(result.results.map(r => r.platform)).toEqual(['twitter', 'discord', 'telegram']);
  });

  it('includes market metadata', () => {
    const result = distributeToAllPlatforms(mockMarket);
    expect(result.marketId).toBe('101');
    expect(result.marketQuestion).toContain('recession');
  });

  it('counts successes', () => {
    const result = distributeToAllPlatforms(mockMarket);
    expect(result.totalSuccess).toBe(3);
    expect(result.totalFailed).toBe(0);
  });

  it('all results have timestamps', () => {
    const result = distributeToAllPlatforms(mockMarket);
    for (const r of result.results) {
      expect(r.timestamp).toBeTruthy();
      expect(() => new Date(r.timestamp)).not.toThrow();
    }
  });
});

describe('distributeToPlatforms', () => {
  it('distributes to selected platforms only', () => {
    const result = distributeToPlatforms(mockMarket, ['twitter', 'discord']);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].platform).toBe('twitter');
    expect(result.results[1].platform).toBe('discord');
  });

  it('handles single platform', () => {
    const result = distributeToPlatforms(mockMarket, ['telegram']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].platform).toBe('telegram');
  });

  it('handles generic platform', () => {
    const result = distributeToPlatforms(mockMarket, ['generic']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].platform).toBe('generic');
    expect(result.results[0].content.length).toBeGreaterThan(0);
  });
});

describe('batchDistribute', () => {
  it('distributes multiple markets', () => {
    const markets = [
      mockMarket,
      { ...mockMarket, marketId: '102', question: 'Will ETH 2.0 launch?' },
    ];
    const results = batchDistribute(markets);
    expect(results).toHaveLength(2);
    expect(results[0].marketId).toBe('101');
    expect(results[1].marketId).toBe('102');
  });

  it('each batch result has 3 platform results', () => {
    const results = batchDistribute([mockMarket]);
    expect(results[0].results).toHaveLength(3);
  });
});

describe('previewAllFormats', () => {
  it('returns cards for all platforms', () => {
    const preview = previewAllFormats(mockMarket);
    expect(preview).toHaveProperty('twitter');
    expect(preview).toHaveProperty('discord');
    expect(preview).toHaveProperty('telegram');
    expect(preview).toHaveProperty('generic');
  });

  it('each card has correct platform', () => {
    const preview = previewAllFormats(mockMarket);
    expect(preview.twitter.platform).toBe('twitter');
    expect(preview.discord.platform).toBe('discord');
    expect(preview.telegram.platform).toBe('telegram');
    expect(preview.generic.platform).toBe('generic');
  });

  it('all cards have baozi.bet links', () => {
    const preview = previewAllFormats(mockMarket);
    for (const [, card] of Object.entries(preview)) {
      expect(card.marketUrl).toContain('baozi.bet');
    }
  });
});
