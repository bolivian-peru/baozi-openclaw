/**
 * Quality Scorer
 * Evaluates market quality based on question clarity, timing, liquidity, and more
 */

import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { QualityScore, MarketCategory } from '../types/index.js';
import { categorizeMarket } from './categorizer.js';
import { analyzeMarketTiming, getTimingScore } from './timing-analyzer.js';
import { QUALITY_RED_FLAGS, GOOD_QUESTION_PATTERNS } from '../utils/keywords.js';

/**
 * Score question clarity (0-100)
 */
export function scoreQuestionClarity(question: string): number {
  let score = 40; // Base

  // Length checks
  if (question.length < 10) score -= 20; // Too short
  else if (question.length < 20) score -= 10;
  else if (question.length >= 20 && question.length <= 200) score += 15; // Good length
  else if (question.length > 300) score -= 10; // Too long

  // Ends with question mark
  if (question.endsWith('?')) score += 10;

  // Matches good question patterns
  for (const pattern of GOOD_QUESTION_PATTERNS) {
    if (pattern.test(question)) {
      score += 5;
      break; // Only count once
    }
  }

  // Contains specific details (numbers, dates, names)
  if (/\d/.test(question)) score += 5; // Contains numbers
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december|20\d{2})\b/i.test(question)) {
    score += 10; // Contains date reference
  }

  // Red flags
  for (const flag of QUALITY_RED_FLAGS) {
    if (question.toLowerCase().includes(flag)) {
      score -= 15;
    }
  }

  // Capitalization (ALL CAPS is bad)
  if (question === question.toUpperCase() && question.length > 5) score -= 10;

  // Has proper capitalization
  if (/^[A-Z]/.test(question)) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Score liquidity quality (0-100)
 */
export function scoreLiquidity(market: Market): number {
  const totalPool = market.totalPoolSol;

  if (totalPool === 0) return 10; // No liquidity at all
  if (totalPool < 0.01) return 20;
  if (totalPool < 0.1) return 35;
  if (totalPool < 0.5) return 50;
  if (totalPool < 1) return 60;
  if (totalPool < 5) return 70;
  if (totalPool < 20) return 80;
  if (totalPool < 100) return 90;
  return 100; // Great liquidity
}

/**
 * Score category relevance (0-100)
 * Markets that clearly fit a category score higher
 */
export function scoreCategoryRelevance(market: Market): number {
  const categories = categorizeMarket(market);

  if (categories[0] === 'other') return 30; // No clear category
  if (categories.length === 1) return 70; // One clear category
  if (categories.length === 2) return 85; // Two relevant categories
  return 90; // Multiple relevant categories = rich topic
}

/**
 * Generate full quality score for a market
 */
export function scoreMarketQuality(market: Market): QualityScore {
  const questionClarity = scoreQuestionClarity(market.question);
  const timingScore = getTimingScore(market);
  const liquidityScore = scoreLiquidity(market);
  const categoryRelevance = scoreCategoryRelevance(market);

  // Weighted average
  const overall = Math.round(
    questionClarity * 0.35 +
    timingScore * 0.25 +
    liquidityScore * 0.20 +
    categoryRelevance * 0.20
  );

  // Identify issues
  const issues: string[] = [];
  if (questionClarity < 40) issues.push('Question is unclear or too short');
  if (questionClarity < 60 && !market.question.endsWith('?')) issues.push('Question does not end with "?"');
  if (timingScore < 40) issues.push('Market timing is problematic');
  if (liquidityScore < 30) issues.push('Very low or no liquidity');
  if (categoryRelevance < 40) issues.push('Market topic is unclear');

  const timing = analyzeMarketTiming(market);
  if (!timing.hasReasonableResolution) issues.push('Resolution window seems unusual');
  if (timing.hoursUntilClose <= 0) issues.push('Market is already closed for betting');

  // Generate suggestions
  const suggestions: string[] = [];
  if (!market.question.endsWith('?')) suggestions.push('Add a question mark to improve clarity');
  if (market.question.length < 20) suggestions.push('Add more detail to the question');
  if (market.question === market.question.toUpperCase()) suggestions.push('Use proper capitalization');
  if (liquidityScore < 50) suggestions.push('Market would benefit from more liquidity');
  if (categorizeMarket(market)[0] === 'other') suggestions.push('Consider adding category-specific keywords');

  // Quality summary
  let qualitySummary: string;
  if (overall >= 80) qualitySummary = 'High-quality market with clear question and good parameters.';
  else if (overall >= 60) qualitySummary = 'Good market with minor improvements possible.';
  else if (overall >= 40) qualitySummary = 'Average market — could benefit from better framing or more liquidity.';
  else qualitySummary = 'Low-quality market — significant improvements needed.';

  return {
    overall,
    questionClarity,
    timingScore,
    liquidityScore,
    categoryRelevance,
    qualitySummary,
    issues,
    suggestions,
  };
}
