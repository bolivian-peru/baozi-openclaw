import { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";
import { baoziClient } from "../client";

let cachedText: string | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000;

export const portfolioProvider: Provider = {
  name: "BAOZI_PORTFOLIO",
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
    const wallet = process.env.SOLANA_WALLET_ADDRESS;
    if (!wallet) return { text: "" };
    try {
      const now = Date.now();
      if (cachedText && now - cacheTime < CACHE_TTL_MS) return { text: cachedText };
      const result = await baoziClient.callTool("get_positions", { wallet });
      const txt = baoziClient.extractText(result);
      if (!result.isError && txt) {
        cachedText = `[My Baozi Positions — ${wallet.slice(0, 8)}...]\n${txt}`;
        cacheTime = now;
        return { text: cachedText };
      }
      return { text: `[No open Baozi positions for ${wallet.slice(0, 8)}...]` };
    } catch {
      return { text: "" };
    }
  },
};
