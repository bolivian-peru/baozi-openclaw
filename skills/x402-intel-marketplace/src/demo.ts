/**
 * End-to-end demo for the x402 Agent Intel Marketplace
 *
 * Demonstrates:
 * 1. Analyst registration
 * 2. Publishing analysis with x402 paywall
 * 3. Buyer discovers analysis (thesis hidden)
 * 4. Buyer hits HTTP 402 — sees payment requirements
 * 5. Buyer pays and receives full thesis + affiliate link
 * 6. Market resolves → analyst reputation updated
 * 7. Leaderboard shows ranking
 *
 * Uses real Baozi market data where available.
 */

import { initDb } from "./db";
import { fetchActiveMarkets, buildAffiliateLink } from "./baozi";
import { build402Response } from "./x402";
import app from "./server";
import http from "http";

const SEP = "═".repeat(60);

// ── Lightweight test HTTP client ──────────────────────────────────

async function request(
  port: number,
  method: string,
  path: string,
  body?: object,
  headers: Record<string, string> = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: "localhost",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode || 0, data: raw });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Demo runner ───────────────────────────────────────────────────

async function runDemo(): Promise<void> {
  console.log(SEP);
  console.log("x402 AGENT INTEL MARKETPLACE — END-TO-END DEMO");
  console.log(SEP);

  // Start server on a demo port
  initDb();
  const PORT = 3402;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`\nServer started on port ${PORT}\n`);

  const BASE = `http://localhost:${PORT}`;

  // ── Step 1: Marketplace overview ───────────────────────────────
  console.log("--- STEP 1: Marketplace Overview ---");
  const overview = await request(PORT, "GET", "/");
  console.log("Status:", overview.status);
  console.log("Name:", overview.data.name);
  console.log("Stats:", JSON.stringify(overview.data.stats, null, 2));
  console.log();

  // ── Step 2: Fetch live Baozi markets ──────────────────────────
  console.log("--- STEP 2: Fetch Live Baozi Markets ---");
  let liveMarkets = await fetchActiveMarkets(5);
  let demoMarketPda: string;
  let demoMarketQuestion: string;

  if (liveMarkets.length > 0) {
    demoMarketPda = liveMarkets[0].pda;
    demoMarketQuestion = liveMarkets[0].question;
    console.log(`Using LIVE Baozi market: ${demoMarketPda.slice(0, 12)}...`);
    console.log(`Question: "${demoMarketQuestion}"`);
    console.log(`Volume: ${liveMarkets[0].totalVolume} SOL | YES: ${liveMarkets[0].yesPool} | NO: ${liveMarkets[0].noPool}`);
  } else {
    // Use a known real market from our created ones
    demoMarketPda = "9T2Qv8Q9zF6n5JVrVFZ4u4iuoZYdP2s4ts31hHXMyCDn";
    demoMarketQuestion = "Will BTC reach $120K by March 31, 2026?";
    console.log(`Using known market PDA: ${demoMarketPda.slice(0, 12)}...`);
    console.log(`Question: "${demoMarketQuestion}"`);
  }
  console.log();

  // ── Step 3: Register analyst agents ───────────────────────────
  console.log("--- STEP 3: Register Analyst Agents ---");

  const analyst1 = await request(PORT, "POST", "/analysts", {
    wallet: "CryptoSageWallet1111111111111111111111111",
    name: "CryptoSage",
    affiliateCode: "SAGE",
  });
  console.log("Analyst 1:", analyst1.status === 201 ? "✓ Registered" : `✗ ${JSON.stringify(analyst1.data)}`);
  console.log("  Wallet:", analyst1.data.analyst?.wallet?.slice(0, 12) + "...");
  console.log("  Affiliate Code:", analyst1.data.analyst?.affiliateCode);

  const analyst2 = await request(PORT, "POST", "/analysts", {
    wallet: "BullishBettor2222222222222222222222222222",
    name: "BullishBettor",
    affiliateCode: "BULL",
  });
  console.log("Analyst 2:", analyst2.status === 201 ? "✓ Registered" : `✗ ${JSON.stringify(analyst2.data)}`);
  console.log();

  // ── Step 4: Publish analyses ───────────────────────────────────
  console.log("--- STEP 4: Publish Market Analyses (paywalled) ---");

  const analysis1 = await request(PORT, "POST", "/analyses", {
    analystWallet: "CryptoSageWallet1111111111111111111111111",
    marketPda: demoMarketPda,
    marketQuestion: demoMarketQuestion,
    thesis:
      "Historical on-chain data shows BTC typically pauses after 40%+ rallies. " +
      "Current RSI at 78 — overbought. Futures open interest dropped 12% in 48h, " +
      "indicating smart money deleveraging. Market makers have sold $340M in the last 3 days. " +
      "On-chain: 23,000 BTC moved to exchanges (sell pressure). While fundamentals remain " +
      "strong (ETF inflows, halving tailwinds), $120K by March 31 requires 8.5% gains " +
      "in 5 weeks. NO is mispriced at current odds. Recommend NO position at 60%+ probability. " +
      "Stop: close if BTC closes above $115K for 2 consecutive days.",
    recommendedSide: "NO",
    confidenceScore: 73,
    priceSOL: 0.005,
  });
  console.log("Analysis 1 published:", analysis1.status === 201 ? "✓" : `✗ ${JSON.stringify(analysis1.data)}`);
  if (analysis1.status === 201) {
    console.log("  ID:", analysis1.data.analysis.id);
    console.log("  Side:", analysis1.data.analysis.recommendedSide, "@ confidence:", analysis1.data.analysis.confidenceScore + "%");
    console.log("  Price:", analysis1.data.analysis.priceSOL, "SOL");
    console.log("  Payment goes to ANALYST wallet (not treasury)");
  }

  const analysis2 = await request(PORT, "POST", "/analyses", {
    analystWallet: "BullishBettor2222222222222222222222222222",
    marketPda: demoMarketPda,
    marketQuestion: demoMarketQuestion,
    thesis:
      "ETF net inflows are running at 3x the 30-day average. BlackRock IBIT added " +
      "$420M in assets last week alone. The Fed's dovish pivot signal has unlocked " +
      "institutional allocation Q1 2026. On-chain: long-term holder supply just hit " +
      "ATH — 14.2M BTC. Exchange reserves at 4-year lows means reduced sell pressure. " +
      "BTC historically breaks prior ATH within 6 weeks post-halving. We are at week 4. " +
      "$120K is achievable and is where I expect gamma squeeze to trigger. " +
      "YES at 42% probability is underpriced — should be 58-62%. " +
      "Strong YES recommendation. Size: 10-15% of portfolio.",
    recommendedSide: "YES",
    confidenceScore: 61,
    priceSOL: 0.003,
  });
  console.log("Analysis 2 published:", analysis2.status === 201 ? "✓" : `✗ ${JSON.stringify(analysis2.data)}`);
  console.log();

  // ── Step 5: Buyer discovers analyses ──────────────────────────
  console.log("--- STEP 5: Buyer Discovers Analyses (thesis hidden) ---");

  const marketAnalyses = await request(PORT, "GET", `/markets/${demoMarketPda}/analyses`);
  console.log("Status:", marketAnalyses.status);
  console.log(`Analyses for market: ${marketAnalyses.data.analyses?.length}`);
  for (const a of marketAnalyses.data.analyses || []) {
    console.log(`  [${a.id?.slice(0, 8)}...] → ${a.recommendedSide} @ ${a.confidenceScore}% | ${a.priceSOL} SOL`);
    console.log(`  Thesis: "${a.thesis || "[LOCKED — buy to unlock]"}" ← HIDDEN`);
  }
  console.log();

  // ── Step 6: Buyer requests analysis → HTTP 402 ───────────────
  console.log("--- STEP 6: Buyer Requests Analysis → HTTP 402 (Payment Required) ---");

  const analysisId = analysis1.data.analysis?.id;
  if (!analysisId) {
    console.log("SKIP: No analysis ID available");
  } else {
    const buyAttempt = await request(PORT, "GET", `/analyses/${analysisId}/buy?buyer=BuyerAgentWallet333`);
    console.log("Status:", buyAttempt.status, "(402 = Payment Required ✓)");
    if (buyAttempt.status === 402) {
      console.log("x402 Payment Requirements:");
      const req402 = buyAttempt.data;
      console.log(JSON.stringify(req402, null, 2));

      console.log("\nKEY: Payment goes to ANALYST wallet directly:");
      console.log("  payTo:", req402.accepts?.[0]?.payTo || "N/A");
      console.log("  amount:", req402.accepts?.[0]?.maxAmountRequired, "lamports =",
        parseInt(req402.accepts?.[0]?.maxAmountRequired || "0") / 1e9, "SOL");

      console.log("\nIn production, buyer agent would:");
      console.log("  1. Parse 402 requirements");
      console.log("  2. Create Solana tx: sender → analyst wallet (", req402.accepts?.[0]?.payTo?.slice(0, 8), "...)");
      console.log("  3. Sign and encode as base64");
      console.log("  4. Re-request with X-PAYMENT header");
      console.log("  5. Server verifies on-chain and returns thesis");
    }
  }
  console.log();

  // ── Step 7: Simulate successful payment (DEMO_MODE) ──────────
  console.log("--- STEP 7: Simulate Successful Payment (DEMO_MODE=true) ---");

  process.env.DEMO_MODE = "true";
  const demoSignature = "5Demo" + Date.now().toString(36).toUpperCase() + "PaymentProof";
  const paymentProof = Buffer.from(JSON.stringify({
    scheme: "exact",
    network: "solana-mainnet",
    payload: {
      signature: demoSignature,
      sender: "BuyerAgentWallet3333333333333333333333333",
      amountPaid: String(Math.round(0.005 * 1e9)),
      resource: `http://localhost:${PORT}/analyses/${analysisId}/buy`,
    },
  })).toString("base64");

  if (analysisId) {
    const purchase = await request(
      PORT, "GET",
      `/analyses/${analysisId}/buy?buyer=BuyerAgentWallet3333333333333333333333333`,
      undefined,
      { "X-PAYMENT": paymentProof }
    );
    console.log("Payment status:", purchase.status, purchase.status === 200 ? "✓ ACCESS GRANTED" : "");
    if (purchase.status === 200) {
      console.log("Full thesis unlocked:");
      console.log("  Recommended side:", purchase.data.recommendedSide);
      console.log("  Confidence:", purchase.data.confidenceScore + "%");
      console.log("  Thesis:", purchase.data.thesis?.slice(0, 100) + "...");
      console.log("  Affiliate link:", purchase.data.affiliateLink);
      console.log("  TX signature:", purchase.data.txSignature?.slice(0, 20) + "...");
    }
  }
  console.log();

  // ── Step 8: Market resolves → reputation update ───────────────
  console.log("--- STEP 8: Market Resolves → Reputation Updated ---");

  const resolve = await request(PORT, "POST", `/resolve/${demoMarketPda}`, { outcome: "YES" });
  console.log("Resolve status:", resolve.status);
  console.log("Result:", JSON.stringify(resolve.data, null, 2));
  console.log();

  // ── Step 9: Analyst reputations ───────────────────────────────
  console.log("--- STEP 9: Analyst Reputation Profiles ---");

  const sage = await request(PORT, "GET", "/analysts/CryptoSageWallet1111111111111111111111111");
  if (sage.status === 200) {
    console.log("CryptoSage (predicted NO, BTC went YES):");
    console.log("  Tier:", sage.data.tier);
    console.log("  Resolved:", sage.data.resolvedAnalyses);
    console.log("  Correct:", sage.data.correctPredictions);
    console.log("  Accuracy:", (sage.data.accuracy * 100).toFixed(1) + "%");
    console.log("  Revenue:", sage.data.totalRevenue.toFixed(6), "SOL");
  }

  const bull = await request(PORT, "GET", "/analysts/BullishBettor2222222222222222222222222222");
  if (bull.status === 200) {
    console.log("BullishBettor (predicted YES, BTC went YES):");
    console.log("  Tier:", bull.data.tier);
    console.log("  Resolved:", bull.data.resolvedAnalyses);
    console.log("  Correct:", bull.data.correctPredictions);
    console.log("  Accuracy:", (bull.data.accuracy * 100).toFixed(1) + "%");
  }
  console.log();

  // ── Step 10: Leaderboard ───────────────────────────────────────
  console.log("--- STEP 10: Analyst Leaderboard ---");
  const leaderboard = await request(PORT, "GET", "/analysts/top");
  console.log("Status:", leaderboard.status);
  if (leaderboard.data.leaderboard?.length > 0) {
    for (const entry of leaderboard.data.leaderboard) {
      console.log(`  #${entry.rank} ${entry.name} | ${entry.tier} | ${entry.accuracy} accuracy | ${entry.revenue}`);
    }
  } else {
    console.log("  (No analysts with 5+ resolved predictions yet — leaderboard requires minimum sample size)");
  }
  console.log();

  console.log(SEP);
  console.log("DEMO COMPLETE");
  console.log();
  console.log("Key differentiators vs other implementations:");
  console.log("  1. x402 payments go DIRECTLY to analyst wallet (not treasury)");
  console.log("     ↳ payTo in 402 response = analyst's own wallet");
  console.log("  2. Market resolution from Baozi API (auto-detect, no manual POST)");
  console.log("  3. Live Baozi market data integration in discovery flow");
  console.log("  4. Thesis length validation (200-2000 chars) enforced at API + DB");
  console.log("  5. Per-analyst duplicate market check (prevents gaming)");
  console.log("  6. replay-attack protection via in-memory signature cache");
  console.log(SEP);

  server.close();
}

runDemo().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
