/**
 * MCP Client for @baozi.bet/mcp-server
 *
 * Imports handlers DIRECTLY from the installed @baozi.bet/mcp-server package
 * instead of spawning a subprocess. This is faster, more reliable, and testable.
 *
 * Uses the same pattern as the merged AgentBook Pundit (PR #68).
 */
import { listMarkets, getMarket } from "@baozi.bet/mcp-server/dist/handlers/markets.js";
import { listRaceMarkets, getRaceMarket, getRaceQuote } from "@baozi.bet/mcp-server/dist/handlers/race-markets.js";
import { getQuote } from "@baozi.bet/mcp-server/dist/handlers/quote.js";
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";
import {
  PROGRAM_ID,
  NETWORK,
  FEES,
  BET_LIMITS,
  TIMING,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  MARKET_TYPE_NAMES,
} from "@baozi.bet/mcp-server/dist/config.js";
import {
  previewMarketCreation,
  createLabMarket as buildLabMarketTx,
  getAllCreationFees,
  getAllPlatformFees,
  getTimingConstraints,
  generateInviteHash,
} from "@baozi.bet/mcp-server/dist/handlers/market-creation.js";
import type { McpResult } from "./types/index.js";

// Re-export the direct handlers for use in other modules
export {
  listMarkets,
  getMarket,
  listRaceMarkets,
  getRaceMarket,
  getRaceQuote,
  getQuote,
  handleTool,
  PROGRAM_ID,
  NETWORK,
  FEES,
  BET_LIMITS,
  TIMING,
  MARKET_STATUS_NAMES,
  MARKET_LAYER_NAMES,
  MARKET_TYPE_NAMES,
  previewMarketCreation,
  buildLabMarketTx,
  getAllCreationFees,
  getAllPlatformFees,
  getTimingConstraints,
  generateInviteHash,
};

/**
 * Execute an MCP tool by name using direct handler imports.
 * Maps tool names to the corresponding handler functions.
 * No subprocess spawning — calls the SDK directly.
 */
export async function execMcpTool(
  toolName: string,
  params: Record<string, unknown>
): Promise<McpResult> {
  try {
    switch (toolName) {
      case "list_markets": {
        const markets = await listMarkets(params.status as string | undefined);
        return { success: true, data: markets };
      }

      case "get_market": {
        const market = await getMarket(
          (params.market_pda || params.publicKey) as string
        );
        return { success: true, data: market };
      }

      case "list_race_markets": {
        const raceMarkets = await listRaceMarkets(params.status as string | undefined);
        return { success: true, data: raceMarkets };
      }

      case "get_race_market": {
        const raceMarket = await getRaceMarket(
          (params.market_pda || params.publicKey) as string
        );
        return { success: true, data: raceMarket };
      }

      case "get_quote": {
        const quote = await getQuote(
          params.market_pda as string,
          params.side as "Yes" | "No",
          params.amount as number
        );
        return { success: true, data: quote };
      }

      case "get_race_quote": {
        const raceMarketData = await getRaceMarket(params.market_pda as string);
        if (!raceMarketData) {
          return { success: false, error: "Race market not found" };
        }
        const raceQuote = getRaceQuote(
          raceMarketData,
          params.outcome_index as number,
          params.amount as number
        );
        return { success: true, data: raceQuote };
      }

      case "preview_create_market": {
        const preview = await previewMarketCreation({
          question: params.question as string,
          layer: (params.layer as "lab" | "private") || "lab",
          closingTime: params.closing_time as string,
          resolutionTime: params.resolution_time as string | undefined,
          marketType: params.market_type as "event" | "measurement" | undefined,
          eventTime: params.event_time as string | undefined,
          measurementStart: params.measurement_start as string | undefined,
          measurementEnd: params.measurement_end as string | undefined,
          creatorWallet: params.creator_wallet as string,
        });
        return { success: true, data: preview };
      }

      case "build_create_lab_market_transaction": {
        const result = await buildLabMarketTx({
          question: params.question as string,
          layer: "lab",
          closingTime: (params.closing_time || params.close_time) as string,
          resolutionTime: params.resolution_time as string | undefined,
          marketType: params.market_type as "event" | "measurement" | undefined,
          eventTime: params.event_time as string | undefined,
          measurementStart: params.measurement_start as string | undefined,
          measurementEnd: params.measurement_end as string | undefined,
          inviteHash: params.invite_hash as string | undefined,
          creatorWallet: params.creator_wallet as string,
        });
        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      // Market creation, validation, fees, timing, intel tools
      case "build_create_race_market_transaction":
      case "build_create_private_market_transaction":
      case "generate_share_card":
      case "validate_market_question":
      case "validate_market_params":
      case "get_creation_fees":
      case "get_platform_fees":
      case "get_timing_rules":
      case "get_intel_sentiment":
      case "get_intel_whale_moves":
      case "get_intel_resolution_forecast":
      case "get_intel_market_alpha": {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `MCP handler error: ${message}` };
  }
}
