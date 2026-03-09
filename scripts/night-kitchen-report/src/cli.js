#!/usr/bin/env node
import { listMarkets } from "./mcpAdapter.js";
import { renderNightKitchenReport } from "./report.js";

async function main() {
  const markets = await listMarkets();
  const report = renderNightKitchenReport(markets);
  console.log(report);
}

main().catch((err) => {
  console.error("night-kitchen-report failed:", err.message);
  process.exit(1);
});
