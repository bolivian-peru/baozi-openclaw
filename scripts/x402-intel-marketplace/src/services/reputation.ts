import type { Analyst, Purchase } from "../types.ts";
import { toPercent } from "../lib/utils.ts";

export interface ScoreboardRow {
  rank: number;
  handle: string;
  reputation: number;
  accuracy: number;
  sales: number;
  revenueUsd: number;
  resolved: number;
  wins: number;
  losses: number;
}

export function applyOutcomeToAnalyst(analyst: Analyst, purchase: Purchase): Analyst {
  if (purchase.verdict === "pending") {
    return analyst;
  }

  const next = structuredClone(analyst);
  next.stats.resolved += 1;

  if (purchase.verdict === "win") {
    next.stats.wins += 1;
  } else if (purchase.verdict === "loss") {
    next.stats.losses += 1;
  }

  const totalResolved = next.stats.resolved;
  next.stats.accuracy = totalResolved > 0 ? toPercent(next.stats.wins / totalResolved) : 0;

  const winBias = totalResolved > 0 ? (next.stats.wins - next.stats.losses) / totalResolved : 0;
  const volumeBoost = Math.min(next.stats.sales, 20) * 0.6;
  const base = 50 + winBias * 35 + volumeBoost;
  next.stats.reputation = Math.max(1, Math.min(99, Math.round(base)));
  next.updatedAt = new Date().toISOString();

  return next;
}

export function buildScoreboard(analysts: Analyst[]): ScoreboardRow[] {
  const rows = analysts
    .map((item) => ({
      handle: item.handle,
      reputation: item.stats.reputation,
      accuracy: item.stats.accuracy,
      sales: item.stats.sales,
      revenueUsd: item.stats.revenueUsd,
      resolved: item.stats.resolved,
      wins: item.stats.wins,
      losses: item.stats.losses,
    }))
    .sort((a, b) => b.reputation - a.reputation || b.revenueUsd - a.revenueUsd)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return rows;
}
