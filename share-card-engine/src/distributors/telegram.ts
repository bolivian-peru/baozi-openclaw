/**
 * Telegram Distribution Formatter
 * 
 * Generates Telegram-ready messages with HTML formatting
 * and inline keyboard markup for Baozi prediction markets.
 */
import type { ShareCard, MarketCardData, DistributionResult } from '../types/index.js';
import { formatPercent, formatSol, formatCountdown, truncateQuestion, formatStatus, oddsEmoji, escapeHtml } from '../utils/formatting.js';
import { buildMarketUrl, DEFAULT_CONFIG } from '../utils/config.js';

/**
 * Format a share card as a Telegram HTML message
 */
export function formatTelegramHtml(card: ShareCard): string {
  return formatMarketTelegramHtml(card.marketData, card.marketUrl);
}

/**
 * Format market data as Telegram HTML message
 */
export function formatMarketTelegramHtml(market: MarketCardData, marketUrl?: string): string {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const emoji = oddsEmoji(market.yesPercent);
  const yesBar = '▓'.repeat(Math.round(market.yesPercent / 10));
  const noBar = '▓'.repeat(Math.round(market.noPercent / 10));

  return [
    `${emoji} <b>${escapeHtml(truncateQuestion(market.question, 200))}</b>`,
    ``,
    `📊 <b>Odds:</b>`,
    `✅ YES <code>${yesBar}</code> <b>${formatPercent(market.yesPercent)}</b>`,
    `❌ NO  <code>${noBar}</code> <b>${formatPercent(market.noPercent)}</b>`,
    ``,
    `💰 Pool: <b>${formatSol(market.totalPoolSol)}</b>`,
    `⏰ ${formatCountdown(market.closingTime)}`,
    `📊 ${formatStatus(market.status)}`,
    ``,
    `🥟 <a href="${url}">Bet now on Baozi.bet</a>`,
  ].join('\n');
}

/**
 * Format market as Telegram Markdown V2 message
 */
export function formatTelegramMarkdown(market: MarketCardData, marketUrl?: string): string {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const emoji = oddsEmoji(market.yesPercent);

  // Escape Telegram MarkdownV2 special characters
  const question = escapeTelegramMd(truncateQuestion(market.question, 200));

  return [
    `${emoji} *${question}*`,
    ``,
    `📊 *Odds:*`,
    `✅ YES: *${formatPercent(market.yesPercent)}*`,
    `❌ NO: *${formatPercent(market.noPercent)}*`,
    ``,
    `💰 Pool: *${escapeTelegramMd(formatSol(market.totalPoolSol))}*`,
    `⏰ ${escapeTelegramMd(formatCountdown(market.closingTime))}`,
    ``,
    `🥟 [Bet now on Baozi\\.bet](${escapeTelegramMd(url)})`,
  ].join('\n');
}

/**
 * Generate Telegram inline keyboard markup
 */
export function generateTelegramKeyboard(marketUrl: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: '✅ Bet YES', url: `${marketUrl}?side=yes` },
        { text: '❌ Bet NO', url: `${marketUrl}?side=no` },
      ],
      [
        { text: '🥟 View Market', url: marketUrl },
      ],
    ],
  };
}

/**
 * Format multiple markets as a Telegram message
 */
export function formatTelegramMarketList(
  markets: MarketCardData[],
  title: string = '🔥 Hot Baozi Markets'
): string {
  const lines = [`<b>${escapeHtml(title)}</b>\n`];

  for (const [i, m] of markets.slice(0, 10).entries()) {
    const url = buildMarketUrl(m.publicKey, DEFAULT_CONFIG);
    lines.push(
      `${i + 1}\\. ${oddsEmoji(m.yesPercent)} <a href="${url}">${escapeHtml(truncateQuestion(m.question, 80))}</a>`,
      `   YES <b>${formatPercent(m.yesPercent)}</b> · Pool: <b>${formatSol(m.totalPoolSol)}</b>\n`
    );
  }

  lines.push(`🥟 <a href="https://baozi.bet">baozi.bet</a>`);
  return lines.join('\n');
}

/**
 * Create a distribution result for Telegram
 */
export function createTelegramDistribution(card: ShareCard): DistributionResult {
  const content = formatTelegramHtml(card);
  return {
    platform: 'telegram',
    success: true,
    content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeTelegramMd(text: string): string {
  return text.replace(/([_\[\]()~`>#+=|{}.!-])/g, '\\$1');
}

/** Telegram inline keyboard type */
export interface TelegramInlineKeyboard {
  inline_keyboard: Array<Array<{
    text: string;
    url: string;
  }>>;
}
