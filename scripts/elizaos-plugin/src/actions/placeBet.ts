import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

const ADDR_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const AMOUNT_REGEX = /(\d+(?:\.\d+)?)\s*(?:sol|usdc)?/i;

export const placeBetAction: Action = {
  name: "PLACE_BAOZI_BET",
  similes: ["BET_ON_MARKET", "MAKE_BET", "BUILD_BET_TRANSACTION", "WAGER_ON_MARKET"],
  description: "Build an unsigned Solana transaction to bet on a Baozi prediction market.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return (text.includes("bet") || text.includes("wager") || text.includes("place")) &&
      (text.includes("yes") || text.includes("no")) &&
      (text.includes("market") || text.includes("baozi") || text.includes("sol"));
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: HandlerOptions,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    const text = message.content?.text || "";
    const addresses = text.match(ADDR_REGEX) || [];

    if (addresses.length < 2) {
      await callback?.({ text: "Please provide both a market PDA and your wallet address. Example: 'Bet 2 SOL YES on market ABC123... from wallet XYZ456...'" });
      return { success: false, error: "Missing market PDA or wallet address" };
    }

    const marketPda = addresses[0];
    const bettorWallet = addresses[1];
    const side = text.toLowerCase().includes(" no ") || text.toLowerCase().endsWith(" no") ? "No" : "Yes";
    const amountMatch = text.match(AMOUNT_REGEX);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 1.0;
    const affiliateCode = process.env.BAOZI_AFFILIATE_CODE;

    const args: Record<string, unknown> = { market: marketPda, side, amount, bettor_wallet: bettorWallet };
    if (affiliateCode) args.affiliate_code = affiliateCode;

    try {
      const result = await baoziClient.callTool("build_bet_transaction", args);
      const txt = baoziClient.extractText(result);
      if (result.isError) {
        await callback?.({ text: `Failed to build bet: ${txt}` });
        return { success: false, error: txt };
      }
      const response = `**Bet Transaction Built** ✅\n\nMarket: \`${marketPda ? marketPda.slice(0,8) : "unknown"}...\` | Side: ${side} | Amount: ${amount} SOL\n\n${txt}\n\n⚠️ _Unsigned transaction — sign with your Solana wallet._`;
      await callback?.({ text: response, actions: ["PLACE_BAOZI_BET"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error building bet: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Bet 2 SOL YES on market ABC123XYZdef from wallet MyWallet456abc" } },
      { name: "{{agentName}}", content: { text: "**Bet Transaction Built** ✅\nSide: Yes | Amount: 2 SOL\n[transaction base64]", actions: ["PLACE_BAOZI_BET"] } },
    ],
  ],
};
