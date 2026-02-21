/**
 * Market Monitor
 *
 * Polls Baozi MCP for active markets, pool states, and implied odds.
 * Notifies listeners when odds shift significantly (e.g. an agent just bet).
 */

import { McpClient, RawMarket } from './mcp-client';
import { MarketInfo, MarketStatus, MarketLayer } from './types';
import { config } from './config';

export type OddsShiftListener = (
  market: MarketInfo,
  prevYesOdds: number,
  newYesOdds: number,
) => void;

// Threshold for triggering an odds-shift event (2 percentage points)
const ODDS_SHIFT_THRESHOLD = 0.02;

export class MarketMonitor {
  private client: McpClient;
  private markets: Map<string, MarketInfo> = new Map();
  private listeners: OddsShiftListener[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(client: McpClient) {
    this.client = client;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  onOddsShift(fn: OddsShiftListener): void {
    this.listeners.push(fn);
  }

  getMarkets(): MarketInfo[] {
    return Array.from(this.markets.values());
  }

  getMarket(pda: string): MarketInfo | undefined {
    return this.markets.get(pda);
  }

  start(): void {
    // Immediate first fetch
    this.refresh().catch(() => {/* silently continue on first-run errors */});
    this.timer = setInterval(() => {
      this.refresh().catch(() => {/* errors are non-fatal — keep polling */});
    }, config.marketRefreshMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  async refresh(): Promise<void> {
    for (const layer of config.layers) {
      for (const status of config.statuses) {
        const rawList = await this.client.listMarkets(layer, status);
        for (const raw of rawList) {
          await this.upsertMarket(raw);
        }
      }
    }
  }

  private async upsertMarket(raw: RawMarket): Promise<void> {
    const pda = raw.pda;
    if (!pda) return;

    const parsed = this.parseMarket(raw);
    if (!parsed) return;

    const existing = this.markets.get(pda);
    if (existing) {
      const prevOdds = existing.yesOdds;
      const newOdds = parsed.yesOdds;
      if (Math.abs(newOdds - prevOdds) >= ODDS_SHIFT_THRESHOLD) {
        this.listeners.forEach((fn) => fn(parsed, prevOdds, newOdds));
      }
    }

    this.markets.set(pda, parsed);
  }

  private parseMarket(raw: RawMarket): MarketInfo | null {
    const yesPool = this.toSol(raw.yes_pool) ?? 0;
    const noPool = this.toSol(raw.no_pool) ?? 0;
    const totalPool = this.toSol(raw.total_pool) ?? yesPool + noPool;

    const yesOdds = totalPool > 0 ? yesPool / totalPool : 0.5;
    const noOdds = totalPool > 0 ? noPool / totalPool : 0.5;

    // Quote = 1 / odds — payout per 1 SOL if this outcome wins (ignoring fees)
    const yesQuote = yesOdds > 0 ? 1 / yesOdds : 2;
    const noQuote = noOdds > 0 ? 1 / noOdds : 2;

    const closingTime = raw.closing_time ? new Date(raw.closing_time) : new Date(Date.now() + 86_400_000);

    return {
      pda: raw.pda,
      question: String(raw.question ?? 'Unknown market'),
      status: this.parseStatus(String(raw.status ?? 'active')),
      layer: this.parseLayer(String(raw.layer ?? 'lab')),
      totalPool,
      yesPool,
      noPool,
      yesOdds,
      noOdds,
      closingTime,
      yesQuote,
      noQuote,
      resolvedOutcome:
        raw.resolved_outcome === 'YES' || raw.resolved_outcome === 'NO'
          ? raw.resolved_outcome
          : undefined,
    };
  }

  private parseStatus(s: string): MarketStatus {
    if (s === 'closed') return 'closed';
    if (s === 'resolved') return 'resolved';
    if (s === 'disputed') return 'disputed';
    return 'active';
  }

  private parseLayer(s: string): MarketLayer {
    if (s === 'official') return 'official';
    if (s === 'private') return 'private';
    return 'lab';
  }

  /**
   * Convert a raw pool value to SOL.
   * The MCP server may return lamports (integers > 1000) or SOL (floats < 1000).
   */
  private toSol(v: unknown): number | null {
    if (v == null) return null;
    const n = Number(v);
    if (isNaN(n)) return null;
    // Heuristic: if value > 1000 it is likely lamports
    return n > 1000 ? n / 1_000_000_000 : n;
  }
}
