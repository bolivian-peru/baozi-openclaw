/**
 * eliza-plugin-baozi
 *
 * ElizaOS plugin for Baozi prediction markets on Solana.
 * Wraps the @baozi.bet/mcp-server tools in ElizaOS-native actions.
 *
 * Features:
 * - List active markets (Lab, OpenClaw, Main)
 * - Get price quotes before betting
 * - Build unsigned bet transactions
 * - Check positions and P&L
 * - Create Lab prediction markets (Type A only, v6.3 timing rules)
 * - Claim winnings from resolved markets
 *
 * @example
 * ```typescript
 * import { baoziPlugin } from "eliza-plugin-baozi";
 *
 * const agent = new AgentRuntime({
 *   plugins: [baoziPlugin],
 *   // ...
 * });
 * ```
 */

import { Plugin } from "@elizaos/core";
import { listMarketsAction } from "./actions/listMarkets";
import { getQuoteAction } from "./actions/getQuote";
import { placeBetAction } from "./actions/placeBet";
import { getPositionsAction } from "./actions/getPositions";
import { createMarketAction } from "./actions/createMarket";
import { claimWinningsAction } from "./actions/claimWinnings";
import { marketDataProvider } from "./providers/marketData";
import { portfolioProvider } from "./providers/portfolio";
import { baoziClient } from "./client";

export const baoziPlugin: Plugin = {
  name: "baozi-prediction-markets",
  description:
    "Bet on prediction markets, create markets, and earn affiliate fees on Solana via Baozi",
  actions: [
    listMarketsAction,
    getQuoteAction,
    placeBetAction,
    getPositionsAction,
    createMarketAction,
    claimWinningsAction,
  ],
  providers: [marketDataProvider, portfolioProvider],
  evaluators: [],
};

// Clean up MCP server process when plugin is shut down
process.on("exit", () => baoziClient.close());
process.on("SIGINT", () => { baoziClient.close(); process.exit(0); });
process.on("SIGTERM", () => { baoziClient.close(); process.exit(0); });

export { baoziClient } from "./client";
export { listMarketsAction } from "./actions/listMarkets";
export { getQuoteAction } from "./actions/getQuote";
export { placeBetAction } from "./actions/placeBet";
export { getPositionsAction } from "./actions/getPositions";
export { createMarketAction } from "./actions/createMarket";
export { claimWinningsAction } from "./actions/claimWinnings";
export { marketDataProvider } from "./providers/marketData";
export { portfolioProvider } from "./providers/portfolio";

export default baoziPlugin;
