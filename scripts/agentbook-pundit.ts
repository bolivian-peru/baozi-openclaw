#!/usr/bin/env npx tsx
/**
 * AgentBook Pundit — AI Market Analyst for Baozi Prediction Markets
 *
 * Scheduled agent that reads active markets, generates LLM analysis,
 * and posts to AgentBook + market comments.
 *
 * Usage:
 *   npx tsx scripts/agentbook-pundit.ts              # Start scheduled agent
 *   npx tsx scripts/agentbook-pundit.ts --once        # Run once and exit
 *   npx tsx scripts/agentbook-pundit.ts --dry-run     # Generate analysis without posting
 *   npx tsx scripts/agentbook-pundit.ts --test-fetch  # Test market data fetching only
 */

import cron from "node-cron";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { loadConfig } from "../lib/config.js";
import { BaoziApi } from "../lib/baozi-api.js";
import { AgentBookApi } from "../lib/agentbook-api.js";
import { MarketAnalyzer } from "../lib/analyzer.js";

// ─── Logging ───────────────────────────────────────────────────────

function log(level: string, msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`);
}

// ─── Main Logic ────────────────────────────────────────────────────

async function runOnce(
  baozi: BaoziApi,
  agentBook: AgentBookApi,
  analyzer: MarketAnalyzer,
  walletAddress: string,
  privateKey: string,
  dryRun: boolean = false
): Promise<void> {
  log("INFO", "Starting analysis cycle...");

  // 1. Fetch active markets
  log("INFO", "Fetching active markets...");
  const markets = await baozi.getActiveMarketsSorted(20);
  log("INFO", `Fetched ${markets.length} active markets`);

  if (markets.length === 0) {
    log("WARN", "No active markets found. Skipping this cycle.");
    return;
  }

  // 2. Determine analysis type based on time of day
  const analysisType = MarketAnalyzer.getAnalysisType();
  log("INFO", `Analysis type: ${analysisType}`);

  // 3. Generate analysis
  log("INFO", "Generating LLM analysis...");
  const analysis = await analyzer.generateByType(analysisType, markets);
  log("INFO", `Generated analysis (${analysis.length} chars):`);
  console.log("\n--- ANALYSIS ---");
  console.log(analysis);
  console.log("--- END ---\n");

  if (dryRun) {
    log("INFO", "Dry run — skipping posting.");
    return;
  }

  // 4. Check cooldown and post to AgentBook
  const { canPost, waitMs } = await agentBook.canPost(walletAddress);
  if (!canPost) {
    log(
      "WARN",
      `AgentBook cooldown active. Wait ${Math.ceil(waitMs / 60000)} more minutes.`
    );
  } else {
    // Find a relevant market to link to
    const topMarket = markets[0];
    const marketPda = topMarket?.publicKey;

    log("INFO", `Posting to AgentBook (wallet: ${walletAddress})...`);
    const postResult = await agentBook.postToAgentBook(
      walletAddress,
      analysis,
      marketPda
    );

    if (postResult.success) {
      log("INFO", `✅ AgentBook post successful! ID: ${postResult.post?.id}`);
    } else {
      log("ERROR", `❌ AgentBook post failed: ${postResult.error}`);
    }
  }

  // 5. Comment on a high-volume market
  if (markets.length > 0) {
    const targetMarket = markets[0]; // Highest volume
    log(
      "INFO",
      `Generating comment for market: "${targetMarket.question}"...`
    );
    const comment = await analyzer.generateMarketComment(targetMarket);
    console.log(`\n--- COMMENT (${comment.length} chars) ---`);
    console.log(comment);
    console.log("--- END ---\n");

    if (!dryRun && targetMarket.publicKey) {
      log("INFO", "Posting comment...");
      const commentResult = await agentBook.commentOnMarket(
        targetMarket.publicKey,
        comment,
        privateKey
      );

      if (commentResult.success) {
        log("INFO", "✅ Market comment posted successfully!");
      } else {
        log("ERROR", `❌ Market comment failed: ${commentResult.error}`);
      }
    }
  }

  log("INFO", "Analysis cycle complete.");
}

// ─── Test Fetch ────────────────────────────────────────────────────

async function testFetch(baozi: BaoziApi): Promise<void> {
  log("INFO", "Testing market data fetch...");

  const markets = await baozi.getActiveMarketsSorted(10);
  log("INFO", `Fetched ${markets.length} active markets:`);

  for (const m of markets) {
    console.log(`  • ${BaoziApi.formatMarket(m)}`);
  }

  const closingSoon = await baozi.getClosingSoon(24);
  log("INFO", `\nMarkets closing in 24h: ${closingSoon.length}`);
  for (const m of closingSoon) {
    console.log(`  ⏰ ${BaoziApi.formatMarket(m)}`);
  }

  log("INFO", "Fetch test complete.");
}

// ─── Entry Point ───────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isOnce = args.includes("--once");
  const isDryRun = args.includes("--dry-run");
  const isTestFetch = args.includes("--test-fetch");

  log("INFO", "🥟 AgentBook Pundit — AI Market Analyst");
  log("INFO", `Mode: ${isTestFetch ? "test-fetch" : isDryRun ? "dry-run" : isOnce ? "once" : "scheduled"}`);

  // Load config (validates env vars)
  const config = loadConfig();

  // Derive wallet address from private key
  const keypair = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey));
  const walletAddress = keypair.publicKey.toBase58();
  log("INFO", `Wallet: ${walletAddress}`);

  // Initialize clients
  const baozi = new BaoziApi(config.baoziBaseUrl);
  const agentBook = new AgentBookApi(config.baoziBaseUrl);
  const analyzer = new MarketAnalyzer(config.geminiApiKey);

  // Test fetch mode
  if (isTestFetch) {
    await testFetch(baozi);
    return;
  }

  // Run once mode
  if (isOnce || isDryRun) {
    await runOnce(
      baozi,
      agentBook,
      analyzer,
      walletAddress,
      config.solanaPrivateKey,
      isDryRun
    );
    return;
  }

  // Scheduled mode — run on cron schedules
  log("INFO", "Starting scheduled agent...");
  log(
    "INFO",
    `Schedules: ${config.cronSchedules.join(", ")} (UTC)`
  );

  for (const schedule of config.cronSchedules) {
    cron.schedule(
      schedule,
      async () => {
        try {
          await runOnce(
            baozi,
            agentBook,
            analyzer,
            walletAddress,
            config.solanaPrivateKey,
            false
          );
        } catch (err) {
          log(
            "ERROR",
            `Scheduled run failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
      { timezone: "UTC" }
    );
  }

  // Also run immediately on startup
  log("INFO", "Running initial analysis cycle...");
  try {
    await runOnce(
      baozi,
      agentBook,
      analyzer,
      walletAddress,
      config.solanaPrivateKey,
      false
    );
  } catch (err) {
    log(
      "ERROR",
      `Initial run failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  log("INFO", "Agent is running. Press Ctrl+C to stop.");

  // Keep process alive
  process.on("SIGINT", () => {
    log("INFO", "Shutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  log("FATAL", `Unhandled error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(err);
  process.exit(1);
});
