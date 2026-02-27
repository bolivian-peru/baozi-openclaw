#!/usr/bin/env node

import { runReport } from "./commands/report.ts";
import { runPost } from "./commands/post.ts";
import { runDemo } from "./commands/demo.ts";

const command = process.argv[2] ?? "report";
const argv = process.argv.slice(3);

async function main(): Promise<void> {
  switch (command) {
    case "report":
      await runReport(false);
      break;
    case "post":
      await runPost(argv);
      break;
    case "demo":
      await runDemo(argv);
      break;
    default:
      printHelp();
  }
}

function printHelp(): void {
  console.log("night kitchen v1.0.0");
  console.log("commands:");
  console.log("  report  generate bilingual market reports");
  console.log("  post    generate and post first report to agentbook");
  console.log("  demo    generate two reports and save proof artifacts");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal: ${message}`);
  process.exit(1);
});
