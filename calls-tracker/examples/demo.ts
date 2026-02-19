#!/usr/bin/env tsx
/**
 * Demo: Calls Tracker in action
 * 
 * Creates 3 example callers with multiple predictions,
 * resolves them, and displays the reputation dashboard.
 * 
 * Run: npx tsx examples/demo.ts
 */
import { CallsTracker } from "../src/services/calls-tracker.js";
import { unlinkSync } from "node:fs";

const DB_PATH = "demo-calls-tracker.db";

// Clean up previous demo
try { unlinkSync(DB_PATH); } catch {}
try { unlinkSync(DB_PATH + "-wal"); } catch {}
try { unlinkSync(DB_PATH + "-shm"); } catch {}

async function main() {
  const tracker = new CallsTracker({ dbPath: DB_PATH, dryRun: true });

  console.log("═".repeat(60));
  console.log("  🎯 CALLS TRACKER DEMO");
  console.log("  Influencer Prediction Reputation System");
  console.log("═".repeat(60));

  // ── Register 3 callers ──────────────────────────────────────

  console.log("\n📋 Registering callers...\n");

  const alice = tracker.registerCaller(
    "CryptoAlice",
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "@cryptoalice",
    "twitter"
  );

  const bob = tracker.registerCaller(
    "SportsKingBob",
    "9WzDXwBbmPBJFhxpj2vFnRJGZtNGEfPkLYQpbWD2va3T",
    "@sportskingbob",
    "twitter"
  );

  const charlie = tracker.registerCaller(
    "AgentCharlie",
    "5ZWj7a1f8tWkjBESHKgrLmXGcFP2TYCwzRm6G8L6pump",
    "@agentcharlie",
    "twitter"
  );

  // ── Submit calls ────────────────────────────────────────────

  console.log("\n🎯 Submitting predictions...\n");

  // Alice's calls (crypto focus)
  const a1 = await tracker.submitCall(alice.id, "BTC will hit $110k by March 1, 2027", 0.5, "yes", 9);
  const a2 = await tracker.submitCall(alice.id, "ETH will exceed $5k by April 2027", 0.3, "yes", 7);
  const a3 = await tracker.submitCall(alice.id, "SOL will hit $300 by March 15, 2027", 0.4, "yes", 8);
  const a4 = await tracker.submitCall(alice.id, "DOGE will drop below $0.10 by February 2027", 0.2, "no", 6);
  const a5 = await tracker.submitCall(alice.id, "BTC will exceed $150k by end of 2027", 1.0, "yes", 5);

  // Bob's calls (sports focus)
  const b1 = await tracker.submitCall(bob.id, "Lakers will win the NBA championship this week", 0.3, "yes", 7);
  const b2 = await tracker.submitCall(bob.id, "NAVI will beat Vitality in CS2 Major finals by March 15, 2027", 0.5, "yes", 8);
  const b3 = await tracker.submitCall(bob.id, "T1 will win LCK Spring 2027", 0.4, "yes", 6);

  // Charlie's calls (mixed)
  const c1 = await tracker.submitCall(charlie.id, "SOL will exceed $500 by June 2027", 0.3, "yes", 5);
  const c2 = await tracker.submitCall(charlie.id, "BTC will hit $200k by end of 2027", 0.5, "yes", 4);
  const c3 = await tracker.submitCall(charlie.id, "ETH will drop below $2,000 in Q1 2027", 0.2, "no", 7);

  // ── Resolve calls ──────────────────────────────────────────

  console.log("\n⚖️  Resolving predictions...\n");

  // Alice: 4 correct, 1 pending → 80% hit rate
  tracker.resolveCall(a1.call.id, "correct", 0.45);
  tracker.resolveCall(a2.call.id, "correct", 0.6);
  tracker.resolveCall(a3.call.id, "correct", 0.35);
  tracker.resolveCall(a4.call.id, "incorrect", -0.2);
  // a5 stays pending

  // Bob: 2 correct, 1 incorrect → 67% hit rate
  tracker.resolveCall(b1.call.id, "incorrect", -0.3);
  tracker.resolveCall(b2.call.id, "correct", 0.5);
  tracker.resolveCall(b3.call.id, "correct", 0.3);

  // Charlie: 1 correct, 1 incorrect, 1 pending → 50% hit rate
  tracker.resolveCall(c1.call.id, "incorrect", -0.3);
  tracker.resolveCall(c2.call.id, "correct", 0.8);
  // c3 stays pending

  // ── Display dashboard ──────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("  📊 REPUTATION DASHBOARD");
  console.log("═".repeat(60));

  // Leaderboard
  console.log("\n🏆 LEADERBOARD\n");
  console.log(tracker.formatLeaderboard());

  // Individual profiles
  console.log("\n👤 CALLER PROFILES\n");
  for (const caller of [alice, bob, charlie]) {
    console.log(tracker.formatReputation(caller.id));
    console.log();
  }

  // Recent calls
  console.log("🕐 ALL CALLS\n");
  const allCalls = tracker.listCalls();
  for (const call of allCalls) {
    console.log(tracker.formatCall(call.id));
    console.log();
  }

  // Share card URLs
  console.log("🖼️  SHARE CARD URLS\n");
  for (const call of allCalls.filter((c) => c.marketPda)) {
    const caller = tracker.listCallers().find((cl) => cl.id === call.callerId);
    console.log(`  ${caller?.name}: ${call.prediction.question}`);
    console.log(`  https://baozi.bet/api/share/card?market=${call.marketPda}&wallet=${caller?.walletAddress}&ref=cristol`);
    console.log();
  }

  console.log("═".repeat(60));
  console.log("  Demo complete! Database saved to: " + DB_PATH);
  console.log("═".repeat(60));

  tracker.close();
}

main().catch(console.error);
