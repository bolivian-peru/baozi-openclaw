import { NightKitchen, ReportData } from '../src/index';
import { ProverbSelector } from '../src/proverbs';
import { MarketWithOdds } from '../src/baozi-api';

function mkMarket(overrides: Partial<MarketWithOdds> = {}): MarketWithOdds {
  return {
    publicKey: 'p1', marketId: 1,
    question: 'Test market?',
    status: 'Active', layer: 'Lab', outcome: null,
    yesPercent: 50, noPercent: 50, totalPoolSol: 5,
    closingTime: new Date(Date.now() + 5 * 86400000).toISOString(),
    isBettingOpen: true, category: 'crypto', creator: 'test',
    oddsLabel: 'yes: 50% | no: 50%', poolLabel: '5.0 SOL', timeLabel: '5d',
    ...overrides,
  };
}

function mkResolved(overrides: Partial<MarketWithOdds> = {}): MarketWithOdds {
  return mkMarket({ status: 'Resolved', outcome: 'Yes', timeLabel: 'closed', ...overrides });
}

function mkData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    date: '2026-03-17',
    activeMarkets: [mkMarket()],
    resolvedMarkets: [],
    totalPoolSol: 5,
    proverbs: new ProverbSelector().selectPair({}),
    ...overrides,
  };
}

describe('ProverbSelector', () => {
  test('highStakes → risk', () => {
    expect(new ProverbSelector().select({ highStakes: true }).context).toBe('risk');
  });

  test('longTerm → patience', () => {
    expect(new ProverbSelector().select({ longTerm: true }).context).toBe('patience');
  });

  test('closeRace → wisdom', () => {
    expect(new ProverbSelector().select({ closeRace: true }).context).toBe('wisdom');
  });

  test('community → community', () => {
    expect(new ProverbSelector().select({ community: true }).context).toBe('community');
  });

  test('selectPair returns different proverbs', () => {
    const [a, b] = new ProverbSelector().selectPair({ highStakes: true });
    expect(a.chinese).not.toBe(b.chinese);
  });
});

describe('NightKitchen', () => {
  let kitchen: NightKitchen;

  beforeEach(() => {
    kitchen = new NightKitchen('https://mock.example.com');
  });

  test('report includes header', () => {
    const report = kitchen.generateReport(mkData());
    expect(report).toContain('夜厨房');
    expect(report).toContain('night kitchen');
  });

  test('report includes market questions', () => {
    const report = kitchen.generateReport(mkData({
      activeMarkets: [mkMarket({ question: 'Will BTC moon?' })]
    }));
    expect(report).toContain('Will BTC moon?');
  });

  test('report includes resolved markets', () => {
    const report = kitchen.generateReport(mkData({
      resolvedMarkets: [mkResolved({ question: 'SOL above $100?' })]
    }));
    expect(report).toContain('resolved');
    expect(report).toContain('SOL above $100?');
  });

  test('report includes baozi branding', () => {
    const report = kitchen.generateReport(mkData());
    expect(report).toContain('baozi.bet');
    expect(report).toContain('小小一笼，大大缘分');
  });

  test('empty markets shows 0 cooking', () => {
    const report = kitchen.generateReport(mkData({ activeMarkets: [], totalPoolSol: 0 }));
    expect(report).toContain('0 market cooking');
  });

  test('report contains Chinese characters', () => {
    const report = kitchen.generateReport(mkData());
    expect(report).toMatch(/[\u4e00-\u9fff]/);
  });

  test('report includes pool total', () => {
    const report = kitchen.generateReport(mkData({
      activeMarkets: [mkMarket({ totalPoolSol: 25.5 }), mkMarket({ totalPoolSol: 17.3 })],
      totalPoolSol: 42.8,
    }));
    expect(report).toContain('42.8 SOL');
  });

  test('footer proverb after divider', () => {
    const report = kitchen.generateReport(mkData());
    const idx = report.indexOf('───────────────');
    expect(idx).toBeGreaterThan(-1);
    expect(report.substring(idx)).toMatch(/[\u4e00-\u9fff]/);
  });

  test('each market gets unique proverb', () => {
    const report = kitchen.generateReport(mkData({
      activeMarkets: [
        mkMarket({ question: 'A?', totalPoolSol: 50 }),
        mkMarket({ question: 'B?', totalPoolSol: 1 }),
        mkMarket({ question: 'C?', yesPercent: 52, noPercent: 48 }),
      ],
      totalPoolSol: 51,
    }));
    expect(report).toContain('A?');
    expect(report).toContain('B?');
    expect(report).toContain('C?');
    const chineseMatches = report.match(/[\u4e00-\u9fff]{3,}/g) || [];
    expect(chineseMatches.length).toBeGreaterThanOrEqual(3);
  });
});
