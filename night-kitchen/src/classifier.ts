import type { Market, MarketSignals } from "./types.js";
import { hoursUntil } from "./utils.js";

export function classifyMarket(market: Market): MarketSignals {
  const hoursLeft = hoursUntil(market.closingTime);
  const sorted = [...market.outcomes].sort((a, b) => b.probability - a.probability);
  const favored = sorted[0] ?? { label: "Yes", probability: 0.5 };
  const second = sorted[1] ?? { probability: 0.5 };
  const spread = favored.probability - second.probability;
  const tags: MarketSignals["tags"] = [];

  if (hoursLeft > 72) tags.push("patience");
  if (hoursLeft <= 24) tags.push("timing");
  if (hoursLeft <= 6) tags.push("heat");
  if (spread >= 0.35) tags.push("risk");
  if (spread <= 0.12) tags.push("luck");
  if (market.pool.total >= 20) tags.push("profit");
  if (tags.length === 0) tags.push("calm");

  return {
    tags,
    hoursLeft,
    spread,
    totalPool: market.pool.total,
    favoredLabel: favored.label,
    favoredProbability: favored.probability
  };
}
