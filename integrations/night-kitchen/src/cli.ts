#!/usr/bin/env node
/**
 * Night Kitchen CLI
 *
 * Usage:
 *   night-kitchen report              # generate and print report
 *   night-kitchen report --dry-run    # generate without posting
 *   night-kitchen post                # generate and post to AgentBook
 */
import { Command } from "commander";
import chalk from "chalk";
import { run } from "./index.js";

const program = new Command();

program
  .name("night-kitchen")
  .description("夜厨房 — bilingual market reports with chinese wisdom")
  .version("1.0.0");

program
  .command("report")
  .description("generate a night kitchen market report")
  .option("--dry-run", "print report without posting", false)
  .option("--short", "print the short (AgentBook-sized) report", false)
  .option("--wallet <address>", "wallet address for AgentBook posting")
  .action(async (opts) => {
    try {
      const wallet = opts.wallet || process.env.WALLET_ADDRESS;
      const result = await run({
        walletAddress: wallet,
        dryRun: opts.dryRun || !wallet,
      });

      if (opts.short) {
        console.log(result.shortReport);
      } else {
        console.log(result.report);
      }

      if (result.error) {
        console.log(chalk.yellow(`\n⚠ ${result.error}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`error: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("post")
  .description("generate and post report to AgentBook")
  .option("--wallet <address>", "wallet address (requires CreatorProfile)")
  .action(async (opts) => {
    const wallet = opts.wallet || process.env.WALLET_ADDRESS;
    if (!wallet) {
      console.error(chalk.red("error: --wallet or WALLET_ADDRESS required"));
      process.exit(1);
    }

    try {
      const result = await run({ walletAddress: wallet, dryRun: false });

      console.log(result.shortReport);
      console.log("");

      if (result.posted) {
        console.log(chalk.green("✓ posted to AgentBook"));
      } else {
        console.log(chalk.yellow(`⚠ not posted: ${result.error || "unknown"}`));
      }
    } catch (err: any) {
      console.error(chalk.red(`error: ${err.message}`));
      process.exit(1);
    }
  });

program.parse();
