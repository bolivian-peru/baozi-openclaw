import { Action, IAgentRuntime, Memory, State, HandlerCallback, HandlerOptions, ActionResult } from "@elizaos/core";
import { baoziClient } from "../client";

const WALLET_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

export const claimWinningsAction: Action = {
  name: "CLAIM_BAOZI_WINNINGS",
  similes: ["COLLECT_WINNINGS","REDEEM_BAOZI","WITHDRAW_WINNINGS","CASH_OUT_BAOZI"],
  description: "Check for and build a transaction to claim winnings from resolved Baozi prediction markets.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    return text.includes("claim")||text.includes("collect")||text.includes("redeem")||
      text.includes("winnings")||text.includes("withdraw")||text.includes("cash out");
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
      const claimableResult = await baoziClient.callTool("get_claimable", { wallet });
      const claimableText = baoziClient.extractText(claimableResult);

      if (claimableResult.isError || !claimableText || claimableText.toLowerCase().includes("nothing")) {
        await callback?.({ text: `No claimable winnings found for \`${wallet.slice(0,8)}...\`` });
        return { success: true, text: "No claimable winnings" };
      }

      const claimResult = await baoziClient.callTool("build_claim_winnings_transaction", { wallet });
      const claimTx = baoziClient.extractText(claimResult);
      if (claimResult.isError) {
        await callback?.({ text: `Failed to build claim: ${claimTx}` });
        return { success: false, error: claimTx };
      }

      const response = `**Claim Transaction Built** 🎉\n\nWallet: \`${wallet.slice(0,8)}...\`\n\nClaimable:\n${claimableText}\n\n${claimTx}\n\n⚠️ _Sign and submit with your Solana wallet._`;
      await callback?.({ text: response, actions: ["CLAIM_BAOZI_WINNINGS"] });
      return { success: true, text: response };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await callback?.({ text: `Error claiming winnings: ${msg}` });
      return { success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Claim my Baozi winnings for wallet GpXHXs5Kabcdef" } },
      { name: "{{agentName}}", content: { text: "**Claim Transaction Built** 🎉\nClaimable: 5.2 SOL", actions: ["CLAIM_BAOZI_WINNINGS"] } },
    ],
  ],
};
