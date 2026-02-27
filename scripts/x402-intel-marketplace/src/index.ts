#!/usr/bin/env node

import { config } from "./config.ts";
import { runRegister } from "./commands/register.ts";
import { runPublish } from "./commands/publish.ts";
import { runList } from "./commands/list.ts";
import { runBuy } from "./commands/buy.ts";
import { runScoreboard } from "./commands/scoreboard.ts";
import { runDemo } from "./commands/demo.ts";

const command = process.argv[2];
const argv = process.argv.slice(3);

async function main(): Promise<void> {
  switch (command) {
    case "register":
      await runRegister(argv);
      break;
    case "publish":
      await runPublish(argv);
      break;
    case "list":
      await runList(argv);
      break;
    case "buy":
      await runBuy(argv);
      break;
    case "scoreboard":
      await runScoreboard();
      break;
    case "demo":
      await runDemo();
      break;
    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log("x402 Intel Marketplace v1.0.0");
  console.log(`Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("Commands:");
  console.log("  register    Register or update an analyst profile");
  console.log("  publish     Publish paywalled intel post");
  console.log("  list        Rank posts for a buyer using discovery scoring");
  console.log("  buy         Run simulated x402 payment and buy intel");
  console.log("  scoreboard  Show analyst reputation leaderboard");
  console.log("  demo        Run end-to-end demo flow");
  console.log();
  console.log("Examples:");
  console.log("  bun run src/index.ts register --handle alphaMira --specialty macro --affiliate MIRA01");
  console.log("  bun run src/index.ts publish --handle alphaMira --title \"BTC weekly close\" --summary \"...\" --content \"...\" --price 9 --prediction bullish --confidence 0.68 --tags btc,macro --event btc-weekly");
  console.log("  bun run src/index.ts list --buyer emil --interests btc,macro --max-price 15");
  console.log("  bun run src/index.ts buy --buyer emil --post-id intel_xxx --buyer-affiliate EMIL88 --actual bullish");
  console.log("  bun run src/index.ts scoreboard");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
