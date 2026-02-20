/**
 * Twitter/X Distribution Formatter
 * 
 * Formats share cards for Twitter/X posting.
 * Handles character limits, thread formatting, and Twitter Card meta.
 */
import type { ShareCard, MarketCardData, DistributionResult } from '../types/index.js';
import { formatPercent, formatSol, formatCountdown, truncateQuestion, oddsEmoji } from '../utils/formatting.js';
import { buildMarketUrl, DEFAULT_CONFIG } from '../utils/config.js';

const TWITTER_CHAR_LIMIT = 280;
const TWITTER_URL_LENGTH = 23; // t.co shortens all URLs to 23 chars

/**
 * Format a share card as a single tweet
 */
export function formatTweet(card: ShareCard): string {
  return formatMarketTweet(card.marketData, card.marketUrl);
}

/**
 * Format market data as a single tweet (within 280 chars)
 */
export function formatMarketTweet(market: MarketCardData, marketUrl?: string): string {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const emoji = oddsEmoji(market.yesPercent);

  // Build tweet parts, tracking length
  const question = truncateQuestion(market.question, 100);
  const odds = `YES ${formatPercent(market.yesPercent)} · NO ${formatPercent(market.noPercent)}`;
  const pool = `Pool: ${formatSol(market.totalPoolSol)}`;

  // Reserve space for URL + newlines
  const reserved = TWITTER_URL_LENGTH + 10;
  const available = TWITTER_CHAR_LIMIT - reserved;

  let tweet = `${emoji} ${question}\n\n${odds}\n💰 ${pool}`;

  if (tweet.length > available) {
    const shorterQ = truncateQuestion(market.question, 60);
    tweet = `${emoji} ${shorterQ}\n${odds} · ${pool}`;
  }

  return `${tweet}\n\n🥟 ${url}`;
}

/**
 * Format a thread of tweets for detailed market breakdown
 */
export function formatTweetThread(market: MarketCardData, marketUrl?: string): string[] {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const emoji = oddsEmoji(market.yesPercent);

  const thread: string[] = [];

  // Tweet 1: Hook
  thread.push(
    `${emoji} ${truncateQuestion(market.question, 200)}\n\n` +
    `Current odds on @baozibet 👇`
  );

  // Tweet 2: Odds & Stats
  thread.push(
    `📊 Market Odds:\n\n` +
    `✅ YES: ${formatPercent(market.yesPercent)}\n` +
    `❌ NO: ${formatPercent(market.noPercent)}\n\n` +
    `💰 Total Pool: ${formatSol(market.totalPoolSol)}\n` +
    `⏰ ${formatCountdown(market.closingTime)}`
  );

  // Tweet 3: CTA
  thread.push(
    `Think you know the answer?\n\n` +
    `Place your bet on Baozi — prediction markets on Solana.\n\n` +
    `🥟 ${url}`
  );

  return thread;
}

/**
 * Format multiple markets as a single "markets roundup" tweet
 */
export function formatMarketsRoundup(
  markets: MarketCardData[],
  title: string = '🔥 Hot Markets'
): string {
  const lines = [`${title} on @baozibet:\n`];

  for (const m of markets.slice(0, 3)) {
    const q = truncateQuestion(m.question, 50);
    lines.push(`${oddsEmoji(m.yesPercent)} ${q} — YES ${formatPercent(m.yesPercent)}`);
  }

  lines.push(`\n🥟 baozi.bet`);
  return lines.join('\n');
}

/**
 * Create a distribution result for Twitter
 */
export function createTwitterDistribution(card: ShareCard): DistributionResult {
  const content = formatTweet(card);
  return {
    platform: 'twitter',
    success: content.length <= TWITTER_CHAR_LIMIT + TWITTER_URL_LENGTH,
    content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate tweet is within character limit
 */
export function validateTweetLength(tweet: string): { valid: boolean; length: number; overBy: number } {
  // URLs count as 23 chars
  const urlRegex = /https?:\/\/\S+/g;
  const urls = tweet.match(urlRegex) || [];
  let effectiveLength = tweet.length;

  for (const url of urls) {
    effectiveLength = effectiveLength - url.length + TWITTER_URL_LENGTH;
  }

  return {
    valid: effectiveLength <= TWITTER_CHAR_LIMIT,
    length: effectiveLength,
    overBy: Math.max(0, effectiveLength - TWITTER_CHAR_LIMIT),
  };
}
