import { describe, it, expect } from 'vitest';
import { generateReport } from '../src/report-generator';
import { NotableEvent } from '../src/baozi-api';

function makeEvent(type: NotableEvent['type'], question: string): NotableEvent {
  return {
    type,
    detail: 'test',
    market: {
      publicKey: '123',
      marketId: 1,
      question,
      status: 'Active',
      outcome: 'Unresolved',
      yesPercent: 60,
      noPercent: 40,
      totalPoolSol: 10,
      closingTime: new Date(Date.now() + 86400000).toISOString(),
      isBettingOpen: true
    }
  };
}

describe('Report Generator', () => {
  it('generates a report with header and footer', async () => {
    const events = [makeEvent('new_market', 'Will BTC hit 100k?')];
    const report = await generateReport(events);
    
    expect(report.toLowerCase()).toContain('night kitchen');
    expect(report.toLowerCase()).toContain('baozi.bet');
  });

  it('includes proverbs', async () => {
    const events = [makeEvent('new_market', 'Will BTC hit 100k?')];
    const report = await generateReport(events);
    // Check for Chinese characters
    expect(report).toMatch(/[\u4e00-\u9fff]/);
  });

  it('includes market details', async () => {
    const events = [makeEvent('new_market', 'Will BTC hit 100k?')];
    const report = await generateReport(events);
    expect(report).toContain('Will BTC hit 100k?');
    expect(report).toContain('10.0 SOL');
  });
});
