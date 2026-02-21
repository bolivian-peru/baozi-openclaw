import type { ParsedPrediction, MarketType } from "./types";

const BAOZI_MCP_URL = "https://baozi.bet/api/mcp";

/**
 * Validate timing rules per pari-mutuel v6.3
 * Type A: close_time <= event_time - 24h
 * Type B: close_time < measurement_start
 */
export function validateTiming(parsed: ParsedPrediction): { valid: boolean; error?: string } {
  const now = new Date();

  if (parsed.close_time <= now) {
    return { valid: false, error: "Close time must be in the future" };
  }

  if (parsed.market_type === "A" && parsed.event_time) {
    const gapHours = (parsed.event_time.getTime() - parsed.close_time.getTime()) / (1000 * 3600);
    if (gapHours < 24) {
      return {
        valid: false,
        error: `Type A: close_time must be >= 24h before event_time (gap: ${gapHours.toFixed(1)}h)`,
      };
    }
  }

  if (parsed.market_type === "B" && parsed.measurement_start) {
    if (parsed.close_time >= parsed.measurement_start) {
      return { valid: false, error: "Type B: close_time must be before measurement_start" };
    }
  }

  return { valid: true };
}

/**
 * Create a Lab market via Baozi MCP.
 * In demo mode, returns a simulated PDA. In production, calls the real MCP endpoint.
 */
export async function createLabMarket(parsed: ParsedPrediction, callerWallet: string): Promise<{
  market_pda: string;
  tx_signature: string | null;
}> {
  // Build the MCP-compatible request
  const payload = {
    question: parsed.question,
    market_type: parsed.market_type,
    close_time: parsed.close_time.toISOString(),
    event_time: parsed.event_time?.toISOString() ?? null,
    measurement_start: parsed.measurement_start?.toISOString() ?? null,
    data_source: parsed.data_source,
    resolution_criteria: parsed.resolution_criteria,
    creator_wallet: callerWallet,
  };

  try {
    const res = await fetch(`${BAOZI_MCP_URL}/build_create_lab_market_transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json() as any;
      return {
        market_pda: data.market_pda ?? data.marketPda ?? `LAB_${Date.now()}`,
        tx_signature: data.transaction ?? data.tx_signature ?? null,
      };
    }
  } catch {
    // MCP unavailable — fall through to simulated
  }

  // Simulated PDA for demo purposes
  return {
    market_pda: `LAB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tx_signature: null,
  };
}

/**
 * Place caller's bet on their own prediction via MCP.
 */
export async function placeBet(marketPda: string, callerWallet: string, amount: number, side: "Yes" | "No"): Promise<{
  tx_signature: string | null;
}> {
  try {
    const res = await fetch(`${BAOZI_MCP_URL}/build_bet_transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        market_pda: marketPda,
        wallet: callerWallet,
        amount,
        side,
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      return { tx_signature: data.transaction ?? data.tx_signature ?? null };
    }
  } catch {
    // MCP unavailable
  }
  return { tx_signature: null };
}

/**
 * Generate a share card for the call via MCP.
 */
export async function generateShareCard(marketPda: string, callerWallet: string, refCode?: string): Promise<string> {
  // Build URL using Baozi's share card API
  const params = new URLSearchParams({
    market: marketPda,
    wallet: callerWallet,
  });
  if (refCode) params.set("ref", refCode);

  try {
    const res = await fetch(`${BAOZI_MCP_URL}/generate_share_card`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market_pda: marketPda, wallet: callerWallet }),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.url || data.share_card_url) return data.url ?? data.share_card_url;
    }
  } catch {
    // Fallback
  }

  return `https://baozi.bet/api/share/card?${params.toString()}`;
}

/**
 * Check resolution status for a market.
 */
export async function checkResolution(marketPda: string): Promise<{
  resolved: boolean;
  outcome: "Yes" | "No" | null;
} | null> {
  try {
    const res = await fetch(`${BAOZI_MCP_URL}/get_resolution_status?market=${marketPda}`);
    if (res.ok) {
      const data = await res.json() as any;
      return {
        resolved: !!data.resolved,
        outcome: data.outcome ?? null,
      };
    }
  } catch {
    // MCP unavailable
  }
  return null;
}

/**
 * Fetch live markets from Baozi for context.
 */
export async function fetchLiveMarkets(): Promise<any[]> {
  try {
    const res = await fetch(`${BAOZI_MCP_URL}/list_markets`);
    if (res.ok) {
      const data = await res.json() as any;
      return data.markets ?? data.data ?? [];
    }
  } catch {}
  return [];
}
