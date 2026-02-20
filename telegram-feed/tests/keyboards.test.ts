import { jest } from '@jest/globals';
import type { Market } from '../src/types/market';

jest.unstable_mockModule('../src/config', () => ({
  config: {
    baoziBaseUrl: 'https://baozi.bet',
    baoziProgramId: 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',
  },
}));

const { marketKeyboard, marketListKeyboard, helpKeyboard } = await import('../src/commands/keyboards');

const sampleMarket: Market = {
  id: 'ABCDEF123456',
  question: 'Will BTC hit $120K?',
  status: 'active',
  layer: 'official',
  totalPool: 15,
  outcomes: [
    { index: 0, label: 'Yes', pool: 9, probability: 0.6 },
    { index: 1, label: 'No', pool: 6, probability: 0.4 },
  ],
  closingTime: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  isRace: false,
};

describe('marketKeyboard', () => {
  it('creates keyboard with bet link, refresh, and share', () => {
    const kb = marketKeyboard(sampleMarket);
    const data = kb.inline_keyboard;

    expect(data.length).toBeGreaterThanOrEqual(2);

    // First row: URL button to baozi.bet
    const urlButton = data[0].find((b: any) => (b as any).url);
    expect(urlButton).toBeDefined();
    expect((urlButton as any).url).toContain('baozi.bet/market/ABCDEF123456');
    expect(urlButton!.text).toContain('Bet on baozi.bet');

    // Second row: Refresh and Share
    const refreshBtn = data[1].find((b: any) => (b as any).callback_data?.startsWith('refresh:'));
    expect(refreshBtn).toBeDefined();
  });
});

describe('marketListKeyboard', () => {
  it('creates list keyboard with market buttons', () => {
    const kb = marketListKeyboard([sampleMarket], 0, 1, 'markets');
    const data = kb.inline_keyboard;

    // Should have market row + footer
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('adds pagination when multiple pages', () => {
    const kb = marketListKeyboard([sampleMarket], 0, 3, 'markets');
    const data = kb.inline_keyboard;

    // Find pagination row
    const hasNext = data.some((row: any[]) =>
      row.some((b: any) => (b as any).callback_data?.includes('page:1'))
    );
    expect(hasNext).toBe(true);
  });
});

describe('helpKeyboard', () => {
  it('creates help keyboard with quick actions', () => {
    const kb = helpKeyboard();
    const data = kb.inline_keyboard;

    expect(data.length).toBeGreaterThanOrEqual(2);

    // Should have a baozi.bet URL link
    const hasUrl = data.some((row: any[]) =>
      row.some((b: any) => (b as any).url?.includes('baozi.bet'))
    );
    expect(hasUrl).toBe(true);
  });
});
