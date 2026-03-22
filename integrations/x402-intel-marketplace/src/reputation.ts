/**
 * Reputation Tracking
 *
 * Computes analyst reputation tiers based on prediction accuracy.
 *
 * Tier system:
 *   novice      — fewer than 10 resolved predictions
 *   apprentice  — 10–24 resolved, accuracy < 50%
 *   journeyman  — 10–24 resolved, accuracy >= 50%
 *   expert      — 25–99 resolved, accuracy >= 60%
 *   master      — 100–499 resolved, accuracy >= 65%
 *   oracle      — 500+ resolved, accuracy >= 70%
 */
import type { AnalystProfile, ReputationTier, ReputationUpdate } from "./types.js";
import type { MarketplaceStore } from "./store.js";

/** Compute the tier for an analyst given their stats. */
export function computeTier(
  totalPredictions: number,
  correctPredictions: number
): ReputationTier {
  const accuracy =
    totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

  if (totalPredictions < 10) return "novice";
  if (totalPredictions < 25) {
    return accuracy >= 50 ? "journeyman" : "apprentice";
  }
  if (totalPredictions < 100) {
    return accuracy >= 60 ? "expert" : "journeyman";
  }
  if (totalPredictions < 500) {
    return accuracy >= 65 ? "master" : "expert";
  }
  return accuracy >= 70 ? "oracle" : "master";
}

/** Tier display information. */
export const TIER_INFO: Record<
  ReputationTier,
  { label: string; emoji: string; description: string }
> = {
  novice: {
    label: "Novice",
    emoji: "🌱",
    description: "New analyst — fewer than 10 resolved predictions",
  },
  apprentice: {
    label: "Apprentice",
    emoji: "📚",
    description: "Learning the markets — accuracy below 50%",
  },
  journeyman: {
    label: "Journeyman",
    emoji: "⚔️",
    description: "Solid track record — accuracy at or above 50%",
  },
  expert: {
    label: "Expert",
    emoji: "🎯",
    description: "Strong analyst — accuracy at or above 60%",
  },
  master: {
    label: "Master",
    emoji: "🏆",
    description: "Elite predictor — accuracy at or above 65%",
  },
  oracle: {
    label: "Oracle",
    emoji: "🔮",
    description: "Legendary analyst — 500+ calls, accuracy at or above 70%",
  },
};

/**
 * Apply a resolution update to an analyst's reputation.
 * Call this when a market resolves and the analyst's intel can be evaluated.
 */
export function applyResolutionUpdate(
  store: MarketplaceStore,
  update: ReputationUpdate
): AnalystProfile | undefined {
  const analyst = store.getAnalyst(update.analystWallet);
  if (!analyst) return undefined;

  const correct = update.correct;
  const newTotal = analyst.totalPredictions + 1;
  const newCorrect = analyst.correctPredictions + (correct ? 1 : 0);
  const newAccuracy =
    newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
  const newTier = computeTier(newTotal, newCorrect);

  // Update the intel record
  const intel = store.getIntel(update.intelId);
  if (intel) {
    store.updateIntel(update.intelId, {
      resolvedOutcome: update.resolvedOutcome,
      correct,
    });
  }

  const updatedAnalyst: AnalystProfile = {
    ...analyst,
    totalPredictions: newTotal,
    correctPredictions: newCorrect,
    accuracy: newAccuracy,
    tier: newTier,
  };

  store.upsertAnalyst(updatedAnalyst);
  return updatedAnalyst;
}

/**
 * Format a reputation summary for display.
 */
export function formatReputation(analyst: AnalystProfile): string {
  const tier = TIER_INFO[analyst.tier];
  const lines = [
    `${tier.emoji} ${tier.label} — ${analyst.displayName}`,
    `Wallet:      ${analyst.wallet}`,
    `Accuracy:    ${analyst.accuracy}% (${analyst.correctPredictions}/${analyst.totalPredictions} correct)`,
    `Tier:        ${tier.label} — ${tier.description}`,
    `Earnings:    ${analyst.totalEarnings.toFixed(4)} SOL from sales`,
    `Affiliate:   ${analyst.affiliateEarnings.toFixed(4)} SOL commissions`,
    `Affiliate Code: ${analyst.affiliateCode}`,
    `Registered:  ${new Date(analyst.registeredAt).toLocaleDateString()}`,
  ];
  return lines.join("\n");
}
