/**
 * Discord Distribution Formatter
 * 
 * Generates Discord-ready embed objects and markdown messages
 * for Baozi prediction market share cards.
 */
import type { ShareCard, MarketCardData, CardEmbed, DistributionResult } from '../types/index.js';
import { formatPercent, formatSol, formatCountdown, truncateQuestion, formatStatus, formatLayer, oddsEmoji } from '../utils/formatting.js';
import { buildMarketUrl, DEFAULT_CONFIG } from '../utils/config.js';

/**
 * Format a share card as a Discord embed object
 */
export function formatDiscordEmbed(card: ShareCard): CardEmbed {
  return card.embed;
}

/**
 * Create a Discord embed from market data
 */
export function createDiscordEmbed(market: MarketCardData, marketUrl?: string): CardEmbed {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const yesBar = '█'.repeat(Math.round(market.yesPercent / 5));
  const noBar = '█'.repeat(Math.round(market.noPercent / 5));

  return {
    title: `🥟 ${truncateQuestion(market.question, 256)}`,
    description: [
      '**Current Odds:**',
      `\`YES ${yesBar} ${formatPercent(market.yesPercent)}\``,
      `\`NO  ${noBar} ${formatPercent(market.noPercent)}\``,
    ].join('\n'),
    color: 0xf59e0b,
    fields: [
      { name: '💰 Total Pool', value: formatSol(market.totalPoolSol), inline: true },
      { name: '⏰ Closes', value: formatCountdown(market.closingTime), inline: true },
      { name: '📊 Status', value: formatStatus(market.status), inline: true },
      { name: '🏷️ Layer', value: formatLayer(market.layer), inline: true },
      { name: '✅ YES Pool', value: formatSol(market.yesPoolSol), inline: true },
      { name: '❌ NO Pool', value: formatSol(market.noPoolSol), inline: true },
    ],
    footer: {
      text: '🥟 Powered by Baozi.bet — Prediction Markets on Solana',
    },
    url,
  };
}

/**
 * Format as Discord markdown message (for bots without embed support)
 */
export function formatDiscordMarkdown(market: MarketCardData, marketUrl?: string): string {
  const url = marketUrl || buildMarketUrl(market.publicKey, DEFAULT_CONFIG);
  const emoji = oddsEmoji(market.yesPercent);

  return [
    `## ${emoji} ${truncateQuestion(market.question, 200)}`,
    ``,
    `> **YES** ${formatPercent(market.yesPercent)} · **NO** ${formatPercent(market.noPercent)}`,
    ``,
    `💰 Pool: **${formatSol(market.totalPoolSol)}** · ⏰ ${formatCountdown(market.closingTime)}`,
    `📊 ${formatStatus(market.status)} · ${formatLayer(market.layer)}`,
    ``,
    `**[🥟 Bet Now on Baozi](${url})**`,
  ].join('\n');
}

/**
 * Format multiple markets as a Discord embed list
 */
export function formatDiscordMarketList(
  markets: MarketCardData[],
  title: string = '🔥 Hot Baozi Markets'
): CardEmbed {
  const fields = markets.slice(0, 10).map((m, i) => ({
    name: `${i + 1}. ${truncateQuestion(m.question, 100)}`,
    value: `YES ${formatPercent(m.yesPercent)} · NO ${formatPercent(m.noPercent)} · Pool: ${formatSol(m.totalPoolSol)}`,
    inline: false,
  }));

  return {
    title,
    description: `${markets.length} markets found. Top markets by pool size:`,
    color: 0xf59e0b,
    fields,
    footer: {
      text: '🥟 baozi.bet — Prediction Markets on Solana',
    },
    url: 'https://baozi.bet',
  };
}

/**
 * Create a distribution result for Discord
 */
export function createDiscordDistribution(card: ShareCard): DistributionResult {
  const content = JSON.stringify(card.embed, null, 2);
  return {
    platform: 'discord',
    success: true,
    content,
    timestamp: new Date().toISOString(),
  };
}
