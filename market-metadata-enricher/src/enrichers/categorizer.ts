/**
 * Market Categorizer
 * Classifies markets into categories based on question content
 */

import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { MarketCategory } from '../types/index.js';
import { CATEGORY_KEYWORDS } from '../utils/keywords.js';

/**
 * Score a market question against a category's keyword list
 */
function scoreCategory(question: string, keywords: string[]): number {
  const lowerQuestion = question.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lowerQuestion.includes(keyword.toLowerCase())) {
      // Longer keywords are more specific, give higher weight
      score += keyword.length > 5 ? 2 : 1;
    }
  }
  return score;
}

/**
 * Categorize a market based on its question
 * Returns up to 3 most relevant categories
 */
export function categorizeMarket(market: Market): MarketCategory[] {
  const scores: [MarketCategory, number][] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'other') continue;
    const score = scoreCategory(market.question, keywords);
    if (score > 0) {
      scores.push([category as MarketCategory, score]);
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b[1] - a[1]);

  // Take top 3 categories, or 'other' if none match
  const topCategories = scores.slice(0, 3).map(([cat]) => cat);
  return topCategories.length > 0 ? topCategories : ['other'];
}

/**
 * Get primary category for a market
 */
export function getPrimaryCategory(market: Market): MarketCategory {
  return categorizeMarket(market)[0];
}

/**
 * Check if a market matches a specific category
 */
export function isInCategory(market: Market, category: MarketCategory): boolean {
  return categorizeMarket(market).includes(category);
}
