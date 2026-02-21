import type { TrackedAgent, AgentPosition, AgentStats, ArenaMarket } from "./types";

const BAOZI_API = "https://baozi.bet/api/mcp";

/** In-memory store for tracked agents and cached data */
let trackedAgents: TrackedAgent[] = [];
let cachedPositions: Map<string, AgentPosition[]> = new Map();
let cachedMarkets: Map<string, ArenaMarket> = new Map();
let cachedStats: Map<string, AgentStats> = new Map();
let lastRefresh: string | null = null;

/** Add an agent to track */
export function addAgent(wallet: string, name?: string): TrackedAgent {
  const existing = trackedAgents.find(a => a.wallet === wallet);
  if (existing) return existing;

  const agent: TrackedAgent = {
    wallet,
    name: name ?? wallet.slice(0, 8) + "...",
    avatar_url: null,
    added_at: new Date().toISOString(),
  };
  trackedAgents.push(agent);
  return agent;
}

/** Remove an agent */
export function removeAgent(wallet: string): boolean {
  const idx = trackedAgents.findIndex(a => a.wallet === wallet);
  if (idx === -1) return false;
  trackedAgents.splice(idx, 1);
  cachedPositions.delete(wallet);
  cachedStats.delete(wallet);
  return true;
}

/** Get all tracked agents */
export function getAgents(): TrackedAgent[] {
  return [...trackedAgents];
}

/** Fetch agent profile from Baozi */
async function fetchAgentProfile(wallet: string): Promise<{ name: string; avatar: string | null } | null> {
  try {
    const res = await fetch(`https://baozi.bet/api/creator/${wallet}`);
    if (res.ok) {
      const data = await res.json() as any;
      return { name: data.name ?? data.username ?? wallet.slice(0, 8), avatar: data.avatar ?? null };
    }
  } catch {}
  return null;
}

/** Fetch positions for an agent via MCP */
async function fetchPositions(wallet: string): Promise<AgentPosition[]> {
  try {
    const res = await fetch(`${BAOZI_API}/get_positions?wallet=${wallet}`);
    if (!res.ok) return [];
    const data = await res.json() as any;
    const positions = data.positions ?? data.data ?? [];
    return positions.map((p: any) => ({
      market_pda: p.market_pda ?? p.market ?? p.marketPda ?? "",
      market_question: p.question ?? p.market_question ?? "Unknown market",
      side: p.side ?? p.outcome ?? "Yes",
      amount: (p.amount ?? p.sol_amount ?? 0) / (p.amount > 1000 ? 1e9 : 1), // normalize lamports
      current_odds: p.odds ?? p.current_odds ?? 0.5,
      implied_value: 0, // computed below
    }));
  } catch {
    return [];
  }
}

/** Fetch active markets */
async function fetchMarkets(): Promise<ArenaMarket[]> {
  try {
    const res = await fetch(`${BAOZI_API}/list_markets`);
    if (!res.ok) return [];
    const data = await res.json() as any;
    const markets = data.markets ?? data.data ?? [];
    return markets.map((m: any) => ({
      pda: m.pda ?? m.market_pda ?? m.id ?? "",
      question: m.question ?? m.title ?? "Unknown",
      close_time: m.close_time ?? m.closeTime ?? "",
      status: m.status ?? "active",
      total_pool: (m.total_pool ?? m.totalPool ?? 0) / (m.total_pool > 1000 ? 1e9 : 1),
      yes_pool: (m.yes_pool ?? m.yesPool ?? 0) / (m.yes_pool > 1000 ? 1e9 : 1),
      no_pool: (m.no_pool ?? m.noPool ?? 0) / (m.no_pool > 1000 ? 1e9 : 1),
      yes_odds: 0,
      no_odds: 0,
      agent_positions: [],
      outcome: m.outcome ?? null,
    }));
  } catch {
    return [];
  }
}

/** Fetch quote for a market */
async function fetchQuote(marketPda: string): Promise<{ yes_odds: number; no_odds: number } | null> {
  try {
    const res = await fetch(`${BAOZI_API}/get_quote?market=${marketPda}&amount=1&side=Yes`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const yesOdds = data.odds ?? data.implied_probability ?? 0.5;
    return { yes_odds: yesOdds, no_odds: 1 - yesOdds };
  } catch {
    return null;
  }
}

/** Refresh all data from chain */
export async function refresh(): Promise<void> {
  // Fetch markets
  const markets = await fetchMarkets();
  cachedMarkets.clear();

  for (const m of markets) {
    // Get odds
    const quote = await fetchQuote(m.pda);
    if (quote) {
      m.yes_odds = quote.yes_odds;
      m.no_odds = quote.no_odds;
    } else if (m.total_pool > 0) {
      m.yes_odds = m.yes_pool / m.total_pool;
      m.no_odds = m.no_pool / m.total_pool;
    } else {
      m.yes_odds = 0.5;
      m.no_odds = 0.5;
    }
    cachedMarkets.set(m.pda, m);
  }

  // Fetch positions for each agent (parallel, resilient)
  const results = await Promise.allSettled(
    trackedAgents.map(async (agent) => {
      // Try to enrich agent profile
      if (agent.name === agent.wallet.slice(0, 8) + "...") {
        const profile = await fetchAgentProfile(agent.wallet);
        if (profile) {
          agent.name = profile.name;
          agent.avatar_url = profile.avatar;
        }
      }

      const positions = await fetchPositions(agent.wallet);
      // Compute implied values
      for (const pos of positions) {
        const market = cachedMarkets.get(pos.market_pda);
        if (market) {
          pos.current_odds = pos.side === "Yes" ? market.yes_odds : market.no_odds;
          pos.implied_value = pos.amount * pos.current_odds;

          // Add to market's agent positions
          market.agent_positions.push({
            agent_name: agent.name,
            agent_wallet: agent.wallet,
            side: pos.side,
            amount: pos.amount,
          });
        }
      }
      cachedPositions.set(agent.wallet, positions);
      return { wallet: agent.wallet, positions };
    })
  );

  // Compute stats for each agent
  cachedStats.clear();
  for (const agent of trackedAgents) {
    const positions = cachedPositions.get(agent.wallet) ?? [];
    const active = positions.filter(p => {
      const m = cachedMarkets.get(p.market_pda);
      return m && m.status === "active";
    });
    const resolved = positions.filter(p => {
      const m = cachedMarkets.get(p.market_pda);
      return m && m.status === "resolved";
    });

    const correct = resolved.filter(p => {
      const m = cachedMarkets.get(p.market_pda);
      return m && m.outcome === p.side;
    });

    const solWagered = positions.reduce((s, p) => s + p.amount, 0);
    const solWon = correct.reduce((s, p) => s + p.amount * 1.8, 0);
    const solLost = resolved.filter(p => {
      const m = cachedMarkets.get(p.market_pda);
      return m && m.outcome !== p.side;
    }).reduce((s, p) => s + p.amount, 0);

    const accuracy = resolved.length > 0 ? correct.length / resolved.length : 0;

    // Streak from most recent
    let streak = 0;
    const sortedResolved = [...resolved].reverse();
    for (const p of sortedResolved) {
      const m = cachedMarkets.get(p.market_pda);
      if (m && m.outcome === p.side) streak++;
      else break;
    }

    let bestStreak = 0, cur = 0;
    for (const p of resolved) {
      const m = cachedMarkets.get(p.market_pda);
      if (m && m.outcome === p.side) { cur++; bestStreak = Math.max(bestStreak, cur); }
      else cur = 0;
    }

    // Composite score: accuracy * volume * profit factor
    const volumeFactor = Math.min(2, 1 + Math.log10(Math.max(1, positions.length)) / 3);
    const profitFactor = solWon > 0 ? Math.min(2, 1 + (solWon - solLost) / solWagered) : 0.5;
    const score = accuracy * 50 * volumeFactor * profitFactor;

    cachedStats.set(agent.wallet, {
      wallet: agent.wallet,
      name: agent.name,
      total_markets: positions.length,
      active_positions: active.length,
      resolved_markets: resolved.length,
      correct_predictions: correct.length,
      accuracy,
      sol_wagered: solWagered,
      sol_won: solWon,
      sol_lost: solLost,
      net_pnl: solWon - solLost,
      current_streak: streak,
      best_streak: bestStreak,
      score,
    });
  }

  lastRefresh = new Date().toISOString();
}

/** Get cached stats for an agent */
export function getAgentStats(wallet: string): AgentStats | null {
  return cachedStats.get(wallet) ?? null;
}

/** Get cached positions */
export function getAgentPositions(wallet: string): AgentPosition[] {
  return cachedPositions.get(wallet) ?? [];
}

/** Get leaderboard sorted by score */
export function getLeaderboard(): AgentStats[] {
  return [...cachedStats.values()].sort((a, b) => b.score - a.score);
}

/** Get all markets with agent overlays */
export function getMarkets(): ArenaMarket[] {
  return [...cachedMarkets.values()].filter(m => m.agent_positions.length > 0);
}

/** Get all markets including empty ones */
export function getAllMarkets(): ArenaMarket[] {
  return [...cachedMarkets.values()];
}

/** Get arena snapshot */
export function getSnapshot(): {
  timestamp: string;
  agents: AgentStats[];
  markets: ArenaMarket[];
  total_agents: number;
  total_active_markets: number;
  total_sol_in_play: number;
  last_refresh: string | null;
} {
  const agents = getLeaderboard();
  const markets = getMarkets();
  return {
    timestamp: new Date().toISOString(),
    agents,
    markets,
    total_agents: trackedAgents.length,
    total_active_markets: [...cachedMarkets.values()].filter(m => m.status === "active").length,
    total_sol_in_play: agents.reduce((s, a) => s + a.sol_wagered, 0),
    last_refresh: lastRefresh,
  };
}

/** Reset all state (for tests) */
export function resetTracker(): void {
  trackedAgents = [];
  cachedPositions = new Map();
  cachedMarkets = new Map();
  cachedStats = new Map();
  lastRefresh = null;
}
