/**
 * Hacker News source adapter
 * Fetches top stories from HN as a tech/AI trend source
 */

import type { TrendingTopic, MarketCategory } from "../types/index.js";

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
  descendants?: number;
  by: string;
  type: string;
}

/**
 * Categorize HN stories
 */
function categorize(title: string): MarketCategory {
  const t = title.toLowerCase();
  if (/crypto|bitcoin|ethereum|solana|blockchain|web3|defi|nft/.test(t)) return "crypto";
  if (/ai|llm|gpt|openai|anthropic|google.*ai|model|neural|ml|machine learning|deep learning|transformer/.test(t)) return "technology";
  if (/apple|microsoft|google|amazon|meta|nvidia|tesla|startup|launch|yc|funding|ipo/.test(t)) return "technology";
  if (/fed|inflation|rate|recession|gdp|market|stock|s&p|economy/.test(t)) return "finance";
  if (/election|vote|law|regulation|congress|senate|supreme court|ban/.test(t)) return "politics";
  if (/nasa|space|climate|physics|biology|research|study|nature|science/.test(t)) return "science";
  return "technology"; // Default for HN
}

/**
 * Create a deterministic ID
 */
function makeId(hnId: number): string {
  return `hackernews:${hnId}`;
}

/**
 * Convert HN score to trend score (top stories typically 100-2000+ points)
 */
function convertScore(score: number): number {
  if (score >= 1000) return 95;
  if (score >= 500) return 85;
  if (score >= 200) return 70;
  if (score >= 100) return 55;
  if (score >= 50) return 40;
  return 30;
}

/**
 * Extract keywords from title
 */
function extractKeywords(title: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "and", "or",
    "but", "not", "no", "if", "then", "than", "when", "how", "what", "which",
    "who", "this", "that", "it", "its", "show", "ask", "new", "now"]);

  return [...new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )].slice(0, 15);
}

/**
 * Filter stories that are market-worthy (announcements, launches, events, milestones)
 */
function isMarketWorthy(title: string): boolean {
  const t = title.toLowerCase();

  // Strong signals for market-worthy topics
  const positivePatterns = [
    /\b(launch|announce|release|ship|introduce|unveil|reveal)\b/,
    /\b(raises?|funding|ipo|acquisition|acquires?|merger)\b/,
    /\b(ban|regulate|approve|reject|rule|lawsuit|sue)\b/,
    /\b(record|milestone|surpass|reach|exceed|hit)\b/,
    /\b(ai|gpt|llm|model|chip|gpu)\b/,
    /\b(bitcoin|ethereum|solana|crypto)\b/,
    /\b(election|vote|bill|law)\b/,
    /\b(breakthrough|discover|first|new)\b/,
  ];

  // Negative signals (not market-worthy)
  const negativePatterns = [
    /^show hn:/i,
    /^ask hn:/i,
    /\b(tutorial|guide|how to|tips|tricks|blog)\b/,
    /\b(opinion|rant|vent|frustrat)\b/,
  ];

  if (negativePatterns.some(p => p.test(t))) return false;
  return positivePatterns.some(p => p.test(t));
}

/**
 * Fetch trending topics from Hacker News
 */
export async function fetchHackerNewsTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    // Fetch top story IDs
    const idsResp = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!idsResp.ok) {
      console.error(`[hackernews] Failed to fetch top stories: ${idsResp.status}`);
      return topics;
    }

    const ids: number[] = await idsResp.json();
    // Only look at top 30 stories
    const topIds = ids.slice(0, 30);

    // Fetch story details in parallel (batched)
    const stories = await Promise.all(
      topIds.map(async (id): Promise<HNItem | null> => {
        try {
          const resp = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!resp.ok) return null;
          return await resp.json();
        } catch {
          return null;
        }
      })
    );

    for (const story of stories) {
      if (!story || story.type !== "story" || !story.title) continue;

      // Filter for market-worthy stories
      if (!isMarketWorthy(story.title)) continue;

      topics.push({
        id: makeId(story.id),
        title: story.title,
        description: `Trending on Hacker News with ${story.score} points and ${story.descendants || 0} comments.`,
        source: "hackernews",
        category: categorize(story.title),
        trendScore: convertScore(story.score),
        detectedAt: new Date(story.time * 1000),
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        keywords: extractKeywords(story.title),
      });
    }

    console.log(`[hackernews] Fetched ${topics.length} market-worthy trending topics`);
  } catch (err) {
    console.error(`[hackernews] Error fetching trends:`, err);
  }

  return topics;
}
