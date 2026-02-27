import { MarketplaceRepository } from "../lib/repository.ts";
import { buildScoreboard } from "../services/reputation.ts";

export async function runScoreboard(): Promise<void> {
  const repo = new MarketplaceRepository();
  const rows = buildScoreboard(repo.listAnalysts());

  if (rows.length === 0) {
    console.log("No analysts registered.");
    return;
  }

  console.log("x402 Intel Marketplace Scoreboard");
  for (const row of rows) {
    console.log(
      `#${String(row.rank).padStart(2, " ")} @${row.handle.padEnd(14)} rep=${row.reputation} acc=${row.accuracy}% sales=${row.sales} revenue=$${row.revenueUsd.toFixed(2)} resolved=${row.resolved} (W${row.wins}/L${row.losses})`,
    );
  }
}
