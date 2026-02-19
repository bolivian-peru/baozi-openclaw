/**
 * Source Aggregator
 * 
 * Combines all event sources into a single scan pipeline
 * with deduplication and quality filtering.
 */

export { scanCryptoMilestones } from './crypto-source.js';
export { scanRSSFeeds } from './rss-source.js';
export { scanSportsEvents } from './sports-source.js';

import { scanCryptoMilestones } from './crypto-source.js';
import { scanRSSFeeds } from './rss-source.js';
import { scanSportsEvents } from './sports-source.js';
import type { DetectedEvent } from '../types.js';

/**
 * Scan all sources and return aggregated, deduplicated events
 */
export async function scanAllSources(): Promise<DetectedEvent[]> {
  const results = await Promise.allSettled([
    scanCryptoMilestones(),
    scanRSSFeeds(),
    scanSportsEvents(),
  ]);

  const allEvents: DetectedEvent[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    } else {
      console.error('[SourceAggregator] Source failed:', result.reason);
    }
  }

  // Sort by confidence (highest first)
  allEvents.sort((a, b) => b.confidence - a.confidence);

  console.log(`[SourceAggregator] Total events across all sources: ${allEvents.length}`);
  return allEvents;
}
