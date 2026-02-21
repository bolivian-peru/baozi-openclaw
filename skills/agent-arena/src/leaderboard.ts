/**
 * Leaderboard
 *
 * Ranks agents by a composite score and exposes sorted views
 * by different metrics (P&L, win rate, volume, streak).
 */

import { AgentTracker } from './agent-tracker';
import { AgentStats, LeaderboardEntry, LeaderboardSortKey } from './types';

export class Leaderboard {
  private tracker: AgentTracker;
  private entries: LeaderboardEntry[] = [];

  constructor(tracker: AgentTracker) {
    this.tracker = tracker;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Recompute rankings from current agent data. */
  refresh(): void {
    const agents = this.tracker.getAllAgents();
    const scored = agents.map((agent) => ({
      rank: 0,
      agent,
      score: this.compositeScore(agent),
    }));

    // Sort descending by composite score
    scored.sort((a, b) => b.score - a.score);

    // Assign ranks
    this.entries = scored.map((entry, i) => ({ ...entry, rank: i + 1 }));
  }

  /**
   * Return the leaderboard sorted by the given key.
   */
  getSorted(by: LeaderboardSortKey = 'score'): LeaderboardEntry[] {
    const copy = [...this.entries];
    switch (by) {
      case 'pnl':
        return copy.sort((a, b) => b.agent.totalPnl - a.agent.totalPnl);
      case 'winRate':
        return copy.sort((a, b) => b.agent.winRate - a.agent.winRate);
      case 'volume':
        return copy.sort((a, b) => b.agent.volume - a.agent.volume);
      case 'streak':
        return copy.sort((a, b) => b.agent.streak - a.agent.streak);
      case 'score':
      default:
        return copy; // already sorted by score
    }
  }

  getEntries(): LeaderboardEntry[] {
    return this.entries;
  }

  getTopN(n: number, by: LeaderboardSortKey = 'score'): LeaderboardEntry[] {
    return this.getSorted(by).slice(0, n);
  }

  getEntry(wallet: string): LeaderboardEntry | undefined {
    return this.entries.find((e) => e.agent.wallet === wallet);
  }

  // -------------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------------

  /**
   * Composite score = win_rate_fraction * max(0, totalPnl + volume_bonus)
   *
   * This rewards agents who are both accurate (high win rate) and profitable.
   * A tiny volume bonus prevents zero-activity agents from outranking active ones.
   */
  private compositeScore(agent: AgentStats): number {
    const winFrac = agent.winRate / 100; // 0-1
    // Give a floor so agents with no bets don't crash to 0
    const pnlComponent = Math.max(-10, agent.totalPnl) + 1 + agent.volume * 0.01;
    return winFrac * pnlComponent;
  }

  // -------------------------------------------------------------------------
  // Formatting helpers (used by dashboard)
  // -------------------------------------------------------------------------

  static formatPnl(sol: number): string {
    const sign = sol >= 0 ? '+' : '';
    return `${sign}${sol.toFixed(2)}`;
  }

  static formatStreak(streak: number): string {
    if (streak === 0) return '-';
    if (streak > 0) return `W${streak}`;
    return `L${Math.abs(streak)}`;
  }

  static formatWinRate(rate: number): string {
    return `${rate.toFixed(1)}%`;
  }
}
