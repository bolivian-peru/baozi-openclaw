/**
 * Tests for formatting utilities
 */
import { describe, it, expect } from 'vitest';
import {
  formatSol,
  formatPercent,
  formatCountdown,
  truncateQuestion,
  asciiOddsBar,
  htmlOddsBar,
  formatStatus,
  formatLayer,
  escapeHtml,
  oddsEmoji,
} from '../utils/formatting.js';

describe('formatSol', () => {
  it('formats large amounts with K suffix', () => {
    expect(formatSol(1500)).toBe('1.5K SOL');
    expect(formatSol(10000)).toBe('10.0K SOL');
  });

  it('formats regular amounts with 2 decimal places', () => {
    expect(formatSol(5.5)).toBe('5.50 SOL');
    expect(formatSol(100)).toBe('100.00 SOL');
  });

  it('formats small amounts with 3 decimal places', () => {
    expect(formatSol(0.05)).toBe('0.050 SOL');
    expect(formatSol(0.123)).toBe('0.123 SOL');
  });

  it('formats tiny amounts with 4 decimal places', () => {
    expect(formatSol(0.001)).toBe('0.0010 SOL');
    expect(formatSol(0.0001)).toBe('0.0001 SOL');
  });
});

describe('formatPercent', () => {
  it('formats normal percentages', () => {
    expect(formatPercent(50)).toBe('50.0%');
    expect(formatPercent(75.5)).toBe('75.5%');
  });

  it('caps very high percentages', () => {
    expect(formatPercent(99.8)).toBe('99.5%+');
    expect(formatPercent(100)).toBe('99.5%+');
  });

  it('shows minimum for very low percentages', () => {
    expect(formatPercent(0.2)).toBe('<0.5%');
    expect(formatPercent(0)).toBe('<0.5%');
  });
});

describe('formatCountdown', () => {
  it('shows days and hours for long durations', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000);
    const result = formatCountdown(future.toISOString());
    expect(result).toMatch(/2d \dh left/);
  });

  it('shows hours and minutes for medium durations', () => {
    const future = new Date(Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000);
    const result = formatCountdown(future.toISOString());
    expect(result).toMatch(/5h 30m left/);
  });

  it('shows minutes only for short durations', () => {
    const future = new Date(Date.now() + 45 * 60 * 1000);
    const result = formatCountdown(future.toISOString());
    expect(result).toMatch(/45m left/);
  });

  it('shows Closed for past times', () => {
    const past = new Date(Date.now() - 60000);
    expect(formatCountdown(past.toISOString())).toBe('Closed');
  });
});

describe('truncateQuestion', () => {
  it('returns short questions unchanged', () => {
    expect(truncateQuestion('Will BTC hit $100k?')).toBe('Will BTC hit $100k?');
  });

  it('truncates long questions with ellipsis', () => {
    const longQ = 'A'.repeat(120);
    const result = truncateQuestion(longQ, 100);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects custom max length', () => {
    const result = truncateQuestion('This is a test question', 10);
    expect(result.length).toBe(10);
  });
});

describe('asciiOddsBar', () => {
  it('generates correct bar width', () => {
    const bar = asciiOddsBar(50, 10);
    expect(bar).toBe('🟢🟢🟢🟢🟢🔴🔴🔴🔴🔴');
  });

  it('handles 100% YES', () => {
    const bar = asciiOddsBar(100, 5);
    expect(bar).toBe('🟢🟢🟢🟢🟢');
  });

  it('handles 0% YES', () => {
    const bar = asciiOddsBar(0, 5);
    expect(bar).toBe('🔴🔴🔴🔴🔴');
  });
});

describe('htmlOddsBar', () => {
  it('generates HTML with correct widths', () => {
    const html = htmlOddsBar(75, '#22c55e', '#ef4444');
    expect(html).toContain('width:75%');
    expect(html).toContain('width:25%');
    expect(html).toContain('#22c55e');
    expect(html).toContain('#ef4444');
  });
});

describe('formatStatus', () => {
  it('maps all known statuses', () => {
    expect(formatStatus('Active')).toBe('🟢 Live');
    expect(formatStatus('Closed')).toBe('🔴 Closed');
    expect(formatStatus('Resolved')).toBe('✅ Resolved');
    expect(formatStatus('Cancelled')).toBe('❌ Cancelled');
    expect(formatStatus('Paused')).toBe('⏸️ Paused');
    expect(formatStatus('Disputed')).toBe('⚠️ Disputed');
  });

  it('returns unknown status as-is', () => {
    expect(formatStatus('Unknown')).toBe('Unknown');
  });
});

describe('formatLayer', () => {
  it('maps known layers', () => {
    expect(formatLayer('Official')).toBe('🏛️ Official');
    expect(formatLayer('Lab')).toBe('🧪 Lab');
    expect(formatLayer('Private')).toBe('🔒 Private');
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });
});

describe('oddsEmoji', () => {
  it('returns fire for high odds', () => {
    expect(oddsEmoji(90)).toBe('🔥');
  });

  it('returns chart for medium-high', () => {
    expect(oddsEmoji(65)).toBe('📈');
  });

  it('returns balance for even odds', () => {
    expect(oddsEmoji(50)).toBe('⚖️');
  });

  it('returns cold for low odds', () => {
    expect(oddsEmoji(10)).toBe('❄️');
  });
});
