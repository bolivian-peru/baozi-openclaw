import { describe, it, expect, vi } from 'vitest';
import { fetchTrends, generateProposal } from '../src/trend-detector';
import { checkV7Compliance, classifyAndValidateTiming } from '../src/validation';

describe('Trending Market Machine', () => {
  it('checks v7.0 compliance correctly', () => {
    expect(checkV7Compliance('Will BTC hit $100k?').allowed).toBe(false);
    expect(checkV7Compliance('Will Apple announce iPhone 17?').allowed).toBe(true);
  });

  it('validates timing rules', () => {
    const now = new Date();
    const eventTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h
    const closeTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h before event
    
    const valid = classifyAndValidateTiming({
      question: `Will X happen by ${eventTime.toISOString().split('T')[0]}?`,
      closingTime: closeTime,
      category: 'test',
      source: 'test',
      sourceUrl: '',
      confidence: 1
    });
    
    expect(valid.valid).toBe(true);
  });
});
