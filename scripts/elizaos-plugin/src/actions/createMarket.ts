import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

const WALLET_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
const ISO_DATE_REGEX = /(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?(?:Z|[+-]\d{2}:?\d{2})?)/g;

const VALID_CATEGORIES = ["crypto","sports","music","streaming","economic","weather","elections"] as const;
type Category = typeof VALID_CATEGORIES[number];

function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  if (t.includes("btc")||t.includes("eth")||t.includes("solana")||t.includes("crypto")||t.includes("price")) return "crypto";
  if (t.includes("game")||t.includes("match")||t.includes("sport")) return "sports";
  if (t.includes("album")||t.includes("song")||t.includes("music")) return "music";
  if (t.includes("netflix")||t.includes("stream")) return "streaming";
  if (t.includes("gdp")||t.includes("inflation")||t.includes("economic")) return "economic";
  if (t.includes("weather")||t.includes("temperature")) return "weather";
  if (t.includes("election")||t.includes("vote")||t.includes("president")) return "elections";
  return "crypto";
}

export const createMarketAction: Action = {
  name: "CREATE_BAOZI_MARKET",
  similes: ["MAKE_PREDICTION_MARKET","CREATE_LAB_MARKET","NEW_BAOZI_MARKET","LAUNCH_PREDICTION"],
  description: "Build an unsigned Solana transaction to create a new Lab prediction market on Baozi. Enforces v6.3 timing rules (closing ≥12h before event).",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return (text.includes("create")||text.includes("make")||text.includes("new")) &&
      (text.includes("market")||text.includes("prediction")||text.includes("baozi"));
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    const text = message.content?.text || "";

    const walletMatch = text.match(WALLET_REGEX);
    const creatorWallet = walletMatch?.[0] || process.env.SOLANA_WALLET_ADDRESS;
    if (!creatorWallet) {
      await callback?.({ text: "Please provide a creator wallet or set SOLANA_WALLET_ADDRESS." });
      return { success: false, error: "No wallet address" };
    }

    const dates = text.match(ISO_DATE_REGEX) || [];
    if (dates.length < 2) {
      await callback?.({ text: "Please provide closing_time and event_time in ISO 8601 format.\nExample: 'Create market: Will BTC hit $100K? closing 2026-03-31T23:59:00Z event 2026-04-01T00:00:00Z wallet ABC...'" });
      return { success: false, error: "Missing dates" };
    }

    const closingTime = dates[0]!;
    const eventTime = dates[1]!;
    const closingMs = new Date(closingTime).getTime();
    const eventMs = new Date(eventTime).getTime();
    const diffHours = (eventMs - closingMs) / (1000 * 60 * 60);

    if (diffHours < 12) {
      await callback?.({ text: `❌ Timing rule violation: closing_time must be ≥12h before event_time (got ${diffHours.toFixed(1)}h). Please adjust dates.` });
      return { success: false, error: `Timing gap too small: ${diffHours.toFixed(1)}h` };
    }

    const quotedMatch = text.match(/["']([^"']+)["']/);
    const question = quotedMatch?.[1] || text.split(/closing|event|wallet/i)[0].trim();
    const sourceMatch = text.match(/source:?\s*([^\n,]+)/i);
    const dataSource = sourceMatch?.[1]?.trim() || "public data";
    const category = detectCategory(question);

    try {
      const result = await baoziClient.callTool("build_create_lab_market_transaction", {
        question, closing_time: closingTime, market_type: "typeA",
        event_time: eventTime, category, data_source: dataSource, creator_wallet: creatorWallet,
      });
      const txt = baoziClient.extractText(result);
      if (result.isError) {
        await callback?.({ text: `Failed to build market: ${txt}` });
        return { success: false, error: txt };
      }
      const response = `**Market Transaction Built** ✅\n\nQuestion: "${question}"\nCategory: ${category} | Buffer: ${diffHours.toFixed(1)}h ✓\n\n${txt}\n\n⚠️ _Sign with your Solana wallet._`;
      await callback?.({ text: response, actions: ["CREATE_BAOZI_MARKET"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error creating market: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Create market: 'Will ETH reach $5K?' closing 2026-03-31T23:59:00Z event 2026-04-01T00:00:00Z wallet GpXHXs5Kabcdef" } },
      { name: "{{agentName}}", content: { text: "**Market Transaction Built** ✅\nQuestion: Will ETH reach $5K?\nCategory: crypto | Buffer: 12.0h ✓", actions: ["CREATE_BAOZI_MARKET"] } },
    ],
  ],
};
