/**
 * Example ElizaOS agent using the Baozi plugin.
 *
 * This demonstrates a minimal agent that can:
 * 1. List active prediction markets
 * 2. Get quotes for bets
 * 3. Build bet transactions
 * 4. Check positions
 *
 * Run: SOLANA_RPC_URL=https://api.mainnet-beta.solana.com bun run example/agent.ts
 */

import { baoziClient } from "../src/client";

async function demo() {
  console.log("=== Baozi ElizaOS Plugin Demo ===\n");
  console.log("Connecting to Baozi MCP server...");

  try {
    await baoziClient.ensureConnected();
    console.log("Connected!\n");

    // 1. List active markets
    console.log("1. Listing active Lab markets...");
    const markets = await baoziClient.callTool("list_markets", {
      layer: "Lab",
      status: "Active",
    });
    const marketsText = baoziClient.extractText(markets);
    console.log(marketsText.split("\n").slice(0, 15).join("\n"));
    console.log("...\n");

    // 2. Get creation fees
    console.log("2. Getting market creation fees...");
    const fees = await baoziClient.callTool("get_creation_fees", {});
    const feesText = baoziClient.extractText(fees);
    console.log(feesText.slice(0, 300));
    console.log("\n");

    // 3. Get timing rules
    console.log("3. Getting market timing rules...");
    const timing = await baoziClient.callTool("get_timing_rules", {});
    const timingText = baoziClient.extractText(timing);
    console.log(timingText.split("\n").slice(0, 10).join("\n"));
    console.log("\n");

    // 4. Validate a market question
    console.log("4. Validating sample market question...");
    const validation = await baoziClient.callTool("validate_market_question", {
      question: "Will Solana price exceed $200 by April 15, 2026?",
      closing_time: "2026-04-14T23:59:00Z",
      market_type: "typeA",
      event_time: "2026-04-15T00:00:00Z",
    });
    const validationText = baoziClient.extractText(validation);
    console.log(validationText.slice(0, 500));
    console.log("\n");

    console.log("=== Demo Complete ===");
    console.log("\nPlugin actions available:");
    console.log("  - LIST_BAOZI_MARKETS: Browse active prediction markets");
    console.log("  - GET_BAOZI_QUOTE: Get implied odds before betting");
    console.log("  - PLACE_BAOZI_BET: Build unsigned bet transaction");
    console.log("  - GET_BAOZI_POSITIONS: Check wallet positions and P&L");
    console.log("  - CREATE_BAOZI_MARKET: Create a new Lab prediction market");
    console.log("  - CLAIM_BAOZI_WINNINGS: Claim winnings from resolved markets");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Demo failed:", msg);
    process.exit(1);
  } finally {
    baoziClient.close();
  }
}

demo();
