import { describe, it, expect } from 'vitest';
import { generateCaption } from '../src/caption-generator';
import { NotableEvent, BinaryMarket } from '../src/baozi-api';

function makeEvent(type: NotableEvent['type'], overrides: Partial<BinaryMarket> = {}): NotableEvent {
  return {
    type,
    detail: 'test detail',
    market: {
      publicKey: 'TEST123',
      marketId: 1,
      question: 'Will it snow in March?',
      status: 'Active',
      outcome: 'Unresolved',
      yesPercent: 60,
      noPercent: 40,
      totalPoolSol: 3.5,
      closingTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isBettingOpen: true,
      ...overrides,
    },
  };
}

describe('generateCaption', () => {
  // Captions may come from LLM or templates, so test for content that both must include

  it('includes market question text for new market', async () => {
    const caption = await generateCaption(makeEvent('new_market'));
    expect(caption.toLowerCase()).toContain('snow');
    expect(caption.toLowerCase()).toContain('march');
  });

  it('includes odds info', async () => {
    const caption = await generateCaption(makeEvent('new_market'));
    expect(caption).toContain('60');
    expect(caption).toContain('40');
  });

  it('includes pool size for large bets', async () => {
    const caption = await generateCaption(makeEvent('large_bet', { totalPoolSol: 15 }));
    expect(caption).toContain('15');
    expect(caption).toContain('SOL');
  });

  it('handles resolved markets', async () => {
    const caption = await generateCaption(makeEvent('resolved', {
      outcome: 'Yes',
      status: 'Resolved',
    }));
    // Must include something about the market
    expect(caption.toLowerCase()).toContain('snow');
  });

  it('includes a Chinese proverb or characters', async () => {
    const caption = await generateCaption(makeEvent('new_market'));
    // Should contain Chinese characters
    expect(caption).toMatch(/[\u4e00-\u9fff]/);
  });

  it('includes market link', async () => {
    const caption = await generateCaption(makeEvent('new_market'));
    expect(caption).toContain('baozi.bet/market/TEST123');
  });

  it('is non-empty for all event types', async () => {
    for (const type of ['new_market', 'closing_soon', 'resolved', 'large_bet', 'odds_shift'] as const) {
      const caption = await generateCaption(makeEvent(type));
      expect(caption.length).toBeGreaterThan(50);
    }
  }, 30000);

  it('stays under 800 chars', async () => {
    const caption = await generateCaption(makeEvent('new_market'));
    expect(caption.length).toBeLessThan(800);
  });
});
