// Reddit trending source — /r/all/rising and curated subreddits
import { type TrendingTopic, type Category } from "../config.ts";

interface RedditPost {
  data: {
    id: string;
    title: string;
    subreddit: string;
    url: string;
    score: number;
    num_comments: number;
    created_utc: number;
    permalink: string;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
  };
}

// Subreddits mapped to categories
const SUBREDDITS: Array<{ sub: string; category: Category }> = [
  { sub: "CryptoCurrency", category: "crypto" },
  { sub: "technology", category: "technology" },
  { sub: "worldnews", category: "politics" },
  { sub: "artificial", category: "technology" },
];

function classifyBySubreddit(sub: string): Category {
  const lower = sub.toLowerCase();
  if (lower.match(/crypto|bitcoin|ethereum|defi|solana/)) return "crypto";
  if (lower.match(/sport|nfl|nba|soccer|football|basketball/)) return "sports";
  if (lower.match(/tech|programming|ai|ml|cs/)) return "technology";
  if (lower.match(/politic|news|world|election/)) return "politics";
  return "technology";
}

function isForwardLooking(title: string): boolean {
  const lower = title.toLowerCase();
  return !!lower.match(
    /\b(will|launch|announce|release|plan|upcoming|set to|expected|predict|forecast|could|might|should|may)\b/
  );
}

function hasGoodEngagement(post: RedditPost["data"]): boolean {
  return post.score > 500 || post.num_comments > 100;
}

export async function fetchRedditTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];
  const now = Date.now();

  for (const { sub, category } of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/rising.json?limit=10`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "TrendingMarketMachine/1.0 (prediction market creation agent)",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!resp.ok) {
        console.warn(`Reddit r/${sub}: HTTP ${resp.status}`);
        continue;
      }

      const data: RedditListing = await resp.json();
      const posts = data.data.children;

      for (const { data: post } of posts) {
        // Only take forward-looking or high-engagement posts
        if (!isForwardLooking(post.title) && !hasGoodEngagement(post)) continue;

        // Skip if too recent (< 1 hour old) — needs time to trend
        const ageHours = (now / 1000 - post.created_utc) / 3600;
        if (ageHours < 0.5) continue;

        const postCategory = category || classifyBySubreddit(post.subreddit);

        topics.push({
          id: `reddit-${post.id}`,
          title: post.title,
          source: "reddit",
          category: postCategory,
          url: `https://www.reddit.com${post.permalink}`,
          score: Math.min(100, Math.floor(post.score / 100 + post.num_comments / 10)),
          detectedAt: new Date(),
          metadata: {
            subreddit: post.subreddit,
            redditScore: post.score,
            comments: post.num_comments,
            ageHours,
          },
        });
      }
    } catch (err) {
      console.warn(`Reddit r/${sub} fetch failed:`, (err as Error).message);
    }
  }

  return topics;
}
