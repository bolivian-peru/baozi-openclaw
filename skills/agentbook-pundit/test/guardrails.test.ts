import { describe, it, expect } from 'vitest';
import { containsPredictiveLanguage, sanitize, getGuardrailPromptSuffix, isV7Banned } from '../src/guardrails';

describe('Guardrail Compliance', () => {
  describe('containsPredictiveLanguage', () => {
    const openMarketViolations = [
      'YES is likely to win based on current trends',
      'This should resolve YES by next week',
      'I think BTC will break 100k easily',
      'I believe the market is underpricing this',
      'There is a strong chance of resolution',
      'Market is leaning towards YES',
      'Probably YES given recent momentum',
      'I predict a YES outcome',
      'BTC will certainly break through',
      'Confident that YES is the right call',
    ];

    for (const text of openMarketViolations) {
      it(`detects: "${text.substring(0, 50)}..."`, () => {
        const result = containsPredictiveLanguage(text);
        expect(result.hasPrediction).toBe(true);
        expect(result.matches.length).toBeGreaterThan(0);
      });
    }

    const factualStatements = [
      'Current odds: YES 65% / NO 35%. Pool: 2.5 SOL.',
      'Market closes in 48 hours. 3.2 SOL in the pool.',
      'YES odds have shifted from 55% to 72% in the last 6 hours.',
      'Pool increased by 1.5 SOL since yesterday.',
      'Category: Crypto. Tags: bitcoin, price milestone.',
      'Quality score: 85/100. Timing compliant.',
    ];

    for (const text of factualStatements) {
      it(`allows: "${text.substring(0, 50)}..."`, () => {
        const result = containsPredictiveLanguage(text);
        expect(result.hasPrediction).toBe(false);
      });
    }
  });

  describe('sanitize', () => {
    it('removes predictive language', () => {
      const content = 'I think BTC will break 100k. Current pool is 2.5 SOL.';
      const sanitized = sanitize(content);
      expect(sanitized).not.toMatch(/I think/i);
      expect(sanitized).toContain('2.5 SOL');
    });

    it('preserves factual content', () => {
      const content = 'YES 65% / NO 35%. Pool: 2.5 SOL. Closes in 48h.';
      expect(sanitize(content)).toBe(content);
    });
  });

  describe('getGuardrailPromptSuffix', () => {
    it('includes restriction for open markets', () => {
      const suffix = getGuardrailPromptSuffix(true);
      expect(suffix).toContain('MUST NOT');
      expect(suffix).toContain('OPEN');
    });

    it('allows analysis for closed markets', () => {
      const suffix = getGuardrailPromptSuffix(false);
      expect(suffix).toContain('closed');
      expect(suffix).toContain('retrospective');
    });
  });
});

describe('Parimutuel Rules v7.0', () => {
  it('flags price prediction markets as banned', () => {
    expect(isV7Banned('Will BTC be above $100000?').banned).toBe(true);
    expect(isV7Banned('Will SOL reach $300 by Q2?').banned).toBe(true);
    expect(isV7Banned('Will Bitcoin price exceed $150000?').banned).toBe(true);
  });

  it('flags measurement-period markets as banned', () => {
    expect(isV7Banned('Will volume during this week exceed 1M?').banned).toBe(true);
  });

  it('allows event-based markets', () => {
    expect(isV7Banned('Will OpenAI announce GPT-5 by April?').banned).toBe(false);
    expect(isV7Banned('Who will win the BAFTA?').banned).toBe(false);
    expect(isV7Banned('Will @baozibet tweet a pizza emoji by March 1?').banned).toBe(false);
  });
});
