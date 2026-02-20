/**
 * 夜厨房 — Report Generator Tests
 */
import { describe, it, expect } from 'vitest';
import { generateMarketReport, generateSummaryReport } from '../report-generator.js';
import type { MarketAnalysis } from '../market-analyzer.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockAnalysis(overrides: Partial<MarketAnalysis> = {}): MarketAnalysis {
  return {
    market: {
      publicKey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      marketId: '42',
      question: 'Will Bitcoin reach $100,000 before March 2025?',
      closingTime: new Date(Date.now() + 86400000 * 7).toISOString(),
      resolutionTime: new Date(Date.now() + 86400000 * 14).toISOString(),
      status: 'Active',
      statusCode: 0,
      winningOutcome: null,
      currencyType: 'Sol',
      yesPoolSol: 5.5,
      noPoolSol: 4.5,
      totalPoolSol: 10.0,
      yesPercent: 55,
      noPercent: 45,
      platformFeeBps: 250,
      layer: 'Official',
      layerCode: 0,
      accessGate: 'Public',
      creator: 'ABcD1234567890ABcD1234567890ABcD1234567890AB',
      hasBets: true,
      isBettingOpen: true,
      creatorFeeBps: 50,
    },
    sentiment: {
      label: 'contested',
      labelCN: '势均力敌 ⚔️',
      labelEN: 'Evenly Contested',
      confidence: 90,
      emoji: '⚡',
    },
    oddsBreakdown: {
      yesPercent: 55,
      noPercent: 45,
      yesDecimalOdds: 1.82,
      noDecimalOdds: 2.22,
      impliedYesProbability: 0.55,
      impliedNoProbability: 0.45,
      spread: 10,
    },
    poolAnalysis: {
      totalPoolSol: 10.0,
      yesPoolSol: 5.5,
      noPoolSol: 4.5,
      poolSizeCategory: 'medium',
      poolSizeCN: '中型池 (1-10 SOL)',
      poolSizeEN: 'Medium Pool (1-10 SOL)',
      liquidityDepth: 'Moderate — reasonable price stability',
    },
    timeAnalysis: {
      closingTime: new Date(Date.now() + 86400000 * 7),
      resolutionTime: new Date(Date.now() + 86400000 * 14),
      timeRemaining: '7 days remaining',
      timeRemainingCN: '剩余 7 天',
      urgency: 'moderate',
      urgencyCN: '从容不迫',
      isBettingOpen: true,
    },
    ...overrides,
  };
}

// =============================================================================
// FULL REPORT TESTS
// =============================================================================

describe('generateMarketReport — full format', () => {
  it('should generate a report with the Night Kitchen header', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('夜厨房');
    expect(report.content).toContain('Night Kitchen');
  });

  it('should include the market question', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('Bitcoin');
    expect(report.content).toContain('$100,000');
  });

  it('should include bilingual sentiment', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('势均力敌');
    expect(report.content).toContain('Evenly Contested');
  });

  it('should include odds breakdown', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('55.0%');
    expect(report.content).toContain('45.0%');
    expect(report.content).toContain('赔率');
  });

  it('should include pool analysis', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('10.0000 SOL');
    expect(report.content).toContain('资金池');
  });

  it('should include time analysis', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('7 days remaining');
    expect(report.content).toContain('剩余 7 天');
  });

  it('should include cultural wisdom section', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('🏮');
    expect(report.content).toContain('CULTURAL WISDOM');
    expect(report.content).toContain('文化智慧');
  });

  it('should include program ID in the sign-off', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.content).toContain('FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ');
  });

  it('should return correct metadata', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'full' });
    expect(report.title).toContain('Night Kitchen');
    expect(report.titleCN).toContain('夜厨房');
    expect(report.marketPda).toBe('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.wordCount).toBeGreaterThan(50);
  });
});

// =============================================================================
// COMPACT REPORT TESTS
// =============================================================================

describe('generateMarketReport — compact format', () => {
  it('should generate a shorter report', () => {
    const analysis = createMockAnalysis();
    const full = generateMarketReport(analysis, { format: 'full' });
    const compact = generateMarketReport(analysis, { format: 'compact' });
    expect(compact.content.length).toBeLessThan(full.content.length);
  });

  it('should still include key data', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'compact' });
    expect(report.content).toContain('55.0%');
    expect(report.content).toContain('10.0000 SOL');
    expect(report.content).toContain('🏮');
  });
});

// =============================================================================
// SOCIAL REPORT TESTS
// =============================================================================

describe('generateMarketReport — social format', () => {
  it('should be very concise', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'social' });
    expect(report.content.length).toBeLessThan(500);
  });

  it('should include hashtags', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'social' });
    expect(report.content).toContain('#Baozi');
    expect(report.content).toContain('#夜厨房');
  });

  it('should include a wisdom entry', () => {
    const analysis = createMockAnalysis();
    const report = generateMarketReport(analysis, { format: 'social' });
    expect(report.content).toContain('🏮');
    expect(report.content).toContain('「');
  });
});

// =============================================================================
// SUMMARY REPORT TESTS
// =============================================================================

describe('generateSummaryReport', () => {
  it('should generate a summary for multiple markets', () => {
    const analyses = [
      createMockAnalysis(),
      createMockAnalysis({
        market: {
          ...createMockAnalysis().market,
          publicKey: 'AAAA1111222233334444555566667777888899990000AAAA',
          question: 'Will ETH flip BTC?',
          yesPercent: 20,
          noPercent: 80,
          totalPoolSol: 5.0,
        },
      }),
    ];
    const summary = generateSummaryReport(analyses);
    expect(summary).toContain('Daily Digest');
    expect(summary).toContain('Total Markets');
    expect(summary).toContain('总市场数');
  });

  it('should include overview stats', () => {
    const analyses = [createMockAnalysis()];
    const summary = generateSummaryReport(analyses);
    expect(summary).toContain('Total Markets');
    expect(summary).toContain('Total Liquidity');
    expect(summary).toContain('总流动性');
  });

  it('should include wisdom of the day', () => {
    const analyses = [createMockAnalysis()];
    const summary = generateSummaryReport(analyses);
    expect(summary).toContain('WISDOM OF THE DAY');
    expect(summary).toContain('每日智慧');
  });
});
