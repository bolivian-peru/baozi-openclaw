/**
 * Baozi Client — Wraps @baozi.bet/mcp-server handlers for Arena data
 *
 * Uses the published MCP server package to query Solana on-chain data
 * for markets, positions, quotes, and race markets.
 */

import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getPositions, getPositionsEnriched, getPositionsSummary } from '@baozi.bet/mcp-server/dist/handlers/positions.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { listRaceMarkets, getRaceMarket } from '@baozi.bet/mcp-server/dist/handlers/race-markets.js';

import type {
  AgentConfig,
  AgentStats,
  AgentPosition,
  MarketState,
  RaceMarketState,
  ArenaSnapshot,
  LeaderboardEntry,
} from './types.js';

// ── Agent profile fetcher (baozi off-chain API) ──────────────────────────

interface AgentProfile {
  displayName?: string;
  avatar?: string;
}

async function fetchAgentProfile(wallet: string): Promise<AgentProfile | null> {
  try {
    const res = await fetch(`https://baozi.bet/api/agents/profile/${wallet}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return data as AgentProfile;
  } catch {
    return null;
  }
}

// ── Agent stats builder ──────────────────────────────────────────────────

function calculateStreak(positions: AgentPosition[]): number {
  // Get resolved positions sorted by most recent first
  const resolved = positions
    .filter(p => p.marketOutcome !== null && p.marketStatus !== 'Active')
    .reverse();

  let streak = 0;
  for (const pos of resolved) {
    const won =
      (pos.side === 'Yes' && pos.marketOutcome === 'Yes') ||
      (pos.side === 'No' && pos.marketOutcome === 'No');
    if (won) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function getAgentStats(agent: AgentConfig): Promise<AgentStats> {
  try {
    const summary = await getPositionsSummary(agent.wallet);

    const positions: AgentPosition[] = summary.positions.map(p => ({
      marketPda: p.marketPda || p.marketId,
      marketQuestion: p.marketQuestion || 'Unknown Market',
      marketStatus: p.marketStatus || 'Unknown',
      side: p.side,
      yesAmountSol: p.yesAmountSol,
      noAmountSol: p.noAmountSol,
      totalAmountSol: p.totalAmountSol,
      claimed: p.claimed,
      marketOutcome: p.marketOutcome || null,
      potentialPayout: p.potentialPayout || 0,
    }));

    // Calculate P&L
    const winning = positions.filter(p => {
      if (!p.marketOutcome) return false;
      return (
        (p.side === 'Yes' && p.marketOutcome === 'Yes') ||
        (p.side === 'No' && p.marketOutcome === 'No')
      );
    });

    const losing = positions.filter(p => {
      if (!p.marketOutcome) return false;
      return (
        (p.side === 'Yes' && p.marketOutcome === 'No') ||
        (p.side === 'No' && p.marketOutcome === 'Yes')
      );
    });

    const totalWon = winning.reduce((sum, p) => sum + (p.potentialPayout || 0), 0);
    const totalLost = losing.reduce((sum, p) => sum + p.totalAmountSol, 0);
    const resolved = winning.length + losing.length;
    const accuracy = resolved > 0 ? (winning.length / resolved) * 100 : 0;

    return {
      wallet: agent.wallet,
      name: agent.name,
      emoji: agent.emoji,
      totalPositions: summary.totalPositions,
      activePositions: summary.activePositions,
      winningPositions: winning.length,
      losingPositions: losing.length,
      pendingPositions: summary.pendingPositions,
      totalBetSol: summary.totalBetSol,
      totalWonSol: totalWon,
      totalLostSol: totalLost,
      netPnlSol: totalWon - totalLost - summary.totalBetSol + winning.reduce((s, p) => s + p.totalAmountSol, 0),
      accuracy: Math.round(accuracy * 10) / 10,
      streak: calculateStreak(positions),
      positions,
    };
  } catch (error) {
    console.error(`Error fetching stats for ${agent.name} (${agent.wallet}):`, error);
    return {
      wallet: agent.wallet,
      name: agent.name,
      emoji: agent.emoji,
      totalPositions: 0,
      activePositions: 0,
      winningPositions: 0,
      losingPositions: 0,
      pendingPositions: 0,
      totalBetSol: 0,
      totalWonSol: 0,
      totalLostSol: 0,
      netPnlSol: 0,
      accuracy: 0,
      streak: 0,
      positions: [],
    };
  }
}

// ── Market state with agent positions ────────────────────────────────────

export async function getMarketsWithAgents(
  agents: AgentConfig[],
  agentStatsMap: Map<string, AgentStats>
): Promise<MarketState[]> {
  try {
    const allMarkets = await listMarkets();

    // Collect all market PDAs that agents have positions on
    const agentMarketPdas = new Set<string>();
    for (const stats of agentStatsMap.values()) {
      for (const pos of stats.positions) {
        agentMarketPdas.add(pos.marketPda);
      }
    }

    // Get detailed market data for markets with agent activity
    const marketStates: MarketState[] = [];

    for (const market of allMarkets) {
      const hasAgentPosition = agentMarketPdas.has(market.publicKey);
      const isActive = market.status === 'Active' || market.status === 'Closed';

      if (!hasAgentPosition && !isActive) continue;

      const agentPositions: MarketState['agentPositions'] = [];

      for (const agent of agents) {
        const stats = agentStatsMap.get(agent.wallet);
        if (!stats) continue;

        for (const pos of stats.positions) {
          if (pos.marketPda === market.publicKey) {
            agentPositions.push({
              agent,
              side: pos.side,
              amount: pos.totalAmountSol,
              potentialPayout: pos.potentialPayout,
            });
          }
        }
      }

      if (agentPositions.length > 0 || isActive) {
        marketStates.push({
          publicKey: market.publicKey,
          marketId: market.marketId,
          question: market.question,
          status: market.status,
          layer: market.layer,
          yesPoolSol: market.yesPoolSol,
          noPoolSol: market.noPoolSol,
          totalPoolSol: market.totalPoolSol,
          yesPercent: market.yesPercent,
          noPercent: market.noPercent,
          closingTime: market.closingTime,
          isBettingOpen: market.isBettingOpen,
          winningOutcome: market.winningOutcome,
          agentPositions,
        });
      }
    }

    // Sort: markets with agent positions first, then by pool size
    marketStates.sort((a, b) => {
      if (a.agentPositions.length > 0 && b.agentPositions.length === 0) return -1;
      if (a.agentPositions.length === 0 && b.agentPositions.length > 0) return 1;
      return b.totalPoolSol - a.totalPoolSol;
    });

    return marketStates;
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

// ── Race markets ─────────────────────────────────────────────────────────

export async function getRaceMarketsState(): Promise<RaceMarketState[]> {
  try {
    const markets = await listRaceMarkets();
    return markets.map(m => ({
      publicKey: m.publicKey,
      marketId: m.marketId,
      question: m.question,
      status: m.status,
      totalPoolSol: m.totalPoolSol,
      closingTime: m.closingTime,
      isBettingOpen: m.isBettingOpen,
      outcomes: m.outcomes,
      winningOutcomeIndex: m.winningOutcomeIndex,
    }));
  } catch (error) {
    console.error('Error fetching race markets:', error);
    return [];
  }
}

// ── Leaderboard builder ──────────────────────────────────────────────────

export function buildLeaderboard(agentStats: AgentStats[]): LeaderboardEntry[] {
  return agentStats
    .map((s, _i) => ({
      rank: 0,
      wallet: s.wallet,
      name: s.name,
      emoji: s.emoji,
      accuracy: s.accuracy,
      netPnlSol: s.netPnlSol,
      totalBetSol: s.totalBetSol,
      totalPositions: s.totalPositions,
      winningPositions: s.winningPositions,
      streak: s.streak,
    }))
    .sort((a, b) => {
      // Sort by net P&L, then by accuracy, then by volume
      if (b.netPnlSol !== a.netPnlSol) return b.netPnlSol - a.netPnlSol;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalBetSol - a.totalBetSol;
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

// ── Sequential helper to avoid RPC rate limits ───────────────────────────

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sequential<T, R>(items: T[], fn: (item: T) => Promise<R>, delayMs = 2000): Promise<R[]> {
  const results: R[] = [];
  for (const item of items) {
    results.push(await fn(item));
    if (items.indexOf(item) < items.length - 1) {
      await delay(delayMs);
    }
  }
  return results;
}

// ── Full arena snapshot ──────────────────────────────────────────────────

export async function getArenaSnapshot(agents: AgentConfig[]): Promise<ArenaSnapshot> {
  console.log(`[Arena] Fetching snapshot for ${agents.length} agents...`);
  const start = Date.now();

  // Fetch agent stats sequentially to avoid RPC rate limits
  const agentStats = await sequential(agents, getAgentStats, 2000);
  const agentStatsMap = new Map(agentStats.map(s => [s.wallet, s]));

  await delay(2000);

  // Fetch markets and race markets sequentially
  const markets = await getMarketsWithAgents(agents, agentStatsMap);
  await delay(2000);
  const raceMarkets = await getRaceMarketsState();

  const leaderboard = buildLeaderboard(agentStats);

  const elapsed = Date.now() - start;
  console.log(`[Arena] Snapshot ready in ${elapsed}ms — ${agentStats.length} agents, ${markets.length} markets`);

  return {
    timestamp: new Date().toISOString(),
    agents: agentStats,
    markets,
    raceMarkets,
    leaderboard,
  };
}

// ── Exports for direct use ───────────────────────────────────────────────

export { listMarkets, getMarket, getQuote, listRaceMarkets, getRaceMarket, fetchAgentProfile };
