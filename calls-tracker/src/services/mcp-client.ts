/**
 * MCP Client for @baozi.bet/mcp-server
 *
 * Imports handlers DIRECTLY from the installed @baozi.bet/mcp-server package
 * instead of spawning a subprocess. This is faster, more reliable, and testable.
 */
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { getPositions, getPositionsEnriched, getPositionsSummary } from "@baozi.bet/mcp-server/dist/handlers/positions.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import type { McpResult } from "../types/index.js";

// Re-export direct handlers for use in other modules
export {
  listMarkets,
  getMarket,
  listRaceMarkets,
  getRaceMarket,
  getRaceQuote,
  getQuote,
  getPositions,
  getPositionsEnriched,
  getPositionsSummary,
  PROGRAM_ID,
  NETWORK,
  handleTool,
};

/**
 * Execute an MCP tool by name using direct handler imports.
 * Maps tool names to the corresponding handler functions.
 */
export async function execMcpTool(
  toolName: string,
  params: Record<string, any>
): Promise<McpResult> {
  try {
    switch (toolName) {
      case "list_markets": {
        const markets = await listMarkets(params.status);
        return { success: true, data: markets };
      }
      case "get_market": {
        const market = await getMarket(params.publicKey || params.market_pda);
        return { success: true, data: market };
      }
      case "list_race_markets": {
        const raceMarkets = await listRaceMarkets(params.status);
        return { success: true, data: raceMarkets };
      }
      case "get_race_market": {
        const raceMarket = await getRaceMarket(params.publicKey || params.market_pda);
        return { success: true, data: raceMarket };
      }
      case "get_quote": {
        const quote = await getQuote(
          params.market || params.market_pda,
          params.side,
          params.amount
        );
        return { success: true, data: quote };
      }
      case "get_race_quote": {
        const raceMarketData = await getRaceMarket(params.market || params.market_pda);
        if (!raceMarketData) {
          return { success: false, error: "Race market not found" };
        }
        const raceQuote = getRaceQuote(raceMarketData, params.outcomeIndex || params.outcome_index, params.amount);
        return { success: true, data: raceQuote };
      }
      case "get_positions": {
        const positions = await getPositions(params.wallet || params.wallet_address);
        return { success: true, data: positions };
      }
      case "get_positions_enriched": {
        const enriched = await getPositionsEnriched(params.wallet || params.wallet_address);
        return { success: true, data: enriched };
      }
      case "get_positions_summary": {
        const summary = await getPositionsSummary(params.wallet || params.wallet_address);
        return { success: true, data: summary };
      }
      default: {
        // Fallback to handleTool for any other tool (including build_* tools)
        const result = await handleTool(toolName, params);
        const textContent = result.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");
        try {
          const parsed = JSON.parse(textContent);
          return { success: true, data: parsed };
        } catch {
          return { success: true, data: textContent };
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: `MCP handler error: ${err.message}` };
  }
}
