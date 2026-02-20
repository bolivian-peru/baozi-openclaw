import { Market, MarketOutcome, MarketQuote } from '../types';
import { config } from '../config';

/**
 * Format a percentage with 1 decimal place.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format SOL amount.
 */
export function formatSol(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K SOL`;
  }
  return `${amount.toFixed(2)} SOL`;
}

/**
 * Format time remaining until a date.
 */
export function formatTimeRemaining(closingTime: string): string {
  const now = Date.now();
  const close = new Date(closingTime).getTime();
  const diff = close - now;

  if (diff <= 0) return 'Closed';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format a single market as a Telegram message.
 */
export function formatMarketCard(market: Market): string {
  const lines: string[] = [];

  // Title
  lines.push(`📊 <b>${escapeHtml(market.question)}</b>`);
  lines.push('');

  // Outcomes with probabilities
  if (market.isRace) {
    for (const outcome of market.outcomes.slice(0, 5)) {
      const bar = makeProgressBar(outcome.probability);
      lines.push(`${bar} ${escapeHtml(outcome.label)}: <b>${formatPercent(outcome.probability)}</b>`);
    }
    if (market.outcomes.length > 5) {
      lines.push(`  <i>...and ${market.outcomes.length - 5} more</i>`);
    }
  } else {
    const yes = market.outcomes[0];
    const no = market.outcomes[1];
    if (yes && no) {
      lines.push(`🟢 Yes: <b>${formatPercent(yes.probability)}</b>  |  🔴 No: <b>${formatPercent(no.probability)}</b>`);
    }
  }

  lines.push('');

  // Pool and timing
  lines.push(`💰 Pool: <b>${formatSol(market.totalPool)}</b>`);

  if (market.volume24h !== undefined) {
    lines.push(`📈 24h Vol: <b>${formatSol(market.volume24h)}</b>`);
  }

  const timeStr = formatTimeRemaining(market.closingTime);
  const timeEmoji = timeStr === 'Closed' ? '🔒' : '⏰';
  lines.push(`${timeEmoji} ${timeStr === 'Closed' ? 'Closed' : `Closes in: <b>${timeStr}</b>`}`);

  if (market.category) {
    lines.push(`🏷️ ${escapeHtml(market.category)}`);
  }

  return lines.join('\n');
}

/**
 * Format a market list header.
 */
export function formatMarketListHeader(title: string, count: number): string {
  return `<b>${escapeHtml(title)}</b>\n${'━'.repeat(20)}\nShowing ${count} market${count !== 1 ? 's' : ''}:\n`;
}

/**
 * Format the daily roundup message.
 */
export function formatDailyRoundup(
  hotMarkets: Market[],
  closingMarkets: Market[],
  newMarkets: Market[],
  resolvedMarkets: Market[],
): string {
  const lines: string[] = [];

  lines.push('🌅 <b>Baozi Daily Market Roundup</b>');
  lines.push(`📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
  lines.push('━'.repeat(25));

  if (hotMarkets.length > 0) {
    lines.push('');
    lines.push('🔥 <b>Trending Markets</b>');
    for (const m of hotMarkets.slice(0, 3)) {
      lines.push(`  • ${escapeHtml(m.question)} — Pool: ${formatSol(m.totalPool)}`);
    }
  }

  if (closingMarkets.length > 0) {
    lines.push('');
    lines.push('⏰ <b>Closing Soon</b>');
    for (const m of closingMarkets.slice(0, 3)) {
      lines.push(`  • ${escapeHtml(m.question)} — ${formatTimeRemaining(m.closingTime)}`);
    }
  }

  if (newMarkets.length > 0) {
    lines.push('');
    lines.push('✨ <b>New Markets</b>');
    for (const m of newMarkets.slice(0, 3)) {
      const odds = m.outcomes[0]
        ? `${formatPercent(m.outcomes[0].probability)} ${m.outcomes[0].label}`
        : '';
      lines.push(`  • ${escapeHtml(m.question)} ${odds ? `— ${odds}` : ''}`);
    }
  }

  if (resolvedMarkets.length > 0) {
    lines.push('');
    lines.push('✅ <b>Recently Resolved</b>');
    for (const m of resolvedMarkets.slice(0, 3)) {
      lines.push(`  • ${escapeHtml(m.question)} → ${escapeHtml(m.resolution || 'Resolved')}`);
    }
  }

  lines.push('');
  lines.push(`<a href="${config.baoziBaseUrl}">🎰 Trade on baozi.bet</a>`);

  return lines.join('\n');
}

/**
 * Create a simple text progress bar.
 */
function makeProgressBar(probability: number): string {
  const filled = Math.round(probability * 8);
  return '▓'.repeat(filled) + '░'.repeat(8 - filled);
}

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the baozi.bet market URL.
 */
export function getMarketUrl(marketId: string): string {
  return `${config.baoziBaseUrl}/market/${marketId}`;
}
