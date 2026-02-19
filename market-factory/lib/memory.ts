/**
 * Persistent Memory for Market Factory
 * 
 * Stores market records, category stats, and processed event IDs
 * to a JSON file for continuity across runs.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { FactoryState, MarketRecord, CategoryStats, MarketCategory } from './types.js';
import { CATEGORIES } from './config.js';

const MEMORY_DIR = join(dirname(new URL(import.meta.url).pathname), '..', 'memory');
const STATE_FILE = join(MEMORY_DIR, 'factory-state.json');

// =============================================================================
// State Management
// =============================================================================

function initEmptyState(): FactoryState {
  const categoryStats: Record<string, CategoryStats> = {};
  for (const cat of CATEGORIES) {
    categoryStats[cat] = {
      category: cat,
      marketsCreated: 0,
      totalVolumeSol: 0,
      totalFeesEarnedSol: 0,
      avgVolumePerMarket: 0,
      resolutions: { correct: 0, incorrect: 0, pending: 0 },
    };
  }
  return {
    markets: [],
    categoryStats,
    processedEventIds: [],
    lastScans: {},
    totalFeesEarnedSol: 0,
    totalMarketsCreated: 0,
  };
}

export function loadState(): FactoryState {
  try {
    if (!existsSync(MEMORY_DIR)) {
      mkdirSync(MEMORY_DIR, { recursive: true });
    }
    if (!existsSync(STATE_FILE)) {
      const state = initEmptyState();
      saveState(state);
      return state;
    }
    const raw = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as FactoryState;
  } catch {
    return initEmptyState();
  }
}

export function saveState(state: FactoryState): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// =============================================================================
// Market Records
// =============================================================================

export function addMarketRecord(state: FactoryState, record: MarketRecord): FactoryState {
  state.markets.push(record);
  state.processedEventIds.push(record.eventId);
  state.totalMarketsCreated++;

  // Update category stats
  const cat = record.category;
  if (!state.categoryStats[cat]) {
    state.categoryStats[cat] = {
      category: cat as MarketCategory,
      marketsCreated: 0,
      totalVolumeSol: 0,
      totalFeesEarnedSol: 0,
      avgVolumePerMarket: 0,
      resolutions: { correct: 0, incorrect: 0, pending: 0 },
    };
  }
  state.categoryStats[cat].marketsCreated++;
  state.categoryStats[cat].resolutions.pending++;

  return state;
}

export function updateMarketVolume(
  state: FactoryState,
  marketId: string,
  volumeSol: number,
  feesEarnedSol: number
): FactoryState {
  const market = state.markets.find(m => m.marketId === marketId);
  if (market) {
    market.volumeSol = volumeSol;
    market.feesEarnedSol = feesEarnedSol;

    // Recalculate category stats
    const cat = market.category;
    const catMarkets = state.markets.filter(m => m.category === cat);
    const stats = state.categoryStats[cat];
    if (stats) {
      stats.totalVolumeSol = catMarkets.reduce((sum, m) => sum + m.volumeSol, 0);
      stats.totalFeesEarnedSol = catMarkets.reduce((sum, m) => sum + m.feesEarnedSol, 0);
      stats.avgVolumePerMarket = stats.marketsCreated > 0
        ? stats.totalVolumeSol / stats.marketsCreated
        : 0;
    }
  }

  // Recalculate totals
  state.totalFeesEarnedSol = state.markets.reduce((sum, m) => sum + m.feesEarnedSol, 0);

  return state;
}

export function markResolved(
  state: FactoryState,
  marketId: string,
  outcome: string,
  correct: boolean
): FactoryState {
  const market = state.markets.find(m => m.marketId === marketId);
  if (market) {
    market.status = 'resolved';
    market.resolvedOutcome = outcome;

    const cat = market.category;
    const stats = state.categoryStats[cat];
    if (stats) {
      stats.resolutions.pending = Math.max(0, stats.resolutions.pending - 1);
      if (correct) {
        stats.resolutions.correct++;
      } else {
        stats.resolutions.incorrect++;
      }
    }
  }
  return state;
}

export function isEventProcessed(state: FactoryState, eventId: string): boolean {
  return state.processedEventIds.includes(eventId);
}

export function updateLastScan(state: FactoryState, source: string): FactoryState {
  state.lastScans[source] = new Date().toISOString();
  return state;
}
