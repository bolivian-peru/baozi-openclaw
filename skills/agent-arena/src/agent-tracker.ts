/**
 * Agent Tracker
 *
 * Polls `get_positions` for each tracked wallet and maintains a live
 * AgentStats object per agent. Detects new bets and updates streaks.
 */

import { McpClient, RawPosition } from './mcp-client';
import { MarketMonitor } from './market-monitor';
import {
  AgentStats,
  AgentPosition,
  ResolvedBet,
  MarketSide,
} from './types';
import { config } from './config';

export class AgentTracker {
  private client: McpClient;
  private monitor: MarketMonitor;
  private agents: Map<string, AgentStats> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(client: McpClient, monitor: MarketMonitor) {
    this.client = client;
    this.monitor = monitor;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  getAgent(wallet: string): AgentStats | undefined {
    return this.agents.get(wallet);
  }

  getAllAgents(): AgentStats[] {
    return Array.from(this.agents.values());
  }

  start(): void {
    // Initialise stubs so the dashboard can render immediately
    for (const wallet of config.agentWallets) {
      if (!this.agents.has(wallet)) {
        this.agents.set(wallet, this.createEmpty(wallet));
      }
    }

    this.pollAll().catch(() => {/* non-fatal on first run */});
    this.timer = setInterval(() => {
      this.pollAll().catch(() => {/* keep polling on errors */});
    }, config.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------

  private async pollAll(): Promise<void> {
    await Promise.allSettled(
      config.agentWallets.map((wallet) => this.pollAgent(wallet)),
    );
  }

  private async pollAgent(wallet: string): Promise<void> {
    const rawPositions = await this.client.getPositions(wallet);
    const existing = this.agents.get(wallet) ?? this.createEmpty(wallet);
    const updated = this.buildStats(wallet, existing, rawPositions);
    this.agents.set(wallet, updated);
  }

  // -------------------------------------------------------------------------
  // Stats computation
  // -------------------------------------------------------------------------

  private buildStats(
    wallet: string,
    existing: AgentStats,
    rawPositions: RawPosition[],
  ): AgentStats {
    const currentPositions: AgentPosition[] = [];
    const resolvedBets: ResolvedBet[] = [];

    for (const raw of rawPositions) {
      const side = this.parseSide(raw.side);
      const amount = this.toSol(raw.amount);
      const marketPda = String(raw.market_pda ?? '');
      const question = String(raw.question ?? 'Unknown market');

      if (raw.resolved) {
        // Settled bet
        const payout = this.toSol(raw.payout ?? 0);
        const won = payout > amount;
        resolvedBets.push({
          marketPda,
          marketQuestion: question,
          side,
          amount,
          payout,
          won,
          resolvedAt: new Date(),
        });
      } else {
        // Open position — compute unrealised P&L from current market odds
        const market = this.monitor.getMarket(marketPda);
        let currentOdds = 0.5;
        if (market) {
          currentOdds = side === 'YES' ? market.yesOdds : market.noOdds;
        }
        // Unrealised P&L = (1/currentOdds) * amount - amount (if market closes at currentOdds)
        const payout = currentOdds > 0 ? (1 / currentOdds) * amount : amount * 2;
        const unrealisedPnl = payout - amount;

        currentPositions.push({
          marketPda,
          marketQuestion: question,
          side,
          amount,
          unrealisedPnl,
          currentOdds,
          timestamp: new Date(),
        });
      }
    }

    // Prefer data already known for markets we have not re-queried yet
    // (merge resolved bets with previously known ones to build history)
    const mergedResolved = this.mergeResolved(existing.resolvedBets, resolvedBets);

    const wins = mergedResolved.filter((b) => b.won).length;
    const losses = mergedResolved.filter((b) => !b.won).length;
    const totalBets = wins + losses + currentPositions.length;
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const volume =
      mergedResolved.reduce((s, b) => s + b.amount, 0) +
      currentPositions.reduce((s, p) => s + p.amount, 0);
    const realisedPnl = mergedResolved.reduce(
      (s, b) => s + (b.payout - b.amount),
      0,
    );
    const unrealisedPnl = currentPositions.reduce(
      (s, p) => s + p.unrealisedPnl,
      0,
    );
    const totalPnl = realisedPnl + unrealisedPnl;
    const streak = this.computeStreak(mergedResolved);

    return {
      wallet,
      label: this.shortLabel(wallet),
      currentPositions,
      resolvedBets: mergedResolved,
      realisedPnl,
      unrealisedPnl,
      totalPnl,
      totalBets,
      wins,
      losses,
      winRate,
      volume,
      streak,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Merge two arrays of resolved bets, deduplicating by marketPda+side.
   */
  private mergeResolved(existing: ResolvedBet[], incoming: ResolvedBet[]): ResolvedBet[] {
    const map = new Map<string, ResolvedBet>();
    for (const b of existing) map.set(`${b.marketPda}-${b.side}`, b);
    for (const b of incoming) map.set(`${b.marketPda}-${b.side}`, b);
    return Array.from(map.values());
  }

  /**
   * Compute winning/losing streak from resolved bets (ordered by resolvedAt).
   * Returns a positive integer for a win streak, negative for a loss streak.
   */
  private computeStreak(resolved: ResolvedBet[]): number {
    if (resolved.length === 0) return 0;
    const sorted = [...resolved].sort(
      (a, b) => a.resolvedAt.getTime() - b.resolvedAt.getTime(),
    );
    let streak = 0;
    const last = sorted[sorted.length - 1];
    const winning = last.won;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].won === winning) {
        streak++;
      } else {
        break;
      }
    }
    return winning ? streak : -streak;
  }

  private createEmpty(wallet: string): AgentStats {
    return {
      wallet,
      label: this.shortLabel(wallet),
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
      lastUpdated: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  private parseSide(raw: unknown): MarketSide {
    const s = String(raw ?? '').toUpperCase();
    return s === 'NO' ? 'NO' : 'YES';
  }

  private toSol(v: unknown): number {
    const n = Number(v ?? 0);
    if (isNaN(n)) return 0;
    return n > 1000 ? n / 1_000_000_000 : n;
  }

  /**
   * Generate a readable short label from a base58 wallet address.
   * e.g. "FyzVsqsBnUo" -> "Agent-FyzV"
   */
  private shortLabel(wallet: string): string {
    return `Agent-${wallet.slice(0, 4)}`;
  }
}
