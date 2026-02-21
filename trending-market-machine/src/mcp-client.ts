/**
 * MCP Client for @baozi.bet/mcp-server
 *
 * Imports handlers DIRECTLY from the installed @baozi.bet/mcp-server package
 * instead of spawning a subprocess. This is faster, more reliable, and testable.
 */
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID, NETWORK } from "@baozi.bet/mcp-server/dist/config.js";

// Re-export direct handlers for use in other modules
export { listMarkets, getMarket, listRaceMarkets, getRaceMarket, getRaceQuote, getQuote, handleTool, PROGRAM_ID, NETWORK };

interface McpResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute an MCP tool by name using direct handler imports.
 * Maps tool names to the corresponding handler functions.
 * No subprocess spawning — calls the SDK directly.
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
        const market = await getMarket(params.market_pda || params.publicKey);
        return { success: true, data: market };
      }

      case "list_race_markets": {
        const raceMarkets = await listRaceMarkets(params.status);
        return { success: true, data: raceMarkets };
      }

      case "get_race_market": {
        const raceMarket = await getRaceMarket(params.market_pda || params.publicKey);
        return { success: true, data: raceMarket };
      }

      case "get_quote": {
        const quote = await getQuote(params.market_pda, params.side, params.amount);
        return { success: true, data: quote };
      }

      case "get_race_quote": {
        const raceMarketData = await getRaceMarket(params.market_pda);
        if (!raceMarketData) {
          return { success: false, error: "Race market not found" };
        }
        const raceQuote = getRaceQuote(raceMarketData, params.outcome_index, params.amount);
        return { success: true, data: raceQuote };
      }

      // Market creation tools — use handleTool for write operations
      case "build_create_lab_market_transaction":
      case "build_create_race_market_transaction":
      case "build_create_private_market_transaction":
      case "generate_share_card": {
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response from handleTool" };
        try {
          const parsed = JSON.parse(text);
          return parsed.success === false
            ? { success: false, error: parsed.error || "Tool returned failure" }
            : { success: true, data: parsed };
        } catch {
          return { success: true, data: { text } };
        }
      }

      default: {
        // Fallback: try handleTool for any other tool
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: `Empty response for tool: ${toolName}` };
        try {
          const parsed = JSON.parse(text);
          return parsed.success === false
            ? { success: false, error: parsed.error }
            : { success: true, data: parsed };
        } catch {
          return { success: true, data: { text } };
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: `MCP handler error: ${err.message}` };
  }
}
