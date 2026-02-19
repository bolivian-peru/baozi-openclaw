/**
 * Google Trends source adapter
 * Fetches real-time trending searches from Google Trends
 */

import type { TrendingTopic, MarketCategory } from "../types/index.js";

interface GoogleTrendItem {
  title: { query: string };
  formattedTraffic: string;
  relatedQueries: Array<{ query: string }>;
  image?: { newsUrl: string };
  articles?: Array<{ title: string; snippet: string; url: string }>;
}

interface GoogleRealTimeTrend {
  title: string;
  entityNames: string[];
  articles: Array<{ articleTitle: string; url: string; snippet: string }>;
}

/**
 * Categorize a Google Trends topic based on keywords
 */
function categorize(query: string, articles: string[]): MarketCategory {
  const text = `${query} ${articles.join(" ")}`.toLowerCase();

  if (/bitcoin|ethereum|crypto|solana|token|defi|nft|web3|blockchain/.test(text)) return "crypto";
  if (/nfl|nba|mlb|nhl|soccer|football|baseball|basketball|tennis|ufc|fight|game|match|championship|playoff|super bowl|world cup|olympics/.test(text)) return "sports";
  if (/apple|google|microsoft|ai|openai|nvidia|chip|launch|release|product|software|tech|startup/.test(text)) return "technology";
  if (/movie|film|oscars|grammy|emmy|album|netflix|disney|concert|award|billboard|spotify|music|tv show|series/.test(text)) return "entertainment";
  if (/fed|rate|inflation|gdp|jobs|unemployment|stock|market|dow|s&p|nasdaq|earnings|ipo/.test(text)) return "finance";
  if (/election|vote|president|congress|senate|bill|law|policy|governor|mayor/.test(text)) return "politics";
  if (/nasa|space|climate|study|research|discovery|experiment|science/.test(text)) return "science";

  return "other";
}

/**
 * Parse traffic string like "200K+" into a numeric score
 */
function parseTrafficScore(traffic: string): number {
  if (!traffic) return 30;
  const cleaned = traffic.replace(/[+,]/g, "");
  const match = cleaned.match(/(\d+)(K|M)?/i);
  if (!match) return 30;

  const num = parseInt(match[1], 10);
  const unit = (match[2] || "").toUpperCase();

  if (unit === "M") return Math.min(100, 80 + num);
  if (unit === "K") return Math.min(95, 30 + Math.floor(num / 10));
  return Math.min(50, 20 + num);
}

/**
 * Create a deterministic ID for dedup
 */
function makeId(query: string): string {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `google-trends:${normalized}`;
}

/**
 * Extract keywords from query and articles for fuzzy matching
 */
function extractKeywords(query: string, articles: string[]): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at",
    "by", "from", "as", "into", "about", "after", "before", "during", "and", "or",
    "but", "not", "no", "if", "then", "than", "when", "where", "how", "what", "which",
    "who", "whom", "this", "that", "these", "those", "it", "its"]);

  const text = `${query} ${articles.join(" ")}`;
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )].slice(0, 20);
}

/**
 * Fetch trending topics from Google Trends using the daily trends API
 */
export async function fetchGoogleTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    // Use the public Google Trends daily trends API (no auth needed)
    const geo = "US";
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrendingMarketMachine/1.0)",
        "Accept": "application/xml, text/xml, application/rss+xml",
      },
    });

    if (!resp.ok) {
      console.error(`[google-trends] RSS fetch failed: ${resp.status}`);
      // Fallback to the JSON API
      return await fetchGoogleTrendsJson();
    }

    const xml = await resp.text();
    // Parse RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const title = titleMatch?.[1] || titleMatch?.[2] || "";
      if (!title) continue;

      const trafficMatch = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/);
      const traffic = trafficMatch?.[1] || "";

      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);
      const description = descMatch?.[1] || descMatch?.[2] || title;

      const newsItems: string[] = [];
      const newsRegex = /<ht:news_item_title><!\[CDATA\[(.*?)\]\]>|<ht:news_item_title>(.*?)<\/ht:news_item_title>/g;
      let newsMatch;
      while ((newsMatch = newsRegex.exec(item)) !== null) {
        newsItems.push(newsMatch[1] || newsMatch[2] || "");
      }

      const category = categorize(title, newsItems);
      const score = parseTrafficScore(traffic);

      topics.push({
        id: makeId(title),
        title,
        description: newsItems[0] || description || title,
        source: "google-trends",
        category,
        trendScore: score,
        detectedAt: new Date(),
        keywords: extractKeywords(title, newsItems),
      });
    }

    console.log(`[google-trends] Fetched ${topics.length} trending topics from RSS`);
  } catch (err) {
    console.error(`[google-trends] Error fetching trends:`, err);
    return await fetchGoogleTrendsJson();
  }

  return topics;
}

/**
 * Fallback: fetch from Google Trends JSON API
 */
async function fetchGoogleTrendsJson(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    // Google Trends daily trends JSON endpoint
    const url = "https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=-480&geo=US&ns=15";
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TrendingMarketMachine/1.0)",
      },
    });

    if (!resp.ok) {
      console.error(`[google-trends] JSON API failed: ${resp.status}`);
      return topics;
    }

    // Google prefixes response with ")]}'"
    let text = await resp.text();
    if (text.startsWith(")]}'")) {
      text = text.slice(4).trim();
    }

    const data = JSON.parse(text);
    const days = data?.default?.trendingSearchesDays || [];

    for (const day of days) {
      for (const search of day.trendingSearches || []) {
        const title = search.title?.query;
        if (!title) continue;

        const articles = (search.articles || []).map((a: any) => a.title || "");
        const traffic = search.formattedTraffic || "";

        topics.push({
          id: makeId(title),
          title,
          description: articles[0] || title,
          source: "google-trends",
          category: categorize(title, articles),
          trendScore: parseTrafficScore(traffic),
          detectedAt: new Date(),
          keywords: extractKeywords(title, articles),
        });
      }
    }

    console.log(`[google-trends] Fetched ${topics.length} trending topics from JSON API`);
  } catch (err) {
    console.error(`[google-trends] JSON fallback error:`, err);
  }

  return topics;
}
