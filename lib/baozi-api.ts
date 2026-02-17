/**
 * Baozi API client — read-only market data fetching.
 * No authentication required for any of these endpoints.
 */

export interface BaoziMarket {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  outcome: string;
  yesPercent: number;
  noPercent: number;
  totalPoolSol: number;
  closingTime: string;
  resolutionTime?: string;
  eventTime?: string | null;
  isBettingOpen: boolean;
  category?: string | null;
  description?: string | null;
  creator: string;
  platformFeeBps: number;
  creatorFeeBps: number;
}

export interface RaceMarket {
  publicKey: string;
  marketId: number;
  question: string;
  status: string;
  layer: string;
  outcomes: Array<{
    index: number;
    label: string;
    percent: number;
    poolSol: number;
  }>;
  totalPoolSol: number;
  closingTime: string;
  resolutionTime?: string;
  isBettingOpen: boolean;
  category?: string | null;
  creator: string;
}

export interface MarketsResponse {
  success: boolean;
  data: {
    binary: BaoziMarket[];
    race: RaceMarket[];
    counts: { binary: number; race: number; total: number };
    filters: Record<string, string>;
  };
  meta: {
    network: string;
    programId: string;
  };
}

export interface ListMarketsOptions {
  status?: "active" | "closed" | "all";
  layer?: "official" | "lab" | "private" | "all";
  query?: string;
  limit?: number;
  type?: "binary" | "race" | "all";
}

export class BaoziApi {
  private baseUrl: string;

  constructor(baseUrl: string = "https://baozi.bet") {
    this.baseUrl = baseUrl;
  }

  /**
   * List markets with optional filters.
   * Returns both binary and race markets combined.
   */
  async listMarkets(options?: ListMarketsOptions): Promise<{ binary: BaoziMarket[]; race: RaceMarket[] }> {
    const params = new URLSearchParams();
    if (options?.status) params.set("status", options.status);
    if (options?.layer) params.set("layer", options.layer);
    if (options?.query) params.set("query", options.query);
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.type) params.set("type", options.type);

    const url = `${this.baseUrl}/api/markets?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`listMarkets failed: ${res.status} ${res.statusText}`);
    }

    const response = await res.json() as MarketsResponse;
    return {
      binary: response.data?.binary || [],
      race: response.data?.race || [],
    };
  }

  /**
   * Get all active markets sorted by pool size (volume).
   */
  async getActiveMarketsSorted(limit: number = 20): Promise<BaoziMarket[]> {
    const { binary } = await this.listMarkets({ status: "active", limit });
    return binary.sort((a, b) => (b.totalPoolSol || 0) - (a.totalPoolSol || 0));
  }

  /**
   * Get active race markets.
   */
  async getActiveRaceMarkets(): Promise<RaceMarket[]> {
    const { race } = await this.listMarkets({ status: "active" });
    return race;
  }

  /**
   * Get markets closing within the next N hours.
   */
  async getClosingSoon(hours: number = 24): Promise<BaoziMarket[]> {
    const { binary } = await this.listMarkets({ status: "active" });
    const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000);

    return binary
      .filter((m) => {
        const closingTime = new Date(m.closingTime);
        return closingTime <= cutoff && closingTime > new Date();
      })
      .sort((a, b) => new Date(a.closingTime).getTime() - new Date(b.closingTime).getTime());
  }

  /**
   * Format a binary market for display in analysis.
   */
  static formatMarket(m: BaoziMarket): string {
    const pool = m.totalPoolSol?.toFixed(2) || "0.00";
    const closingDate = new Date(m.closingTime);
    const hoursLeft = Math.max(0, (closingDate.getTime() - Date.now()) / (1000 * 60 * 60));
    const timeStr = hoursLeft < 24
      ? `${hoursLeft.toFixed(1)}h left`
      : `${(hoursLeft / 24).toFixed(1)}d left`;

    const oddsStr = `Yes: ${m.yesPercent}% | No: ${m.noPercent}%`;
    const layerStr = m.layer === "Lab" ? " [Lab]" : "";

    return `"${m.question}" — ${oddsStr} — Pool: ${pool} SOL — ${timeStr}${layerStr}`;
  }

  /**
   * Format a race market for display.
   */
  static formatRaceMarket(m: RaceMarket): string {
    const pool = m.totalPoolSol?.toFixed(2) || "0.00";
    const closingDate = new Date(m.closingTime);
    const hoursLeft = Math.max(0, (closingDate.getTime() - Date.now()) / (1000 * 60 * 60));
    const timeStr = hoursLeft < 24
      ? `${hoursLeft.toFixed(1)}h left`
      : `${(hoursLeft / 24).toFixed(1)}d left`;

    const outcomesStr = m.outcomes
      ?.map((o) => `${o.label}: ${o.percent}%`)
      .join(" | ") || "no outcomes";

    return `"${m.question}" — ${outcomesStr} — Pool: ${pool} SOL — ${timeStr}`;
  }
}
