import { runRegister } from "./register.ts";
import { runPublish } from "./publish.ts";
import { runList } from "./list.ts";
import { runBuy } from "./buy.ts";
import { runScoreboard } from "./scoreboard.ts";
import { MarketplaceRepository } from "../lib/repository.ts";

export async function runDemo(): Promise<void> {
  console.log("=== x402 Intel Marketplace Demo ===");

  await runRegister([
    "--handle",
    "alphaMira",
    "--specialty",
    "macro",
    "--tags",
    "btc,macro,fed",
    "--affiliate",
    "MIRA01",
  ]);

  await runRegister([
    "--handle",
    "flowKai",
    "--specialty",
    "flow",
    "--tags",
    "orderflow,sol,alts",
    "--affiliate",
    "KAI02",
  ]);

  await runPublish([
    "--handle",
    "alphaMira",
    "--title",
    "BTC weekly close above 70k",
    "--summary",
    "Volatility compression plus ETF inflow impulse.",
    "--content",
    "Detailed setup, invalidation, and timing windows.",
    "--prediction",
    "bullish",
    "--confidence",
    "0.72",
    "--price",
    "11",
    "--tags",
    "btc,macro,etf",
    "--event",
    "btc-weekly-close",
  ]);

  await runPublish([
    "--handle",
    "flowKai",
    "--title",
    "SOL perp funding mean reversion",
    "--summary",
    "Funding spread suggests quick unwind.",
    "--content",
    "Execution plan and risk buckets by leverage tier.",
    "--prediction",
    "bearish",
    "--confidence",
    "0.64",
    "--price",
    "9",
    "--tags",
    "sol,alts,orderflow",
    "--event",
    "sol-funding-window",
  ]);

  await runList(["--buyer", "emil", "--interests", "btc,macro,sol", "--max-price", "15"]);

  const repo = new MarketplaceRepository();
  const newest = repo
    .listPosts()
    .slice()
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))[0];

  if (newest) {
    await runBuy([
      "--buyer",
      "emil",
      "--post-id",
      newest.id,
      "--buyer-affiliate",
      "EMIL88",
      "--actual",
      newest.prediction,
    ]);
  }

  await runScoreboard();
}
