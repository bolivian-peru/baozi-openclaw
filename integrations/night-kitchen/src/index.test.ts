import { describe, it, expect } from 'vitest';
import { selectProverb, PROVERBS } from './proverbs.js';
import { computeOdds, daysUntilClose } from './baozi-client.js';
import { formatShortReport, formatFullReport } from './report-gen.js';

describe('proverb selection', () => {
  it('selects patience theme for long-dated markets', () => {
    const p = selectProverb({ daysToClose: 20, poolSol: 10, yesOdds: 60, resolved: false });
    expect(p.theme).toBe('patience');
  });

  it('selects timing theme for closing within 24h', () => {
    const p = selectProverb({ daysToClose: 0, poolSol: 10, yesOdds: 65, resolved: false });
    expect(p.theme).toBe('timing');
  });

  it('selects warmth theme for resolved markets', () => {
    const p = selectProverb({ daysToClose: 0, poolSol: 10, yesOdds: 80, resolved: true });
    expect(p.theme).toBe('warmth');
  });

  it('selects risk theme for high-stakes skewed markets', () => {
    const p = selectProverb({ daysToClose: 5, poolSol: 100, yesOdds: 90, resolved: false });
    expect(p.theme).toBe('risk');
  });

  it('selects luck theme for close races with large pools', () => {
    const p = selectProverb({ daysToClose: 5, poolSol: 100, yesOdds: 52, resolved: false });
    expect(p.theme).toBe('luck');
  });

  it('all proverbs have zh, en, theme, context', () => {
    for (const p of PROVERBS) {
      expect(p.zh).toBeTruthy();
      expect(p.en).toBeTruthy();
      expect(p.theme).toBeTruthy();
      expect(p.context).toBeTruthy();
    }
  });

  it('proverb library has at least 20 entries', () => {
    expect(PROVERBS.length).toBeGreaterThanOrEqual(20);
  });
});

describe('computeOdds', () => {
  it('computes YES/NO percentages correctly', () => {
    const odds = computeOdds({ pda: 'x', question: 'q', yesPool: 30, noPool: 70, totalPool: 100, status: 'Active', closingTime: new Date().toISOString() });
    expect(odds.yes).toBe(30);
    expect(odds.no).toBe(70);
  });

  it('returns 50/50 for empty pool', () => {
    const odds = computeOdds({ pda: 'x', question: 'q', yesPool: 0, noPool: 0, totalPool: 0, status: 'Active', closingTime: new Date().toISOString() });
    expect(odds.yes).toBe(50);
    expect(odds.no).toBe(50);
  });
});

describe('daysUntilClose', () => {
  it('returns 0 for past date', () => {
    expect(daysUntilClose('2020-01-01T00:00:00Z')).toBe(0);
  });

  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntilClose(future)).toBeGreaterThan(5);
  });
});

describe('report formatting', () => {
  const mockSection = {
    market: {
      pda: 'abc123',
      question: 'Will BTC hit $110k by March 1?',
      yesPool: 32.4,
      noPool: 27.6,
      totalPool: 60,
      status: 'Active' as const,
      closingTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    proverb: PROVERBS[0],
    summary: 'the steam is building.\n蒸笼里的热气慢慢上升，耐心等待。',
  };

  it('full report contains brand header', () => {
    const r = formatFullReport([mockSection], 'feb 21, 2026');
    expect(r).toContain('夜厨房');
    expect(r).toContain('night kitchen report');
    expect(r).toContain('baozi.bet');
  });

  it('full report contains proverb', () => {
    const r = formatFullReport([mockSection], 'feb 21, 2026');
    expect(r).toContain(mockSection.proverb.zh);
  });

  it('short report is under 2000 characters', () => {
    // with 3 sections
    const r = formatShortReport([mockSection, mockSection, mockSection], 'feb 21, 2026');
    expect(r.length).toBeLessThan(2000);
  });

  it('short report contains market question', () => {
    const r = formatShortReport([mockSection], 'feb 21, 2026');
    expect(r).toContain('BTC');
  });

  it('full report includes risk disclaimer', () => {
    const r = formatFullReport([mockSection], 'feb 21, 2026');
    expect(r).toContain('play small, play soft');
  });
});
