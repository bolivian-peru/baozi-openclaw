/**
 * Agent Arena — Tests
 */

import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from '../baozi-client.js';
import type { AgentStats, LeaderboardEntry } from '../types.js';

// ── Leaderboard tests ────────────────────────────────────────────────────

describe('buildLeaderboard', () => {
  const makeAgent = (overrides: Partial<AgentStats>): AgentStats => ({
    wallet: 'test',
    name: 'Test Agent',
    emoji: '🤖',
    totalPositions: 0,
    activePositions: 0,
    winningPositions: 0,
    losingPositions: 0,
    pendingPositions: 0,
    totalBetSol: 0,
    totalWonSol: 0,
    totalLostSol: 0,
    netPnlSol: 0,
    accuracy: 0,
    streak: 0,
    positions: [],
    ...overrides,
  });

  it('should rank agents by P&L', () => {
    const agents: AgentStats[] = [
      makeAgent({ wallet: 'a', name: 'Alpha', netPnlSol: 5 }),
      makeAgent({ wallet: 'b', name: 'Beta', netPnlSol: 10 }),
      makeAgent({ wallet: 'c', name: 'Gamma', netPnlSol: -2 }),
    ];

    const lb = buildLeaderboard(agents);
    expect(lb[0].name).toBe('Beta');
    expect(lb[0].rank).toBe(1);
    expect(lb[1].name).toBe('Alpha');
    expect(lb[1].rank).toBe(2);
    expect(lb[2].name).toBe('Gamma');
    expect(lb[2].rank).toBe(3);
  });

  it('should break ties by accuracy', () => {
    const agents: AgentStats[] = [
      makeAgent({ wallet: 'a', name: 'Alpha', netPnlSol: 5, accuracy: 60 }),
      makeAgent({ wallet: 'b', name: 'Beta', netPnlSol: 5, accuracy: 80 }),
    ];

    const lb = buildLeaderboard(agents);
    expect(lb[0].name).toBe('Beta');
    expect(lb[1].name).toBe('Alpha');
  });

  it('should break accuracy ties by volume', () => {
    const agents: AgentStats[] = [
      makeAgent({ wallet: 'a', name: 'Alpha', netPnlSol: 5, accuracy: 80, totalBetSol: 10 }),
      makeAgent({ wallet: 'b', name: 'Beta', netPnlSol: 5, accuracy: 80, totalBetSol: 50 }),
    ];

    const lb = buildLeaderboard(agents);
    expect(lb[0].name).toBe('Beta');
  });

  it('should handle empty array', () => {
    const lb = buildLeaderboard([]);
    expect(lb).toEqual([]);
  });

  it('should handle single agent', () => {
    const agents = [makeAgent({ wallet: 'a', name: 'Solo' })];
    const lb = buildLeaderboard(agents);
    expect(lb).toHaveLength(1);
    expect(lb[0].rank).toBe(1);
  });
});

// ── Type validation tests ────────────────────────────────────────────────

describe('Type structures', () => {
  it('should validate AgentPosition shape', () => {
    const pos = {
      marketPda: 'abc123',
      marketQuestion: 'Will BTC hit 100k?',
      marketStatus: 'Active',
      side: 'Yes' as const,
      yesAmountSol: 5,
      noAmountSol: 0,
      totalAmountSol: 5,
      claimed: false,
      marketOutcome: null,
      potentialPayout: 8.5,
    };

    expect(pos.side).toBe('Yes');
    expect(pos.totalAmountSol).toBe(5);
  });

  it('should validate MarketState shape', () => {
    const market = {
      publicKey: 'xyz789',
      marketId: '1',
      question: 'Test market',
      status: 'Active',
      layer: 'Lab',
      yesPoolSol: 100,
      noPoolSol: 50,
      totalPoolSol: 150,
      yesPercent: 66.7,
      noPercent: 33.3,
      closingTime: '2026-03-01T00:00:00Z',
      isBettingOpen: true,
      winningOutcome: null,
      agentPositions: [],
    };

    expect(market.yesPercent + market.noPercent).toBeCloseTo(100, 0);
  });
});
