/**
 * Rich embed builders for market data
 */
import { EmbedBuilder } from 'discord.js';
import type { Market, RaceMarket, PositionSummary } from '../baozi/types.js';

const BAOZI_COLOR = 0xF5A623; // Orange/amber
const BAOZI_GREEN = 0x2ECC71;
const BAOZI_RED = 0xE74C3C;
const BAOZI_BLUE = 0x3498DB;

const BAOZI_URL = 'https://baozi.bet';
const BAOZI_ICON = 'https://baozi.bet/baozi-logo.png';

/**
 * Build a progress bar from a percentage
 */
function progressBar(percent: number, length = 15): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format a date for display
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

/**
 * Time remaining until close
 */
function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 48) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Status emoji
 */
function statusEmoji(status: string): string {
  switch (status) {
    case 'Active': return '🟢';
    case 'Closed': return '🔴';
    case 'Resolved': return '✅';
    case 'Cancelled': return '❌';
    case 'Paused': return '⏸️';
    case 'Disputed': return '⚠️';
    default: return '❓';
  }
}

/**
 * Boolean market embed (/odds)
 */
export function buildMarketEmbed(market: Market): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(market.isBettingOpen ? BAOZI_COLOR : BAOZI_RED)
    .setTitle(`📊 ${market.question}`)
    .setURL(`${BAOZI_URL}/markets/${market.publicKey}`)
    .setDescription(
      `**Yes** ${progressBar(market.yesPercent)} ${market.yesPercent.toFixed(1)}%\n` +
      `**No**  ${progressBar(market.noPercent)} ${market.noPercent.toFixed(1)}%`
    )
    .addFields(
      { name: 'Pool', value: `${market.totalPoolSol.toFixed(2)} SOL`, inline: true },
      { name: 'Closes', value: formatDate(market.closingTime), inline: true },
      { name: 'Status', value: `${statusEmoji(market.status)} ${market.status}`, inline: true },
      { name: 'Layer', value: market.layer, inline: true },
      { name: 'Time Left', value: timeUntil(market.closingTime), inline: true },
    )
    .setFooter({ text: 'Baozi.bet — Prediction Markets on Solana', iconURL: BAOZI_ICON })
    .setTimestamp();

  if (market.winningOutcome) {
    embed.addFields({ name: 'Result', value: `🏆 **${market.winningOutcome}**`, inline: true });
  }

  return embed;
}

/**
 * Race market embed (/race)
 */
export function buildRaceEmbed(market: RaceMarket): EmbedBuilder {
  const outcomeLines = market.outcomes
    .sort((a, b) => b.percent - a.percent)
    .map(o => `**${o.label}** ${progressBar(o.percent, 12)} ${o.percent.toFixed(1)}%`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(market.isBettingOpen ? BAOZI_BLUE : BAOZI_RED)
    .setTitle(`🏇 ${market.question}`)
    .setURL(`${BAOZI_URL}/markets/${market.publicKey}`)
    .setDescription(outcomeLines)
    .addFields(
      { name: 'Pool', value: `${market.totalPoolSol.toFixed(2)} SOL`, inline: true },
      { name: 'Outcomes', value: `${market.outcomes.length}`, inline: true },
      { name: 'Closes', value: formatDate(market.closingTime), inline: true },
      { name: 'Status', value: `${statusEmoji(market.status)} ${market.status}`, inline: true },
      { name: 'Layer', value: market.layer, inline: true },
      { name: 'Time Left', value: timeUntil(market.closingTime), inline: true },
    )
    .setFooter({ text: 'Baozi.bet — Prediction Markets on Solana', iconURL: BAOZI_ICON })
    .setTimestamp();

  if (market.winningOutcomeIndex !== null) {
    const winner = market.outcomes[market.winningOutcomeIndex];
    if (winner) {
      embed.addFields({ name: 'Winner', value: `🏆 **${winner.label}**`, inline: true });
    }
  }

  return embed;
}

/**
 * Market list embed (/markets)
 */
export function buildMarketListEmbed(
  markets: Market[],
  title: string,
  description?: string
): EmbedBuilder {
  const lines = markets.slice(0, 10).map((m, i) => {
    const emoji = statusEmoji(m.status);
    const pool = m.totalPoolSol.toFixed(2);
    const fav = m.yesPercent > m.noPercent ? `Yes ${m.yesPercent.toFixed(0)}%` : `No ${m.noPercent.toFixed(0)}%`;
    return `${emoji} **${i + 1}.** [${m.question}](${BAOZI_URL}/markets/${m.publicKey})\n` +
      `   ${fav} · ${pool} SOL · ${timeUntil(m.closingTime)}`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setColor(BAOZI_COLOR)
    .setTitle(title)
    .setDescription(description ? `${description}\n\n${lines}` : lines)
    .setFooter({ text: `Showing ${Math.min(markets.length, 10)} of ${markets.length} markets · Baozi.bet`, iconURL: BAOZI_ICON })
    .setTimestamp();
}

/**
 * Portfolio embed (/portfolio)
 */
export function buildPortfolioEmbed(summary: PositionSummary): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BAOZI_GREEN)
    .setTitle(`💼 Portfolio — ${summary.wallet.slice(0, 4)}...${summary.wallet.slice(-4)}`)
    .setURL(`${BAOZI_URL}/portfolio/${summary.wallet}`)
    .addFields(
      { name: 'Total Bet', value: `${summary.totalBetSol.toFixed(4)} SOL`, inline: true },
      { name: 'Positions', value: `${summary.totalPositions}`, inline: true },
      { name: 'Active', value: `${summary.activePositions}`, inline: true },
      { name: '🏆 Won', value: `${summary.winningPositions}`, inline: true },
      { name: '❌ Lost', value: `${summary.losingPositions}`, inline: true },
      { name: '⏳ Pending', value: `${summary.pendingPositions}`, inline: true },
    )
    .setFooter({ text: 'Baozi.bet — Prediction Markets on Solana', iconURL: BAOZI_ICON })
    .setTimestamp();

  // Show top 5 positions
  const topPositions = summary.positions.slice(0, 5);
  if (topPositions.length > 0) {
    const posLines = topPositions.map(p => {
      const q = p.marketQuestion || `Market #${p.marketId}`;
      const status = p.marketStatus ? `${statusEmoji(p.marketStatus)} ` : '';
      return `${status}**${p.side}** ${p.totalAmountSol.toFixed(4)} SOL — ${q}`;
    }).join('\n');
    embed.addFields({ name: 'Recent Positions', value: posLines });
  }

  return embed;
}

/**
 * Daily roundup embed
 */
export function buildDailyRoundupEmbed(
  hotMarkets: Market[],
  newMarkets: Market[],
  resolvedMarkets: Market[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BAOZI_COLOR)
    .setTitle('📰 Daily Baozi Market Roundup')
    .setTimestamp();

  // Hot markets by volume
  if (hotMarkets.length > 0) {
    const hotLines = hotMarkets.slice(0, 5).map((m, i) =>
      `**${i + 1}.** [${m.question}](${BAOZI_URL}/markets/${m.publicKey}) — ${m.totalPoolSol.toFixed(2)} SOL`
    ).join('\n');
    embed.addFields({ name: '🔥 Top Markets by Volume', value: hotLines });
  }

  // New markets
  if (newMarkets.length > 0) {
    const newLines = newMarkets.slice(0, 5).map((m, i) =>
      `**${i + 1}.** [${m.question}](${BAOZI_URL}/markets/${m.publicKey})`
    ).join('\n');
    embed.addFields({ name: '🆕 New Markets', value: newLines });
  }

  // Resolved
  if (resolvedMarkets.length > 0) {
    const resLines = resolvedMarkets.slice(0, 5).map((m, i) =>
      `**${i + 1}.** ${m.question} → **${m.winningOutcome || 'N/A'}**`
    ).join('\n');
    embed.addFields({ name: '✅ Resolved', value: resLines });
  }

  if (hotMarkets.length === 0 && newMarkets.length === 0 && resolvedMarkets.length === 0) {
    embed.setDescription('No market activity today. Check back tomorrow!');
  }

  embed.setFooter({ text: 'Baozi.bet — Prediction Markets on Solana', iconURL: BAOZI_ICON });
  return embed;
}
