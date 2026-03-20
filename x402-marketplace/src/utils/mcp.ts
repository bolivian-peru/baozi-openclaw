/**
 * MCP Utilities
 *
 * Thin wrappers around @baozi.bet/mcp-server's handleTool for
 * fetching market data needed by the marketplace.
 */
import { handleTool } from "@baozi.bet/mcp-server/dist/tools.js";

/**
 * Fetch market title from Baozi MCP for enriching analysis listings.
 */
export async function fetchMarketTitle(marketPda: string): Promise<string | undefined> {
  try {
    const result = await handleTool("get_market", { market_pda: marketPda });
    const text = result?.content?.[0]?.text;
    if (!text) return undefined;
    const parsed = JSON.parse(text);
    return parsed?.market?.title ?? parsed?.title ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch resolved market outcome from Baozi MCP.
 * Returns "YES", "NO", or undefined if unresolved.
 */
export async function fetchMarketOutcome(marketPda: string): Promise<string | undefined> {
  try {
    const result = await handleTool("get_market", { market_pda: marketPda });
    const text = result?.content?.[0]?.text;
    if (!text) return undefined;
    const parsed = JSON.parse(text);
    const market = parsed?.market ?? parsed;

    // Check various possible outcome field names from Baozi MCP
    const status = market?.status ?? market?.marketStatus;
    if (status !== "resolved" && status !== "Resolved") return undefined;

    const outcome = market?.outcome ?? market?.winningOutcome ?? market?.resolution;
    if (!outcome) return undefined;

    // Normalize to YES/NO
    const upper = String(outcome).toUpperCase();
    if (upper === "YES" || upper === "A" || upper === "OPTION_A") return "YES";
    if (upper === "NO" || upper === "B" || upper === "OPTION_B") return "NO";
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch a list of active Baozi markets for discovery.
 */
export async function fetchActiveMarkets(limit = 20): Promise<any[]> {
  try {
    const result = await handleTool("list_markets", { status: "active" });
    const text = result?.content?.[0]?.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    const markets: any[] = parsed?.markets ?? [];
    return markets.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get intel sentiment for a market (x402 gated — may return payment required).
 */
export async function getMarketSentiment(marketPda: string, paymentTx?: string): Promise<any> {
  const args: Record<string, any> = { market: marketPda };
  if (paymentTx) args.payment_tx = paymentTx;
  try {
    const result = await handleTool("get_intel_sentiment", args);
    const text = result?.content?.[0]?.text;
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
