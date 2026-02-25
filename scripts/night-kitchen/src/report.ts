/**
 * report.ts — format bilingual market reports
 *
 * generates baozi-style reports: lowercase, warm, kitchen metaphors.
 * each market gets a matched chinese proverb.
 */

import type { Market, BooleanMarket, RaceMarket } from "./markets.js";
import { selectProverb, selectClosingProverb, type MarketContext } from "./proverbs.js";

const DIVIDER = "───────────────";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  if (isNaN(target)) return 0;
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function formatSol(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K SOL`;
  if (amount >= 1) return `${amount.toFixed(1)} SOL`;
  return `${amount.toFixed(2)} SOL`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function buildMarketContext(market: Market): MarketContext {
  const days = daysUntil(market.closingTime);
  let oddsSpread = 0.5;

  if (market.type === "boolean") {
    oddsSpread = Math.abs(market.yesPrice - market.noPrice);
  } else if (market.type === "race" && market.options.length >= 2) {
    const sorted = [...market.options].sort((a, b) => b.probability - a.probability);
    oddsSpread = sorted[0].probability - sorted[1].probability;
  }

  return {
    daysUntilClose: days,
    poolSol: market.poolSol,
    isRace: market.type === "race",
    oddsSpread,
    isResolved: market.resolved,
    category: market.category,
  };
}

function formatBooleanMarket(m: BooleanMarket, days: number): string {
  const closing = days > 0 ? `closing in ${days} day${days === 1 ? "" : "s"}` : "closing soon";
  return [
    `🥟 "${m.question}"`,
    `   YES: ${pct(m.yesPrice)} | NO: ${pct(m.noPrice)} | pool: ${formatSol(m.poolSol)}`,
    `   ${closing}`,
  ].join("\n");
}

function formatRaceMarket(m: RaceMarket, days: number): string {
  const closing = days > 0 ? `closing in ${days} day${days === 1 ? "" : "s"}` : "closing soon";
  const optionLines = m.options
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4)
    .map((o) => `${o.name}: ${pct(o.probability)}`)
    .join(" | ");

  return [
    `🥟 "${m.question}"`,
    `   ${optionLines}`,
    `   pool: ${formatSol(m.poolSol)} | ${closing}`,
  ].join("\n");
}

export interface ReportOptions {
  maxMarkets?: number;
}

export function generateReport(markets: Market[], opts: ReportOptions = {}): string {
  const maxMarkets = opts.maxMarkets ?? 5;
  const now = new Date();
  const dateStr = formatDate(now.toISOString());

  // separate active (with bets) and resolved, skip empty markets
  const active = markets.filter((m) => !m.resolved && m.poolSol > 0);
  const resolved = markets.filter((m) => m.resolved && m.poolSol > 0);

  // pick top markets by pool size
  const featured = active
    .sort((a, b) => b.poolSol - a.poolSol)
    .slice(0, maxMarkets);

  if (featured.length === 0) {
    return [
      "夜厨房 — night kitchen report",
      dateStr,
      "",
      "the kitchen is quiet tonight. no markets cooking.",
      "",
      "好饭不怕晚 — good food doesn't fear being late.",
      "",
      "baozi.bet | 小小一笼，大大缘分",
    ].join("\n");
  }

  const usedProverbs = new Set<number>();
  const totalPool = active.reduce((sum, m) => sum + m.poolSol, 0);

  const lines: string[] = [
    "夜厨房 — night kitchen report",
    dateStr,
    "",
  ];

  // header summary
  if (resolved.length > 0) {
    lines.push(
      `${resolved.length} market${resolved.length === 1 ? "" : "s"} resolved today. grandma checked the evidence.`
    );
    lines.push("");
  }

  // featured markets with proverbs
  for (const market of featured) {
    const days = daysUntil(market.closingTime);
    const ctx = buildMarketContext(market);

    if (market.type === "boolean") {
      lines.push(formatBooleanMarket(market, days));
    } else {
      lines.push(formatRaceMarket(market, days));
    }

    lines.push("");

    // contextual proverb
    const { proverb, index } = selectProverb(ctx, usedProverbs);
    usedProverbs.add(index);
    lines.push(`   ${proverb.chinese}`);
    lines.push(`   "${proverb.english}"`);
    lines.push("");
  }

  // footer
  lines.push(DIVIDER);
  lines.push("");
  lines.push(
    `${active.length} market${active.length === 1 ? "" : "s"} cooking. ` +
      `${resolved.length} resolved. ` +
      `total pool: ${formatSol(totalPool)}`
  );
  lines.push("");

  // closing proverb
  const closing = selectClosingProverb(usedProverbs);
  lines.push(`${closing.chinese} — ${closing.english}`);
  lines.push("");
  lines.push("baozi.bet | 小小一笼，大大缘分");

  // risk disclaimer (brand voice)
  lines.push("");
  lines.push("this is still gambling. play small, play soft. 🥟");

  return lines.join("\n");
}
