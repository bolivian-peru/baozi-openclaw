#!/usr/bin/env node

/**
 * Trending Market Machine CLI
 *
 * Commands:
 *   scan        — Scan trending topics and preview market proposals (no creation)
 *   run-cycle   — Run a full cycle: scan → validate → create markets
 *   stats       — Show machine statistics
 *   help        — Show help
 *
 * Usage:
 *   node dist/cli.js scan
 *   node dist/cli.js run-cycle
 *   DRY_RUN=true node dist/cli.js run-cycle
 */

import { runCycle, scanTrends, loadConfig } from "./index.js";
import { loadState, getStats } from "./state.js";

async function main() {
  const command = process.argv[2] || "help";

  switch (command) {
    case "scan": {
      console.log("🥟 Trending Market Machine — Scan Mode\n");
      const config = loadConfig();
      await scanTrends(config);
      break;
    }

    case "run-cycle":
    case "create": {
      console.log("🥟 Trending Market Machine — Run Cycle\n");
      const config = loadConfig();
      const result = await runCycle(config);

      // Output results as JSON for programmatic use
      if (process.env.OUTPUT_JSON === "true") {
        console.log("\n--- JSON OUTPUT ---");
        console.log(JSON.stringify({
          created: result.created.map(m => ({
            marketId: m.marketId,
            question: m.proposal.question,
            category: m.proposal.category,
            marketType: m.proposal.marketType,
            closeTime: m.proposal.closeTime,
            txSignature: m.txSignature,
            shareCardUrl: m.shareCardUrl,
            agentBookPostId: m.agentBookPostId,
          })),
          rejected: result.rejected.map(r => ({
            question: r.proposal.question,
            reason: r.reason,
          })),
          errors: result.errors,
        }, null, 2));
      }

      // Exit with error code if all proposals failed
      if (result.created.length === 0 && result.rejected.length > 0) {
        process.exitCode = 1;
      }
      break;
    }

    case "stats": {
      const state = await loadState();
      const stats = getStats(state);

      console.log("🥟 Trending Market Machine — Statistics\n");
      console.log(`Total markets created: ${stats.totalCreated}`);
      console.log(`Markets in last 24h:   ${stats.recentMarkets}`);
      console.log(`Last run:              ${stats.lastRunAt}`);
      console.log("\nBy category:");
      for (const [cat, count] of Object.entries(stats.categoryCounts)) {
        console.log(`  ${cat}: ${count}`);
      }

      if (state.markets.length > 0) {
        console.log("\nRecent markets:");
        for (const m of state.markets.slice(-5)) {
          console.log(`  • "${m.proposal.question}" (${m.proposal.category}) — ${m.marketId}`);
        }
      }
      break;
    }

    case "help":
    default: {
      console.log(`
🥟 Trending Market Machine — Auto-create prediction markets from trending topics

COMMANDS:
  scan        Scan trending topics and preview market proposals (no creation)
  run-cycle   Run a full cycle: scan → validate → create markets
  stats       Show machine statistics
  help        Show this help

ENVIRONMENT VARIABLES:
  SOLANA_RPC_URL          Solana RPC endpoint (required for creation)
  SOLANA_PRIVATE_KEY      Base58 private key (required for creation)
  BAOZI_BASE_URL          Baozi API base URL (default: https://baozi.bet)
  TREND_SOURCES           Comma-separated sources (default: google-trends,coingecko,hackernews)
  MIN_TREND_SCORE         Minimum trend score 0-100 (default: 40)
  MAX_MARKETS_PER_CYCLE   Max markets per cycle (default: 5)
  MIN_HOURS_UNTIL_CLOSE   Min hours until market close (default: 48)
  MAX_DAYS_UNTIL_CLOSE    Max days until market close (default: 14)
  CREATOR_FEE_BPS         Creator fee in basis points (default: 100 = 1%)
  AFFILIATE_WALLET        Affiliate wallet for referral tracking
  DRY_RUN                 Set to "true" to validate without creating (default: false)
  OUTPUT_JSON             Set to "true" to output results as JSON

EXAMPLES:
  # Preview trending topics and generated questions
  node dist/cli.js scan

  # Dry run — validate proposals without creating markets
  DRY_RUN=true node dist/cli.js run-cycle

  # Full run — create markets from trends
  SOLANA_RPC_URL=https://... SOLANA_PRIVATE_KEY=... node dist/cli.js run-cycle

  # Use specific sources only
  TREND_SOURCES=coingecko,hackernews node dist/cli.js scan
`);
      break;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
