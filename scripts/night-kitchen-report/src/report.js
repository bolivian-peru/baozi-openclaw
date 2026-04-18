import { selectProverb } from "./proverbs.js";

function pickContext(market) {
  if (market.closesInHours >= 72) return "patience";
  if ((market.poolSol ?? 0) >= 50) return "risk";

  const spread = market.outcomes
    ? Math.abs((market.outcomes[0]?.[1] ?? 0.5) - (market.outcomes[1]?.[1] ?? 0.5))
    : Math.abs((market.yes ?? 0.5) - (market.no ?? 0.5));
  if (spread <= 0.08) return "luck";

  return "warmth";
}

function formatOdds(m) {
  if (m.outcomes) {
    return m.outcomes.map(([name, p]) => `${name}: ${Math.round(p * 100)}%`).join(" | ");
  }
  return `yes: ${Math.round((m.yes ?? 0) * 100)}% | no: ${Math.round((m.no ?? 0) * 100)}%`;
}

export function renderNightKitchenReport(markets, now = new Date()) {
  const used = new Set();
  const date = now.toISOString().slice(0, 10);

  const lines = [
    "夜厨房 — night kitchen report",
    date,
    "",
    `${markets.length} markets simmering tonight.`,
    ""
  ];

  for (const m of markets) {
    const ctx = pickContext(m);
    const proverb = selectProverb(ctx, used);

    lines.push(`🥟 ${m.question}`);
    lines.push(`   ${formatOdds(m)}`);
    lines.push(`   pool: ${(m.poolSol ?? 0).toFixed(1)} sol | closes in ${m.closesInHours}h`);
    lines.push("");
    lines.push(`   ${proverb.zh}`);
    lines.push(`   \"${proverb.en}\"`);
    lines.push("");
  }

  lines.push("───────────────");
  lines.push("");
  lines.push("this is still gambling. play small, play soft.");
  lines.push("baozi.bet | 小小一笼，大大缘分");

  return lines.join("\n").toLowerCase();
}
