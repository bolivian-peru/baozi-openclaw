#!/usr/bin/env npx tsx
/**
 * Live Integration Test — Calls Tracker
 *
 * Tests the full calls-tracker pipeline against real Baozi APIs on Solana mainnet:
 * 1. Verify PROGRAM_ID and NETWORK from @baozi.bet/mcp-server config
 * 2. Fetch live markets from Solana mainnet via direct handler imports
 * 3. Get single market details via getMarket()
 * 4. Get quote via getQuote()
 * 5. Test handleTool() with list_markets
 * 6. Test prediction parser with real market data
 * 7. Test MarketService with live data
 * 8. Test dry-run call flow
 *
 * This proves real API interaction — no mocks, no stubs, no subprocess spawning.
 * Uses cached results to avoid Solana public RPC rate limits (429).
 */

import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { execMcpTool } from "../services/mcp-client.js";
import { MarketService } from "../services/market-service.js";
import { parsePrediction, validatePrediction } from "../parsers/prediction-parser.js";

const WALLET = "FdWWx9pFvgxoE3e45dofAJ9gqygTzvHhqmUMwEdP3Nzx";
const EXPECTED_PROGRAM_ID = "FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<{ passed: boolean; details: string; data?: any }>) {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: result.passed, duration, details: result.details, data: result.data });
    console.log(`${result.passed ? "✅" : "❌"} ${name} (${duration}ms)`);
    if (result.details) console.log(`  ${result.details}`);
    return result;
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, details: `Exception: ${err.message}` });
    console.log(`❌ ${name} (${duration}ms)`);
    console.log(`  Exception: ${err.message}`);
    return { passed: false, details: err.message };
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log("\n🧪 LIVE INTEGRATION TESTS — Calls Tracker");
console.log("=".repeat(60));
console.log(`Program ID: ${PROGRAM_ID}`);
console.log(`Network: ${NETWORK}`);
console.log(`Wallet: ${WALLET}`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// -- Test 1: Program ID
await runTest("1. Program ID matches expected", async () => {
  const pid = String(PROGRAM_ID);
  return {
    passed: pid === EXPECTED_PROGRAM_ID,
    details: `Expected: ${EXPECTED_PROGRAM_ID}, Got: ${pid}`,
  };
});

// -- Test 2: Network is mainnet-beta
await runTest("2. Network is mainnet-beta", async () => {
  return {
    passed: NETWORK === "mainnet-beta",
    details: `Network: ${NETWORK}`,
  };
});

// -- Test 3: Fetch live markets via direct listMarkets() handler (single RPC call, cache for later)
let liveMarkets: any[] = [];
await runTest("3. Fetch live markets via direct listMarkets() handler", async () => {
  const markets = await listMarkets("active");
  liveMarkets = markets || [];
  return {
    passed: Array.isArray(markets) && markets.length > 0,
    details: `Fetched ${liveMarkets.length} active markets from Solana mainnet`,
    data: { count: liveMarkets.length },
  };
});

await sleep(3000);

// -- Test 4: Fetch markets via handleTool('list_markets')
let handleToolResponse: any = null;
await runTest("4. Fetch markets via handleTool('list_markets')", async () => {
  const result = await handleTool("list_markets", { status: "active" });
  const text = result?.content?.[0]?.text;
  if (!text) return { passed: false, details: "Empty response" };

  handleToolResponse = JSON.parse(text);
  const htMarkets = handleToolResponse.markets || [];
  return {
    passed: handleToolResponse.success === true && htMarkets.length > 0,
    details: `Network: ${handleToolResponse.network}, Program: ${handleToolResponse.programId}, Markets: ${htMarkets.length}`,
    data: { network: handleToolResponse.network, programId: handleToolResponse.programId, count: htMarkets.length },
  };
});

await sleep(3000);

// -- Test 5: Get single market via getMarket()
const testMarketPda = liveMarkets[0]?.publicKey || "";
let cachedMarketDetail: any = null;
await runTest("5. Get single market via direct getMarket() handler", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  cachedMarketDetail = await getMarket(testMarketPda);
  const question = cachedMarketDetail?.question || "";
  return {
    passed: question.length > 0,
    details: `Market: "${question.slice(0, 60)}" YES: ${cachedMarketDetail?.yesPercent ?? "N/A"}% NO: ${cachedMarketDetail?.noPercent ?? "N/A"}% Pool: ${cachedMarketDetail?.totalPoolSol ?? "N/A"} SOL`,
    data: cachedMarketDetail,
  };
});

await sleep(3000);

// -- Test 6: Get quote via direct getQuote() handler
let cachedQuote: any = null;
await runTest("6. Get quote via direct getQuote() handler", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  cachedQuote = await getQuote(testMarketPda, "Yes", 0.1);
  return {
    passed: cachedQuote !== null && cachedQuote !== undefined,
    details: cachedQuote
      ? `Valid: ${cachedQuote.valid}, Expected payout: ${cachedQuote.expectedPayoutSol?.toFixed(4)} SOL, Implied odds: ${(cachedQuote.impliedOdds * 100)?.toFixed(1)}%`
      : "No quote returned",
    data: cachedQuote,
  };
});

// -- Test 7: execMcpTool wrapper maps tool names correctly (uses cached result to verify mapping)
await runTest("7. execMcpTool('get_market') wrapper maps to direct handler", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  // Verify the wrapper correctly delegates to the direct handler
  // Using get_market which is a lighter call than list_markets
  const result = await execMcpTool("get_market", { market_pda: testMarketPda });
  const question = result.data?.question || "";
  return {
    passed: result.success === true && question.length > 0,
    details: `execMcpTool correctly routed to getMarket(). Market: "${question.slice(0, 60)}"`,
    data: result.data,
  };
});

// -- Test 8: execMcpTool('get_quote') wrapper works
await runTest("8. execMcpTool('get_quote') wrapper works", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  const result = await execMcpTool("get_quote", { market_pda: testMarketPda, side: "Yes", amount: 0.1 });
  return {
    passed: result.success === true && result.data !== null,
    details: result.success
      ? `Valid: ${result.data?.valid}, Payout: ${result.data?.expectedPayoutSol?.toFixed(4)} SOL`
      : `Error: ${result.error}`,
    data: result.data,
  };
});

// -- Test 9: MarketService uses correct program and network config
await runTest("9. MarketService reads correct program ID and network", async () => {
  const service = new MarketService();
  const pid = service.getProgramId();
  const net = service.getNetwork();
  return {
    passed: pid === EXPECTED_PROGRAM_ID && net === "mainnet-beta",
    details: `Program: ${pid}, Network: ${net}`,
  };
});

// -- Test 10: MarketService.fetchMarketDetails() uses cached-friendly single-market call
await runTest("10. MarketService.fetchMarketDetails() for live market", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  const service = new MarketService();
  const market = await service.fetchMarketDetails(testMarketPda);
  return {
    passed: market !== null && market?.question?.length > 0,
    details: `Market: "${market?.question?.slice(0, 60)}"`,
    data: market,
  };
});

// -- Test 11: MarketService.fetchQuote() for live market
await runTest("11. MarketService.fetchQuote() for live market", async () => {
  if (!testMarketPda) return { passed: false, details: "No market PDA available" };

  const service = new MarketService();
  const quote = await service.fetchQuote(testMarketPda, "Yes", 0.1);
  return {
    passed: quote !== null && quote !== undefined,
    details: quote
      ? `Valid: ${quote.valid}, Payout: ${quote.expectedPayoutSol?.toFixed(4)} SOL`
      : "No quote returned",
    data: quote,
  };
});

// -- Test 12: Prediction parser produces valid output
await runTest("12. Prediction parser produces valid market params", async () => {
  const prediction = parsePrediction("BTC will hit $110k by March 1, 2027");
  const { valid, errors } = validatePrediction(prediction);
  return {
    passed: valid && prediction.subject === "BTC" && prediction.targetValue === 110000,
    details: `Question: "${prediction.question}", Subject: ${prediction.subject}, Target: $${prediction.targetValue}, Direction: ${prediction.direction}`,
    data: prediction,
  };
});

// -- Test 13: MarketService.buildMarketParams() from parsed prediction
await runTest("13. MarketService.buildMarketParams() from parsed prediction", async () => {
  const prediction = parsePrediction("SOL will exceed $500 in Q1 2027");
  const service = new MarketService();
  const params = service.buildMarketParams(prediction);
  return {
    passed: params.question.length > 0 && params.closingTime > 0 && params.dataSource.includes("CoinGecko"),
    details: `Question: "${params.question}", Close: ${new Date(params.closingTime * 1000).toISOString()}, Fee: ${params.creatorFee}bps`,
    data: params,
  };
});

// -- Test 14: Full dry-run call flow (parser → market service → tracker)
await runTest("14. Full dry-run call flow (no real market creation)", async () => {
  const service = new MarketService({ dryRun: true });
  const prediction = parsePrediction("ETH will hit $5000 by March 2027");
  const { valid } = validatePrediction(prediction);
  if (!valid) return { passed: false, details: "Invalid prediction" };

  const result = await service.executeCall(prediction, WALLET, 0.1, "yes");
  return {
    passed: result.marketPda !== undefined && result.marketPda.startsWith("DRY_RUN"),
    details: `Market PDA: ${result.marketPda}, Errors: ${result.errors.length}`,
    data: result,
  };
});

// -- Test 15: Verify live market data has correct structure
await runTest("15. Verify live market data structure", async () => {
  if (liveMarkets.length === 0) return { passed: false, details: "No markets to verify" };

  const market = liveMarkets[0];
  const hasRequired =
    market.publicKey &&
    market.question &&
    market.status &&
    market.yesPercent !== undefined &&
    market.noPercent !== undefined &&
    market.totalPoolSol !== undefined;

  return {
    passed: hasRequired,
    details: `PDA: ${market.publicKey?.slice(0, 12)}..., Question: "${market.question?.slice(0, 40)}...", YES: ${market.yesPercent}%, NO: ${market.noPercent}%, Pool: ${market.totalPoolSol} SOL`,
    data: {
      pda: market.publicKey,
      question: market.question,
      yesPercent: market.yesPercent,
      noPercent: market.noPercent,
      totalPoolSol: market.totalPoolSol,
      status: market.status,
      layer: market.layer,
    },
  };
});

// -- Test 16: handleTool response contains correct network and program metadata
await runTest("16. handleTool response has correct network metadata", async () => {
  if (!handleToolResponse) return { passed: false, details: "No handleTool response cached" };

  return {
    passed:
      handleToolResponse.network === "mainnet-beta" &&
      handleToolResponse.programId === EXPECTED_PROGRAM_ID &&
      handleToolResponse.success === true,
    details: `network: ${handleToolResponse.network}, programId: ${handleToolResponse.programId}, success: ${handleToolResponse.success}`,
  };
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(60));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;
const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

console.log(`\n✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${failed}/${total}`);
console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(1)}s`);

if (failed > 0) {
  console.log("\nFailed tests:");
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  ❌ ${r.name}: ${r.details}`);
  }
}

// Export results for PROOF.md generation
const proofData = {
  timestamp: new Date().toISOString(),
  network: String(NETWORK),
  programId: String(PROGRAM_ID),
  wallet: WALLET,
  tests: results,
  summary: { passed, failed, total, totalTimeMs: totalTime },
  liveMarkets: liveMarkets.slice(0, 5).map((m: any) => ({
    pda: m.publicKey,
    question: m.question,
    yesPercent: m.yesPercent,
    noPercent: m.noPercent,
    totalPoolSol: m.totalPoolSol,
    closingTime: m.closingTime,
    status: m.status,
    layer: m.layer,
  })),
};

// Write proof data to file
const fs = await import("fs");
fs.writeFileSync(
  new URL("../../test-results.json", import.meta.url),
  JSON.stringify(proofData, null, 2)
);
console.log("\n📄 Results written to test-results.json");

process.exit(failed > 0 ? 1 : 0);
