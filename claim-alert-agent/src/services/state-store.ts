/**
 * State store — tracks previous poll data to detect changes
 *
 * Stores in a JSON file so state persists across restarts.
 * Tracks: previous odds (for shift detection), sent alerts (for dedup),
 * and known resolved markets (to avoid re-alerting).
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export interface MarketOddsSnapshot {
  marketId: string;
  /** Probability per outcome index */
  probabilities: Record<number, number>;
  timestamp: string;
}

export interface SentAlert {
  /** Unique key for dedup: `${type}:${marketId}:${wallet}` */
  key: string;
  timestamp: string;
}

export interface StateData {
  /** Previous odds snapshots by market ID */
  oddsSnapshots: Record<string, MarketOddsSnapshot>;
  /** Set of sent alert keys for dedup */
  sentAlerts: Record<string, SentAlert>;
  /** Known market IDs (for new market detection) */
  knownMarketIds: string[];
  /** Last poll timestamp */
  lastPollTime?: string;
}

const EMPTY_STATE: StateData = {
  oddsSnapshots: {},
  sentAlerts: {},
  knownMarketIds: [],
};

export class StateStore {
  private filePath: string;
  private data: StateData;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = this.emptyState();
  }

  private emptyState(): StateData {
    return {
      oddsSnapshots: {},
      sentAlerts: {},
      knownMarketIds: [],
    };
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {
      this.data = this.emptyState();
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  /** Get previous odds for a market */
  getOddsSnapshot(marketId: string): MarketOddsSnapshot | undefined {
    return this.data.oddsSnapshots[marketId];
  }

  /** Update odds snapshot for a market */
  setOddsSnapshot(snapshot: MarketOddsSnapshot): void {
    this.data.oddsSnapshots[snapshot.marketId] = snapshot;
  }

  /** Check if an alert was already sent */
  wasAlertSent(key: string): boolean {
    return key in this.data.sentAlerts;
  }

  /** Mark an alert as sent */
  markAlertSent(key: string): void {
    this.data.sentAlerts[key] = {
      key,
      timestamp: new Date().toISOString(),
    };
  }

  /** Get known market IDs */
  getKnownMarketIds(): string[] {
    return this.data.knownMarketIds;
  }

  /** Set known market IDs */
  setKnownMarketIds(ids: string[]): void {
    this.data.knownMarketIds = ids;
  }

  /** Update last poll time */
  setLastPollTime(time: string): void {
    this.data.lastPollTime = time;
  }

  /** Get last poll time */
  getLastPollTime(): string | undefined {
    return this.data.lastPollTime;
  }

  /** Prune old sent alerts (older than 7 days) */
  pruneOldAlerts(maxAgeDays: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    const cutoffStr = cutoff.toISOString();

    let pruned = 0;
    for (const [key, alert] of Object.entries(this.data.sentAlerts)) {
      if (alert.timestamp < cutoffStr) {
        delete this.data.sentAlerts[key];
        pruned++;
      }
    }
    return pruned;
  }

  /** Get raw state data (for testing) */
  getData(): StateData {
    return this.data;
  }

  /** Set raw state data (for testing) */
  setData(data: StateData): void {
    this.data = data;
  }
}
