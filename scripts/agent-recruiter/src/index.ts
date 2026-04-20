#!/usr/bin/env bun

import { config } from "./config.ts";
import { runDiscover } from "./commands/discover.ts";
import { runPitch } from "./commands/pitch.ts";
import { runOnboard } from "./commands/onboard.ts";
import { runReport } from "./commands/report.ts";

const command = process.argv[2];
const argv = process.argv.slice(3);

async function main(): Promise<void> {
  switch (command) {
    case "discover":
      await runDiscover(argv);
      break;
    case "pitch":
      await runPitch(argv);
      break;
    case "onboard":
      await runOnboard(argv);
      break;
    case "report":
      await runReport(argv);
      break;
    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log("Agent Recruiter v1.0.0");
  console.log(`Mode: ${config.dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("Commands:");
  console.log("  discover   Run discovery pipeline and persist candidates");
  console.log("  pitch      Generate persona outreach templates and mark pitched");
  console.log("  onboard    Run onboarding flow and affiliate link stubs");
  console.log("  report     Print recruited agent tracking metrics");
  console.log();
  console.log("Examples:");
  console.log("  bun run src/index.ts discover --persona builder --limit 5");
  console.log("  bun run src/index.ts pitch --persona content --channel telegram");
  console.log("  bun run src/index.ts onboard --handle macroMina --campaign feb_cohort");
  console.log("  bun run src/index.ts report --json");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
