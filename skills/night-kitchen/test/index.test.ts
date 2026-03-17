import { ProverbSelector, PROVERBS } from '../src/proverbs';
import { NightKitchen, ReportData } from '../src/index';
import { MarketWithOdds } from '../src/baozi-api';

describe('ProverbSelector', () => {
  let selector: ProverbSelector;
  beforeEach(() => { selector = new ProverbSelector(); });

  test('select returns proverb with all fields', () => {
    const p = selector.select({});
    expect(p.chinese).toBeTruthy();
    expect(p.english).toBeTruthy();
    expect(p.context).toBeTruthy();
    expect(p.pinyin).toBeTruthy();
  });

  test('highStakes → risk proverbs', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) { selector = new ProverbSelector(); results.add(selector.select({ highStakes: true }).context); }
    expect(results.has('risk')).toBe(true);
  });

  test('longTerm → patience proverbs', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) { selector = new ProverbSelector(); results.add(selector.select({ longTerm: true }).context); }
    expect(results.has('patience')).toBe(true);
  });

  test('closeRace → wisdom proverbs', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) { selector = new ProverbSelector(); results.add(selector.select({ closeRace: true }).context); }
    expect(results.has('wisdom')).toBe(true);
  });

  test('community → community proverbs', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) { selector = new ProverbSelector(); results.add(selector.select({ community: true }).context); }
    expect(results.has('community')).toBe(true);
  });

  test('selectPair returns different contexts', () => {
    const [a, b] = selector.selectPair({ highStakes: true });
    expect(a.context).not.toBe(b.context);
  });

  test('no duplicates until pool exhausted', () => {
    const seen = new Set<string>();
    for (let i = 0; i < PROVERBS.length; i++) {
      const p = selector.select({});
      expect(seen.has(p.chinese)).toBe(false);
      seen.add(p.chinese);
    }
  });

  test('proverb library size = 16', () => { expect(PROVERBS.length).toBe(16); });

  test('all contexts are valid', () => {
    const valid = ['patience', 'risk', 'luck', 'warmth', 'community', 'wisdom'];
    for (const p of PROVERBS) expect(valid).toContain(p.context);
  });

  test('main contexts have 2+ proverbs', () => {
    const counts: Record<string, number> = {};
    for (const p of PROVERBS) counts[p.context] = (counts[p.context] || 0) + 1;
    expect(counts['patience']).toBeGreaterThanOrEqual(2);
    expect(counts['risk']).toBeGreaterThanOrEqual(2);
    expect(counts['wisdom']).toBeGreaterThanOrEqual(2);
  });
});

describe('NightKitchen', () => {
  let kitchen: NightKitchen;
  beforeEach(() => { kitchen = new NightKitchen(); });

  function mockMarket(overrides: Partial<MarketWithOdds> = {}): MarketWithOdds {
    return {
      publicKey: 'mock', marketId: 1, question: 'Will BTC moon?',
      status: 'Active', layer: 'Lab', outcome: null,
      yesPercent: 60, noPercent: 40, totalPoolSol: 15.0,
      closingTime: new Date(Date.now() + 5 * 86400000).toISOString(),
      isBettingOpen: true, category: 'crypto', creator: 'mock',
      oddsLabel: 'yes: 60% | no: 40%', poolLabel: '15.0 SOL', timeLabel: '5d',
      ...overrides,
    };
  }

  function mockData(active: MarketWithOdds[] = [], resolved: MarketWithOdds[] = []): ReportData {
    return {
      date: '2026-03-17', activeMarkets: active, resolvedMarkets: resolved,
      totalPoolSol: active.reduce((s, m) => s + m.totalPoolSol, 0),
      proverbs: new ProverbSelector().selectPair({}),
    };
  }

  test('report includes header', () => {
    expect(kitchen.generateReport(mockData())).toContain('夜厨房');
  });

  test('report includes market questions', () => {
    expect(kitchen.generateReport(mockData([mockMarket()]))).toContain('Will BTC moon?');
  });

  test('report includes resolved markets', () => {
    const r = kitchen.generateReport(mockData([], [mockMarket({ status: 'Resolved', outcome: 'Yes', question: 'SOL above $100?' })]));
    expect(r).toContain('resolved');
  });

  test('report includes baozi branding', () => {
    const r = kitchen.generateReport(mockData());
    expect(r).toContain('baozi.bet');
    expect(r).toContain('小小一笼');
  });

  test('empty markets shows correct count', () => {
    expect(kitchen.generateReport(mockData())).toContain('0 market cooking');
  });

  test('report contains Chinese', () => {
    expect(kitchen.generateReport(mockData([mockMarket()]))).toMatch(/[\u4e00-\u9fff]/);
  });
});
