import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectNotableEvents, BinaryMarket } from '../src/baozi-api';

function makeMarket(overrides: Partial<BinaryMarket> = {}): BinaryMarket {
  return {
    publicKey: 'ABC123',
    marketId: 1,
    question: 'Will it rain tomorrow?',
    status: 'Active',
    outcome: 'Unresolved',
    yesPercent: 55,
    noPercent: 45,
    totalPoolSol: 1.5,
    closingTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    isBettingOpen: true,
    ...overrides,
  };
}

describe('detectNotableEvents', () => {
  it('detects new markets (< 1 hour old)', () => {
    const m = makeMarket({
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'new_market')).toBe(true);
  });

  it('does not flag old markets as new', () => {
    const m = makeMarket({
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'new_market')).toBe(false);
  });

  it('detects markets closing soon (< 24h)', () => {
    const m = makeMarket({
      closingTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
    });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'closing_soon')).toBe(true);
  });

  it('does not flag distant markets as closing soon', () => {
    const m = makeMarket({
      closingTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
    });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'closing_soon')).toBe(false);
  });

  it('detects resolved markets', () => {
    const m = makeMarket({
      outcome: 'Yes',
      status: 'Resolved',
    });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'resolved')).toBe(true);
  });

  it('detects large pools (> 5 SOL)', () => {
    const m = makeMarket({ totalPoolSol: 10.5 });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'large_bet')).toBe(true);
  });

  it('does not flag small pools', () => {
    const m = makeMarket({ totalPoolSol: 1.2 });
    const events = detectNotableEvents([m]);
    expect(events.some(e => e.type === 'large_bet')).toBe(false);
  });

  it('detects odds shifts on second poll', () => {
    const m1 = makeMarket({ publicKey: 'SHIFT1', yesPercent: 50, noPercent: 50 });
    detectNotableEvents([m1]); // first snapshot

    const m2 = makeMarket({ publicKey: 'SHIFT1', yesPercent: 70, noPercent: 30 });
    const events = detectNotableEvents([m2]);
    expect(events.some(e => e.type === 'odds_shift')).toBe(true);
  });

  it('does not flag small odds changes', () => {
    const m1 = makeMarket({ publicKey: 'SMALL1', yesPercent: 50, noPercent: 50 });
    detectNotableEvents([m1]);

    const m2 = makeMarket({ publicKey: 'SMALL1', yesPercent: 55, noPercent: 45 });
    const events = detectNotableEvents([m2]);
    expect(events.some(e => e.type === 'odds_shift')).toBe(false);
  });

  it('handles empty market list', () => {
    const events = detectNotableEvents([]);
    expect(events).toEqual([]);
  });
});
