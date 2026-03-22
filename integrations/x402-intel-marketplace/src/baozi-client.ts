/**
 * Baozi API Client
 *
 * Fetches market data from Baozi.bet API using the MCP server handlers.
 * Used by the marketplace to validate market PDAs and enrich intel listings.
 */

const BAOZI_API = process.env.BAOZI_API_URL ?? "https://baozi.bet";

export interface BaoziMarket {
  id: string;
  pda: string;
  question: string;
  status: "active" | "closed" | "resolved";
  layer: string;
  closingTime: string;
  resolvedOutcome?: string;
  outcomes: Array<{ label: string; probability: number; pool: number }>;
}

/**
 * Fetch a single market by PDA from the Baozi API.
 */
export async function fetchMarket(
  marketPda: string
): Promise<BaoziMarket | null> {
  try {
    const url = `${BAOZI_API}/api/mcp/markets/${marketPda}`;
    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    return normalizeMarket(data);
  } catch {
    return null;
  }
}

/**
 * List active markets from the Baozi API.
 */
export async function listMarkets(limit = 20): Promise<BaoziMarket[]> {
  try {
    const url = `${BAOZI_API}/api/mcp/markets?status=active&limit=${limit}`;
    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as any;
    const raw = Array.isArray(data) ? data : data.markets ?? [];
    return raw.map(normalizeMarket);
  } catch {
    return [];
  }
}

function normalizeMarket(raw: any): BaoziMarket {
  return {
    id: raw.id ?? raw.pda ?? "",
    pda: raw.pda ?? raw.id ?? "",
    question: raw.question ?? raw.title ?? "",
    status: raw.status ?? "active",
    layer: raw.layer ?? "lab",
    closingTime: raw.closingTime ?? raw.closing_time ?? new Date().toISOString(),
    resolvedOutcome: raw.resolvedOutcome ?? raw.resolved_outcome,
    outcomes: Array.isArray(raw.outcomes)
      ? raw.outcomes.map((o: any) => ({
          label: o.label ?? o.name ?? "",
          probability: o.probability ?? 0.5,
          pool: o.pool ?? 0,
        }))
      : [
          { label: "Yes", probability: 0.5, pool: 0 },
          { label: "No", probability: 0.5, pool: 0 },
        ],
  };
}

/**
 * Build a Baozi bet URL with the analyst's affiliate code embedded.
 * When a buyer clicks this link and bets, the analyst earns 1% commission.
 */
export function buildAffiliateUrl(
  marketPda: string,
  affiliateCode: string
): string {
  return `${BAOZI_API}/market/${marketPda}?ref=${affiliateCode}`;
}

/**
 * Build a referral registration transaction payload for the affiliate system.
 * Returns the API URL + payload; caller must sign & submit to Solana.
 */
export function buildAffiliateRegistrationPayload(
  walletAddress: string,
  affiliateCode: string,
  referrerCode?: string
): {
  endpoint: string;
  payload: Record<string, string>;
} {
  return {
    endpoint: `${BAOZI_API}/api/mcp/affiliate/register`,
    payload: {
      wallet: walletAddress,
      affiliateCode,
      ...(referrerCode ? { referrer: referrerCode } : {}),
    },
  };
}
