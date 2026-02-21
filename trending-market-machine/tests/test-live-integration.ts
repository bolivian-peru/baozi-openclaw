/**
 * Live Integration Tests for Trending Market Machine
 *
 * These tests call the REAL @baozi.bet/mcp-server handlers against
 * Solana mainnet. No mocks, no stubs, no simulations.
 *
 * Run: npx tsx tests/test-live-integration.ts
 */

import { listMarkets, getMarket, getQuote, PROGRAM_ID, NETWORK, FEES, BET_LIMITS, TIMING } from "../src/mcp-client.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { getAllCreationFees, getAllPlatformFees, getTimingConstraints } from "@baozi.bet/mcp-server/dist/handlers/market-creation.js";

const WALLET = "FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx";
const EXPECTED_PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration: number;
}

const results: TestResult[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 5000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i < attempts - 1 && msg.includes("429")) {
        console.log(`    ⏳ Rate limited, waiting ${delayMs / 1000}s before retry ${i + 2}/${attempts}...`);
        await sleep(delayMs);
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Exhausted retries");
}

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ name, passed: true, details, duration: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, details: msg, duration: Date.now() - start });
    console.log(`  ❌ ${name}: ${msg}`);
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

async function main(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🧪 Trending Market Machine — Live Integration Tests");
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════\n");

  // ─── Config Tests (no RPC needed) ───
  console.log("📋 Configuration Tests:");

  await runTest("PROGRAM_ID matches expected Baozi mainnet", async () => {
    const pid = PROGRAM_ID.toBase58();
    assert(pid === EXPECTED_PROGRAM_ID, `Expected ${EXPECTED_PROGRAM_ID}, got ${pid}`);
    return `PROGRAM_ID: ${pid}`;
  });

  await runTest("NETWORK is mainnet-beta", async () => {
    assert(NETWORK === "mainnet-beta", `Expected mainnet-beta, got ${NETWORK}`);
    return `NETWORK: ${NETWORK}`;
  });

  await runTest("FEES are configured", async () => {
    assert(FEES.LAB_CREATION_FEE > 0, "Lab creation fee should be > 0");
    assert(FEES.LAB_PLATFORM_FEE_BPS > 0, "Lab platform fee should be > 0");
    return `Lab creation fee: ${FEES.LAB_CREATION_FEE} lamports, platform fee: ${FEES.LAB_PLATFORM_FEE_BPS} bps`;
  });

  await runTest("BET_LIMITS are configured", async () => {
    assert(BET_LIMITS.MIN_BET_SOL > 0, "Min bet should be > 0");
    assert(BET_LIMITS.MAX_BET_SOL > BET_LIMITS.MIN_BET_SOL, "Max bet should be > min bet");
    return `Min: ${BET_LIMITS.MIN_BET_SOL} SOL, Max: ${BET_LIMITS.MAX_BET_SOL} SOL`;
  });

  await runTest("TIMING constraints are configured", async () => {
    assert(TIMING.BETTING_FREEZE_SECONDS > 0, "Betting freeze should be > 0");
    assert(TIMING.MIN_EVENT_BUFFER_HOURS > 0, "Min event buffer should be > 0");
    return `Freeze: ${TIMING.BETTING_FREEZE_SECONDS}s, Min buffer: ${TIMING.MIN_EVENT_BUFFER_HOURS}h`;
  });

  // ─── Market Creation Handlers (no RPC needed) ───
  console.log("\n🏗️  Market Creation Handler Tests:");

  await runTest("getAllCreationFees() returns fee structure", async () => {
    const fees = getAllCreationFees();
    assert(typeof fees.lab.sol === "number", "Should have lab fee in SOL");
    assert(fees.lab.sol > 0, "Lab fee should be > 0");
    return `Lab: ${fees.lab.sol} SOL, Private: ${fees.private.sol} SOL`;
  });

  await runTest("getAllPlatformFees() returns fee structure", async () => {
    const fees = getAllPlatformFees();
    assert(typeof fees.lab.bps === "number", "Should have lab fee bps");
    assert(fees.lab.bps > 0, "Lab fee bps should be > 0");
    return `Lab: ${fees.lab.percent}, Private: ${fees.private.percent}`;
  });

  await runTest("getTimingConstraints() returns constraints", async () => {
    const timing = getTimingConstraints();
    assert(timing.minEventBufferHours > 0, "Min buffer should be > 0");
    assert(timing.bettingFreezeSeconds > 0, "Freeze should be > 0");
    return `Buffer: ${timing.minEventBufferHours}h, Freeze: ${timing.bettingFreezeSeconds}s, Max duration: ${timing.maxMarketDurationDays} days`;
  });

  // ─── handleTool Tests ───
  console.log("\n🛠️  handleTool Tests:");

  await runTest("handleTool('get_creation_fees') works", async () => {
    const result = await handleTool("get_creation_fees", {});
    const text = result.content[0].text;
    assert(text.length > 0, "Should have content");
    return `Fees: ${text.slice(0, 200)}...`;
  });

  await runTest("handleTool('get_timing_rules') works", async () => {
    const result = await handleTool("get_timing_rules", {});
    const text = result.content[0].text;
    assert(text.length > 0, "Should have content");
    return `Timing: ${text.slice(0, 200)}...`;
  });

  await runTest("handleTool('validate_market_params') works", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = await handleTool("validate_market_params", {
      question: "Will Bitcoin exceed $200,000 by end of March 2026?",
      closing_time: futureDate,
      market_type: "event",
      event_time: futureDate,
    });
    const text = result.content[0].text;
    assert(text.length > 0, "Should return validation result");
    return `Validation: ${text.slice(0, 200)}...`;
  });

  // ─── Live RPC Tests (with retry/backoff) ───
  console.log("\n🔗 Live Handler Tests (Solana Mainnet RPC):");
  console.log("   (Using retry with backoff for rate-limited public RPC)\n");

  let sampleMarketPda = "";

  await runTest("listMarkets() returns live on-chain data", async () => {
    const markets = await retry(async () => listMarkets());
    assert(Array.isArray(markets), "Should return an array");
    assert(markets.length > 0, "Should have at least 1 market on mainnet");

    const m = markets[0];
    assert(typeof m.publicKey === "string", "Market should have publicKey");
    assert(typeof m.question === "string", "Market should have question");
    assert(typeof m.status === "string", "Market should have status");
    assert(typeof m.totalPoolSol === "number", "Market should have totalPoolSol");

    sampleMarketPda = m.publicKey;
    return `Found ${markets.length} markets. Sample: "${m.question}" (${m.status}, ${m.totalPoolSol} SOL pool)`;
  });

  await sleep(3000);

  await runTest("getMarket() returns specific market details", async () => {
    if (!sampleMarketPda) return "SKIP: No sample market PDA available";
    const market = await retry(async () => getMarket(sampleMarketPda));
    assert(market !== null, "Market should not be null");
    assert(market!.publicKey === sampleMarketPda, "Should return the requested market");
    assert(typeof market!.yesPercent === "number", "Should have yesPercent");
    assert(typeof market!.noPercent === "number", "Should have noPercent");
    return `Market "${market!.question}" — Yes: ${market!.yesPercent}%, No: ${market!.noPercent}%, Pool: ${market!.totalPoolSol} SOL`;
  });

  await sleep(3000);

  await runTest("getQuote() returns valid quote for active market", async () => {
    if (!sampleMarketPda) return "SKIP: No sample market available";
    const markets = await retry(async () => listMarkets("active"));
    const bettable = markets.find(m => m.isBettingOpen);
    if (!bettable) return "SKIP: No market with open betting found (all closed)";
    await sleep(2000);
    const quote = await retry(async () => getQuote(bettable.publicKey, "Yes", 0.01));
    assert(typeof quote.valid === "boolean", "Quote should have valid field");
    assert(typeof quote.impliedOdds === "number", "Quote should have impliedOdds");
    return `Quote for "${bettable.question}": valid=${quote.valid}, odds=${quote.impliedOdds}, payout=${quote.expectedPayoutSol} SOL`;
  });

  // ─── execMcpTool Wrapper Tests ───
  console.log("\n📡 execMcpTool Wrapper Tests:");

  const { execMcpTool } = await import("../src/mcp-client.js");

  await sleep(3000);

  await runTest("execMcpTool('list_markets') returns markets", async () => {
    const result = await retry(async () => {
      const r = await execMcpTool("list_markets", { status: "active" });
      if (!r.success) throw new Error(r.error || "Failed");
      return r;
    });
    assert(result.success, `Should succeed: ${result.error}`);
    assert(Array.isArray(result.data), "Data should be an array");
    return `${(result.data as unknown[]).length} active markets via execMcpTool`;
  });

  await sleep(3000);

  await runTest("execMcpTool('get_market') returns market detail", async () => {
    if (!sampleMarketPda) return "SKIP: No sample market PDA available";
    const result = await retry(async () => {
      const r = await execMcpTool("get_market", { publicKey: sampleMarketPda });
      if (!r.success) throw new Error(r.error || "Failed");
      return r;
    });
    assert(result.success, `Should succeed: ${result.error}`);
    return `Market retrieved via execMcpTool`;
  });

  // ─── Summary ───
  console.log("\n═══════════════════════════════════════════════════════");
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r => r.details.startsWith("SKIP")).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped, ${results.length} total (${totalTime}ms)`);
  console.log(`Wallet: ${WALLET}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);
  console.log(`Network: ${NETWORK}`);
  console.log("═══════════════════════════════════════════════════════\n");

  console.log("Detailed Results:");
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name} (${r.duration}ms)`);
    console.log(`     ${r.details.slice(0, 300)}`);
  }

  if (failed > 0) {
    const realFailures = results.filter(r => !r.passed && !r.details.includes("429") && !r.details.startsWith("SKIP"));
    if (realFailures.length > 0) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
