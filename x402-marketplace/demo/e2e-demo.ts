/**
 * End-to-End Demo: x402 Agent Intel Marketplace
 *
 * Demonstrates the full agent-to-agent flow:
 * 1. Register analysts (Orion the Bull, Cassidy the Bear)
 * 2. Analysts fetch live Baozi markets via MCP
 * 3. Analysts publish market analyses behind x402 paywall
 * 4. Buyer agent discovers analyses via the marketplace
 * 5. Buyer requests access → gets 402 Payment Required
 * 6. Buyer pays via x402 (simulated) → receives full thesis
 * 7. Affiliate earns commission from the sale
 * 8. Market resolves → reputation records updated
 * 9. Leaderboard shown
 */
import chalk from "chalk";
import { getTestDb } from "../src/db/schema.js";
import { registerAnalyst } from "../src/services/registry.js";
import { publishAnalysis } from "../src/services/marketplace.js";
import { discoverAnalyses, requestAccess, completePurchase } from "../src/services/marketplace.js";
import { createReputationRecord, resolveReputationRecord, getAnalystStats, getLeaderboard } from "../src/services/reputation.js";
import { getAffiliateStats } from "../src/services/affiliate.js";
import { fetchActiveMarkets } from "../src/utils/mcp.js";

const DIVIDER = chalk.dim("─".repeat(72));

function header(text: string) {
  console.log("\n" + chalk.bold.cyan(`  ${text}`));
  console.log(DIVIDER);
}

function log(label: string, value: any) {
  const v = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  console.log(`  ${chalk.cyan(label.padEnd(22))}${v}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(chalk.bold.magenta("\n╔══════════════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.magenta("║        x402 Agent Intel Marketplace — End-to-End Demo               ║"));
  console.log(chalk.bold.magenta("╚══════════════════════════════════════════════════════════════════════╝"));

  const db = getTestDb();

  // ── Step 1: Register Analysts ────────────────────────────────────────────

  header("Step 1: Register Analysts");

  const orion = registerAnalyst(db, {
    walletAddress: "OrionBullWALLET111111111111111111111111111",
    name: "Orion the Bull",
    description: "Momentum-focused analyst specializing in YES plays",
  });
  log("Registered", orion.name);
  log("Affiliate Code", orion.affiliateCode);

  const cassidy = registerAnalyst(db, {
    walletAddress: "CassidyBearWALLET22222222222222222222222222",
    name: "Cassidy the Bear",
    description: "Contrarian bear analyst, specializes in overvalued markets",
    referredBy: orion.affiliateCode,  // Cassidy was referred by Orion
  });
  log("Registered", cassidy.name);
  log("Referred By", cassidy.referredBy ?? "—");
  log("Affiliate Code", cassidy.affiliateCode);

  // ── Step 2: Fetch Live Markets via Baozi MCP ─────────────────────────────

  header("Step 2: Fetch Live Baozi Markets via MCP");

  let marketPda = "DEMO_MARKET_PDA_11111111111111111111111111";
  let marketTitle = "Will BTC break $100k by end of Q2?";

  try {
    console.log("  Calling Baozi MCP list_markets...");
    const markets = await fetchActiveMarkets(3);
    if (markets.length > 0) {
      marketPda = markets[0].pda ?? markets[0].pubkey ?? marketPda;
      marketTitle = markets[0].title ?? marketTitle;
      log("Live Markets Found", markets.length);
      log("Selected Market", marketTitle);
      log("Market PDA", marketPda);
    } else {
      console.log(chalk.yellow("  (Using demo market — MCP returned no active markets)"));
      log("Market", marketTitle);
    }
  } catch (err: any) {
    console.log(chalk.yellow(`  (MCP unavailable: ${err.message.slice(0, 60)}) — using demo market`));
    log("Market", marketTitle);
  }

  // ── Step 3: Publish Analyses with x402 Paywall ──────────────────────────

  header("Step 3: Publish Analyses (x402 Paywall)");

  const orionAnalysis = await publishAnalysis(db, {
    analystId: orion.id,
    marketPda,
    title: "BTC $100k — Momentum Confirms Breakout",
    preview: "On-chain data shows accumulation at key support. Whale wallets are loading. This is a YES play with high conviction.",
    thesis: `FULL THESIS (UNLOCKED)\n\n` +
      `Market: ${marketTitle}\n\n` +
      `1. ON-CHAIN SIGNALS\n` +
      `   - Exchange outflows hit 6-month high (bullish)\n` +
      `   - Whale wallets (>100 BTC) accumulated +12,400 BTC last 7 days\n` +
      `   - SOPR crossed 1.0 → profitable holders not selling\n\n` +
      `2. TECHNICAL SETUP\n` +
      `   - Weekly close above $87k triggers measured move to $103-108k\n` +
      `   - CME gap fill at $88.2k completed last Monday (clean)\n` +
      `   - RSI(14) = 62 — room to run without being overbought\n\n` +
      `3. MACRO CONTEXT\n` +
      `   - Fed pause likely Q1 per CME FedWatch\n` +
      `   - Institutional ETF inflows +$2.1B this week\n\n` +
      `VERDICT: YES — 80% confidence. Target: $101-105k by end of Q2.\n` +
      `Position sizing: 3% of portfolio. Stop at weekly close below $82k.`,
    predictedSide: "YES",
    confidence: 80,
    priceInSol: 0.001,
    tags: ["bitcoin", "technical-analysis", "whale-watch"],
  });

  createReputationRecord(db, {
    analystId: orion.id,
    analysisId: orionAnalysis.id,
    marketPda,
    predictedSide: "YES",
    confidence: 80,
  });

  log("Published", orionAnalysis.title);
  log("Side", orionAnalysis.predictedSide);
  log("Confidence", `${orionAnalysis.confidence}%`);
  log("x402 Price", `${orionAnalysis.priceInSol} SOL`);
  log("Analysis ID", orionAnalysis.id);

  const cassidyAnalysis = await publishAnalysis(db, {
    analystId: cassidy.id,
    marketPda,
    title: "BTC $100k — Overbought, NO Play",
    preview: "Market is pricing in perfection. Macro headwinds and retail FOMO are classic reversal signals. This is a NO.",
    thesis: `FULL THESIS (UNLOCKED)\n\n` +
      `Market: ${marketTitle}\n\n` +
      `1. BEARISH DIVERGENCE\n` +
      `   - Funding rates on perps hit +0.06% (extreme greed)\n` +
      `   - Open interest up 40% with price only up 8% → leveraged longs at risk\n` +
      `   - Retail search interest (Google Trends) 95/100 — historically signals tops\n\n` +
      `2. MACRO HEADWINDS\n` +
      `   - US CPI printing hotter than expected → rate cut delay\n` +
      `   - DXY (dollar index) forming reversal pattern\n` +
      `   - Risk-off assets outperforming this week\n\n` +
      `3. HISTORICAL PATTERN\n` +
      `   - 2021 top: similar funding + retail setup → -55% correction\n` +
      `   - Q2 historically weak for crypto (sell in May effect)\n\n` +
      `VERDICT: NO — 65% confidence. Q2 ends below $100k.\n` +
      `This is a hedge position, not a directional short.`,
    predictedSide: "NO",
    confidence: 65,
    priceInSol: 0.0008,
    tags: ["bitcoin", "contrarian", "macro"],
  });

  createReputationRecord(db, {
    analystId: cassidy.id,
    analysisId: cassidyAnalysis.id,
    marketPda,
    predictedSide: "NO",
    confidence: 65,
  });

  log("\nPublished", cassidyAnalysis.title);
  log("Side", cassidyAnalysis.predictedSide);
  log("x402 Price", `${cassidyAnalysis.priceInSol} SOL`);

  // ── Step 4: Buyer Agent Discovers Analyses ───────────────────────────────

  header("Step 4: Buyer Agent Discovers Analyses");

  const buyerWallet = "BuyerAgentWALLET3333333333333333333333333";

  const allListings = discoverAnalyses(db, { marketPda });
  log("Available Analyses", allListings.length);
  for (const l of allListings) {
    const side = l.predictedSide === "YES" ? chalk.green("YES") : chalk.red("NO");
    console.log(`  ${chalk.dim("·")} [${l.id.slice(0, 8)}] ${l.title}`);
    console.log(`    ${side} (${l.confidence}%) — ${l.priceInSol} SOL — ${chalk.dim(l.preview.slice(0, 60))}...`);
  }

  const highConfidence = discoverAnalyses(db, { minConfidence: 75 });
  log("\nHigh-Confidence (≥75%)", highConfidence.length);

  // ── Step 5: Buyer Requests Access → 402 ─────────────────────────────────

  header("Step 5: Buyer Requests Access → 402 Payment Required");

  const accessCheck = requestAccess(db, orionAnalysis.id, buyerWallet, cassidy.affiliateCode);
  log("Status", accessCheck.status);
  if (accessCheck.status === 402 && accessCheck.payment) {
    log("Amount Required", `${accessCheck.payment.payment.amount} SOL`);
    log("Platform Fee", `${accessCheck.payment.payment.breakdown.platformFee.toFixed(6)} SOL`);
    log("Affiliate Comm.", `${accessCheck.payment.payment.breakdown.affiliateCommission.toFixed(6)} SOL`);
    log("Analyst Receives", `${accessCheck.payment.payment.breakdown.analystReceives.toFixed(6)} SOL`);
    log("Network", accessCheck.payment.payment.network);
    console.log(chalk.yellow("\n  ⚠ Payment required. Initiating x402 payment..."));
  }

  // ── Step 6: Buyer Pays → Full Thesis Unlocked ───────────────────────────

  header("Step 6: Buyer Pays via x402 → Full Thesis Unlocked");

  const { purchase, analysis: fullAnalysis } = await completePurchase(db, {
    analysisId: orionAnalysis.id,
    buyerWallet,
    affiliateCode: cassidy.affiliateCode,
  });

  log("Purchase ID", purchase.id);
  log("Tx Signature", purchase.txSignature.startsWith("SIM:")
    ? chalk.dim("[simulated — set X402_SIMULATE=false for real payments]")
    : purchase.txSignature);
  log("Amount Paid", `${purchase.amountSol} SOL`);
  log("Affiliate Commission", `${purchase.affiliateCommission.toFixed(6)} SOL → ${cassidy.affiliateCode}`);
  log("Simulated", purchase.simulated ? chalk.yellow("YES") : chalk.green("NO"));

  console.log(chalk.bold.green("\n  ✓ FULL THESIS UNLOCKED:"));
  console.log(chalk.dim(DIVIDER));
  console.log(fullAnalysis.thesis.split("\n").map(l => `  ${l}`).join("\n"));

  // ── Step 7: Affiliate Stats ──────────────────────────────────────────────

  header("Step 7: Affiliate Commission Stats");

  const orionAffiliate = getAffiliateStats(db, orion.affiliateCode);
  if (orionAffiliate) {
    log(`${orion.name}`, `${orionAffiliate.totalCommissions.toFixed(6)} SOL earned`);
    log("Total Referrals", orionAffiliate.totalReferrals);
  }

  const cassidyAffiliate = getAffiliateStats(db, cassidy.affiliateCode);
  if (cassidyAffiliate) {
    log(`${cassidy.name}`, `${cassidyAffiliate.totalCommissions.toFixed(6)} SOL earned`);
  }

  // ── Step 8: Market Resolves → Reputation Updated ─────────────────────────

  header("Step 8: Market Resolves → Reputation Tracking");

  // Simulate: market resolves YES — Orion was right, Cassidy was wrong
  const r1 = resolveReputationRecord(db, orionAnalysis.id, "YES");
  const r2 = resolveReputationRecord(db, cassidyAnalysis.id, "YES");

  if (r1) {
    const result = r1.wasCorrect ? chalk.green("✓ CORRECT") : chalk.red("✗ INCORRECT");
    log(`${orion.name}`, `Predicted ${r1.predictedSide} → Outcome YES → ${result}`);
  }
  if (r2) {
    const result = r2.wasCorrect ? chalk.green("✓ CORRECT") : chalk.red("✗ INCORRECT");
    log(`${cassidy.name}`, `Predicted ${r2.predictedSide} → Outcome YES → ${result}`);
  }

  // ── Step 9: Leaderboard ───────────────────────────────────────────────────

  header("Step 9: Final Leaderboard");

  const board = getLeaderboard(db);
  board.forEach((s, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : `${i + 1}.`;
    const score = s.reputationScore >= 70 ? chalk.green(`★${s.reputationScore}`) : chalk.yellow(`★${s.reputationScore}`);
    console.log(
      `  ${medal} ${chalk.bold(s.analystName.padEnd(22))} ${score}  ` +
      `WR: ${(s.winRate * 100).toFixed(0)}%  ` +
      `Earnings: ${s.totalEarnings.toFixed(6)} SOL`
    );
  });

  const orionStats = getAnalystStats(db, orion.id);
  log(`\n${orion.name} reputation`, `${orionStats.reputationScore}/100`);
  log("Total earnings", `${orionStats.totalEarnings.toFixed(6)} SOL`);

  console.log(chalk.bold.magenta("\n╔══════════════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.magenta("║              Demo Complete — All Steps Verified ✓                   ║"));
  console.log(chalk.bold.magenta("╚══════════════════════════════════════════════════════════════════════╝\n"));
}

main().catch((err) => {
  console.error(chalk.red("Demo failed:"), err);
  process.exit(1);
});
