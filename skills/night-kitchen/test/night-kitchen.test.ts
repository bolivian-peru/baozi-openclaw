import { NightKitchen, ReportData } from '../src/index';
import { ProverbSelector } from '../src/proverbs';
import { MarketWithOdds } from '../src/baozi-api';

describe('NightKitchen', () => {
  let kitchen: NightKitchen;

  beforeEach(() => {
    kitchen = new NightKitchen();
  });

  function mockMarket(overrides: Partial<MarketWithOdds> = {}): MarketWithOdds {
    return {
      publicKey: 'mock', marketId: 1,
      question: 'Will BTC moon?',
      status: 'Active', layer: 'Lab', outcome: null,
      yesPercent: 60, noPercent: 40, totalPoolSol: 15.0,
      closingTime: new Date(Date.now() + 5 * 86400000).toISOString(),
      isBettingOpen: true, category: 'crypto', creator: 'mock',
      oddsLabel: 'yes: 60% | no: 40%', poolLabel: '15.0 SOL', timeLabel: '5d',
      ...overrides,
    };
  }

  test('generateReport includes header', () => {
    const data: ReportData = {
      date: '2026-03-17', activeMarkets: [], resolvedMarkets: [],
      totalPoolSol: 0, proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toContain('夜厨房');
    expect(report).toContain('night kitchen');
  });

  test('report includes market questions', () => {
    const data: ReportData = {
      date: '2026-03-17',
      activeMarkets: [mockMarket()],
      resolvedMarkets: [],
      totalPoolSol: 15.0,
      proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toContain('Will BTC moon?');
  });

  test('report includes resolved markets', () => {
    const data: ReportData = {
      date: '2026-03-17',
      activeMarkets: [],
      resolvedMarkets: [mockMarket({ status: 'Resolved', outcome: 'Yes', question: 'SOL above $100?' })],
      totalPoolSol: 0,
      proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toContain('resolved');
    expect(report).toContain('SOL above $100?');
  });

  test('report includes baozi branding', () => {
    const data: ReportData = {
      date: '2026-03-17', activeMarkets: [], resolvedMarkets: [],
      totalPoolSol: 0, proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toContain('baozi.bet');
    expect(report).toContain('小小一笼，大大缘分');
  });

  test('empty markets shows 0 cooking', () => {
    const data: ReportData = {
      date: '2026-03-17', activeMarkets: [], resolvedMarkets: [],
      totalPoolSol: 0, proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toContain('0 market cooking');
  });

  test('report contains Chinese characters', () => {
    const data: ReportData = {
      date: '2026-03-17',
      activeMarkets: [mockMarket()],
      resolvedMarkets: [],
      totalPoolSol: 15.0,
      proverbs: new ProverbSelector().selectPair({}),
    };
    const report = kitchen.generateReport(data);
    expect(report).toMatch(/[\u4e00-\u9fff]/);
  });
});
