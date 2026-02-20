import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/config', () => ({
  config: {
    baoziBaseUrl: 'https://baozi.bet',
    maxMarketsPerPage: 5,
    baoziProgramId: 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',
  },
}));

const {
  formatPercent,
  formatSol,
  formatTimeRemaining,
  formatMarketCard,
  formatMarketListHeader,
  formatDailyRoundup,
  escapeHtml,
  getMarketUrl,
} = await import('../src/utils/format');

import type { Market } from '../src/types/market';

describe('formatPercent', () => {
  it('formats probability as percentage', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
    expect(formatPercent(0.632)).toBe('63.2%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(1)).toBe('100.0%');
  });
});

describe('formatSol', () => {
  it('formats small amounts', () => {
    expect(formatSol(15.2)).toBe('15.20 SOL');
    expect(formatSol(0.01)).toBe('0.01 SOL');
  });

  it('formats large amounts with K suffix', () => {
    expect(formatSol(1500)).toBe('1.5K SOL');
    expect(formatSol(10000)).toBe('10.0K SOL');
  });
});

describe('formatTimeRemaining', () => {
  it('shows "Closed" for past dates', () => {
    expect(formatTimeRemaining('2020-01-01T00:00:00Z')).toBe('Closed');
  });

  it('shows days and hours', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000);
    const result = formatTimeRemaining(future.toISOString());
    expect(result).toMatch(/^2d 4h$/);
  });

  it('shows hours and minutes when less than a day', () => {
    const future = new Date(Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000);
    const result = formatTimeRemaining(future.toISOString());
    expect(result).toMatch(/^5h (29|30)m$/);
  });

  it('shows minutes when less than an hour', () => {
    const future = new Date(Date.now() + 45 * 60 * 1000);
    const result = formatTimeRemaining(future.toISOString());
    expect(result).toMatch(/^4[45]m$/);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<b>test</b>')).toBe('&lt;b&gt;test&lt;/b&gt;');
    expect(escapeHtml('A & B')).toBe('A &amp; B');
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('getMarketUrl', () => {
  it('builds correct URL', () => {
    expect(getMarketUrl('ABC123')).toBe('https://baozi.bet/market/ABC123');
  });
});

describe('formatMarketCard', () => {
  const booleanMarket: Market = {
    id: 'test-market-1',
    question: 'Will BTC hit $120K by March?',
    status: 'active',
    layer: 'official',
    category: 'Crypto',
    totalPool: 15.2,
    outcomes: [
      { index: 0, label: 'Yes', pool: 9.576, probability: 0.63 },
      { index: 1, label: 'No', pool: 5.624, probability: 0.37 },
    ],
    closingTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    isRace: false,
    volume24h: 5.3,
  };

  it('formats boolean market correctly', () => {
    const card = formatMarketCard(booleanMarket);
    expect(card).toContain('Will BTC hit $120K by March?');
    expect(card).toContain('63.0%');
    expect(card).toContain('37.0%');
    expect(card).toContain('15.20 SOL');
    expect(card).toContain('Crypto');
  });

  const raceMarket: Market = {
    id: 'test-race-1',
    question: 'Who will win the election?',
    status: 'active',
    layer: 'lab',
    totalPool: 100,
    outcomes: [
      { index: 0, label: 'Candidate A', pool: 50, probability: 0.5 },
      { index: 1, label: 'Candidate B', pool: 30, probability: 0.3 },
      { index: 2, label: 'Candidate C', pool: 20, probability: 0.2 },
    ],
    closingTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    isRace: true,
  };

  it('formats race market with multiple outcomes', () => {
    const card = formatMarketCard(raceMarket);
    expect(card).toContain('Who will win the election?');
    expect(card).toContain('Candidate A');
    expect(card).toContain('50.0%');
    expect(card).toContain('Candidate B');
    expect(card).toContain('30.0%');
  });
});

describe('formatMarketListHeader', () => {
  it('formats header with count', () => {
    const header = formatMarketListHeader('Hot Markets', 3);
    expect(header).toContain('Hot Markets');
    expect(header).toContain('3 markets');
  });

  it('handles singular', () => {
    const header = formatMarketListHeader('Test', 1);
    expect(header).toContain('1 market');
    expect(header).not.toContain('1 markets');
  });
});

describe('formatDailyRoundup', () => {
  const sampleMarket: Market = {
    id: 'test-1',
    question: 'Test market?',
    status: 'active',
    layer: 'official',
    totalPool: 10,
    outcomes: [
      { index: 0, label: 'Yes', pool: 7, probability: 0.7 },
      { index: 1, label: 'No', pool: 3, probability: 0.3 },
    ],
    closingTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    isRace: false,
  };

  it('formats roundup with all sections', () => {
    const roundup = formatDailyRoundup([sampleMarket], [sampleMarket], [sampleMarket], []);
    expect(roundup).toContain('Daily Market Roundup');
    expect(roundup).toContain('Trending Markets');
    expect(roundup).toContain('Closing Soon');
    expect(roundup).toContain('New Markets');
    expect(roundup).toContain('baozi.bet');
  });

  it('omits empty sections', () => {
    const roundup = formatDailyRoundup([], [], [], []);
    expect(roundup).toContain('Daily Market Roundup');
    expect(roundup).not.toContain('Trending Markets');
  });
});
