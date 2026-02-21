/**
 * 夜厨房 — Bilingual Report Generator
 *
 * Generates beautiful bilingual (English + Chinese) market reports
 * combining market data with Chinese cultural wisdom.
 */

import type { MarketAnalysis } from './market-analyzer.js';
import { getWisdomForMarket, getOddsWisdom, formatWisdom } from './wisdom.js';
import type { WisdomEntry } from './wisdom.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ReportOptions {
  includeQuotes?: boolean;
  wisdomCount?: number;
  format?: 'full' | 'compact' | 'social';
  timestamp?: Date;
}

export interface MarketReport {
  title: string;
  titleCN: string;
  content: string;
  marketPda: string;
  generatedAt: Date;
  wordCount: number;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generate a bilingual market report for a single market
 */
export function generateMarketReport(
  analysis: MarketAnalysis,
  options: ReportOptions = {},
): MarketReport {
  const {
    includeQuotes = true,
    wisdomCount = 3,
    format = 'full',
    timestamp = new Date(),
  } = options;

  switch (format) {
    case 'compact':
      return generateCompactReport(analysis, wisdomCount, timestamp);
    case 'social':
      return generateSocialReport(analysis, timestamp);
    case 'full':
    default:
      return generateFullReport(analysis, includeQuotes, wisdomCount, timestamp);
  }
}

/**
 * Generate a multi-market summary report
 */
export function generateSummaryReport(
  analyses: MarketAnalysis[],
  options: ReportOptions = {},
): string {
  const { timestamp = new Date() } = options;
  const dateStr = formatDate(timestamp);

  const sections: string[] = [];

  // Header
  sections.push(renderHeader(dateStr));

  // Market overview stats
  sections.push(renderOverviewStats(analyses));

  // Individual market summaries
  for (const analysis of analyses.slice(0, 10)) {
    sections.push(renderMarketSummaryCard(analysis));
  }

  // Wisdom footer
  const wisdomEntries = getWisdomForMarket('market prediction trading', 2);
  sections.push(renderWisdomFooter(wisdomEntries));

  // Sign-off
  sections.push(renderSignOff(dateStr));

  return sections.join('\n\n');
}

// =============================================================================
// FULL REPORT
// =============================================================================

function generateFullReport(
  analysis: MarketAnalysis,
  includeQuotes: boolean,
  wisdomCount: number,
  timestamp: Date,
): MarketReport {
  const { market, sentiment, oddsBreakdown, poolAnalysis, timeAnalysis, quote } = analysis;
  const dateStr = formatDate(timestamp);
  const wisdomEntries = getWisdomForMarket(market.question, wisdomCount);
  const oddsWisdom = getOddsWisdom(market.yesPercent);

  const sections: string[] = [];

  // === Title Section ===
  const title = `Night Kitchen Report: ${truncate(market.question, 60)}`;
  const titleCN = `夜厨房报告：${truncate(market.question, 60)}`;

  sections.push([
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🏮 夜厨房 · Night Kitchen 🏮                  ║',
    '║           Bilingual Market Intelligence Report              ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
    `📅 ${dateStr}`,
  ].join('\n'));

  // === Market Question ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 📋 MARKET QUESTION / 市场问题                               │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  ❓ ${market.question}`,
    '',
    `  🔑 Market ID: ${market.marketId}`,
    `  📍 PDA: ${market.publicKey}`,
    `  🏷️ Layer: ${market.layer} | Status: ${market.status}`,
    `  💰 Currency: ${market.currencyType}`,
  ].join('\n'));

  // === Sentiment Analysis ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 📊 MARKET SENTIMENT / 市场情绪                              │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  ${sentiment.emoji} ${sentiment.labelEN} / ${sentiment.labelCN}`,
    '',
    `  Confidence / 信心指数: ${renderProgressBar(sentiment.confidence)} ${sentiment.confidence.toFixed(1)}%`,
  ].join('\n'));

  // === Odds Breakdown ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 🎲 ODDS BREAKDOWN / 赔率分析                                │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  YES / 是: ${renderPoolBar(oddsBreakdown.yesPercent)} ${oddsBreakdown.yesPercent.toFixed(1)}%`,
    `  NO  / 否: ${renderPoolBar(oddsBreakdown.noPercent)} ${oddsBreakdown.noPercent.toFixed(1)}%`,
    '',
    `  📐 Decimal Odds / 小数赔率:`,
    `     YES: ${oddsBreakdown.yesDecimalOdds.toFixed(2)}x  |  NO: ${oddsBreakdown.noDecimalOdds.toFixed(2)}x`,
    '',
    `  📈 Implied Probability / 隐含概率:`,
    `     YES: ${(oddsBreakdown.impliedYesProbability * 100).toFixed(1)}%  |  NO: ${(oddsBreakdown.impliedNoProbability * 100).toFixed(1)}%`,
    '',
    `  ↔️ Spread / 价差: ${oddsBreakdown.spread.toFixed(1)} points`,
    '',
    `  ${formatWisdom(oddsWisdom)}`,
  ].join('\n'));

  // === Pool Analysis ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 🏊 POOL ANALYSIS / 资金池分析                                │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  💎 Total Pool / 总资金池: ${poolAnalysis.totalPoolSol.toFixed(4)} SOL`,
    `  🟢 YES Pool / 是方资金: ${poolAnalysis.yesPoolSol.toFixed(4)} SOL`,
    `  🔴 NO Pool / 否方资金:  ${poolAnalysis.noPoolSol.toFixed(4)} SOL`,
    '',
    `  📏 Size / 规模: ${poolAnalysis.poolSizeEN} / ${poolAnalysis.poolSizeCN}`,
    `  💧 Liquidity / 流动性: ${poolAnalysis.liquidityDepth}`,
  ].join('\n'));

  // === Quote Snapshot (optional) ===
  if (includeQuotes && quote) {
    sections.push(renderQuoteSection(quote));
  }

  // === Time Analysis ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ ⏰ TIME ANALYSIS / 时间分析                                  │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  📅 Closing / 截止: ${timeAnalysis.closingTime.toISOString()}`,
    `  📅 Resolution / 结算: ${timeAnalysis.resolutionTime.toISOString()}`,
    `  ⏳ ${timeAnalysis.timeRemaining} / ${timeAnalysis.timeRemainingCN}`,
    `  🚦 Urgency / 紧迫度: ${timeAnalysis.urgencyCN}`,
    `  ${timeAnalysis.isBettingOpen ? '🟢 Betting Open / 投注开放' : '🔴 Betting Closed / 投注已关闭'}`,
  ].join('\n'));

  // === Cultural Wisdom ===
  sections.push([
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 🏮 CULTURAL WISDOM / 文化智慧                                │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    ...wisdomEntries.map(w => '  ' + formatWisdom(w)),
  ].join('\n'));

  // === Sign Off ===
  sections.push([
    '═══════════════════════════════════════════════════════════════',
    '  🏮 夜厨房 · Night Kitchen — Where data meets ancient wisdom',
    `  Generated: ${dateStr}`,
    `  Program: ${PROGRAM_ID_STR}`,
    '═══════════════════════════════════════════════════════════════',
  ].join('\n'));

  const content = sections.join('\n\n');

  return {
    title,
    titleCN,
    content,
    marketPda: market.publicKey,
    generatedAt: timestamp,
    wordCount: content.split(/\s+/).length,
  };
}

// =============================================================================
// COMPACT REPORT
// =============================================================================

function generateCompactReport(
  analysis: MarketAnalysis,
  wisdomCount: number,
  timestamp: Date,
): MarketReport {
  const { market, sentiment, oddsBreakdown, poolAnalysis, timeAnalysis } = analysis;
  const dateStr = formatDate(timestamp);
  const wisdomEntries = getWisdomForMarket(market.question, Math.min(wisdomCount, 2));

  const content = [
    `🏮 夜厨房 Night Kitchen | ${dateStr}`,
    '',
    `❓ ${market.question}`,
    `${sentiment.emoji} ${sentiment.labelEN} / ${sentiment.labelCN}`,
    '',
    `📊 YES ${oddsBreakdown.yesPercent.toFixed(1)}% | NO ${oddsBreakdown.noPercent.toFixed(1)}%`,
    `💰 Pool: ${poolAnalysis.totalPoolSol.toFixed(4)} SOL (${poolAnalysis.poolSizeEN})`,
    `⏰ ${timeAnalysis.timeRemaining} / ${timeAnalysis.timeRemainingCN}`,
    `🚦 ${timeAnalysis.isBettingOpen ? 'Betting Open ✅' : 'Betting Closed ❌'}`,
    '',
    ...wisdomEntries.map(w => formatWisdom(w)),
  ].join('\n');

  return {
    title: `Night Kitchen: ${truncate(market.question, 40)}`,
    titleCN: `夜厨房：${truncate(market.question, 40)}`,
    content,
    marketPda: market.publicKey,
    generatedAt: timestamp,
    wordCount: content.split(/\s+/).length,
  };
}

// =============================================================================
// SOCIAL (SHORT) REPORT
// =============================================================================

function generateSocialReport(
  analysis: MarketAnalysis,
  timestamp: Date,
): MarketReport {
  const { market, sentiment, oddsBreakdown, poolAnalysis } = analysis;
  const wisdom = getWisdomForMarket(market.question, 1)[0];

  const content = [
    `🏮 夜厨房 Night Kitchen`,
    '',
    `❓ ${truncate(market.question, 100)}`,
    `${sentiment.emoji} ${oddsBreakdown.yesPercent.toFixed(0)}% YES | ${oddsBreakdown.noPercent.toFixed(0)}% NO`,
    `💰 ${poolAnalysis.totalPoolSol.toFixed(2)} SOL`,
    '',
    `🏮「${wisdom.chinese}」`,
    `   "${wisdom.english}"`,
    '',
    `#Baozi #PredictionMarkets #夜厨房`,
  ].join('\n');

  return {
    title: `Night Kitchen: ${truncate(market.question, 40)}`,
    titleCN: `夜厨房：${truncate(market.question, 40)}`,
    content,
    marketPda: market.publicKey,
    generatedAt: timestamp,
    wordCount: content.split(/\s+/).length,
  };
}

// =============================================================================
// SECTION RENDERERS
// =============================================================================

function renderHeader(dateStr: string): string {
  return [
    '╔══════════════════════════════════════════════════════════════╗',
    '║         🏮 夜厨房 · Night Kitchen — Daily Digest 🏮        ║',
    '║              Bilingual Market Summary Report                ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
    `📅 ${dateStr}`,
  ].join('\n');
}

function renderOverviewStats(analyses: MarketAnalysis[]): string {
  const totalMarkets = analyses.length;
  const openMarkets = analyses.filter(a => a.market.isBettingOpen).length;
  const totalPool = analyses.reduce((sum, a) => sum + a.market.totalPoolSol, 0);
  const avgYes = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.market.yesPercent, 0) / analyses.length
    : 50;

  return [
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 📈 OVERVIEW / 概览                                          │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  📊 Total Markets / 总市场数: ${totalMarkets}`,
    `  🟢 Open for Betting / 可投注: ${openMarkets}`,
    `  💰 Total Liquidity / 总流动性: ${totalPool.toFixed(4)} SOL`,
    `  📐 Average YES / 平均看涨: ${avgYes.toFixed(1)}%`,
  ].join('\n');
}

function renderMarketSummaryCard(analysis: MarketAnalysis): string {
  const { market, sentiment, oddsBreakdown, poolAnalysis, timeAnalysis } = analysis;

  return [
    `  ─── ${truncate(market.question, 50)} ───`,
    `  ${sentiment.emoji} ${oddsBreakdown.yesPercent.toFixed(1)}% YES | ${oddsBreakdown.noPercent.toFixed(1)}% NO | 💰 ${poolAnalysis.totalPoolSol.toFixed(4)} SOL`,
    `  ⏰ ${timeAnalysis.timeRemaining} | ${timeAnalysis.isBettingOpen ? '✅ Open' : '❌ Closed'}`,
  ].join('\n');
}

function renderQuoteSection(quote: NonNullable<MarketAnalysis['quote']>): string {
  const lines: string[] = [
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 💹 QUOTE SNAPSHOT / 报价快照                                 │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    `  Reference: ${quote.referenceAmount} SOL / 参考金额: ${quote.referenceAmount} SOL`,
  ];

  if (quote.yesQuote && quote.yesQuote.valid) {
    lines.push(
      '',
      '  🟢 YES Quote / 是方报价:',
      `     Expected Payout / 预期收益: ${quote.yesQuote.expectedPayoutSol.toFixed(4)} SOL`,
      `     Potential Profit / 潜在利润: ${quote.yesQuote.potentialProfitSol.toFixed(4)} SOL`,
      `     Implied Odds / 隐含赔率: ${(quote.yesQuote.impliedOdds * 100).toFixed(1)}%`,
      `     Fee / 手续费: ${quote.yesQuote.feeSol.toFixed(6)} SOL (${quote.yesQuote.feeBps} bps)`,
    );
  }

  if (quote.noQuote && quote.noQuote.valid) {
    lines.push(
      '',
      '  🔴 NO Quote / 否方报价:',
      `     Expected Payout / 预期收益: ${quote.noQuote.expectedPayoutSol.toFixed(4)} SOL`,
      `     Potential Profit / 潜在利润: ${quote.noQuote.potentialProfitSol.toFixed(4)} SOL`,
      `     Implied Odds / 隐含赔率: ${(quote.noQuote.impliedOdds * 100).toFixed(1)}%`,
      `     Fee / 手续费: ${quote.noQuote.feeSol.toFixed(6)} SOL (${quote.noQuote.feeBps} bps)`,
    );
  }

  return lines.join('\n');
}

function renderWisdomFooter(entries: WisdomEntry[]): string {
  return [
    '┌─────────────────────────────────────────────────────────────┐',
    '│ 🏮 WISDOM OF THE DAY / 每日智慧                              │',
    '└─────────────────────────────────────────────────────────────┘',
    '',
    ...entries.map(w => '  ' + formatWisdom(w)),
  ].join('\n');
}

function renderSignOff(dateStr: string): string {
  return [
    '═══════════════════════════════════════════════════════════════',
    '  🏮 夜厨房 · Night Kitchen — Where data meets ancient wisdom',
    `  Generated: ${dateStr}`,
    '═══════════════════════════════════════════════════════════════',
  ].join('\n');
}

// =============================================================================
// HELPERS
// =============================================================================

const PROGRAM_ID_STR = 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ';

function renderProgressBar(percent: number, length: number = 20): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function renderPoolBar(percent: number): string {
  return renderProgressBar(percent, 15);
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, ' UTC');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
