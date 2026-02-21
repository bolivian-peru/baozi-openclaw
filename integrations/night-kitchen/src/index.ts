/**
 * Night Kitchen 夜厨房
 *
 * Bilingual market report agent with Chinese wisdom.
 * Fetches live Baozi prediction market data, generates
 * warm bilingual reports, and posts to AgentBook.
 */
export { generateReport, generateShortReport } from "./report-gen.js";
export { selectProverb, selectProverbs, PROVERBS } from "./proverbs.js";
export { postToAgentBook, checkCooldown, getRecentPosts } from "./agentbook.js";
export { listMarkets, listRaceMarkets, getMarket, getQuote } from "./mcp-client.js";

import { listMarkets, listRaceMarkets } from "./mcp-client.js";
import { generateReport, generateShortReport } from "./report-gen.js";
import { postToAgentBook, checkCooldown } from "./agentbook.js";
import type { MarketData, RaceMarketData } from "./mcp-client.js";

export interface NightKitchenConfig {
  walletAddress?: string;
  dryRun?: boolean;
  maxMarkets?: number;
}

/**
 * Run the full night kitchen pipeline:
 * 1. Fetch active markets
 * 2. Generate bilingual report
 * 3. Optionally post to AgentBook
 */
export async function run(config: NightKitchenConfig = {}): Promise<{
  report: string;
  shortReport: string;
  posted: boolean;
  error?: string;
}> {
  // fetch markets
  console.log("fetching active markets...");
  const [booleanRaw, raceRaw] = await Promise.all([
    listMarkets("active").catch(() => []),
    listRaceMarkets("active").catch(() => []),
  ]);

  const booleanMarkets: MarketData[] = Array.isArray(booleanRaw)
    ? (booleanRaw as any[])
    : [];
  const raceMarkets: RaceMarketData[] = Array.isArray(raceRaw)
    ? (raceRaw as any[])
    : [];

  console.log(
    `found ${booleanMarkets.length} boolean + ${raceMarkets.length} race markets`
  );

  if (booleanMarkets.length === 0 && raceMarkets.length === 0) {
    return {
      report: "夜厨房 — the kitchen is quiet tonight. no markets cooking.",
      shortReport: "夜厨房 — no markets cooking tonight.",
      posted: false,
      error: "no active markets found",
    };
  }

  // generate reports
  const report = generateReport({ booleanMarkets, raceMarkets });
  const shortReport = generateShortReport({ booleanMarkets, raceMarkets });

  // post if wallet configured
  let posted = false;
  let error: string | undefined;

  if (config.walletAddress && !config.dryRun) {
    const cooldown = await checkCooldown(config.walletAddress);
    if (!cooldown.hasProfile) {
      error = "no CreatorProfile on-chain. create one at baozi.bet first.";
    } else if (!cooldown.canPost) {
      error = `cooldown active: ${cooldown.minutesRemaining} minutes remaining`;
    } else {
      const postContent =
        shortReport.length <= 2000 ? shortReport : shortReport.slice(0, 1997) + "...";
      const result = await postToAgentBook(config.walletAddress, postContent);
      posted = result.success;
      if (!result.success) {
        error = result.error;
      }
    }
  }

  return { report, shortReport, posted, error };
}
