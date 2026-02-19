/**
 * Test suite for Calls Tracker
 * 
 * Runs all core tests: parser, database, reputation
 */
import { parsePrediction, validatePrediction } from "../parsers/prediction-parser.js";
import { CallsDatabase } from "../db/database.js";
import { ReputationService } from "../services/reputation-service.js";
import { CallsTracker } from "../services/calls-tracker.js";
import { unlinkSync } from "node:fs";

const TEST_DB = "test-calls-tracker.db";
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function cleanup(): void {
  try { unlinkSync(TEST_DB); } catch {}
  try { unlinkSync(TEST_DB + "-wal"); } catch {}
  try { unlinkSync(TEST_DB + "-shm"); } catch {}
}

// ─── Parser Tests ────────────────────────────────────────────

console.log("\n📝 Parser Tests\n");

{
  const p = parsePrediction("BTC will hit $110k by March 1");
  assert(p.subject === "BTC", "Detects BTC as subject");
  assert(p.targetValue === 110000, "Parses $110k as 110000");
  assert(p.direction === "above", "Detects 'hit' as above direction");
  assert(p.question.includes("110k"), "Question includes price target");
  assert(p.dataSource.includes("CoinGecko"), "Data source is CoinGecko");
  assert(p.marketType === "boolean", "Market type is boolean");
}

{
  const p = parsePrediction("ETH will drop below $3,000 by end of 2026");
  assert(p.subject === "ETH", "Detects ETH");
  assert(p.targetValue === 3000, "Parses $3,000");
  assert(p.direction === "below", "Detects 'drop below' as below direction");
}

{
  const p = parsePrediction("SOL will exceed $500 in Q1 2026");
  assert(p.subject === "SOL", "Detects SOL");
  assert(p.targetValue === 500, "Parses $500");
  assert(p.direction === "above", "Detects 'exceed' as above");
}

{
  const p = parsePrediction("Lakers will win the NBA championship this week");
  assert(p.dataSource.includes("ESPN") || p.dataSource.includes("NBA"), "Sports data source detected");
  assert(p.question.includes("?"), "Question ends with ?");
}

{
  const p = parsePrediction("NAVI will beat Vitality in the CS2 Major finals by March 15");
  assert(p.dataSource.includes("HLTV") || p.dataSource.includes("ESPN"), "Esports source detected");
}

{
  const { valid: v1 } = validatePrediction(parsePrediction("BTC will hit $110k by March 1, 2027"));
  assert(v1, "Valid prediction passes validation");

  const { valid: v2, errors: e2 } = validatePrediction({ ...parsePrediction("Short"), rawText: "Short", question: "Short" } as any);
  assert(!v2, "Short question fails validation");
  assert(e2.some(e => e.includes("too short")), "Error mentions question too short");
}

// ─── Database Tests ──────────────────────────────────────────

console.log("\n💾 Database Tests\n");

cleanup();

{
  const db = new CallsDatabase(TEST_DB);

  // Register callers
  const c1 = db.registerCaller("CryptoGuru", "Wallet111", "@cryptoguru", "twitter");
  assert(c1.name === "CryptoGuru", "Register caller works");
  assert(c1.walletAddress === "Wallet111", "Wallet stored");

  const c2 = db.registerCaller("SportsBet", "Wallet222", "@sportsbet", "twitter");

  // Lookup
  const found = db.getCallerByWallet("Wallet111");
  assert(found?.name === "CryptoGuru", "Lookup by wallet works");

  const byName = db.getCallerByName("SportsBet");
  assert(byName?.walletAddress === "Wallet222", "Lookup by name works");

  // Create calls
  const call1 = db.createCall(c1.id, {
    rawText: "BTC will hit $110k by March 1",
    question: "Will BTC exceed $110k by March 1, 2027?",
    dataSource: "CoinGecko (bitcoin)",
    resolutionCriteria: "Check BTC price on CoinGecko at deadline.",
    subject: "BTC",
    targetValue: 110000,
    direction: "above",
    deadline: "2027-03-01T00:00:00.000Z",
    marketType: "boolean",
  }, 0.5, "yes");

  assert(call1.status === "pending", "New call is pending");
  assert(call1.betAmount === 0.5, "Bet amount stored");

  // Update status
  db.updateCallStatus(call1.id, "market_created", { marketPda: "MARKET_PDA_123" });
  db.updateCallStatus(call1.id, "active");
  const updated = db.getCall(call1.id);
  assert(updated?.status === "active", "Status updated to active");
  assert(updated?.marketPda === "MARKET_PDA_123", "Market PDA stored");

  // Resolve
  db.updateCallStatus(call1.id, "resolved", { outcome: "correct", pnl: 0.4 });
  const resolved = db.getCall(call1.id);
  assert(resolved?.outcome === "correct", "Outcome set to correct");
  assert(resolved?.pnl === 0.4, "PnL stored");
  assert(resolved?.resolvedAt !== undefined, "Resolved timestamp set");

  // Create more calls for reputation testing
  const call2 = db.createCall(c1.id, {
    rawText: "ETH to $5k by April",
    question: "Will ETH exceed $5k by April 2027?",
    dataSource: "CoinGecko (ethereum)",
    resolutionCriteria: "Check ETH price.",
    subject: "ETH",
    targetValue: 5000,
    direction: "above",
    deadline: "2027-04-01T00:00:00.000Z",
    marketType: "boolean",
  }, 0.3, "yes");
  db.updateCallStatus(call2.id, "resolved", { outcome: "correct", pnl: 0.6 });

  const call3 = db.createCall(c1.id, {
    rawText: "SOL to $500 by June",
    question: "Will SOL exceed $500 by June 2027?",
    dataSource: "CoinGecko (solana)",
    resolutionCriteria: "Check SOL price.",
    subject: "SOL",
    targetValue: 500,
    direction: "above",
    deadline: "2027-06-01T00:00:00.000Z",
    marketType: "boolean",
  }, 0.2, "yes");
  db.updateCallStatus(call3.id, "resolved", { outcome: "incorrect", pnl: -0.2 });

  // Reputation
  const rep = db.getReputation(c1.id);
  assert(rep !== undefined, "Reputation computed");
  assert(rep!.totalCalls === 3, "Total calls = 3");
  assert(rep!.correctCalls === 2, "Correct calls = 2");
  assert(rep!.incorrectCalls === 1, "Incorrect calls = 1");
  assert(rep!.hitRate > 60, "Hit rate > 60%");
  assert(rep!.currentStreak === 0, "Current streak = 0 (last was incorrect)");
  assert(rep!.bestStreak === 2, "Best streak = 2");
  assert(rep!.netPnl === 0.8, "Net PnL = 0.8");

  // Leaderboard
  const leaderboard = db.getLeaderboard();
  assert(leaderboard.length >= 1, "Leaderboard has entries");
  assert(leaderboard[0].rank === 1, "First entry has rank 1");

  db.close();
}

cleanup();

// ─── Integration: CallsTracker (dry run) ─────────────────────

console.log("\n🔗 Integration Tests (dry run)\n");

cleanup();

{
  const tracker = new CallsTracker({ dbPath: TEST_DB, dryRun: true });

  // Register
  const caller = tracker.registerCaller("TestTrader", "TestWallet123", "@test", "twitter");
  assert(caller.name === "TestTrader", "Tracker register works");

  // Parse
  const { prediction, valid } = tracker.parsePrediction("BTC will hit $120k by March 2027");
  assert(valid, "Prediction is valid");
  assert(prediction.subject === "BTC", "Subject parsed");

  // Submit call (dry run)
  const result = await tracker.submitCall(caller.id, "BTC will hit $120k by March 2027", 0.5, "yes", 8);
  assert(result.call.id !== undefined, "Call created with ID");
  assert(result.errors.length === 0 || result.errors.every(e => !e.includes("Parse error")), "No parse errors");

  // Resolve
  const resolved = tracker.resolveCall(result.call.id, "correct", 0.8);
  assert(resolved?.outcome === "correct", "Call resolved correctly");

  // Reputation
  const rep = tracker.getReputation(caller.id);
  assert(rep !== undefined, "Reputation available");
  assert(rep!.totalCalls === 1, "Total calls = 1");
  assert(rep!.hitRate === 100, "Hit rate = 100%");

  // Dashboard
  const dashboard = tracker.formatLeaderboard();
  assert(dashboard.includes("TestTrader"), "Leaderboard includes caller");

  tracker.close();
}

cleanup();

// ─── Results ─────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"─".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
