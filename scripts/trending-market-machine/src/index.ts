#!/usr/bin/env bun
// Trending Market Machine — Auto-create Baozi Lab markets from trending topics
//
// The machine never sleeps. If it's trending, there's a market.

import { CONFIG } from "./config.ts";
import { fetchCoinGeckoTrends } from "./sources/coingecko.ts";
import { fetchHackerNewsTrends } from "./sources/hackernews.ts";
import { fetchRSSFeeds } from "./sources/rss.ts";
import { fetchRedditTrends } from "./sources/reddit.ts";
import { generateBatch } from "./market/generator.ts";
import { validateMarket } from "./market/validator.ts";
import { createLabMarket, closeMCP } from "./market/creator.ts";
import { loadState, saveState, isTopicSeen, markTopicSeen, mergeTopics, pruneState, recordCreatedMarket } from "./market/dedup.ts";
import { Keypair } from "@solana/web3.js";
import type { TrendingTopic } from "./config.ts";

async function detectTrends() {
  console.log("\n=== Detecting Trends ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // Fetch from all sources in parallel
  const [cgTrends, hnTrends, rssTrends, redditTrends] = await Promise.all([
    fetchCoinGeckoTrends().catch((e) => { console.error("CoinGecko:", e.message); return []; }),
    fetchHackerNewsTrends().catch((e) => { console.error("HN:", e.message); return []; }),
    fetchRSSFeeds().catch((e) => { console.error("RSS:", e.message); return []; }),
    fetchRedditTrends().catch((e) => { console.error("Reddit:", e.message); return []; }),
  ]);

  console.log(`Sources: CoinGecko=${cgTrends.length}, HN=${hnTrends.length}, RSS=${rssTrends.length}, Reddit=${redditTrends.length}`);

  // Merge and deduplicate
  const allTopics = mergeTopics([...cgTrends, ...hnTrends, ...rssTrends, ...redditTrends]);
  console.log(`Total unique topics: ${allTopics.length}`);

  // Filter out already-seen topics
  const newTopics = allTopics.filter((t) => !isTopicSeen(t));
  console.log(`New topics: ${newTopics.length}`);

  return newTopics;
}

async function processTopics(topics: TrendingTopic[]) {
  // Generate market questions
  const questions = generateBatch(topics);
  console.log(`\n=== Generated ${questions.length} Market Questions ===`);

  // Load wallet if available
  let wallet: Keypair | undefined;
  if (process.env.SOLANA_PRIVATE_KEY) {
    try {
      const keyBytes: number[] = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
      if (!Array.isArray(keyBytes) || keyBytes.length !== 64) {
        throw new Error(`Expected 64-byte keypair array, got ${Array.isArray(keyBytes) ? keyBytes.length : typeof keyBytes}`);
      }
      wallet = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
      console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    } catch (err) {
      console.error("Invalid SOLANA_PRIVATE_KEY:", (err as Error).message);
    }
  }

  let created = 0;
  for (const market of questions) {
    console.log(`\n--- Validating: "${market.question.slice(0, 80)}..." ---`);

    // Validate
    const validation = await validateMarket(market);
    if (!validation.approved) {
      console.log("REJECTED:");
      for (const v of validation.violations) {
        console.log(`  [${v.severity}] ${v.rule}: ${v.message}`);
      }
      continue;
    }

    if (validation.violations.length > 0) {
      console.log("WARNINGS:");
      for (const v of validation.violations) {
        console.log(`  [${v.severity}] ${v.rule}: ${v.message}`);
      }
    }

    console.log("APPROVED — creating market...");

    // Create market
    const result = await createLabMarket(market, wallet);
    if (result) {
      created++;
      recordCreatedMarket(result);
      markTopicSeen(market.trendSource);
      console.log(`CREATED: ${result.marketPda} (tx: ${result.txSignature})`);
    }
  }

  return created;
}

async function runOnce() {
  await loadState();
  pruneState();

  const topics = await detectTrends();
  if (topics.length === 0) {
    console.log("No new trending topics found.");
    await saveState();
    return 0;
  }

  const created = await processTopics(topics);
  await saveState();

  console.log(`\n=== Summary ===`);
  console.log(`Topics found: ${topics.length}`);
  console.log(`Markets created: ${created}`);
  console.log(`Mode: ${CONFIG.DRY_RUN ? "DRY RUN" : "LIVE"}`);

  return created;
}

async function runLoop() {
  console.log("=== Trending Market Machine ===");
  console.log(`Mode: ${CONFIG.DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Poll interval: ${CONFIG.POLL_INTERVAL_MS / 1000 / 60} minutes`);
  console.log(`Max markets/hour: ${CONFIG.MAX_MARKETS_PER_HOUR}`);
  console.log(`RPC: ${CONFIG.RPC_URL}`);
  console.log();

  while (true) {
    try {
      await runOnce();
    } catch (err) {
      console.error("Machine error:", (err as Error).message);
    }

    console.log(`\nSleeping ${CONFIG.POLL_INTERVAL_MS / 1000 / 60} minutes...`);
    await new Promise((r) => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
  }
}

// Entry point
const mode = process.argv[2] || "once";
if (mode === "loop") {
  runLoop();
} else {
  runOnce().then((n) => {
    console.log(`\nDone. ${n} markets ${CONFIG.DRY_RUN ? "would be" : ""} created.`);
    closeMCP();
    process.exit(0);
  });
}
