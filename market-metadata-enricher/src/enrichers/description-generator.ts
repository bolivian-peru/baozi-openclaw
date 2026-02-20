/**
 * Description Generator
 * Generates human-readable descriptions and summaries for prediction markets
 */

import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { MarketCategory, TimingAnalysis } from '../types/index.js';
import { categorizeMarket } from './categorizer.js';
import { analyzeMarketTiming } from './timing-analyzer.js';

/**
 * Category-specific description templates
 */
const CATEGORY_CONTEXT: Record<MarketCategory, string> = {
  crypto: 'This cryptocurrency/blockchain prediction market',
  politics: 'This political prediction market',
  sports: 'This sports prediction market',
  entertainment: 'This entertainment prediction market',
  technology: 'This technology prediction market',
  finance: 'This financial prediction market',
  science: 'This science/health prediction market',
  'world-events': 'This world events prediction market',
  meme: 'This community/meme prediction market',
  weather: 'This weather prediction market',
  gaming: 'This gaming/esports prediction market',
  culture: 'This culture prediction market',
  other: 'This prediction market',
};

/**
 * Generate a pool status description
 */
function describePool(market: Market): string {
  const total = market.totalPoolSol;
  if (total === 0) return 'No bets placed yet.';
  if (total < 0.1) return `Minimal liquidity with ${total.toFixed(4)} SOL in the pool.`;
  if (total < 1) return `Light activity with ${total.toFixed(3)} SOL in the pool.`;
  if (total < 10) return `Moderate activity with ${total.toFixed(2)} SOL pooled.`;
  if (total < 100) return `Active market with ${total.toFixed(2)} SOL pooled.`;
  return `Highly active market with ${total.toFixed(2)} SOL pooled.`;
}

/**
 * Describe the current sentiment based on yes/no percentages
 */
function describeSentiment(market: Market): string {
  const yp = market.yesPercent;
  const np = market.noPercent;

  if (yp === 0 && np === 0) return 'No positions taken yet.';
  if (yp > 80) return `Strong Yes sentiment at ${yp.toFixed(0)}%.`;
  if (yp > 60) return `Leaning Yes at ${yp.toFixed(0)}%.`;
  if (np > 80) return `Strong No sentiment at ${np.toFixed(0)}%.`;
  if (np > 60) return `Leaning No at ${np.toFixed(0)}%.`;
  return `Split opinion — Yes ${yp.toFixed(0)}% / No ${np.toFixed(0)}%.`;
}

/**
 * Generate timing context for the description
 */
function describeTimingContext(timing: TimingAnalysis): string {
  if (timing.hoursUntilClose <= 0) return 'Betting is now closed.';
  if (timing.isClosingSoon) return `Closing soon — only ${Math.round(timing.hoursUntilClose)} hours left to bet.`;
  if (timing.isShortTerm) return 'Short-term market — closing within days.';
  if (timing.isLongTerm) return 'Long-term market with extended betting window.';
  return `Market open with ${Math.round(timing.hoursUntilClose)} hours until close.`;
}

/**
 * Generate a full description for a market
 */
export function generateDescription(market: Market): string {
  const categories = categorizeMarket(market);
  const primaryCategory = categories[0];
  const timing = analyzeMarketTiming(market);

  const intro = CATEGORY_CONTEXT[primaryCategory];
  const question = market.question.endsWith('?') ? market.question : `${market.question}?`;

  const parts: string[] = [
    `${intro} asks: "${question}"`,
    '',
    describePool(market),
    describeSentiment(market),
    describeTimingContext(timing),
  ];

  // Add category tags
  if (categories.length > 1) {
    parts.push('');
    parts.push(`Tags: ${categories.map(c => `#${c}`).join(' ')}`);
  }

  return parts.join('\n').trim();
}

/**
 * Generate a one-line summary suitable for AgentBook posts
 */
export function generateOneLiner(market: Market): string {
  const timing = analyzeMarketTiming(market);
  const categories = categorizeMarket(market);

  const emoji = timing.isClosingSoon ? '⚡' : timing.isLongTerm ? '📅' : '🔮';
  const tags = categories.map(c => `#${c}`).join(' ');

  return `${emoji} "${market.question}" — ${describeSentiment(market)} ${describePool(market)} ${tags}`;
}

/**
 * Generate a concise AgentBook enrichment post
 */
export function generateAgentBookContent(
  market: Market,
  categories: MarketCategory[],
  timing: TimingAnalysis,
  qualityScore: number,
): string {
  const lines: string[] = [];

  lines.push(`📊 Market Enrichment: "${market.question}"`);
  lines.push('');

  // Categories
  lines.push(`🏷️ Categories: ${categories.map(c => `#${c}`).join(' ')}`);

  // Pool status
  lines.push(`💰 Pool: ${market.totalPoolSol.toFixed(4)} SOL (Yes ${market.yesPercent.toFixed(0)}% / No ${market.noPercent.toFixed(0)}%)`);

  // Timing
  lines.push(`⏰ ${timing.timingSummary}`);

  // Quality
  const qualityEmoji = qualityScore >= 80 ? '🟢' : qualityScore >= 50 ? '🟡' : '🔴';
  lines.push(`${qualityEmoji} Quality Score: ${qualityScore}/100`);

  // Layer
  lines.push(`📋 Layer: ${market.layer}`);

  return lines.join('\n');
}
