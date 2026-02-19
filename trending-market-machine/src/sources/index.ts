/**
 * Source aggregator — fetches trends from all configured sources
 */

import type { TrendingTopic, TrendSource } from "../types/index.js";
import { fetchGoogleTrends } from "./google-trends.js";
import { fetchCoinGeckoTrends } from "./coingecko.js";
import { fetchHackerNewsTrends } from "./hackernews.js";

const SOURCE_FETCHERS: Record<TrendSource, () => Promise<TrendingTopic[]>> = {
  "google-trends": fetchGoogleTrends,
  "coingecko": fetchCoinGeckoTrends,
  "hackernews": fetchHackerNewsTrends,
  "espn": async () => {
    console.log("[espn] Sports source not yet implemented — skipping");
    return [];
  },
  "techcrunch": async () => {
    console.log("[techcrunch] TechCrunch source not yet implemented — skipping");
    return [];
  },
};

/**
 * Fetch trending topics from all configured sources
 */
export async function fetchAllTrends(sources: TrendSource[]): Promise<TrendingTopic[]> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const fetcher = SOURCE_FETCHERS[source];
      if (!fetcher) {
        console.warn(`[sources] Unknown source: ${source}`);
        return [];
      }
      return fetcher();
    })
  );

  const allTopics: TrendingTopic[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      allTopics.push(...result.value);
    } else {
      console.error(`[sources] ${sources[i]} failed:`, result.reason);
    }
  }

  // Sort by trend score (highest first)
  allTopics.sort((a, b) => b.trendScore - a.trendScore);

  console.log(`[sources] Total trending topics: ${allTopics.length} from ${sources.length} sources`);
  return allTopics;
}

export { fetchGoogleTrends } from "./google-trends.js";
export { fetchCoinGeckoTrends } from "./coingecko.js";
export { fetchHackerNewsTrends } from "./hackernews.js";
