#!/usr/bin/env node
/**
 * x402 Intel Marketplace — CLI
 *
 * Usage:
 *   x402-market register   — Register as an analyst
 *   x402-market publish    — Publish a paywalled analysis
 *   x402-market browse     — Browse available intel listings
 *   x402-market buy        — Buy an analysis via x402
 *   x402-market reputation — Check analyst reputation
 *   x402-market serve      — Start the HTTP marketplace server
 *   x402-market demo       — Run a full end-to-end demo
 */
import { Command } from "commander";
import chalk from "chalk";
import "dotenv/config";
import { Marketplace } from "../marketplace.js";
import { MarketplaceServer } from "../server.js";
import { formatReputation, TIER_INFO } from "../reputation.js";

const program = new Command();
const marketplace = new Marketplace({
  dataDir: process.env.MARKETPLACE_DATA_DIR ?? "./data",
  simulatePayments: !process.env.X402_FACILITATOR_URL,
  x402FacilitatorUrl: process.env.X402_FACILITATOR_URL ?? "",
});

program
  .name("x402-market")
  .description("x402 Agent Intel Marketplace — Agents sell prediction market analysis to each other")
  .version("1.0.0");

// ─── register ─────────────────────────────────────────────────────────────────

program
  .command("register")
  .description("Register as an analyst")
  .requiredOption("--wallet <address>", "Your Solana wallet address")
  .requiredOption("--name <name>", "Display name (e.g. 'CryptoOwl')")
  .requiredOption("--affiliate <code>", "Your Baozi affiliate code")
  .action((opts) => {
    const analyst = marketplace.registerAnalyst({
      wallet: opts.wallet,
      displayName: opts.name,
      affiliateCode: opts.affiliate,
    });
    console.log(chalk.green("\n✅ Analyst registered!\n"));
    console.log(formatReputation(analyst));
    console.log();
  });

// ─── publish ──────────────────────────────────────────────────────────────────

program
  .command("publish")
  .description("Publish a paywalled market analysis")
  .requiredOption("--wallet <address>", "Your analyst wallet address")
  .requiredOption("--market <pda>", "Baozi market PDA (base58)")
  .requiredOption("--outcome <label>", "Predicted outcome (e.g. 'Yes', 'No')")
  .requiredOption("--confidence <1-100>", "Confidence score (1–100)", parseInt)
  .requiredOption("--price <SOL>", "Price in SOL (e.g. 0.01)", parseFloat)
  .requiredOption("--teaser <text>", "Short teaser (max 100 chars)")
  .requiredOption("--thesis <text>", "Full analysis (200–2000 chars)")
  .action(async (opts) => {
    const result = await marketplace.publishIntel({
      analystWallet: opts.wallet,
      marketPda: opts.market,
      predictedOutcome: opts.outcome,
      confidence: opts.confidence,
      priceSOL: opts.price,
      teaser: opts.teaser,
      thesis: opts.thesis,
    });

    if (!result.success || !result.intel) {
      console.error(chalk.red("\n❌ Failed to publish:"), result.error);
      process.exit(1);
    }

    console.log(chalk.green("\n✅ Analysis published!\n"));
    console.log(`ID:         ${result.intel.id}`);
    console.log(`Market:     ${result.intel.marketQuestion}`);
    console.log(`Prediction: ${result.intel.predictedOutcome} (${result.intel.confidence}% confidence)`);
    console.log(`Price:      ${result.intel.priceSOL} SOL`);
    console.log(`Teaser:     ${result.intel.teaser}`);
    console.log();
  });

// ─── browse ───────────────────────────────────────────────────────────────────

program
  .command("browse")
  .description("Browse available intel listings")
  .option("--min-confidence <n>", "Minimum confidence score", parseInt)
  .option("--min-tier <tier>", "Minimum reputation tier (novice|apprentice|journeyman|expert|master|oracle)")
  .option("--market <pda>", "Filter by market PDA")
  .option("--analyst <wallet>", "Filter by analyst wallet")
  .option("--limit <n>", "Max results", parseInt)
  .action((opts) => {
    const listings = marketplace.listIntel({
      analystWallet: opts.analyst,
      marketPda: opts.market,
      minConfidence: opts.minConfidence,
      minTier: opts.minTier,
      limit: opts.limit,
    });

    if (listings.length === 0) {
      console.log(chalk.yellow("\nNo intel listings found.\n"));
      return;
    }

    console.log(chalk.bold(`\n📊 ${listings.length} Intel Listing(s)\n`));

    for (const l of listings) {
      const tierInfo = TIER_INFO[l.analystTier];
      console.log(chalk.bold(`─── ${l.id.slice(0, 8)}... ───────────────────`));
      console.log(`Market:    ${l.marketQuestion}`);
      console.log(`Analyst:   ${l.analystName} ${tierInfo.emoji} ${tierInfo.label} (${l.analystAccuracy}% accurate)`);
      console.log(`Prediction: ${l.predictedOutcome} (${l.confidence}% confidence)`);
      console.log(`Price:     ${l.priceSOL} SOL`);
      console.log(`Teaser:    ${chalk.italic(l.teaser)}`);
      console.log(`Published: ${new Date(l.publishedAt).toLocaleString()}`);
      console.log(`Sales:     ${l.salesCount}`);
      console.log();
    }
  });

// ─── buy ──────────────────────────────────────────────────────────────────────

program
  .command("buy")
  .description("Purchase an analysis via x402 micropayment")
  .requiredOption("--id <intelId>", "Intel ID to purchase")
  .requiredOption("--buyer <wallet>", "Your wallet address")
  .option("--key <privateKey>", "Your base58 private key (for real payments)")
  .action(async (opts) => {
    console.log(chalk.blue("\n💳 Processing x402 payment...\n"));

    const result = await marketplace.purchaseIntel({
      intelId: opts.id,
      buyerWallet: opts.buyer,
      buyerPrivateKey: opts.key,
    });

    if (!result.success) {
      if (result.paymentRequest) {
        console.log(chalk.yellow("⚡ Payment required (HTTP 402):\n"));
        console.log(JSON.stringify(result.paymentRequest, null, 2));
      } else {
        console.error(chalk.red("\n❌ Purchase failed:"), result.error);
      }
      process.exit(1);
    }

    const intel = result.intel!;
    const simulated = "simulated" in (intel as any);

    console.log(chalk.green("✅ Purchase successful!\n"));
    if (simulated) {
      console.log(chalk.dim("(Simulated x402 payment — no real SOL spent)\n"));
    }

    console.log(chalk.bold("📋 Full Analysis:\n"));
    console.log(`Market:     ${intel.marketQuestion}`);
    console.log(`Prediction: ${intel.predictedOutcome} (${intel.confidence}% confidence)`);
    console.log();
    console.log(chalk.bold("Thesis:"));
    console.log(intel.thesis);
    console.log();
    console.log(chalk.bold("🔗 Bet via affiliate link:"));
    console.log(chalk.cyan(intel.affiliateUrl));
    console.log();
    console.log(chalk.dim("By using this link, the analyst earns 1% lifetime commission on your bets."));
    console.log();
  });

// ─── reputation ───────────────────────────────────────────────────────────────

program
  .command("reputation")
  .description("Check analyst reputation")
  .option("--wallet <address>", "Analyst wallet address")
  .action((opts) => {
    if (opts.wallet) {
      const analyst = marketplace.getAnalyst(opts.wallet);
      if (!analyst) {
        console.error(chalk.red(`\n❌ Analyst not found: ${opts.wallet}\n`));
        process.exit(1);
      }
      console.log(chalk.bold("\n📈 Analyst Reputation:\n"));
      console.log(formatReputation(analyst));
      console.log();
    } else {
      const analysts = marketplace.listAnalysts();
      if (analysts.length === 0) {
        console.log(chalk.yellow("\nNo analysts registered.\n"));
        return;
      }
      console.log(chalk.bold(`\n🏆 All Analysts (ranked by accuracy):\n`));
      for (const a of analysts) {
        const tier = TIER_INFO[a.tier];
        console.log(
          `${tier.emoji} ${a.displayName.padEnd(20)} ${a.accuracy.toString().padStart(3)}% accurate  ` +
            `${a.totalPredictions} calls  ${tier.label}`
        );
      }
      console.log();
    }
  });

// ─── serve ────────────────────────────────────────────────────────────────────

program
  .command("serve")
  .description("Start the HTTP marketplace server")
  .option("--port <n>", "Port to listen on", parseInt)
  .action(async (opts) => {
    const port = opts.port ?? parseInt(process.env.PORT ?? "3000");
    const server = new MarketplaceServer(
      {
        dataDir: process.env.MARKETPLACE_DATA_DIR ?? "./data",
        simulatePayments: !process.env.X402_FACILITATOR_URL,
        x402FacilitatorUrl: process.env.X402_FACILITATOR_URL ?? "",
      },
      port
    );
    await server.start();

    process.on("SIGINT", async () => {
      console.log("\nShutting down...");
      await server.stop();
      process.exit(0);
    });
  });

// ─── demo ─────────────────────────────────────────────────────────────────────

program
  .command("demo")
  .description("Run an end-to-end demo of the marketplace")
  .action(async () => {
    console.log(chalk.bold.blue("\n🎪 x402 Intel Marketplace — End-to-End Demo\n"));
    console.log(chalk.dim("(Simulated payments — no real SOL spent)\n"));

    // 1. Register analyst
    console.log(chalk.bold("Step 1: Register Analyst\n"));
    const analyst = marketplace.registerAnalyst({
      wallet: "DEMO1111111111111111111111111111111111111",
      displayName: "DemoOracle",
      affiliateCode: "DEMOORACLE",
    });
    console.log(`  ✅ Registered: ${analyst.displayName} (${analyst.tier} tier)`);

    // 2. Publish analysis
    console.log(chalk.bold("\nStep 2: Publish Analysis\n"));
    const demoThesis =
      "Based on my analysis of the on-chain data and current market sentiment, " +
      "I strongly believe this market will resolve YES. The key indicators are: " +
      "(1) Pool composition shows 73% concentration in YES outcome — whale wallets " +
      "are positioning heavily for resolution. (2) Recent transaction volume spiked " +
      "3x above baseline 48 hours ago, historically predicting resolution in the " +
      "dominant outcome's favor. (3) The originating oracle has a 91% accuracy rate " +
      "on similar boolean markets. Risk factors: low overall liquidity may cause " +
      "price slippage above 0.5 SOL bets. Recommended entry: 0.1–0.3 SOL for " +
      "optimal risk-adjusted return at current implied probability.";

    const pubResult = await marketplace.publishIntel({
      analystWallet: analyst.wallet,
      marketPda: "3xFP8nMNFpAJsZkLePQdW7bRmKHveNs1eMoQxjdD2mhK",
      predictedOutcome: "Yes",
      confidence: 78,
      priceSOL: 0.01,
      teaser: "Whale wallet accumulation signals YES resolution within 72h...",
      thesis: demoThesis,
    });

    if (!pubResult.success || !pubResult.intel) {
      console.error("  ❌ Failed to publish:", pubResult.error);
      return;
    }
    console.log(`  ✅ Published intel: ${pubResult.intel.id.slice(0, 8)}...`);
    console.log(`     Market: ${pubResult.intel.marketQuestion}`);
    console.log(`     Price: ${pubResult.intel.priceSOL} SOL`);

    // 3. Browse listings
    console.log(chalk.bold("\nStep 3: Buyer Browses Marketplace\n"));
    const listings = marketplace.listIntel();
    console.log(`  📋 Found ${listings.length} listing(s)`);
    for (const l of listings) {
      const tierInfo = TIER_INFO[l.analystTier];
      console.log(`  • [${l.id.slice(0, 8)}...] ${l.marketQuestion}`);
      console.log(`    Analyst: ${l.analystName} ${tierInfo.emoji} — ${l.priceSOL} SOL`);
      console.log(`    Teaser: "${l.teaser}"`);
    }

    // 4. Buy via x402
    console.log(chalk.bold("\nStep 4: Buyer Purchases via x402\n"));
    const buyResult = await marketplace.purchaseIntel({
      intelId: pubResult.intel.id,
      buyerWallet: "BUYER111111111111111111111111111111111111",
    });

    if (!buyResult.success || !buyResult.intel) {
      console.error("  ❌ Purchase failed:", buyResult.error);
      return;
    }

    console.log(`  ✅ Purchase complete! (simulated x402 payment)`);
    console.log(`  📋 Full thesis unlocked:`);
    console.log(chalk.dim(`     "${buyResult.intel.thesis?.slice(0, 120)}..."`));
    console.log(`  🔗 Affiliate URL: ${buyResult.intel.affiliateUrl}`);

    // 5. Resolve market
    console.log(chalk.bold("\nStep 5: Market Resolves → Reputation Update\n"));
    const resolveResult = marketplace.resolveIntel(pubResult.intel.id, "Yes");
    if (resolveResult.success && resolveResult.analyst) {
      const isCorrect = resolveResult.correct;
      console.log(`  ${isCorrect ? "✅" : "❌"} Prediction was ${isCorrect ? "CORRECT" : "WRONG"}!`);
      console.log(`  Updated reputation: ${resolveResult.analyst.tier} tier`);
      console.log(`  Accuracy: ${resolveResult.analyst.accuracy}% (${resolveResult.analyst.correctPredictions}/${resolveResult.analyst.totalPredictions})`);
    }

    console.log(chalk.bold.green("\n🎉 Demo complete!\n"));
    console.log("The full marketplace is available via:");
    console.log("  Library:  import { Marketplace } from '@baozi/x402-intel-marketplace'");
    console.log("  HTTP API: npm run serve");
    console.log("  CLI:      npm run register / publish / browse / buy / reputation");
    console.log();
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
