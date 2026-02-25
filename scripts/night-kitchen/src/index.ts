/**
 * 夜厨房 — night kitchen
 *
 * bilingual market report agent for baozi.bet
 * fetches live prediction market data, generates reports
 * with contextual chinese proverbs, posts to agentbook.
 *
 * usage:
 *   bun run src/index.ts --report     # generate and print report
 *   bun run src/index.ts --post       # generate and post to agentbook
 *   bun run src/index.ts --demo       # generate demo with sample data
 */

import { fetchMarkets, closeMcp, type Market } from "./markets.js";
import { generateReport } from "./report.js";
import { postToAgentBook } from "./post.js";

// baozi creator wallet (for agentbook posts)
const WALLET_ADDRESS =
  process.env.WALLET_ADDRESS ?? "GpXHXs5KfzfXbNKcMLNbAMsJsgPsBE7y5GtwVoiuxYvH";

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "--report";

  if (mode === "--demo") {
    await runDemo();
    return;
  }

  console.error("夜厨房 — fetching markets...\n");

  let markets: Market[];
  try {
    markets = await fetchMarkets();
  } catch (err) {
    console.error("failed to fetch markets:", err);
    process.exit(1);
  } finally {
    closeMcp();
  }

  console.error(`found ${markets.length} markets\n`);

  const report = generateReport(markets);

  if (mode === "--post") {
    console.log(report);
    console.error("\nposting to agentbook...");
    const result = await postToAgentBook(report, WALLET_ADDRESS);
    if (result.success) {
      console.error("posted successfully! 🥟");
    } else {
      console.error(`post failed: ${result.error}`);
    }
  } else {
    // --report (default)
    console.log(report);
  }
}

async function runDemo() {
  console.error("夜厨房 — generating demo reports...\n");

  // demo with sample market data (no MCP needed)
  const sampleMarkets: Market[] = [
    {
      type: "boolean",
      publicKey: "9T2Qv8Q9zF6n5JVrVFZ4u4iuoZYdP2s4ts31hHXMyCDn",
      question: "will BTC hit $110k by march 1?",
      yesPrice: 0.58,
      noPrice: 0.42,
      poolSol: 32.4,
      closingTime: new Date(Date.now() + 10 * 86400000).toISOString(),
      eventTime: new Date(Date.now() + 11 * 86400000).toISOString(),
      resolved: false,
      category: "crypto",
    },
    {
      type: "race",
      publicKey: "J4TyPjm2g1MYRCBj7n1G5saRn5WSa3nT8chHhngzreMa",
      question: "who wins NBA all-star MVP?",
      options: [
        { name: "LeBron", probability: 0.35 },
        { name: "Tatum", probability: 0.28 },
        { name: "Jokic", probability: 0.22 },
        { name: "Other", probability: 0.15 },
      ],
      poolSol: 18.7,
      closingTime: new Date(Date.now() + 2 * 86400000).toISOString(),
      eventTime: new Date(Date.now() + 3 * 86400000).toISOString(),
      resolved: false,
      category: "sports",
    },
    {
      type: "boolean",
      publicKey: "BaoziBetMarket3ExamplePubkey",
      question: "will ETH reach $4000 before april?",
      yesPrice: 0.34,
      noPrice: 0.66,
      poolSol: 8.2,
      closingTime: new Date(Date.now() + 45 * 86400000).toISOString(),
      eventTime: new Date(Date.now() + 46 * 86400000).toISOString(),
      resolved: false,
      category: "crypto",
    },
    {
      type: "boolean",
      publicKey: "BaoziBetMarket4ExamplePubkey",
      question: "will solana process 100M daily txs this quarter?",
      yesPrice: 0.71,
      noPrice: 0.29,
      poolSol: 5.1,
      closingTime: new Date(Date.now() + 30 * 86400000).toISOString(),
      eventTime: new Date(Date.now() + 31 * 86400000).toISOString(),
      resolved: false,
      category: "crypto",
    },
  ];

  // demo report 1: full report
  console.log("╔══════════════════════════════════════╗");
  console.log("║   demo report 1 — evening edition    ║");
  console.log("╚══════════════════════════════════════╝\n");

  const report1 = generateReport(sampleMarkets);
  console.log(report1);

  // demo report 2: with resolved markets
  const resolvedMarkets: Market[] = [
    ...sampleMarkets.slice(0, 2),
    {
      type: "boolean",
      publicKey: "ResolvedMarketExample",
      question: "did NEAR hit $2 by feb 15?",
      yesPrice: 1.0,
      noPrice: 0.0,
      poolSol: 12.0,
      closingTime: new Date(Date.now() - 86400000).toISOString(),
      eventTime: new Date(Date.now() - 43200000).toISOString(),
      resolved: true,
      outcome: "YES",
      category: "crypto",
    },
  ];

  console.log("\n\n╔══════════════════════════════════════╗");
  console.log("║   demo report 2 — morning recap      ║");
  console.log("╚══════════════════════════════════════╝\n");

  const report2 = generateReport(resolvedMarkets, { maxMarkets: 3 });
  console.log(report2);
}

main().catch((err) => {
  console.error("fatal:", err);
  closeMcp();
  process.exit(1);
});
