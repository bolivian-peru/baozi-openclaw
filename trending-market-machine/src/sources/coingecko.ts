/**
 * CoinGecko trending source adapter
 * Fetches trending coins, NFTs, and categories from CoinGecko's free API
 */

import type { TrendingTopic } from "../types/index.js";

interface CoinGeckoTrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    score: number;
    data?: {
      price: string;
      price_change_percentage_24h?: Record<string, number>;
      market_cap?: string;
      total_volume?: string;
    };
  };
}

interface CoinGeckoTrendingResponse {
  coins: CoinGeckoTrendingCoin[];
  nfts?: Array<{
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    data?: {
      floor_price?: string;
      h24_volume?: string;
    };
  }>;
  categories?: Array<{
    id: number;
    name: string;
    data?: {
      market_cap_change_percentage_24h?: Record<string, number>;
    };
  }>;
}

/**
 * Create a deterministic ID for dedup
 */
function makeId(coinId: string): string {
  return `coingecko:${coinId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Convert CoinGecko score (0 = top) to our score (100 = top)
 */
function convertScore(rank: number, totalItems: number): number {
  return Math.max(30, Math.min(95, 95 - Math.floor((rank / Math.max(totalItems, 1)) * 60)));
}

/**
 * Generate market-relevant description from coin data
 */
function generateDescription(coin: CoinGeckoTrendingCoin["item"]): string {
  const parts: string[] = [`${coin.name} (${coin.symbol.toUpperCase()}) is trending on CoinGecko`];

  if (coin.market_cap_rank) {
    parts.push(`ranked #${coin.market_cap_rank} by market cap`);
  }

  if (coin.data?.price_change_percentage_24h?.usd) {
    const change = coin.data.price_change_percentage_24h.usd;
    const direction = change >= 0 ? "up" : "down";
    parts.push(`${direction} ${Math.abs(change).toFixed(1)}% in 24h`);
  }

  return parts.join(", ") + ".";
}

/**
 * Extract keywords from coin data
 */
function extractKeywords(coin: CoinGeckoTrendingCoin["item"]): string[] {
  return [
    coin.name.toLowerCase(),
    coin.symbol.toLowerCase(),
    coin.id.toLowerCase(),
    "crypto",
    "trending",
    "coingecko",
    ...coin.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2),
  ];
}

/**
 * Fetch trending topics from CoinGecko
 */
export async function fetchCoinGeckoTrends(): Promise<TrendingTopic[]> {
  const topics: TrendingTopic[] = [];

  try {
    // CoinGecko trending endpoint (free, no API key needed, rate limited to ~30 req/min)
    const resp = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      headers: {
        "Accept": "application/json",
        "User-Agent": "TrendingMarketMachine/1.0",
      },
    });

    if (!resp.ok) {
      console.error(`[coingecko] API failed: ${resp.status} ${resp.statusText}`);
      return topics;
    }

    const data: CoinGeckoTrendingResponse = await resp.json();
    const totalCoins = data.coins?.length || 1;

    // Process trending coins
    for (let i = 0; i < (data.coins || []).length; i++) {
      const coin = data.coins[i].item;

      topics.push({
        id: makeId(coin.id),
        title: `${coin.name} (${coin.symbol.toUpperCase()}) trending`,
        description: generateDescription(coin),
        source: "coingecko",
        category: "crypto",
        trendScore: convertScore(i, totalCoins),
        detectedAt: new Date(),
        url: `https://www.coingecko.com/en/coins/${coin.id}`,
        keywords: extractKeywords(coin),
      });
    }

    // Process trending categories (these make great broad markets)
    for (const cat of data.categories || []) {
      const change = cat.data?.market_cap_change_percentage_24h?.usd;
      if (change === undefined) continue;

      const direction = change >= 0 ? "growing" : "declining";
      topics.push({
        id: makeId(`cat-${cat.id}`),
        title: `${cat.name} sector ${direction}`,
        description: `The ${cat.name} crypto sector is ${direction}, with market cap ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% in 24h.`,
        source: "coingecko",
        category: "crypto",
        trendScore: Math.min(80, 40 + Math.floor(Math.abs(change))),
        detectedAt: new Date(),
        keywords: [cat.name.toLowerCase(), "crypto", "sector", "trending", direction],
      });
    }

    console.log(`[coingecko] Fetched ${topics.length} trending topics`);
  } catch (err) {
    console.error(`[coingecko] Error fetching trends:`, err);
  }

  return topics;
}
