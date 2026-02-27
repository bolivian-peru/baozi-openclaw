import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

export const listMarketsAction: Action = {
  name: "LIST_BAOZI_MARKETS",
  similes: ["SHOW_PREDICTION_MARKETS", "GET_BAOZI_MARKETS", "BROWSE_MARKETS"],
  description: "List active prediction markets on Baozi. Supports filtering by layer (Lab/OpenClaw/Main) and status.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return text.includes("market") || text.includes("predict") || text.includes("bet") || text.includes("baozi");
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    const text = (message.content?.text || "").toLowerCase();
    let layer = "Lab";
    if (text.includes("openclaw") || text.includes("open claw")) layer = "OpenClaw";
    else if (text.includes("main")) layer = "Main";
    let status = "Active";
    if (text.includes("closed")) status = "Closed";
    else if (text.includes("resolved")) status = "Resolved";

    try {
      const result = await baoziClient.callTool("list_markets", { layer, status });
      const txt = baoziClient.extractText(result);
      if (result.isError) {
        await callback?.({ text: `Failed to fetch markets: ${txt}` });
        return { success: false, error: txt };
      }
      const summary = txt.split("\n").slice(0, 30).join("\n");
      const response = `**Baozi Prediction Markets** (${layer} / ${status})\n\n${summary}`;
      await callback?.({ text: response, actions: ["LIST_BAOZI_MARKETS"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error listing markets: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Show me active prediction markets on Baozi" } },
      { name: "{{agentName}}", content: { text: "**Baozi Prediction Markets** (Lab / Active)\n\nMarket #98: Will BTC exceed $100K?...", actions: ["LIST_BAOZI_MARKETS"] } },
    ],
  ],
};
