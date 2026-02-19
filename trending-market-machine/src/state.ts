/**
 * State management module
 * Persists machine state between runs for dedup and tracking
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { MachineState, CreatedMarket } from "./types/index.js";

const DEFAULT_STATE: MachineState = {
  createdTopicIds: [],
  createdQuestions: [],
  markets: [],
  lastRunAt: new Date().toISOString(),
  totalCreated: 0,
};

/** Default state file location */
const DEFAULT_STATE_PATH = join(process.cwd(), "data", "state.json");

/**
 * Load state from disk
 */
export async function loadState(path?: string): Promise<MachineState> {
  const statePath = path || DEFAULT_STATE_PATH;

  try {
    const raw = await readFile(statePath, "utf-8");
    const state = JSON.parse(raw) as MachineState;

    // Prune old entries (keep last 500 to prevent unbounded growth)
    if (state.createdTopicIds.length > 500) {
      state.createdTopicIds = state.createdTopicIds.slice(-500);
    }
    if (state.createdQuestions.length > 500) {
      state.createdQuestions = state.createdQuestions.slice(-500);
    }
    if (state.markets.length > 200) {
      state.markets = state.markets.slice(-200);
    }

    return state;
  } catch {
    console.log("[state] No existing state found, starting fresh");
    return { ...DEFAULT_STATE };
  }
}

/**
 * Save state to disk
 */
export async function saveState(state: MachineState, path?: string): Promise<void> {
  const statePath = path || DEFAULT_STATE_PATH;

  try {
    await mkdir(dirname(statePath), { recursive: true });
    await writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
    console.log(`[state] Saved state to ${statePath}`);
  } catch (err) {
    console.error(`[state] Failed to save state: ${err}`);
  }
}

/**
 * Record a newly created market in state
 */
export function recordCreation(state: MachineState, market: CreatedMarket): MachineState {
  return {
    ...state,
    createdTopicIds: [...state.createdTopicIds, market.proposal.topic.id],
    createdQuestions: [...state.createdQuestions, market.proposal.question],
    markets: [...state.markets, market],
    lastRunAt: new Date().toISOString(),
    totalCreated: state.totalCreated + 1,
  };
}

/**
 * Get summary statistics from state
 */
export function getStats(state: MachineState): {
  totalCreated: number;
  lastRunAt: string;
  recentMarkets: number;
  categoryCounts: Record<string, number>;
} {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentMarkets = state.markets.filter(
    (m) => new Date(m.createdAt) > oneDayAgo
  ).length;

  const categoryCounts: Record<string, number> = {};
  for (const market of state.markets) {
    const cat = market.proposal.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return {
    totalCreated: state.totalCreated,
    lastRunAt: state.lastRunAt,
    recentMarkets,
    categoryCounts,
  };
}
