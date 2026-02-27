import { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";
import { baoziClient } from "../client";

let cachedText: string | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const marketDataProvider: Provider = {
  name: "BAOZI_MARKET_DATA",
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
    try {
      const now = Date.now();
      if (cachedText && now - cacheTime < CACHE_TTL_MS) return { text: cachedText };
      const result = await baoziClient.callTool("list_markets", { layer: "Lab", status: "Active" });
      const txt = baoziClient.extractText(result);
      if (!result.isError && txt) {
        cachedText = `[Baozi Active Markets]\n${txt.split("\n").slice(0, 30).join("\n")}`;
        cacheTime = now;
        return { text: cachedText };
      }
      return { text: "[Baozi markets unavailable]" };
    } catch {
      return { text: "[Baozi markets unavailable]" };
    }
  },
};
