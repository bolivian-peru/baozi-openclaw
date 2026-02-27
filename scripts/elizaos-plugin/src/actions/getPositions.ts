import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

const WALLET_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

export const getPositionsAction: Action = {
  name: "GET_BAOZI_POSITIONS",
  similes: ["CHECK_MY_BETS", "SHOW_PORTFOLIO", "MY_BAOZI_POSITIONS", "CHECK_PNL"],
  description: "Get a wallet's open positions and P&L on Baozi prediction markets.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return text.includes("position") || text.includes("portfolio") || text.includes("my bet") ||
      text.includes("winnings") || text.includes("pnl") || (text.includes("check") && text.includes("baozi"));
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
    const wallet = walletMatch?.[0] || process.env.SOLANA_WALLET_ADDRESS;

    if (!wallet) {
      await callback?.({ text: "Please provide a wallet address or set SOLANA_WALLET_ADDRESS." });
      return { success: false, error: "No wallet address" };
    }

    try {
      const result = await baoziClient.callTool("get_positions", { wallet });
      const txt = baoziClient.extractText(result);
      if (result.isError) {
        await callback?.({ text: `Failed to fetch positions: ${txt}` });
        return { success: false, error: txt };
      }
      const display = txt || "No open positions found.";
      const response = `**Baozi Portfolio** — \`${wallet.slice(0, 8)}...\`\n\n${display}`;
      await callback?.({ text: response, actions: ["GET_BAOZI_POSITIONS"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error fetching positions: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Show my Baozi positions for wallet GpXHXs5Kabcdef" } },
      { name: "{{agentName}}", content: { text: "**Baozi Portfolio**\n2 open positions\nMarket #42 YES: 3 SOL", actions: ["GET_BAOZI_POSITIONS"] } },
    ],
  ],
};
