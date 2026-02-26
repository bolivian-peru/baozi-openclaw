#!/usr/bin/env bun
/**
 * x402 Intel Marketplace — CLI Entry Point
 *
 * Commands:
 *   serve      — Start the HTTP server (default on port 3040)
 *   list       — List available analyses
 *   markets    — Show active Baozi markets via MCP
 *   publish    — Publish an analysis (interactive)
 *   buy        — Buy an analysis (simulated demo)
 *   reputation — Show analyst reputation leaderboard
 *   demo       — Run end-to-end demo flow
 */

import { startServer } from "./server.ts";
import { getAnalyses, registerAnalyst, publishAnalysis, computeReputation, getAnalysts, recordPurchase, recordPrediction } from "./store.ts";
import { buildSimulatedPaymentProof, verifyPaymentProof, buildPaymentRequirements } from "./x402.ts";
import { getActiveMarkets, stopMcp, formatAffiliateLink } from "./mcp.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

function header(text: string): void {
  console.log(`\n${BOLD}${CYAN}${text}${RESET}`);
  console.log("─".repeat(text.length));
}

function ok(msg: string): void { console.log(`${GREEN}✓${RESET} ${msg}`); }
function warn(msg: string): void { console.log(`${YELLOW}⚠${RESET} ${msg}`); }
function err(msg: string): void { console.log(`${RED}✗${RESET} ${msg}`); }
function info(msg: string): void { console.log(`${DIM}  ${msg}${RESET}`); }

const cmd = process.argv[2] ?? "serve";

switch (cmd) {
  case "serve": {
    await startServer();
    // Keep alive
    break;
  }

  case "list": {
    header("Available Analyses");
    const analyses = getAnalyses();
    if (analyses.length === 0) {
      warn("No analyses published yet. Run: bun run publish");
      break;
    }
    for (const a of analyses) {
      console.log(`\n${BOLD}[${a.id.slice(0, 8)}]${RESET} ${a.marketQuestion}`);
      info(`Side: ${a.recommendedSide} | Confidence: ${a.confidenceScore}% | Price: ${a.priceSol} SOL`);
      info(`Preview: ${a.preview}`);
      info(`Buy: GET /analyses/${a.id}`);
    }
    break;
  }

  case "markets": {
    header("Active Baozi Markets (Live MCP Data)");
    console.log("Fetching from @baozi.bet/mcp-server...\n");
    const markets = await getActiveMarkets();
    stopMcp();
    if (markets.length === 0) {
      warn("No active markets found or MCP unavailable");
    } else {
      for (const m of markets) {
        console.log(`${BOLD}${m.question ?? m.publicKey}${RESET}`);
        info(`PDA: ${m.publicKey} | Status: ${m.status}`);
      }
    }
    break;
  }

  case "reputation": {
    header("Analyst Reputation Leaderboard");
    const analysts = getAnalysts();
    if (analysts.length === 0) {
      warn("No analysts registered yet.");
      break;
    }
    for (const analyst of analysts) {
      const stats = computeReputation(analyst.wallet);
      if (!stats) continue;
      console.log(`\n${BOLD}${stats.displayName}${RESET} (${stats.affiliateCode})`);
      info(`Wallet: ${stats.wallet.slice(0, 16)}...`);
      info(`Accuracy: ${(stats.accuracy * 100).toFixed(1)}% (${stats.correct}/${stats.correct + stats.incorrect} settled)`);
      info(`Analyses: ${stats.totalAnalyses} | Sold: ${stats.totalSold} | Revenue: ${stats.revenueSol.toFixed(3)} SOL`);
      info(`Avg Confidence: ${stats.avgConfidence.toFixed(0)}%`);
    }
    break;
  }

  case "demo": {
    header("x402 Intel Marketplace — End-to-End Demo");
    console.log("\nThis demo shows the full flow:");
    console.log("  Analyst registers → publishes analysis → buyer discovers → pays → receives thesis\n");

    // 1. Fetch real markets
    console.log(`${BOLD}Step 1: Fetch real Baozi markets via MCP${RESET}`);
    console.log("  Connecting to @baozi.bet/mcp-server...");
    const markets = await getActiveMarkets();
    stopMcp();

    let marketPda: string;
    let marketQuestion: string;

    if (markets.length > 0) {
      const m = markets[0];
      marketPda = m.publicKey;
      marketQuestion = m.question ?? `Market ${m.publicKey.slice(0, 8)}`;
      ok(`Found ${markets.length} active markets. Using: "${marketQuestion}"`);
    } else {
      warn("MCP unavailable — using demo market");
      marketPda = "9T2Qv8Q9zF6n5JVrVFZ4u4iuoZYdP2s4ts31hHXMyCDn";
      marketQuestion = "Will BTC reach $110k before March 2026?";
    }

    // 2. Register analyst
    console.log(`\n${BOLD}Step 2: Analyst registers${RESET}`);
    const analystWallet = "GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH";
    const analyst = registerAnalyst(analystWallet, "AuroraIntel");
    ok(`Analyst registered: ${analyst.displayName} (affiliate code: ${analyst.affiliateCode})`);

    // 3. Publish analysis
    console.log(`\n${BOLD}Step 3: Analyst publishes paywalled analysis${RESET}`);
    const thesis = `After analyzing on-chain volume patterns and liquidity depth for the ${marketQuestion} market, ` +
      `this position shows significant mispricing. Current YES probability at 58% underestimates the momentum ` +
      `indicators: 3-week BTC trend strength is 0.82 (strong), open interest increased 24% last week, and ` +
      `institutional flow data from on-chain analytics shows net buying pressure. Historical accuracy of similar ` +
      `setups: 73% YES resolution. Recommended position sizing: 2-5% of bankroll at current odds. ` +
      `Entry window: next 48 hours before expected repricing. The affiliate link below includes my ` +
      `code for 1% lifetime commission on all bets placed via this analysis.`;

    const analysis = publishAnalysis(
      analystWallet, marketPda, marketQuestion,
      thesis, "YES", 78, 0.01
    );
    recordPrediction(analystWallet, analysis.id, marketPda, "YES", 78);
    ok(`Analysis published (ID: ${analysis.id.slice(0, 12)}...)`);
    info(`Price: ${analysis.priceSol} SOL | Side: ${analysis.recommendedSide} | Confidence: ${analysis.confidenceScore}%`);
    info(`Preview: "${analysis.preview}"`);

    // 4. Buyer discovers and gets 402
    console.log(`\n${BOLD}Step 4: Buyer agent requests analysis — gets 402${RESET}`);
    const buyerWallet = "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
    const requirements = buildPaymentRequirements(
      analysis.id, analysis.priceSol, analystWallet,
      `Market thesis: ${marketQuestion}`
    );
    console.log(`  Server returns: HTTP 402 Payment Required`);
    info(`  X-Payment-Required: [base64 encoded x402 requirements]`);
    info(`  Payment to: ${analystWallet.slice(0, 16)}... (analyst wallet)`);
    info(`  Amount: ${analysis.priceSol} SOL (${requirements.maxAmountRequired} lamports)`);

    // 5. Buyer generates simulated payment proof
    console.log(`\n${BOLD}Step 5: Buyer generates x402 payment proof${RESET}`);
    console.log(`${YELLOW}  ⚠ SIMULATED: In production, real Solana tx broadcast here${RESET}`);
    const proof = buildSimulatedPaymentProof(buyerWallet, analysis.id, analysis.priceSol);
    ok(`Payment proof generated: ${proof.paymentHash.slice(0, 20)}...`);

    // 6. Verify and unlock
    console.log(`\n${BOLD}Step 6: Server verifies proof — delivers analysis${RESET}`);
    const { valid, reason } = verifyPaymentProof(proof, requirements);
    if (valid) {
      recordPurchase(analysis.id, buyerWallet, proof.paymentHash);
      ok("Payment verified ✓");
      ok("Full analysis unlocked!");
      info(`Thesis: ${thesis.slice(0, 120)}...`);
      const affiliateLink = formatAffiliateLink(marketPda, analyst.affiliateCode);
      info(`Affiliate link: ${affiliateLink}`);
      info(`Bet via affiliate link → analyst earns 1% commission`);
    } else {
      err(`Verification failed: ${reason}`);
    }

    // 7. Reputation
    console.log(`\n${BOLD}Step 7: Analyst reputation (updated after market resolves)${RESET}`);
    const stats = computeReputation(analystWallet);
    if (stats) {
      info(`${stats.displayName}: ${stats.totalAnalyses} analyses, ${stats.totalSold} sold`);
      info(`Revenue: ${stats.revenueSol.toFixed(3)} SOL | Accuracy: ${(stats.accuracy * 100).toFixed(1)}%`);
    }

    header("Demo Complete");
    console.log("\nTo run the live server: bun run serve");
    console.log("Then test with: curl http://localhost:3040/analyses");
    console.log();
    break;
  }

  default: {
    console.log(`Usage: bun run <command>`);
    console.log(`Commands: serve, list, markets, publish, buy, reputation, demo`);
  }
}
