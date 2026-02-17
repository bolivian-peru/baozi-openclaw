#!/usr/bin/env npx tsx
/**
 * Market Metadata Enricher — Auto-Curate Lab Markets for Baozi
 *
 * Monitors newly created Lab markets, generates rich metadata
 * (category, tags, description, quality score) using Gemini,
 * and posts suggestions to AgentBook.
 *
 * Usage:
 *   npx tsx scripts/metadata-enricher.ts              # Start scheduled agent (every 30 min)
 *   npx tsx scripts/metadata-enricher.ts --once        # Run once and exit
 *   npx tsx scripts/metadata-enricher.ts --dry-run     # Generate metadata without posting
 */

import cron from "node-cron";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { loadConfig } from "../lib/config.js";
import { BaoziApi, BaoziMarket } from "../lib/baozi-api.js";
import { AgentBookApi } from "../lib/agentbook-api.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

// ─── Logging ───────────────────────────────────────────────────────

function log(level: string, msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [Enricher] [${level}] ${msg}`);
}

// ─── State Management ──────────────────────────────────────────────

const STATE_FILE = path.resolve(process.cwd(), ".metadata-enricher-state.json");

interface State {
  processedMarketIds: number[];
  lastRunAt?: string;
  totalAnalyzed: number;
}

function loadState(): State {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    } catch {
      log("WARN", "Corrupt state file, starting fresh.");
    }
  }
  return { processedMarketIds: [], totalAnalyzed: 0 };
}

function saveState(state: State) {
  state.lastRunAt = new Date().toISOString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Quality Checks ───────────────────────────────────────────────

/**
 * Check if a market question is a duplicate of any existing market.
 * Uses simple normalized substring matching.
 */
function isDuplicate(question: string, existingMarkets: BaoziMarket[]): { isDup: boolean; match?: string } {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const normalizedQ = normalize(question);

  for (const m of existingMarkets) {
    if (m.question === question) continue; // skip self
    const normalizedExisting = normalize(m.question);

    // Check for high overlap: one contains the other, or they share >80% words
    if (normalizedExisting.includes(normalizedQ) || normalizedQ.includes(normalizedExisting)) {
      return { isDup: true, match: m.question };
    }

    const wordsQ = new Set(normalizedQ.split(/\s+/));
    const wordsE = new Set(normalizedExisting.split(/\s+/));
    const intersection = [...wordsQ].filter(w => wordsE.has(w));
    const similarity = intersection.length / Math.max(wordsQ.size, wordsE.size);
    if (similarity > 0.8) {
      return { isDup: true, match: m.question };
    }
  }
  return { isDup: false };
}

/**
 * Check if a market's lockup period (time until closing) exceeds 14 days.
 */
function checkLockupPeriod(closingTime: string): { tooLong: boolean; daysUntilClose: number } {
  const closingDate = new Date(closingTime);
  const daysUntilClose = (closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return { tooLong: daysUntilClose > 14, daysUntilClose };
}

// ─── Metadata Generation ──────────────────────────────────────────

interface MarketMetadata {
  category: string;
  tags: string[];
  description: string;
  qualityScore: number;
  timingValidation: {
    isValid: boolean;
    message: string;
  };
  qualityFlags: string[];
  suggestions: string[];
}

async function analyzeMarket(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  market: BaoziMarket
): Promise<MarketMetadata> {
  const closingDate = new Date(market.closingTime);
  const hoursUntilClose = (closingDate.getTime() - Date.now()) / (1000 * 60 * 60);

  const prompt = `You are a prediction market metadata curator. Analyze this market and generate structured metadata.

Market Question: "${market.question}"
Closing Time: ${market.closingTime} (${hoursUntilClose.toFixed(1)} hours from now)
Current Odds: Yes ${market.yesPercent}% / No ${market.noPercent}%
Pool Size: ${market.totalPoolSol?.toFixed(2) || "0.00"} SOL
Layer: ${market.layer}

Output a JSON object with these fields:
1. "category": one of "Crypto", "Sports", "Politics", "Entertainment", "Tech", "Finance", "Weather", "Other"
2. "tags": array of 1-3 lowercase keywords
3. "description": 1-2 sentence summary adding context beyond the question
4. "qualityScore": integer 1-5 (clarity, objectivity, verifiability, timing)
5. "timingValidation": { "isValid": boolean, "message": string } — is closing time reasonable relative to the event?
6. "qualityFlags": array of strings — flag ANY of these issues if present:
   - "closing_time_too_close" — closing time is dangerously close to the event (information advantage risk)
   - "missing_data_source" — no resolution source is specified or implied
   - "vague_question" — question is subjective, ambiguous, or not clearly verifiable
   Only include flags that actually apply. Empty array if market looks good.
7. "suggestions": array of improvement strings (e.g. "Add resolution source", "Clarify resolution criteria")

Return ONLY valid JSON, no markdown fences.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText) as MarketMetadata;

    // Clamp quality score
    parsed.qualityScore = Math.max(1, Math.min(5, Math.round(parsed.qualityScore)));
    return parsed;
  } catch (error) {
    log("ERROR", `Gemini analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Other",
      tags: [],
      description: "Metadata generation failed.",
      qualityScore: 1,
      timingValidation: { isValid: true, message: "Could not validate." },
      qualityFlags: [],
      suggestions: ["Retry metadata generation"],
    };
  }
}

function formatPost(market: BaoziMarket, metadata: MarketMetadata): string {
  const stars = "★".repeat(metadata.qualityScore) + "☆".repeat(5 - metadata.qualityScore);
  const timingIcon = metadata.timingValidation.isValid ? "✅" : "⚠️";
  const suggestionsStr = metadata.suggestions.length > 0
    ? metadata.suggestions.join(" · ")
    : "None — looks good!";

  // Build flags section
  let flagsStr = "";
  if (metadata.qualityFlags.length > 0) {
    const flagLabels: Record<string, string> = {
      "closing_time_too_close": "⚠️ Closing time too close to event",
      "missing_data_source": "⚠️ No resolution source specified",
      "vague_question": "⚠️ Question may be vague/subjective",
      "duplicate_market": "⚠️ Possible duplicate market",
      "lockup_too_long": "⚠️ Lockup period exceeds 14 days",
    };
    flagsStr = "\n🚩 Flags: " + metadata.qualityFlags.map(f => flagLabels[f] || f).join(" · ");
  }

  return `🔍 Market Metadata Analysis

"${market.question}"

📊 Category: ${metadata.category} | Tags: ${metadata.tags.join(", ")}
⭐ Quality: ${stars}${flagsStr}

📝 ${metadata.description}

⏰ Timing: ${timingIcon} ${metadata.timingValidation.message}
💡 Suggestions: ${suggestionsStr}`.trim();
}

// ─── Main Logic ────────────────────────────────────────────────────

async function runOnce(
  baozi: BaoziApi,
  agentBook: AgentBookApi,
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  walletAddress: string,
  dryRun: boolean = false
): Promise<void> {
  log("INFO", "Starting enrichment cycle...");
  const state = loadState();

  // 1. Fetch ALL active markets (for duplicate detection) and filter to Lab
  log("INFO", "Fetching active markets...");
  const { binary: allBinary } = await baozi.listMarkets({ status: "active", limit: 100 });
  const labMarkets = allBinary.filter((m: BaoziMarket) => m.layer === "Lab");
  log("INFO", `Found ${labMarkets.length} active Lab markets (${allBinary.length} total for duplicate check).`);

  const newMarkets = labMarkets
    .filter((m: BaoziMarket) => !state.processedMarketIds.includes(m.marketId))
    .sort((a: BaoziMarket, b: BaoziMarket) => b.marketId - a.marketId);

  if (newMarkets.length === 0) {
    log("INFO", "No new Lab markets to analyze.");
    return;
  }

  log("INFO", `Found ${newMarkets.length} new market(s) to analyze.`);

  for (const market of newMarkets) {
    log("INFO", `Analyzing Market #${market.marketId}: "${market.question}"`);

    // 2. Run explicit quality checks
    const dupCheck = isDuplicate(market.question, allBinary);
    const lockupCheck = checkLockupPeriod(market.closingTime);

    if (dupCheck.isDup) {
      log("WARN", `Duplicate detected! Similar to: "${dupCheck.match}"`);
    }
    if (lockupCheck.tooLong) {
      log("WARN", `Lockup period too long: ${lockupCheck.daysUntilClose.toFixed(1)} days until close.`);
    }

    // 3. Generate metadata via LLM
    const metadata = await analyzeMarket(model, market);

    // Merge explicit checks into qualityFlags
    if (!metadata.qualityFlags) metadata.qualityFlags = [];
    if (dupCheck.isDup && !metadata.qualityFlags.includes("duplicate_market")) {
      metadata.qualityFlags.push("duplicate_market");
      metadata.suggestions.push(`Possible duplicate of: "${dupCheck.match}"`);
    }
    if (lockupCheck.tooLong && !metadata.qualityFlags.includes("lockup_too_long")) {
      metadata.qualityFlags.push("lockup_too_long");
      metadata.suggestions.push(`Lockup period is ${lockupCheck.daysUntilClose.toFixed(0)} days — consider shortening`);
    }

    // Adjust quality score down if flags exist
    if (metadata.qualityFlags.length > 0) {
      metadata.qualityScore = Math.max(1, metadata.qualityScore - metadata.qualityFlags.length);
    }

    log("INFO", `Metadata: ${metadata.category} | Quality: ${metadata.qualityScore}/5 | Tags: ${metadata.tags.join(", ")} | Flags: ${metadata.qualityFlags.length > 0 ? metadata.qualityFlags.join(", ") : "none"}`);

    // 3. Format post
    const postContent = formatPost(market, metadata);

    if (postContent.length < 10 || postContent.length > 2000) {
      log("WARN", `Post content length ${postContent.length} out of range (10-2000), skipping.`);
      continue;
    }

    // 4. Post or dry-run
    if (dryRun) {
      log("INFO", "DRY RUN — would post:");
      console.log("\n--- POST ---");
      console.log(postContent);
      console.log("--- END ---\n");
    } else {
      // Check cooldown
      const { canPost, waitMs } = await agentBook.canPost(walletAddress);
      if (!canPost) {
        log("WARN", `AgentBook cooldown active. Wait ${Math.ceil(waitMs / 60000)} more minutes.`);
        break;
      }

      log("INFO", `Posting to AgentBook (wallet: ${walletAddress})...`);
      const result = await agentBook.postToAgentBook(
        walletAddress,
        postContent,
        market.publicKey
      );

      if (result.success) {
        log("INFO", `✅ Posted for Market #${market.marketId} (post ID: ${result.post?.id})`);
        state.processedMarketIds.push(market.marketId);
        state.totalAnalyzed++;
        saveState(state);

        // Respect 30-min cooldown — stop after one post per cycle
        log("INFO", "Stopping cycle to respect AgentBook cooldown.");
        break;
      } else {
        log("ERROR", `❌ Post failed: ${result.error}`);
      }
    }
  }

  log("INFO", `Enrichment cycle complete. Total analyzed to date: ${state.totalAnalyzed}`);
}

// ─── Entry Point ───────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const isOnce = args.includes("--once");
  const isDryRun = args.includes("--dry-run");

  log("INFO", "🔍 Market Metadata Enricher — Auto-Curate Lab Markets");
  log("INFO", `Mode: ${isDryRun ? "dry-run" : isOnce ? "once" : "scheduled"}`);

  // Load config
  const config = loadConfig();

  // Derive wallet address from private key
  const keypair = Keypair.fromSecretKey(bs58.decode(config.solanaPrivateKey));
  const walletAddress = keypair.publicKey.toBase58();
  log("INFO", `Wallet: ${walletAddress}`);

  // Initialize clients
  const baozi = new BaoziApi(config.baoziBaseUrl);
  const agentBook = new AgentBookApi(config.baoziBaseUrl);
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Once / dry-run mode
  if (isOnce || isDryRun) {
    await runOnce(baozi, agentBook, model, walletAddress, isDryRun);
    return;
  }

  // Scheduled mode — every 30 minutes
  const schedule = "*/30 * * * *";
  log("INFO", `Starting scheduled enricher (${schedule})...`);

  cron.schedule(
    schedule,
    async () => {
      try {
        await runOnce(baozi, agentBook, model, walletAddress, false);
      } catch (err) {
        log("ERROR", `Scheduled run failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { timezone: "UTC" }
  );

  // Run immediately on startup
  log("INFO", "Running initial enrichment cycle...");
  try {
    await runOnce(baozi, agentBook, model, walletAddress, false);
  } catch (err) {
    log("ERROR", `Initial run failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  log("INFO", "Enricher is running. Press Ctrl+C to stop.");

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
