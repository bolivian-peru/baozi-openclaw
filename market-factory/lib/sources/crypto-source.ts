/**
 * Crypto Price Milestone Source
 * 
 * Monitors cryptocurrency prices for round-number milestones
 * and generates prediction market questions.
 * 
 * Uses CoinGecko free API (no key required for basic endpoints).
 */

import type { DetectedEvent } from '../types.js';

// =============================================================================
// Configuration
// =============================================================================

/** Tokens to monitor with their milestone thresholds */
const MONITORED_TOKENS: TokenConfig[] = [
  { id: 'solana', symbol: 'SOL', milestones: [100, 150, 200, 250, 300, 400, 500] },
  { id: 'bitcoin', symbol: 'BTC', milestones: [75000, 100000, 125000, 150000, 200000] },
  { id: 'ethereum', symbol: 'ETH', milestones: [3000, 3500, 4000, 4500, 5000, 6000] },
  { id: 'dogecoin', symbol: 'DOGE', milestones: [0.25, 0.5, 0.75, 1.0] },
  { id: 'sui', symbol: 'SUI', milestones: [3, 5, 7, 10] },
];

/** Percentage thresholds for "approaching milestone" detection */
const APPROACH_THRESHOLD = 0.10; // Within 10% of milestone
const CLOSE_THRESHOLD = 0.05;   // Within 5% of milestone

interface TokenConfig {
  id: string;
  symbol: string;
  milestones: number[];
}

interface TokenPrice {
  id: string;
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

// =============================================================================
// Price Fetching
// =============================================================================

async function fetchPrices(): Promise<TokenPrice[]> {
  const ids = MONITORED_TOKENS.map(t => t.id).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) {
      console.error(`CoinGecko API error: ${resp.status} ${resp.statusText}`);
      return [];
    }
    const data = await resp.json() as Record<string, { usd: number; usd_24h_change: number }>;

    return MONITORED_TOKENS.map(token => {
      const priceData = data[token.id];
      if (!priceData) return null;
      return {
        id: token.id,
        symbol: token.symbol,
        currentPrice: priceData.usd,
        priceChange24h: priceData.usd * (priceData.usd_24h_change / 100),
        priceChangePercent24h: priceData.usd_24h_change,
      };
    }).filter((p): p is TokenPrice => p !== null);
  } catch (err) {
    console.error('Failed to fetch crypto prices:', err);
    return [];
  }
}

// =============================================================================
// Milestone Detection
// =============================================================================

function detectMilestones(prices: TokenPrice[]): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  for (const price of prices) {
    const config = MONITORED_TOKENS.find(t => t.id === price.id);
    if (!config) continue;

    for (const milestone of config.milestones) {
      const distanceRatio = Math.abs(price.currentPrice - milestone) / milestone;
      const isApproaching = price.currentPrice < milestone && distanceRatio < APPROACH_THRESHOLD;
      const isClose = price.currentPrice < milestone && distanceRatio < CLOSE_THRESHOLD;
      const isAbove = price.currentPrice >= milestone;

      // Create market for milestones we're approaching from below
      if (isApproaching || isClose) {
        const direction = price.priceChangePercent24h > 0 ? 'rising' : 'falling';
        const confidence = isClose ? 0.9 : 0.7;

        // Snapshot-style: "Will X be above Y at time Z?"
        const snapshotTime = getNextSnapshotTime();
        const snapshotLabel = formatSnapshotLabel(snapshotTime);

        events.push({
          eventId: `crypto:${price.id}:above:${milestone}:${snapshotLabel}`,
          title: `${config.symbol} approaching $${milestone} (currently $${price.currentPrice.toFixed(2)}, ${direction})`,
          source: 'coingecko',
          category: 'crypto',
          eventTime: snapshotTime,
          suggestedQuestion: `Will ${config.symbol} be above $${formatPrice(milestone)} at ${snapshotLabel} UTC?`,
          marketType: 'boolean',
          confidence,
          resolutionSource: `CoinGecko ${config.symbol}/USD price at ${snapshotLabel} UTC`,
          metadata: {
            token: config.symbol,
            milestone,
            currentPrice: price.currentPrice,
            distancePercent: (distanceRatio * 100).toFixed(1),
          },
        });
      }

      // If just crossed above, create "Will it stay above?" market
      if (isAbove && distanceRatio < CLOSE_THRESHOLD) {
        const snapshotTime = getNextSnapshotTime(48); // 48h out
        const snapshotLabel = formatSnapshotLabel(snapshotTime);

        events.push({
          eventId: `crypto:${price.id}:stay-above:${milestone}:${snapshotLabel}`,
          title: `${config.symbol} just crossed $${milestone} — will it hold?`,
          source: 'coingecko',
          category: 'crypto',
          eventTime: snapshotTime,
          suggestedQuestion: `Will ${config.symbol} stay above $${formatPrice(milestone)} until ${snapshotLabel} UTC?`,
          marketType: 'boolean',
          confidence: 0.8,
          resolutionSource: `CoinGecko ${config.symbol}/USD price at ${snapshotLabel} UTC`,
          metadata: {
            token: config.symbol,
            milestone,
            currentPrice: price.currentPrice,
          },
        });
      }
    }

    // 24h price movement markets (daily)
    if (Math.abs(price.priceChangePercent24h) > 5) {
      const direction = price.priceChangePercent24h > 0 ? 'up' : 'down';
      const snapshotTime = getNextSnapshotTime(24);
      const snapshotLabel = formatSnapshotLabel(snapshotTime);
      const targetPrice = direction === 'up'
        ? Math.ceil(price.currentPrice * 1.05)
        : Math.floor(price.currentPrice * 0.95);

      events.push({
        eventId: `crypto:${price.id}:momentum:${direction}:${snapshotLabel}`,
        title: `${config.symbol} ${direction} ${Math.abs(price.priceChangePercent24h).toFixed(1)}% in 24h`,
        source: 'coingecko',
        category: 'crypto',
        eventTime: snapshotTime,
        suggestedQuestion: `Will ${config.symbol} be above $${formatPrice(targetPrice)} at ${snapshotLabel} UTC?`,
        marketType: 'boolean',
        confidence: 0.6,
        resolutionSource: `CoinGecko ${config.symbol}/USD price at ${snapshotLabel} UTC`,
        metadata: {
          token: config.symbol,
          currentPrice: price.currentPrice,
          change24h: price.priceChangePercent24h,
          targetPrice,
        },
      });
    }
  }

  return events;
}

// =============================================================================
// Helpers
// =============================================================================

/** Get next round snapshot time (midnight UTC or noon UTC) */
function getNextSnapshotTime(hoursOut: number = 24): Date {
  const now = new Date();
  const target = new Date(now.getTime() + hoursOut * 60 * 60 * 1000);
  // Round to next midnight UTC
  target.setUTCHours(0, 0, 0, 0);
  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  // Ensure at least MIN_FUTURE_HOURS ahead
  while (target.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target;
}

function formatSnapshotLabel(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} 00:00`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toString();
}

// =============================================================================
// Public API
// =============================================================================

export async function scanCryptoMilestones(): Promise<DetectedEvent[]> {
  console.log('[CryptoSource] Fetching prices...');
  const prices = await fetchPrices();
  if (prices.length === 0) {
    console.log('[CryptoSource] No prices fetched');
    return [];
  }

  console.log('[CryptoSource] Prices:', prices.map(p => `${p.symbol}=$${p.currentPrice.toFixed(2)}`).join(', '));

  const events = detectMilestones(prices);
  console.log(`[CryptoSource] Detected ${events.length} potential markets`);
  return events;
}
