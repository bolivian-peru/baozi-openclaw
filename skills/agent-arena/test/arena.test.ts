/**
 * Agent Arena — Basic test structure
 *
 * These tests exercise the pure-logic modules (leaderboard scoring,
 * streak calculation, etc.) without requiring a live MCP connection.
 *
 * Run with: npx ts-node test/arena.test.ts
 */

import assert from 'assert';
import { Leaderboard } from '../src/leaderboard';
import { AgentStats, ResolvedBet, MarketSide } from '../src/types';

// ---------------------------------------------------------------------------
// Minimal stubs
// ---------------------------------------------------------------------------

function makeResolvedBet(
  won: boolean,
  amount: number,
  payout: number,
  side: MarketSide = 'YES',
  offsetMs = 0,
): ResolvedBet {
  return {
    marketPda: `pda-${Math.random().toString(36).slice(2)}`,
    marketQuestion: 'Test market?',
    side,
    amount,
    payout,
    won,
    resolvedAt: new Date(Date.now() - offsetMs),
  };
}

function makeAgent(overrides: Partial<AgentStats> = {}): AgentStats {
  return {
    wallet: 'TestWallet1111111111111111111111111111111111',
    label: 'Agent-Test',
    currentPositions: [],
    resolvedBets: [],
    realisedPnl: 0,
    unrealisedPnl: 0,
    totalPnl: 0,
    totalBets: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    volume: 0,
    streak: 0,
    lastUpdated: Date.now(),
    ...overrides,
  };
}

// Minimal stub for AgentTracker
class StubTracker {
  private agents: AgentStats[];
  constructor(agents: AgentStats[]) {
    this.agents = agents;
  }
  getAllAgents(): AgentStats[] {
    return this.agents;
  }
  getAgent(wallet: string): AgentStats | undefined {
    return this.agents.find((a) => a.wallet === wallet);
  }
}

// ---------------------------------------------------------------------------
// Helpers under test (re-implemented locally to avoid private member access)
// ---------------------------------------------------------------------------

function computeStreak(resolved: ResolvedBet[]): number {
  if (resolved.length === 0) return 0;
  const sorted = [...resolved].sort(
    (a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime(),
  );
  let streak = 0;
  const last = sorted[sorted.length - 1];
  const winning = last.won;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].won === winning) streak++;
    else break;
  }
  return winning ? streak : -streak;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  [FAIL] ${name}: ${message}`);
    failed++;
  }
}

console.log('\nAgent Arena — Unit Tests\n');

// ---- Leaderboard.formatPnl ----
test('formatPnl positive', () => {
  assert.strictEqual(Leaderboard.formatPnl(12.5), '+12.50');
});

test('formatPnl negative', () => {
  assert.strictEqual(Leaderboard.formatPnl(-3.14), '-3.14');
});

test('formatPnl zero', () => {
  assert.strictEqual(Leaderboard.formatPnl(0), '+0.00');
});

// ---- Leaderboard.formatStreak ----
test('formatStreak win streak', () => {
  assert.strictEqual(Leaderboard.formatStreak(3), 'W3');
});

test('formatStreak loss streak', () => {
  assert.strictEqual(Leaderboard.formatStreak(-2), 'L2');
});

test('formatStreak none', () => {
  assert.strictEqual(Leaderboard.formatStreak(0), '-');
});

// ---- Leaderboard.formatWinRate ----
test('formatWinRate', () => {
  assert.strictEqual(Leaderboard.formatWinRate(66.666), '66.7%');
});

// ---- computeStreak ----
test('streak: empty resolvedBets returns 0', () => {
  assert.strictEqual(computeStreak([]), 0);
});

test('streak: three consecutive wins', () => {
  const bets = [
    makeResolvedBet(true, 1, 2, 'YES', 3000),
    makeResolvedBet(true, 1, 2, 'YES', 2000),
    makeResolvedBet(true, 1, 2, 'YES', 1000),
  ];
  assert.strictEqual(computeStreak(bets), 3);
});

test('streak: two losses ending', () => {
  const bets = [
    makeResolvedBet(true, 1, 2, 'YES', 3000),
    makeResolvedBet(false, 1, 0, 'NO', 2000),
    makeResolvedBet(false, 1, 0, 'NO', 1000),
  ];
  assert.strictEqual(computeStreak(bets), -2);
});

test('streak: single win', () => {
  const bets = [makeResolvedBet(true, 1, 2)];
  assert.strictEqual(computeStreak(bets), 1);
});

// ---- Leaderboard ranking ----
test('leaderboard ranks by composite score', () => {
  const agentA = makeAgent({
    wallet: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    label: 'Agent-AAAA',
    winRate: 80,
    totalPnl: 10,
    volume: 20,
    totalBets: 10,
  });
  const agentB = makeAgent({
    wallet: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    label: 'Agent-BBBB',
    winRate: 40,
    totalPnl: -2,
    volume: 5,
    totalBets: 5,
  });

  const tracker = new StubTracker([agentA, agentB]) as unknown as import('../src/agent-tracker').AgentTracker;
  const lb = new Leaderboard(tracker);
  lb.refresh();
  const entries = lb.getEntries();

  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].rank, 1);
  assert.strictEqual(entries[0].agent.label, 'Agent-AAAA');
  assert.strictEqual(entries[1].rank, 2);
});

test('leaderboard getSorted by pnl', () => {
  const agentA = makeAgent({
    wallet: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    label: 'Agent-AAAA',
    winRate: 30,
    totalPnl: 50,
  });
  const agentB = makeAgent({
    wallet: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    label: 'Agent-BBBB',
    winRate: 90,
    totalPnl: 5,
  });

  const tracker = new StubTracker([agentA, agentB]) as unknown as import('../src/agent-tracker').AgentTracker;
  const lb = new Leaderboard(tracker);
  lb.refresh();
  const byPnl = lb.getSorted('pnl');

  // By default score Agent-BBBB may win (high winRate), but by pnl Agent-AAAA should win
  assert.strictEqual(byPnl[0].agent.label, 'Agent-AAAA');
});

// ---- Summary ----
console.log(`\n${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
