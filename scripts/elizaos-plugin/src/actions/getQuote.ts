import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

const MARKET_PDA_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const AMOUNT_REGEX = /(\d+(?:\.\d+)?)\s*(?:sol|usdc|token)?/i;

export const getQuoteAction: Action = {
  name: "GET_BAOZI_QUOTE",
  similes: ["CHECK_BAOZI_ODDS", "PREVIEW_BET", "GET_ODDS", "SIMULATE_BET"],
  description: "Get a price quote for a prediction market bet on Baozi. Shows expected payout, implied odds, and price impact.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return (text.includes("quote") || text.includes("odds") || text.includes("payout") || text.includes("simulate")) &&
      (text.includes("bet") || text.includes("market") || text.includes("baozi"));
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    const text = message.content?.text || "";
    const pdaMatches = text.match(MARKET_PDA_REGEX);
    const marketPda = pdaMatches?.[0];

    if (!marketPda) {
      await callback?.({ text: "Please provide a market address (PDA) to get a quote." });
      return { success: false, error: "No market PDA provided" };
    }

    const side = text.toLowerCase().includes(" no ") ? "No" : "Yes";
    const amountMatch = text.match(AMOUNT_REGEX);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 1.0;

    try {
      const result = await baoziClient.callTool("get_quote", { market: marketPda, side, amount });
      const txt = baoziClient.extractText(result);
      if (result.isError) {
        await callback?.({ text: `Failed to get quote: ${txt}` });
        return { success: false, error: txt };
      }
      const response = `**Baozi Quote** — Market: \`${marketPda.slice(0, 8)}...\`\n\n${txt}\n\n_To place this bet: "bet ${amount} SOL on ${side} for market ${marketPda}"_`;
      await callback?.({ text: response, actions: ["GET_BAOZI_QUOTE"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error getting quote: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Get me a quote for betting 5 SOL YES on market ABC123XYZ" } },
      { name: "{{agentName}}", content: { text: "**Baozi Quote**\nExpected payout: 8.5 SOL\nImplied odds: 59%", actions: ["GET_BAOZI_QUOTE"] } },
    ],
  ],
};
