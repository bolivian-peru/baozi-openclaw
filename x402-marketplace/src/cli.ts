/**
 * x402 Marketplace CLI
 *
 * Usage:
 *   x402-marketplace register --wallet <addr> --name <name> [--referred-by <code>]
 *   x402-marketplace publish --analyst <id> --market <pda> --title <t> --preview <p> --thesis <t> --side YES --confidence 80 --price 0.001
 *   x402-marketplace discover [--market <pda>] [--min-confidence 70] [--max-price 0.01]
 *   x402-marketplace buy --analysis <id> --buyer <wallet> [--affiliate <code>]
 *   x402-marketplace stats --analyst <id>
 *   x402-marketplace leaderboard [--limit 10]
 *   x402-marketplace resolve --analysis <id> --outcome YES|NO
 *   x402-marketplace demo
 */
import { Command } from "commander";
import chalk from "chalk";
import { getDb } from "./db/schema.js";
import {
  registerAnalyst,
  listAnalysts,
  getAnalystById,
} from "./services/registry.js";
import {
  publishAnalysis,
  discoverAnalyses,
  completePurchase,
  requestAccess,
} from "./services/marketplace.js";
import {
  getAnalystStats,
  getLeaderboard,
  resolveReputationRecord,
  resolvePendingOutcomes,
} from "./services/reputation.js";
import { getAffiliateStats } from "./services/affiliate.js";
import { createReputationRecord } from "./services/reputation.js";

const program = new Command();
const db = getDb();

program
  .name("x402-marketplace")
  .description("Agent-to-agent prediction market intelligence marketplace with x402 micropayments")
  .version("1.0.0");

// ── register ─────────────────────────────────────────────────────────────────

program
  .command("register")
  .description("Register a new analyst")
  .requiredOption("--wallet <address>", "Solana wallet address")
  .requiredOption("--name <name>", "Analyst display name")
  .option("--description <desc>", "Short bio", "")
  .option("--referred-by <code>", "Referral affiliate code")
  .action((opts) => {
    try {
      const analyst = registerAnalyst(db, {
        walletAddress: opts.wallet,
        name: opts.name,
        description: opts.description,
        referredBy: opts.referredBy,
      });
      console.log(chalk.green("✓ Analyst registered"));
      console.log(chalk.cyan("ID:"), analyst.id);
      console.log(chalk.cyan("Name:"), analyst.name);
      console.log(chalk.cyan("Wallet:"), analyst.walletAddress);
      console.log(chalk.cyan("Affiliate Code:"), chalk.yellow(analyst.affiliateCode));
      if (analyst.referredBy) {
        console.log(chalk.cyan("Referred By:"), analyst.referredBy);
      }
    } catch (err: any) {
      console.error(chalk.red("✗"), err.message);
      process.exit(1);
    }
  });

// ── publish ───────────────────────────────────────────────────────────────────

program
  .command("publish")
  .description("Publish a new analysis with x402 paywall")
  .requiredOption("--analyst <id>", "Analyst ID")
  .requiredOption("--market <pda>", "Market PDA address")
  .requiredOption("--title <title>", "Analysis title")
  .requiredOption("--preview <preview>", "Free preview (max 280 chars)")
  .requiredOption("--thesis <thesis>", "Full analysis thesis (behind paywall)")
  .requiredOption("--side <side>", "Predicted side: YES or NO")
  .requiredOption("--confidence <n>", "Confidence 0-100", parseInt)
  .requiredOption("--price <sol>", "Price in SOL", parseFloat)
  .option("--expires <iso>", "Expiry date (ISO 8601)")
  .option("--tags <tags>", "Comma-separated tags", "")
  .action(async (opts) => {
    try {
      const side = opts.side.toUpperCase();
      if (side !== "YES" && side !== "NO") {
        throw new Error("--side must be YES or NO");
      }
      const analysis = await publishAnalysis(db, {
        analystId: opts.analyst,
        marketPda: opts.market,
        title: opts.title,
        preview: opts.preview,
        thesis: opts.thesis,
        predictedSide: side,
        confidence: opts.confidence,
        priceInSol: opts.price,
        expiresAt: opts.expires,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : [],
      });

      // Create reputation tracking record
      createReputationRecord(db, {
        analystId: analysis.analystId,
        analysisId: analysis.id,
        marketPda: analysis.marketPda,
        predictedSide: analysis.predictedSide,
        confidence: analysis.confidence,
      });

      console.log(chalk.green("✓ Analysis published"));
      console.log(chalk.cyan("ID:"), analysis.id);
      console.log(chalk.cyan("Market:"), analysis.marketPda);
      if (analysis.marketTitle) console.log(chalk.cyan("Market Title:"), analysis.marketTitle);
      console.log(chalk.cyan("Side:"), chalk.bold(analysis.predictedSide));
      console.log(chalk.cyan("Confidence:"), `${analysis.confidence}%`);
      console.log(chalk.cyan("Price:"), `${analysis.priceInSol} SOL`);
      console.log(chalk.cyan("Preview:"), analysis.preview);
    } catch (err: any) {
      console.error(chalk.red("✗"), err.message);
      process.exit(1);
    }
  });

// ── discover ─────────────────────────────────────────────────────────────────

program
  .command("discover")
  .description("Browse available analyses")
  .option("--market <pda>", "Filter by market PDA")
  .option("--analyst <id>", "Filter by analyst ID")
  .option("--side <side>", "Filter by predicted side (YES/NO)")
  .option("--min-confidence <n>", "Minimum confidence", parseInt)
  .option("--max-price <sol>", "Maximum price in SOL", parseFloat)
  .option("--min-reputation <n>", "Minimum analyst reputation score", parseInt)
  .option("--tags <tags>", "Filter by tags (comma-separated)")
  .action((opts) => {
    try {
      const listings = discoverAnalyses(db, {
        marketPda: opts.market,
        analystId: opts.analyst,
        predictedSide: opts.side?.toUpperCase(),
        minConfidence: opts.minConfidence,
        maxPrice: opts.maxPrice,
        minReputation: opts.minReputation,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
      });

      if (listings.length === 0) {
        console.log(chalk.yellow("No analyses found matching your criteria."));
        return;
      }

      console.log(chalk.bold(`\n${listings.length} analyses available:\n`));
      for (const l of listings) {
        const side = l.predictedSide === "YES" ? chalk.green("YES") : chalk.red("NO");
        const rep = l.analystReputation >= 70
          ? chalk.green(`★${l.analystReputation}`)
          : l.analystReputation >= 40
          ? chalk.yellow(`★${l.analystReputation}`)
          : chalk.gray(`★${l.analystReputation}`);

        console.log(chalk.bold(`[${l.id.slice(0, 8)}]`), l.title);
        console.log(`  ${chalk.cyan("Analyst:")} ${l.analystName} ${rep}`);
        if (l.marketTitle) console.log(`  ${chalk.cyan("Market:")} ${l.marketTitle}`);
        console.log(`  ${chalk.cyan("Prediction:")} ${side} (${l.confidence}% confident)`);
        console.log(`  ${chalk.cyan("Price:")} ${l.priceInSol} SOL | ${chalk.cyan("Buyers:")} ${l.purchaseCount}`);
        console.log(`  ${chalk.dim(l.preview)}`);
        if (l.tags.length > 0) console.log(`  ${chalk.cyan("Tags:")} ${l.tags.join(", ")}`);
        console.log();
      }
    } catch (err: any) {
      console.error(chalk.red("✗"), err.message);
      process.exit(1);
    }
  });

// ── buy ───────────────────────────────────────────────────────────────────────

program
  .command("buy")
  .description("Purchase an analysis via x402 payment")
  .requiredOption("--analysis <id>", "Analysis ID")
  .requiredOption("--buyer <wallet>", "Buyer wallet address")
  .option("--affiliate <code>", "Affiliate code")
  .option("--payment-tx <sig>", "Pre-existing payment transaction signature")
  .action(async (opts) => {
    try {
      const { purchase, analysis } = await completePurchase(db, {
        analysisId: opts.analysis,
        buyerWallet: opts.buyer,
        affiliateCode: opts.affiliate,
        paymentTx: opts.paymentTx,
      });

      console.log(chalk.green("✓ Purchase complete"));
      console.log(chalk.cyan("Tx:"), purchase.txSignature.startsWith("SIM:") ? chalk.dim("[simulated]") : purchase.txSignature);
      console.log(chalk.cyan("Amount:"), `${purchase.amountSol} SOL`);
      if (purchase.platformFee > 0) {
        console.log(chalk.cyan("Platform Fee:"), `${purchase.platformFee.toFixed(6)} SOL`);
      }
      if (purchase.affiliateCommission > 0) {
        console.log(chalk.cyan("Affiliate Commission:"), `${purchase.affiliateCommission.toFixed(6)} SOL (${purchase.affiliateCode})`);
      }
      console.log();
      console.log(chalk.bold.underline("FULL ANALYSIS:"));
      console.log(chalk.bold(analysis.title));
      console.log(chalk.cyan("Market:"), analysis.marketPda);
      const side = analysis.predictedSide === "YES" ? chalk.green.bold("YES") : chalk.red.bold("NO");
      console.log(chalk.cyan("Prediction:"), `${side} (${analysis.confidence}% confidence)`);
      console.log();
      console.log(analysis.thesis);
    } catch (err: any) {
      console.error(chalk.red("✗"), err.message);
      process.exit(1);
    }
  });

// ── access ────────────────────────────────────────────────────────────────────

program
  .command("access")
  .description("Check access / get payment info for an analysis")
  .requiredOption("--analysis <id>", "Analysis ID")
  .requiredOption("--buyer <wallet>", "Buyer wallet address")
  .option("--affiliate <code>", "Affiliate code for commission")
  .action((opts) => {
    try {
      const result = requestAccess(db, opts.analysis, opts.buyer, opts.affiliate);
      if (result.status === 200) {
        console.log(chalk.green("✓ Access granted (already purchased)"));
        console.log(result.analysis?.thesis);
      } else {
        console.log(chalk.yellow("⚠ Payment Required (402)"));
        console.log(JSON.stringify(result.payment, null, 2));
      }
    } catch (err: any) {
      console.error(chalk.red("✗"), err.message);
      process.exit(1);
    }
  });

// ── stats ─────────────────────────────────────────────────────────────────────

program
  .command("stats")
  .description("Get analyst reputation stats")
  .requiredOption("--analyst <id>", "Analyst ID")
  .action((opts) => {
    const stats = getAnalystStats(db, opts.analyst);
    console.log(chalk.bold(`\n${stats.analystName} — Reputation Stats`));
    console.log(chalk.cyan("Reputation Score:"), chalk.bold(`${stats.reputationScore}/100`));
    console.log(chalk.cyan("Win Rate:"), `${(stats.winRate * 100).toFixed(1)}%`);
    console.log(chalk.cyan("Resolved:"), `${stats.correctPredictions}/${stats.resolvedAnalyses}`);
    console.log(chalk.cyan("Total Analyses:"), stats.totalAnalyses);
    console.log(chalk.cyan("Total Purchases:"), stats.totalPurchases);
    console.log(chalk.cyan("Total Earnings:"), `${stats.totalEarnings.toFixed(6)} SOL`);
    console.log(chalk.cyan("Avg Confidence:"), `${stats.avgConfidence.toFixed(1)}%`);
    console.log(chalk.cyan("Affiliate Code:"), chalk.yellow(stats.affiliateCode));
  });

// ── leaderboard ───────────────────────────────────────────────────────────────

program
  .command("leaderboard")
  .description("Show top analysts by reputation")
  .option("--limit <n>", "Number of analysts to show", parseInt, 10)
  .action((opts) => {
    const board = getLeaderboard(db, opts.limit ?? 10);
    if (board.length === 0) {
      console.log(chalk.yellow("No analysts registered yet."));
      return;
    }
    console.log(chalk.bold("\n🏆 Analyst Leaderboard\n"));
    board.forEach((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const score = s.reputationScore >= 70
        ? chalk.green(`★${s.reputationScore}`)
        : chalk.yellow(`★${s.reputationScore}`);
      console.log(
        `${medal} ${chalk.bold(s.analystName.padEnd(20))} ${score}  ` +
        `WR: ${(s.winRate * 100).toFixed(0)}%  ` +
        `Resolved: ${s.resolvedAnalyses}  ` +
        `Earnings: ${s.totalEarnings.toFixed(4)} SOL`
      );
    });
    console.log();
  });

// ── resolve ───────────────────────────────────────────────────────────────────

program
  .command("resolve")
  .description("Manually resolve a market outcome for reputation tracking")
  .requiredOption("--analysis <id>", "Analysis ID")
  .requiredOption("--outcome <side>", "Actual outcome: YES or NO")
  .action((opts) => {
    const outcome = opts.outcome.toUpperCase();
    if (outcome !== "YES" && outcome !== "NO") {
      console.error(chalk.red("--outcome must be YES or NO"));
      process.exit(1);
    }
    const record = resolveReputationRecord(db, opts.analysis, outcome);
    if (!record) {
      console.error(chalk.red("✗ Reputation record not found for analysis"), opts.analysis);
      process.exit(1);
    }
    const correct = record.wasCorrect ? chalk.green("CORRECT ✓") : chalk.red("INCORRECT ✗");
    console.log(chalk.green("✓ Outcome recorded"));
    console.log(`  Predicted: ${record.predictedSide}  Actual: ${outcome}  Result: ${correct}`);
  });

// ── auto-resolve ──────────────────────────────────────────────────────────────

program
  .command("auto-resolve")
  .description("Scan pending outcomes and resolve via Baozi MCP")
  .action(async () => {
    console.log(chalk.cyan("Scanning for resolved markets..."));
    const { checked, resolved } = await resolvePendingOutcomes(db);
    console.log(`Checked: ${checked} pending  |  Resolved: ${chalk.green(resolved)}`);
  });

// ── affiliate ─────────────────────────────────────────────────────────────────

program
  .command("affiliate")
  .description("Show affiliate stats for a code")
  .requiredOption("--code <code>", "Affiliate code")
  .action((opts) => {
    const stats = getAffiliateStats(db, opts.code);
    if (!stats) {
      console.error(chalk.red("✗ No affiliate found with code"), opts.code);
      process.exit(1);
    }
    console.log(chalk.bold(`\nAffiliate Stats: ${opts.code}`));
    console.log(chalk.cyan("Wallet:"), stats.walletAddress);
    console.log(chalk.cyan("Total Referrals:"), stats.totalReferrals);
    console.log(chalk.cyan("Total Commissions:"), `${stats.totalCommissions.toFixed(6)} SOL`);
  });

// ── analysts ──────────────────────────────────────────────────────────────────

program
  .command("analysts")
  .description("List all registered analysts")
  .action(() => {
    const analysts = listAnalysts(db, { activeOnly: true });
    if (analysts.length === 0) {
      console.log(chalk.yellow("No analysts registered."));
      return;
    }
    console.log(chalk.bold(`\n${analysts.length} registered analysts:\n`));
    for (const a of analysts) {
      console.log(`  ${chalk.bold(a.id.slice(0, 8))}  ${chalk.cyan(a.name)}  ${chalk.dim(a.walletAddress.slice(0, 8))}...  Code: ${chalk.yellow(a.affiliateCode)}`);
    }
    console.log();
  });

program.parse();
