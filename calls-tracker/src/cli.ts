#!/usr/bin/env node
/**
 * Calls Tracker CLI
 * 
 * Usage:
 *   calls-tracker register <name> <wallet> [--handle @twitter] [--platform twitter]
 *   calls-tracker call <caller> "<prediction>" [--amount 0.5] [--side yes] [--confidence 8]
 *   calls-tracker resolve <call-id> <correct|incorrect|cancelled> [--pnl 0.5]
 *   calls-tracker status <call-id>
 *   calls-tracker history [caller-id]
 *   calls-tracker reputation <caller-id>
 *   calls-tracker dashboard
 *   calls-tracker leaderboard
 *   calls-tracker parse "<text>"   -- dry run: parse without creating
 */
import { Command } from "commander";
import chalk from "chalk";
import { CallsTracker } from "./services/calls-tracker.js";
import { parsePrediction, validatePrediction } from "./parsers/prediction-parser.js";

const program = new Command();

program
  .name("calls-tracker")
  .description("Influencer Prediction Reputation System — turn tweets into markets, build reputation on-chain")
  .version("1.0.0");

function getTracker(opts: any): CallsTracker {
  return new CallsTracker({
    dbPath: opts.db || process.env.CALLS_DB_PATH || "calls-tracker.db",
    dryRun: opts.dryRun || false,
    useHttp: opts.http || false,
    httpProxyUrl: opts.httpUrl,
    defaultBetAmount: opts.defaultBet ? parseFloat(opts.defaultBet) : 0.1,
    referralCode: opts.ref || "cristol",
  });
}

// ─── Global Options ─────────────────────────────────────────

program
  .option("--db <path>", "Database file path", "calls-tracker.db")
  .option("--dry-run", "Don't create real markets", false)
  .option("--http", "Use HTTP MCP proxy instead of stdio", false)
  .option("--http-url <url>", "HTTP MCP proxy URL", "http://localhost:3000")
  .option("--default-bet <amount>", "Default bet amount in SOL", "0.1")
  .option("--ref <code>", "Referral code", "cristol");

// ─── Register ────────────────────────────────────────────────

program
  .command("register")
  .description("Register a new caller (influencer/agent)")
  .argument("<name>", "Display name")
  .argument("<wallet>", "Solana wallet address")
  .option("--handle <handle>", "Social media handle")
  .option("--platform <platform>", "Platform (twitter, telegram, etc.)")
  .action((name: string, wallet: string, opts: any) => {
    const tracker = getTracker(program.opts());
    try {
      const caller = tracker.registerCaller(name, wallet, opts.handle, opts.platform);
      console.log(chalk.green("\n✓ Caller registered successfully\n"));
      console.log(`  ID:       ${caller.id}`);
      console.log(`  Name:     ${caller.name}`);
      console.log(`  Wallet:   ${caller.walletAddress}`);
      if (caller.socialHandle) console.log(`  Handle:   ${caller.socialHandle}`);
      if (caller.platform) console.log(`  Platform: ${caller.platform}`);
      console.log();
    } finally {
      tracker.close();
    }
  });

// ─── Call ────────────────────────────────────────────────────

program
  .command("call")
  .description("Submit a new prediction call")
  .argument("<caller>", "Caller ID or wallet address")
  .argument("<prediction>", "Prediction text (natural language)")
  .option("-a, --amount <sol>", "Bet amount in SOL", "0.1")
  .option("-s, --side <side>", "Bet side (yes/no)")
  .option("-c, --confidence <n>", "Confidence level (1-10)")
  .action(async (caller: string, prediction: string, opts: any) => {
    const tracker = getTracker(program.opts());
    try {
      const result = await tracker.submitCall(
        caller,
        prediction,
        parseFloat(opts.amount),
        opts.side,
        opts.confidence ? parseInt(opts.confidence) : undefined
      );

      if (result.errors.length > 0) {
        console.log(chalk.yellow("\n⚠ Warnings/Errors:"));
        result.errors.forEach((e) => console.log(chalk.yellow(`  - ${e}`)));
      }

      if (result.call?.id) {
        console.log(chalk.green("\n✓ Call submitted successfully\n"));
        console.log(tracker.formatCall(result.call.id));
      }
      console.log();
    } finally {
      tracker.close();
    }
  });

// ─── Resolve ─────────────────────────────────────────────────

program
  .command("resolve")
  .description("Resolve a call outcome")
  .argument("<call-id>", "Call ID")
  .argument("<outcome>", "Outcome: correct, incorrect, or cancelled")
  .option("--pnl <sol>", "Actual P&L in SOL")
  .action((callId: string, outcome: string, opts: any) => {
    const tracker = getTracker(program.opts());
    try {
      if (!["correct", "incorrect", "cancelled"].includes(outcome)) {
        console.error(chalk.red("Outcome must be: correct, incorrect, or cancelled"));
        process.exit(1);
      }
      const pnl = opts.pnl !== undefined ? parseFloat(opts.pnl) : undefined;
      const call = tracker.resolveCall(callId, outcome as any, pnl);
      if (!call) {
        console.error(chalk.red(`Call not found: ${callId}`));
        process.exit(1);
      }
      console.log(chalk.green(`\n✓ Call resolved: ${outcome}\n`));
      console.log(tracker.formatCall(callId));
      console.log();
    } finally {
      tracker.close();
    }
  });

// ─── Status ──────────────────────────────────────────────────

program
  .command("status")
  .description("Show call status")
  .argument("<call-id>", "Call ID")
  .action((callId: string) => {
    const tracker = getTracker(program.opts());
    try {
      const display = tracker.formatCall(callId);
      console.log(`\n${display}\n`);
    } finally {
      tracker.close();
    }
  });

// ─── History ─────────────────────────────────────────────────

program
  .command("history")
  .description("Show call history")
  .argument("[caller-id]", "Filter by caller ID")
  .action((callerId?: string) => {
    const tracker = getTracker(program.opts());
    try {
      const calls = tracker.listCalls(callerId);
      if (calls.length === 0) {
        console.log(chalk.dim("\nNo calls found.\n"));
        return;
      }
      console.log(chalk.bold(`\n📋 Call History (${calls.length} calls)\n`));
      calls.forEach((c) => {
        console.log(tracker.formatCall(c.id));
        console.log();
      });
    } finally {
      tracker.close();
    }
  });

// ─── Reputation ──────────────────────────────────────────────

program
  .command("reputation")
  .description("Show caller reputation")
  .argument("<caller-id>", "Caller ID or wallet address")
  .action((callerId: string) => {
    const tracker = getTracker(program.opts());
    try {
      const display = tracker.formatReputation(callerId);
      console.log(`\n${display}\n`);
    } finally {
      tracker.close();
    }
  });

// ─── Dashboard ───────────────────────────────────────────────

program
  .command("dashboard")
  .description("Show reputation dashboard with leaderboard")
  .option("-l, --limit <n>", "Number of callers to show", "20")
  .action((opts: any) => {
    const tracker = getTracker(program.opts());
    try {
      const callers = tracker.listCallers();
      const calls = tracker.listCalls();
      const activeCalls = calls.filter((c) => ["active", "market_created", "bet_placed"].includes(c.status));
      const resolvedCalls = calls.filter((c) => c.status === "resolved");

      console.log(chalk.bold("\n🎯 CALLS TRACKER — Reputation Dashboard\n"));
      console.log(chalk.dim("─".repeat(50)));
      console.log(`  Callers:  ${callers.length}`);
      console.log(`  Total:    ${calls.length} calls`);
      console.log(`  Active:   ${activeCalls.length}`);
      console.log(`  Resolved: ${resolvedCalls.length}`);
      console.log(chalk.dim("─".repeat(50)));

      console.log(chalk.bold("\n📊 Leaderboard\n"));
      const leaderboard = tracker.formatLeaderboard(parseInt(opts.limit));
      console.log(leaderboard);

      // Show each caller's reputation card
      if (callers.length > 0) {
        console.log(chalk.bold("\n👤 Caller Profiles\n"));
        for (const caller of callers) {
          const rep = tracker.formatReputation(caller.id);
          console.log(rep);
          console.log();
        }
      }

      // Show recent calls
      const recentCalls = calls.slice(0, 5);
      if (recentCalls.length > 0) {
        console.log(chalk.bold("\n🕐 Recent Calls\n"));
        recentCalls.forEach((c) => {
          console.log(tracker.formatCall(c.id));
          console.log();
        });
      }
    } finally {
      tracker.close();
    }
  });

// ─── Leaderboard ─────────────────────────────────────────────

program
  .command("leaderboard")
  .description("Show reputation leaderboard")
  .option("-l, --limit <n>", "Number of callers to show", "20")
  .action((opts: any) => {
    const tracker = getTracker(program.opts());
    try {
      console.log(chalk.bold("\n🏆 Calls Tracker Leaderboard\n"));
      console.log(tracker.formatLeaderboard(parseInt(opts.limit)));
      console.log();
    } finally {
      tracker.close();
    }
  });

// ─── Parse (dry run) ────────────────────────────────────────

program
  .command("parse")
  .description("Parse a prediction text (dry run, no market creation)")
  .argument("<text>", "Prediction text")
  .action((text: string) => {
    const prediction = parsePrediction(text);
    const { valid, errors } = validatePrediction(prediction);

    console.log(chalk.bold("\n🔍 Parsed Prediction\n"));
    console.log(`  Question:     ${prediction.question}`);
    console.log(`  Subject:      ${prediction.subject}`);
    console.log(`  Data Source:  ${prediction.dataSource}`);
    console.log(`  Direction:    ${prediction.direction || "n/a"}`);
    console.log(`  Target Value: ${prediction.targetValue || "n/a"}`);
    console.log(`  Deadline:     ${new Date(prediction.deadline).toLocaleString()}`);
    console.log(`  Market Type:  ${prediction.marketType}`);
    console.log(`  Resolution:   ${prediction.resolutionCriteria}`);
    console.log();
    console.log(`  Valid: ${valid ? chalk.green("✓ YES") : chalk.red("✗ NO")}`);
    if (errors.length > 0) {
      errors.forEach((e) => console.log(chalk.red(`    - ${e}`)));
    }
    console.log();
  });

// ─── Callers List ────────────────────────────────────────────

program
  .command("callers")
  .description("List all registered callers")
  .action(() => {
    const tracker = getTracker(program.opts());
    try {
      const callers = tracker.listCallers();
      if (callers.length === 0) {
        console.log(chalk.dim("\nNo callers registered yet.\n"));
        return;
      }
      console.log(chalk.bold(`\n👤 Registered Callers (${callers.length})\n`));
      callers.forEach((c) => {
        console.log(`  ${c.name}`);
        console.log(chalk.dim(`    ID: ${c.id}`));
        console.log(chalk.dim(`    Wallet: ${c.walletAddress}`));
        if (c.socialHandle) console.log(chalk.dim(`    Handle: ${c.socialHandle}`));
        console.log();
      });
    } finally {
      tracker.close();
    }
  });

program.parse();
