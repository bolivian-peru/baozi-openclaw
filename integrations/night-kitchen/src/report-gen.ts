/**
 * Night Kitchen Report Generator
 *
 * Generates bilingual (English + Mandarin) market reports
 * in the Baozi brand voice: lowercase, warm, kitchen metaphors.
 */
import { format, differenceInDays, differenceInHours } from "date-fns";
import { selectProverb, selectProverbs, type Proverb } from "./proverbs.js";
import type { MarketData, RaceMarketData, RaceOutcome } from "./mcp-client.js";

/** Infer the proverb context from market characteristics. */
function inferContext(market: {
  closingTime: string;
  totalPoolSol: number;
  yesPercent?: number;
  noPercent?: number;
  outcomes?: RaceOutcome[];
  status?: string;
}): string {
  const now = new Date();
  const close = new Date(market.closingTime);
  const hoursLeft = differenceInHours(close, now);

  // resolved markets get warmth
  if (market.status === "Resolved" || market.status === "resolved") {
    return "warmth";
  }

  // closing within 24h
  if (hoursLeft <= 24 && hoursLeft > 0) {
    return "closing";
  }

  // high stakes (> 20 SOL pool)
  if (market.totalPoolSol > 20) {
    return "risk";
  }

  // close race (within 10% spread)
  if (market.yesPercent !== undefined && market.noPercent !== undefined) {
    if (Math.abs(market.yesPercent - market.noPercent) < 10) {
      return "luck";
    }
  }

  // multi-outcome close race
  if (market.outcomes && market.outcomes.length >= 2) {
    const sorted = [...market.outcomes].sort((a, b) => b.percent - a.percent);
    if (sorted.length >= 2 && sorted[0].percent - sorted[1].percent < 10) {
      return "luck";
    }
  }

  // long-dated market (> 7 days)
  if (hoursLeft > 168) {
    return "patience";
  }

  return "patience";
}

/** Format time remaining in baozi voice. */
function timeRemaining(closingTime: string): string {
  const now = new Date();
  const close = new Date(closingTime);
  const days = differenceInDays(close, now);
  const hours = differenceInHours(close, now);

  if (hours <= 0) return "closed";
  if (hours < 24) return `closing in ${hours} hours`;
  if (days === 1) return "closing tomorrow";
  return `closing in ${days} days`;
}

/** Format a boolean market entry. */
function formatBooleanMarket(m: MarketData, proverb: Proverb): string {
  const lines: string[] = [];
  lines.push(`🥟 "${m.question}"`);
  lines.push(
    `   YES: ${m.yesPercent}% | NO: ${m.noPercent}% | Pool: ${m.totalPoolSol.toFixed(1)} SOL`
  );
  lines.push(`   ${timeRemaining(m.closingTime)}`);
  lines.push("");
  lines.push(`   ${proverb.chinese}`);
  lines.push(`   "${proverb.english} — ${proverb.kitchen}"`);
  return lines.join("\n");
}

/** Format a race market entry. */
function formatRaceMarket(
  m: RaceMarketData,
  proverb: Proverb
): string {
  const lines: string[] = [];
  lines.push(`🥟 "${m.question}"`);

  // show top outcomes (up to 4)
  const sorted = [...m.outcomes].sort((a, b) => b.percent - a.percent);
  const display = sorted.slice(0, 4);
  for (const o of display) {
    lines.push(`   ${o.label}: ${o.percent}%`);
  }
  if (sorted.length > 4) {
    lines.push(`   + ${sorted.length - 4} more`);
  }

  lines.push(`   Pool: ${m.totalPoolSol.toFixed(1)} SOL | ${timeRemaining(m.closingTime)}`);
  lines.push("");
  lines.push(`   ${proverb.chinese}`);
  lines.push(`   "${proverb.english} — ${proverb.kitchen}"`);
  return lines.join("\n");
}

export interface ReportInput {
  booleanMarkets: MarketData[];
  raceMarkets: RaceMarketData[];
}

/**
 * Generate the full bilingual night kitchen report.
 */
export function generateReport(input: ReportInput): string {
  const now = new Date();
  const dateStr = format(now, "MMM d, yyyy").toLowerCase();
  const allMarkets = [
    ...input.booleanMarkets.map((m) => ({
      type: "boolean" as const,
      data: m,
      pool: m.totalPoolSol,
      closingTime: m.closingTime,
    })),
    ...input.raceMarkets.map((m) => ({
      type: "race" as const,
      data: m,
      pool: m.totalPoolSol,
      closingTime: m.closingTime,
    })),
  ];

  // sort by pool size descending (most active first)
  allMarkets.sort((a, b) => b.pool - a.pool);

  // take top markets (up to 5 for readability)
  const featured = allMarkets.slice(0, 5);

  // collect contexts for proverb selection
  const contexts = featured.map((m) => {
    if (m.type === "boolean") {
      const d = m.data as MarketData;
      return inferContext({
        closingTime: d.closingTime,
        totalPoolSol: d.totalPoolSol,
        yesPercent: d.yesPercent,
        noPercent: d.noPercent,
        status: d.status,
      });
    } else {
      const d = m.data as RaceMarketData;
      return inferContext({
        closingTime: d.closingTime,
        totalPoolSol: d.totalPoolSol,
        outcomes: d.outcomes,
        status: d.status,
      });
    }
  });

  // select unique proverbs for each market
  const proverbs = selectProverbs(contexts, featured.length);

  // build report
  const lines: string[] = [];

  lines.push("夜厨房 — night kitchen report");
  lines.push(dateStr);
  lines.push("");
  lines.push(
    `${allMarkets.length} markets cooking. grandma is watching the steam.`
  );
  lines.push("");

  for (let i = 0; i < featured.length; i++) {
    const m = featured[i];
    const proverb = proverbs[i] || selectProverb("warmth");

    if (m.type === "boolean") {
      lines.push(formatBooleanMarket(m.data as MarketData, proverb));
    } else {
      lines.push(formatRaceMarket(m.data as RaceMarketData, proverb));
    }
    lines.push("");
  }

  // summary line
  const totalPool = allMarkets.reduce((sum, m) => sum + m.pool, 0);
  lines.push("───────────────");
  lines.push("");
  lines.push(
    `${featured.length} markets featured. ${allMarkets.length} total. pool: ${totalPool.toFixed(1)} SOL`
  );
  lines.push("");

  // closing proverb
  const closing = selectProverb("warmth");
  lines.push(`${closing.chinese} — ${closing.english}.`);
  lines.push("");
  lines.push("baozi.bet | 小小一笼，大大缘分");
  lines.push("");
  lines.push("this is still gambling. play small, play soft.");

  return lines.join("\n");
}

/**
 * Generate a short report (under 2000 chars) suitable for AgentBook posting.
 */
export function generateShortReport(input: ReportInput): string {
  const now = new Date();
  const dateStr = format(now, "MMM d").toLowerCase();
  const allMarkets = [
    ...input.booleanMarkets.map((m) => ({
      type: "boolean" as const,
      data: m,
      pool: m.totalPoolSol,
    })),
    ...input.raceMarkets.map((m) => ({
      type: "race" as const,
      data: m,
      pool: m.totalPoolSol,
    })),
  ];
  allMarkets.sort((a, b) => b.pool - a.pool);

  const top = allMarkets.slice(0, 3);
  const totalPool = allMarkets.reduce((sum, m) => sum + m.pool, 0);

  const lines: string[] = [];
  lines.push(`夜厨房 — ${dateStr}`);
  lines.push("");

  for (const m of top) {
    if (m.type === "boolean") {
      const d = m.data as MarketData;
      lines.push(`🥟 ${d.question}`);
      lines.push(`YES ${d.yesPercent}% | NO ${d.noPercent}% | ${d.totalPoolSol.toFixed(1)} SOL`);
    } else {
      const d = m.data as RaceMarketData;
      lines.push(`🥟 ${d.question}`);
      const top2 = [...d.outcomes].sort((a, b) => b.percent - a.percent).slice(0, 2);
      lines.push(top2.map((o) => `${o.label} ${o.percent}%`).join(" | "));
    }
    lines.push("");
  }

  const proverb = selectProverb("warmth");
  lines.push(`${proverb.chinese}`);
  lines.push(`"${proverb.english}"`);
  lines.push("");
  lines.push(`${allMarkets.length} markets | ${totalPool.toFixed(1)} SOL total`);
  lines.push("baozi.bet");

  return lines.join("\n");
}
