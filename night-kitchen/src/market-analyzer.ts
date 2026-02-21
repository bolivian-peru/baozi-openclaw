/**
 * 夜厨房 — Market Analysis Engine
 *
 * Fetches and analyzes Baozi prediction markets using the MCP server handlers.
 * Provides bilingual market analysis with odds breakdown and trend insights.
 */

import { listMarkets, getMarket } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import { getQuote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';
import { PROGRAM_ID, DISCRIMINATORS } from '@baozi.bet/mcp-server/dist/config.js';
import type { Market } from '@baozi.bet/mcp-server/dist/handlers/markets.js';
import type { Quote } from '@baozi.bet/mcp-server/dist/handlers/quote.js';

// Re-export for convenience
export type { Market, Quote };
export { PROGRAM_ID, DISCRIMINATORS };

// =============================================================================
// TYPES
// =============================================================================

export interface MarketAnalysis {
  market: Market;
  sentiment: MarketSentiment;
  oddsBreakdown: OddsBreakdown;
  poolAnalysis: PoolAnalysis;
  timeAnalysis: TimeAnalysis;
  quote?: QuoteSnapshot;
}

export interface MarketSentiment {
  label: 'strongly_yes' | 'leaning_yes' | 'contested' | 'leaning_no' | 'strongly_no';
  labelCN: string;
  labelEN: string;
  confidence: number; // 0-100 how decisive the market is
  emoji: string;
}

export interface OddsBreakdown {
  yesPercent: number;
  noPercent: number;
  yesDecimalOdds: number;
  noDecimalOdds: number;
  impliedYesProbability: number;
  impliedNoProbability: number;
  spread: number; // absolute difference
}

export interface PoolAnalysis {
  totalPoolSol: number;
  yesPoolSol: number;
  noPoolSol: number;
  poolSizeCategory: 'micro' | 'small' | 'medium' | 'large' | 'whale';
  poolSizeCN: string;
  poolSizeEN: string;
  liquidityDepth: string;
}

export interface TimeAnalysis {
  closingTime: Date;
  resolutionTime: Date;
  timeRemaining: string;
  timeRemainingCN: string;
  urgency: 'expired' | 'imminent' | 'soon' | 'moderate' | 'distant';
  urgencyCN: string;
  isBettingOpen: boolean;
}

export interface QuoteSnapshot {
  yesQuote: Quote | null;
  noQuote: Quote | null;
  referenceAmount: number; // SOL amount used for quote
}

// =============================================================================
// ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze a single market comprehensively
 */
export async function analyzeMarket(marketPubkey: string): Promise<MarketAnalysis | null> {
  const market = await getMarket(marketPubkey);
  if (!market) return null;

  const sentiment = analyzeSentiment(market);
  const oddsBreakdown = analyzeOdds(market);
  const poolAnalysis = analyzePool(market);
  const timeAnalysis = analyzeTime(market);

  let quote: QuoteSnapshot | undefined;
  if (market.isBettingOpen && market.totalPoolSol > 0) {
    try {
      const refAmount = 0.1; // Reference quote for 0.1 SOL
      const [yesQuote, noQuote] = await Promise.all([
        getQuote(marketPubkey, 'Yes', refAmount).catch(() => null),
        getQuote(marketPubkey, 'No', refAmount).catch(() => null),
      ]);
      quote = { yesQuote, noQuote, referenceAmount: refAmount };
    } catch {
      // Quotes are optional — continue without them
    }
  }

  return { market, sentiment, oddsBreakdown, poolAnalysis, timeAnalysis, quote };
}

/**
 * Fetch and analyze all active markets
 */
export async function analyzeActiveMarkets(): Promise<MarketAnalysis[]> {
  const markets = await listMarkets('active');
  const analyses: MarketAnalysis[] = [];

  for (const market of markets) {
    const analysis = await analyzeMarket(market.publicKey);
    if (analysis) {
      analyses.push(analysis);
    }
  }

  return analyses;
}

/**
 * Fetch all markets with optional status filter
 */
export async function fetchMarkets(status?: string): Promise<Market[]> {
  return listMarkets(status);
}

/**
 * Fetch a single market by public key
 */
export async function fetchMarket(publicKey: string): Promise<Market | null> {
  return getMarket(publicKey);
}

// =============================================================================
// SENTIMENT ANALYSIS
// =============================================================================

function analyzeSentiment(market: Market): MarketSentiment {
  const yes = market.yesPercent;

  if (yes >= 80) {
    return {
      label: 'strongly_yes',
      labelCN: '强烈看涨 📈',
      labelEN: 'Strongly YES',
      confidence: yes,
      emoji: '🟢',
    };
  }
  if (yes >= 60) {
    return {
      label: 'leaning_yes',
      labelCN: '偏向看涨 📊',
      labelEN: 'Leaning YES',
      confidence: yes,
      emoji: '🟡',
    };
  }
  if (yes >= 40) {
    return {
      label: 'contested',
      labelCN: '势均力敌 ⚔️',
      labelEN: 'Evenly Contested',
      confidence: 100 - Math.abs(yes - 50) * 2,
      emoji: '⚡',
    };
  }
  if (yes >= 20) {
    return {
      label: 'leaning_no',
      labelCN: '偏向看跌 📉',
      labelEN: 'Leaning NO',
      confidence: 100 - yes,
      emoji: '🟠',
    };
  }
  return {
    label: 'strongly_no',
    labelCN: '强烈看跌 📉',
    labelEN: 'Strongly NO',
    confidence: 100 - yes,
    emoji: '🔴',
  };
}

// =============================================================================
// ODDS ANALYSIS
// =============================================================================

function analyzeOdds(market: Market): OddsBreakdown {
  const yesPercent = market.yesPercent;
  const noPercent = market.noPercent;

  // Decimal odds (e.g., 2.0 = even money)
  const yesDecimalOdds = yesPercent > 0 ? 100 / yesPercent : Infinity;
  const noDecimalOdds = noPercent > 0 ? 100 / noPercent : Infinity;

  // Implied probabilities (accounting for pool mechanics)
  const impliedYesProbability = yesPercent / 100;
  const impliedNoProbability = noPercent / 100;

  const spread = Math.abs(yesPercent - noPercent);

  return {
    yesPercent,
    noPercent,
    yesDecimalOdds: Math.round(yesDecimalOdds * 100) / 100,
    noDecimalOdds: Math.round(noDecimalOdds * 100) / 100,
    impliedYesProbability,
    impliedNoProbability,
    spread,
  };
}

// =============================================================================
// POOL ANALYSIS
// =============================================================================

function analyzePool(market: Market): PoolAnalysis {
  const total = market.totalPoolSol;

  let poolSizeCategory: PoolAnalysis['poolSizeCategory'];
  let poolSizeCN: string;
  let poolSizeEN: string;
  let liquidityDepth: string;

  if (total < 0.1) {
    poolSizeCategory = 'micro';
    poolSizeCN = '微型池 (< 0.1 SOL)';
    poolSizeEN = 'Micro Pool (< 0.1 SOL)';
    liquidityDepth = 'Very thin — prices move significantly per trade';
  } else if (total < 1) {
    poolSizeCategory = 'small';
    poolSizeCN = '小型池 (0.1-1 SOL)';
    poolSizeEN = 'Small Pool (0.1-1 SOL)';
    liquidityDepth = 'Thin — moderate price impact per trade';
  } else if (total < 10) {
    poolSizeCategory = 'medium';
    poolSizeCN = '中型池 (1-10 SOL)';
    poolSizeEN = 'Medium Pool (1-10 SOL)';
    liquidityDepth = 'Moderate — reasonable price stability';
  } else if (total < 100) {
    poolSizeCategory = 'large';
    poolSizeCN = '大型池 (10-100 SOL)';
    poolSizeEN = 'Large Pool (10-100 SOL)';
    liquidityDepth = 'Deep — low price impact per trade';
  } else {
    poolSizeCategory = 'whale';
    poolSizeCN = '巨型池 (100+ SOL) 🐋';
    poolSizeEN = 'Whale Pool (100+ SOL) 🐋';
    liquidityDepth = 'Very deep — highly liquid market';
  }

  return {
    totalPoolSol: total,
    yesPoolSol: market.yesPoolSol,
    noPoolSol: market.noPoolSol,
    poolSizeCategory,
    poolSizeCN,
    poolSizeEN,
    liquidityDepth,
  };
}

// =============================================================================
// TIME ANALYSIS
// =============================================================================

function analyzeTime(market: Market): TimeAnalysis {
  const now = new Date();
  const closingTime = new Date(market.closingTime);
  const resolutionTime = new Date(market.resolutionTime);
  const diffMs = closingTime.getTime() - now.getTime();

  let timeRemaining: string;
  let timeRemainingCN: string;
  let urgency: TimeAnalysis['urgency'];
  let urgencyCN: string;

  if (diffMs <= 0) {
    timeRemaining = 'Closed';
    timeRemainingCN = '已关闭';
    urgency = 'expired';
    urgencyCN = '已过期';
  } else if (diffMs < 3600000) { // < 1 hour
    const mins = Math.ceil(diffMs / 60000);
    timeRemaining = `${mins} minute${mins !== 1 ? 's' : ''} remaining`;
    timeRemainingCN = `剩余 ${mins} 分钟`;
    urgency = 'imminent';
    urgencyCN = '即将截止 ⏰';
  } else if (diffMs < 86400000) { // < 24 hours
    const hours = Math.ceil(diffMs / 3600000);
    timeRemaining = `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    timeRemainingCN = `剩余 ${hours} 小时`;
    urgency = 'soon';
    urgencyCN = '即将到来';
  } else if (diffMs < 604800000) { // < 7 days
    const days = Math.ceil(diffMs / 86400000);
    timeRemaining = `${days} day${days !== 1 ? 's' : ''} remaining`;
    timeRemainingCN = `剩余 ${days} 天`;
    urgency = 'moderate';
    urgencyCN = '从容不迫';
  } else {
    const days = Math.ceil(diffMs / 86400000);
    timeRemaining = `${days} days remaining`;
    timeRemainingCN = `剩余 ${days} 天`;
    urgency = 'distant';
    urgencyCN = '遥远';
  }

  return {
    closingTime,
    resolutionTime,
    timeRemaining,
    timeRemainingCN,
    urgency,
    urgencyCN,
    isBettingOpen: market.isBettingOpen,
  };
}
