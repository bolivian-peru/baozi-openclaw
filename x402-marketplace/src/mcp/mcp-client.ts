/**
 * MCP Client for @baozi.bet/mcp-server
 *
 * Imports handlers DIRECTLY from the installed @baozi.bet/mcp-server package
 * instead of spawning a subprocess. This is faster, more reliable, and testable.
 *
 * Re-exports the handleTool function for intel tools (sentiment, whale moves,
 * resolution forecasts, market alpha) and paper trades.
 */
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import { PROGRAM_ID } from "@baozi.bet/mcp-server/dist/config.js";

export interface McpResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Re-export the direct handlers for use in other modules
export { listMarkets, getMarket, listRaceMarkets, getRaceMarket, getRaceQuote, getQuote, handleTool, PROGRAM_ID };

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
      // Intel tools (x402 Payment Protocol)
      case "get_intel_sentiment":
      case "get_intel_whale_moves":
      case "get_intel_resolution_forecast":
      case "get_intel_market_alpha": {
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response" };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }

      // Paper trade (simulated prediction)
      case "submit_paper_trade": {
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response" };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }

      // Affiliate tools
      case "format_affiliate_link": {
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response" };
        const parsed = JSON.parse(text);
        return { success: true, data: parsed };
      }

      case "build_register_affiliate_transaction": {
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response" };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }

      default: {
        // Fall through to handleTool for any other tool
        const result = await handleTool(toolName, params);
        const text = result?.content?.[0]?.text;
        if (!text) return { success: false, error: "Empty response" };
        const parsed = JSON.parse(text);
        return parsed.success === false
          ? { success: false, error: parsed.error }
          : { success: true, data: parsed };
      }
    }
  } catch (err: any) {
    return { success: false, error: `MCP handler error: ${err.message}` };
  }
}
