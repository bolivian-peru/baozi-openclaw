/**
 * Tests for baozi/types.ts — type shapes and data formatting
 */
import { describe, it, expect } from 'vitest';
import type { Market, RaceMarket, Position, PositionSummary, RaceOutcome } from '../baozi/types.js';

describe('Market type shape', () => {
  it('can construct a valid Market object', () => {
    const market: Market = {
      publicKey: 'abc123',
      marketId: '1',
      question: 'Test?',
      closingTime: new Date().toISOString(),
      resolutionTime: new Date().toISOString(),
      status: 'Active',
      statusCode: 0,
      winningOutcome: null,
      yesPoolSol: 10,
      noPoolSol: 5,
      totalPoolSol: 15,
      yesPercent: 66.67,
      noPercent: 33.33,
      platformFeeBps: 250,
      layer: 'Official',
      layerCode: 0,
      creator: 'creator123',
      hasBets: true,
      isBettingOpen: true,
    };
    expect(market.status).toBe('Active');
    expect(market.yesPercent + market.noPercent).toBeCloseTo(100, 0);
  });
});

describe('Position type shape', () => {
  it('can construct a valid Position object', () => {
    const pos: Position = {
      publicKey: 'pos1',
      user: 'user1',
      marketId: '42',
      yesAmountSol: 1.5,
      noAmountSol: 0,
      totalAmountSol: 1.5,
      side: 'Yes',
      claimed: false,
    };
    expect(pos.side).toBe('Yes');
    expect(pos.totalAmountSol).toBe(pos.yesAmountSol + pos.noAmountSol);
  });

  it('side can be Yes, No, or Both', () => {
    const sides: Position['side'][] = ['Yes', 'No', 'Both'];
    expect(sides).toHaveLength(3);
  });
});

describe('RaceOutcome type shape', () => {
  it('can construct a valid RaceOutcome', () => {
    const outcome: RaceOutcome = {
      index: 0,
      label: 'BTC',
      poolSol: 100,
      percent: 50,
    };
    expect(outcome.label).toBe('BTC');
  });
});

describe('PositionSummary type shape', () => {
  it('can construct a valid PositionSummary', () => {
    const summary: PositionSummary = {
      wallet: 'abc',
      totalPositions: 5,
      totalBetSol: 10,
      activePositions: 3,
      winningPositions: 1,
      losingPositions: 1,
      pendingPositions: 3,
      positions: [],
    };
    expect(summary.totalPositions).toBe(
      summary.winningPositions + summary.losingPositions + summary.pendingPositions
    );
  });
});
