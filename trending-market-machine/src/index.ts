/**
 * Trending Market Machine — Main Orchestrator
 *
 * Monitors trending topics across multiple sources and automatically creates
 * properly-structured Lab prediction markets on Baozi.
 *
 * The market machine never sleeps. If it's trending, there's a market.
 */

import type { MachineConfig, MarketProposal, CreatedMarket, MachineState } from "./types/index.js";
import { fetchAllTrends } from "./sources/index.js";
import { generateMarketProposal } from "./generator.js";
import { isDuplicateTopic, isDuplicateProposal, deduplicateTopics } from "./dedup.js";
import { validateProposal, validateProposalLocally } from "./validator.js";
import {
  createLabMarket,
  setMarketMetadata,
  generateShareCard,
  postToAgentBook,
  fetchExistingMarketQuestions,
} from "./creator.js";
import { loadState, saveState, recordCreation, getStats } from "./state.js";

/**
 * Load configuration from environment variables
 */
export function loadConfig(): MachineConfig {
  return {
    solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || "",
    baoziBaseUrl: process.env.BAOZI_BASE_URL || "https://baozi.bet",
    sources: (process.env.TREND_SOURCES || "google-trends,coingecko,hackernews").split(",").map(s => s.trim()) as any,
    minTrendScore: parseInt(process.env.MIN_TREND_SCORE || "40", 10),
    maxMarketsPerCycle: parseInt(process.env.MAX_MARKETS_PER_CYCLE || "5", 10),
    minHoursUntilClose: parseInt(process.env.MIN_HOURS_UNTIL_CLOSE || "48", 10),
    maxDaysUntilClose: parseInt(process.env.MAX_DAYS_UNTIL_CLOSE || "14", 10),
    affiliateWallet: process.env.AFFILIATE_WALLET || undefined,
    creatorFeeBps: parseInt(process.env.CREATOR_FEE_BPS || "100", 10), // 1% default
    dryRun: process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1",
  };
}

/**
 * Run a single cycle of the trending market machine
 *
 * 1. Fetch trends from all configured sources
 * 2. Deduplicate and filter
 * 3. Generate market proposals
 * 4. Validate each proposal
 * 5. Create markets on Baozi
 * 6. Generate share cards and post to AgentBook
 */
export async function runCycle(config?: MachineConfig): Promise<{
  created: CreatedMarket[];
  rejected: Array<{ proposal: MarketProposal; reason: string }>;
  errors: string[];
}> {
  const cfg = config || loadConfig();
  const created: CreatedMarket[] = [];
  const rejected: Array<{ proposal: MarketProposal; reason: string }> = [];
  const errors: string[] = [];

  console.log("═══════════════════════════════════════════════");
  console.log("🥟 Trending Market Machine — Cycle Start");
  console.log(`   Sources: ${cfg.sources.join(", ")}`);
  console.log(`   Dry run: ${cfg.dryRun}`);
  console.log(`   Max markets: ${cfg.maxMarketsPerCycle}`);
  console.log("═══════════════════════════════════════════════\n");

  // Step 1: Load state
  let state = await loadState();
  console.log(`[state] Loaded: ${state.totalCreated} markets created previously\n`);

  // Step 2: Fetch trends
  console.log("📡 Fetching trending topics...\n");
  const rawTopics = await fetchAllTrends(cfg.sources);

  if (rawTopics.length === 0) {
    console.log("⚠️  No trending topics found. Cycle complete.\n");
    return { created, rejected, errors };
  }

  // Step 3: Filter by minimum trend score
  const filteredTopics = rawTopics.filter(t => t.trendScore >= cfg.minTrendScore);
  console.log(`\n📊 ${filteredTopics.length}/${rawTopics.length} topics meet minimum trend score (${cfg.minTrendScore})\n`);

  // Step 4: Deduplicate among themselves
  const uniqueTopics = deduplicateTopics(filteredTopics);
  console.log(`🔄 ${uniqueTopics.length} unique topics after dedup\n`);

  // Step 5: Check against existing markets
  const existingQuestions = await fetchExistingMarketQuestions(cfg);
  console.log(`📋 ${existingQuestions.length} existing Baozi Lab markets for dedup check\n`);

  // Step 6: Generate proposals and validate
  let proposalCount = 0;

  for (const topic of uniqueTopics) {
    if (created.length >= cfg.maxMarketsPerCycle) {
      console.log(`\n🛑 Reached max markets per cycle (${cfg.maxMarketsPerCycle}). Stopping.\n`);
      break;
    }

    // Check for duplicates against state
    const dupCheck = isDuplicateTopic(topic, state, existingQuestions);
    if (dupCheck.isDuplicate) {
      console.log(`  ⏭️  Skip (dup): "${topic.title}" — ${dupCheck.reason}`);
      continue;
    }

    // Generate proposal
    const proposal = generateMarketProposal(topic);
    if (!proposal) {
      console.log(`  ⏭️  Skip (no proposal): "${topic.title}"`);
      continue;
    }

    // Check proposal-level dedup
    const proposalDup = isDuplicateProposal(proposal, state, existingQuestions);
    if (proposalDup.isDuplicate) {
      console.log(`  ⏭️  Skip (dup question): "${proposal.question}" — ${proposalDup.reason}`);
      continue;
    }

    proposalCount++;
    console.log(`\n─── Proposal #${proposalCount} ───`);
    console.log(`  📰 Topic: "${topic.title}" (${topic.source}, score: ${topic.trendScore})`);
    console.log(`  ❓ Question: "${proposal.question}"`);
    console.log(`  📁 Type: ${proposal.marketType} | Category: ${proposal.category}`);
    console.log(`  ⏰ Close: ${proposal.closeTime}`);
    console.log(`  📖 Data: ${proposal.dataSource}`);

    // Validate locally first
    const localValidation = validateProposalLocally(proposal, cfg);
    if (!localValidation.valid) {
      console.log(`  ❌ Local validation FAILED:`);
      localValidation.errors.forEach(e => console.log(`     • ${e}`));
      rejected.push({ proposal, reason: localValidation.errors.join("; ") });
      continue;
    }
    if (localValidation.warnings.length > 0) {
      localValidation.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }

    // Validate with Baozi API
    console.log("  🔍 Validating with Baozi API...");
    const apiValidation = await validateProposal(proposal, cfg);
    if (!apiValidation.valid) {
      console.log(`  ❌ API validation FAILED:`);
      apiValidation.errors.forEach(e => console.log(`     • ${e}`));
      rejected.push({ proposal, reason: apiValidation.errors.join("; ") });
      continue;
    }

    console.log("  ✅ Validation passed!");

    // Create the market
    try {
      console.log("  🔨 Creating market...");
      const market = await createLabMarket(proposal, cfg);

      // Set metadata
      console.log("  📝 Setting metadata...");
      await setMarketMetadata(market.marketId, proposal, cfg);

      // Generate share card
      console.log("  🎨 Generating share card...");
      const shareCardUrl = await generateShareCard(market.marketId, cfg);
      market.shareCardUrl = shareCardUrl;

      // Post to AgentBook
      console.log("  📢 Posting to AgentBook...");
      const postId = await postToAgentBook(market, shareCardUrl, cfg);
      market.agentBookPostId = postId;

      // Record in state
      state = recordCreation(state, market);
      created.push(market);

      console.log(`  ✅ Market created successfully!`);
      console.log(`     ID: ${market.marketId}`);
      console.log(`     TX: ${market.txSignature}`);
      if (shareCardUrl) console.log(`     Card: ${shareCardUrl}`);
      if (postId) console.log(`     Post: ${postId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌ Creation failed: ${errMsg}`);
      errors.push(`Failed to create "${proposal.question}": ${errMsg}`);
    }
  }

  // Save state
  await saveState(state);

  // Print summary
  const stats = getStats(state);
  console.log("\n═══════════════════════════════════════════════");
  console.log("🥟 Trending Market Machine — Cycle Complete");
  console.log(`   Created: ${created.length} markets`);
  console.log(`   Rejected: ${rejected.length} proposals`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Total lifetime: ${stats.totalCreated} markets`);
  console.log(`   Last 24h: ${stats.recentMarkets} markets`);
  console.log("═══════════════════════════════════════════════\n");

  return { created, rejected, errors };
}

/**
 * Scan trends without creating markets (preview mode)
 */
export async function scanTrends(config?: MachineConfig): Promise<void> {
  const cfg = config || loadConfig();

  console.log("📡 Scanning trends (preview only)...\n");

  const topics = await fetchAllTrends(cfg.sources);

  console.log(`\n📊 Found ${topics.length} trending topics:\n`);

  for (let i = 0; i < Math.min(topics.length, 20); i++) {
    const t = topics[i];
    const proposal = generateMarketProposal(t);

    console.log(`${i + 1}. [${t.source}] "${t.title}" (score: ${t.trendScore})`);
    console.log(`   Category: ${t.category}`);
    if (proposal) {
      console.log(`   → Question: "${proposal.question}"`);
      console.log(`   → Type: ${proposal.marketType} | Close: ${proposal.closeTime}`);

      const validation = validateProposalLocally(proposal, cfg);
      console.log(`   → Valid: ${validation.valid ? "✅" : "❌ " + validation.errors.join(", ")}`);
    } else {
      console.log(`   → Could not generate proposal`);
    }
    console.log();
  }
}
