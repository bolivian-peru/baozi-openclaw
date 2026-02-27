import type { Analyst, DiscoveryItem, IntelPost } from "../types.ts";

export interface DiscoveryOptions {
  buyer: string;
  interests: string[];
  maxPrice?: number;
}

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(a.map((item) => item.toLowerCase()));
  return b.filter((item) => set.has(item.toLowerCase()));
}

export function rankDiscovery(
  posts: IntelPost[],
  analysts: Analyst[],
  options: DiscoveryOptions,
): DiscoveryItem[] {
  const analystByHandle = new Map(analysts.map((item) => [item.handle.toLowerCase(), item]));
  const interests = options.interests.map((item) => item.toLowerCase()).filter(Boolean);

  const items: DiscoveryItem[] = [];

  for (const post of posts) {
    if (post.status !== "listed") {
      continue;
    }

    if (typeof options.maxPrice === "number" && post.priceUsd > options.maxPrice) {
      continue;
    }

    const analyst = analystByHandle.get(post.analystHandle.toLowerCase());
    if (!analyst) {
      continue;
    }

    const overlapTags = overlap(interests, post.tags);
    const matchScore = interests.length > 0 ? overlapTags.length / interests.length : 0.4;
    const confidenceScore = Math.min(Math.max(post.confidence, 0), 1);
    const reputationScore = Math.min(Math.max(analyst.stats.reputation / 100, 0), 1);
    const affordability = Math.max(0, 1 - post.priceUsd / 50);

    const score = Math.round((matchScore * 0.45 + confidenceScore * 0.25 + reputationScore * 0.2 + affordability * 0.1) * 100);

    items.push({ post, analyst, score, overlapTags });
  }

  items.sort((a, b) => b.score - a.score || b.post.listedAt.localeCompare(a.post.listedAt));
  return items;
}
