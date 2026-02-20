/**
 * Tests for Twitter distribution formatter
 */
import { describe, it, expect } from 'vitest';
import {
  formatTweet,
  formatMarketTweet,
  formatTweetThread,
  formatMarketsRoundup,
  validateTweetLength,
} from '../distributors/twitter.js';
import { generateShareCard } from '../generators/html-card.js';
import type { MarketCardData } from '../types/index.js';

const mockMarket: MarketCardData = {
  publicKey: 'TestPubKey123',
  marketId: '7',
  question: 'Will Ethereum flip Bitcoin in market cap by 2027?',
  yesPercent: 22.3,
  noPercent: 77.7,
  yesPoolSol: 30.5,
  noPoolSol: 106.8,
  totalPoolSol: 137.3,
  status: 'Active',
  closingTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  layer: 'Lab',
  currencyType: 'Sol',
  hasBets: true,
  isBettingOpen: true,
  creator: 'SomeCreator',
};

describe('formatMarketTweet', () => {
  it('includes the market question', () => {
    const tweet = formatMarketTweet(mockMarket);
    expect(tweet).toContain('Ethereum');
    expect(tweet).toContain('Bitcoin');
  });

  it('includes odds', () => {
    const tweet = formatMarketTweet(mockMarket);
    expect(tweet).toContain('22.3%');
    expect(tweet).toContain('77.7%');
  });

  it('includes baozi.bet link', () => {
    const tweet = formatMarketTweet(mockMarket);
    expect(tweet).toContain('baozi.bet');
  });

  it('includes pool size', () => {
    const tweet = formatMarketTweet(mockMarket);
    expect(tweet).toContain('137.30 SOL');
  });

  it('handles very long questions', () => {
    const longMarket = {
      ...mockMarket,
      question: 'A'.repeat(250),
    };
    const tweet = formatMarketTweet(longMarket);
    // Should still be reasonable length
    expect(tweet.length).toBeLessThan(400);
  });
});

describe('formatTweet (from card)', () => {
  it('generates valid tweet from card', () => {
    const card = generateShareCard(mockMarket, { platform: 'twitter' });
    const tweet = formatTweet(card);
    expect(tweet).toContain('baozi.bet');
    expect(tweet.length).toBeGreaterThan(0);
  });
});

describe('formatTweetThread', () => {
  it('generates a 3-part thread', () => {
    const thread = formatTweetThread(mockMarket);
    expect(thread).toHaveLength(3);
  });

  it('first tweet has the question', () => {
    const thread = formatTweetThread(mockMarket);
    expect(thread[0]).toContain('Ethereum');
  });

  it('second tweet has odds', () => {
    const thread = formatTweetThread(mockMarket);
    expect(thread[1]).toContain('YES');
    expect(thread[1]).toContain('NO');
  });

  it('third tweet has CTA and link', () => {
    const thread = formatTweetThread(mockMarket);
    expect(thread[2]).toContain('baozi.bet');
    expect(thread[2]).toContain('bet');
  });
});

describe('formatMarketsRoundup', () => {
  it('formats multiple markets', () => {
    const markets = [mockMarket, { ...mockMarket, question: 'Will SOL hit $500?', yesPercent: 45 }];
    const roundup = formatMarketsRoundup(markets);
    expect(roundup).toContain('Hot Markets');
    expect(roundup).toContain('Ethereum');
    expect(roundup).toContain('SOL');
  });

  it('limits to 3 markets', () => {
    const markets = Array.from({ length: 5 }, (_, i) => ({
      ...mockMarket,
      question: `Market ${i}`,
    }));
    const roundup = formatMarketsRoundup(markets);
    expect(roundup).toContain('Market 0');
    expect(roundup).toContain('Market 2');
    expect(roundup).not.toContain('Market 3');
  });
});

describe('validateTweetLength', () => {
  it('validates short tweets as valid', () => {
    const result = validateTweetLength('Hello world');
    expect(result.valid).toBe(true);
    expect(result.overBy).toBe(0);
  });

  it('counts URLs as 23 chars', () => {
    const tweet = 'Check this https://baozi.bet/market/very-long-pubkey-that-would-be-long';
    const result = validateTweetLength(tweet);
    // "Check this " = 11 chars + 23 for URL = 34
    expect(result.length).toBeLessThan(280);
    expect(result.valid).toBe(true);
  });

  it('detects over-limit tweets', () => {
    const tweet = 'A'.repeat(300);
    const result = validateTweetLength(tweet);
    expect(result.valid).toBe(false);
    expect(result.overBy).toBe(20);
  });
});
