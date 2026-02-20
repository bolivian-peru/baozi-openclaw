import { InlineKeyboard } from 'grammy';
import { Market } from '../types';
import { getMarketUrl } from '../utils/format';

/**
 * Build inline keyboard for a single market card.
 */
export function marketKeyboard(market: Market): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Row 1: View on baozi.bet
  kb.url('🎰 Bet on baozi.bet', getMarketUrl(market.id));

  // Row 2: Refresh & Share
  kb.row();
  kb.text('🔄 Refresh', `refresh:${market.id}`);
  kb.text('📤 Share', `share:${market.id}`);

  return kb;
}

/**
 * Build inline keyboard for a market list with navigation.
 */
export function marketListKeyboard(
  markets: Market[],
  page: number,
  totalPages: number,
  prefix: string,
): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Each market gets a "View" button
  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    kb.row();
    kb.text(`📊 ${truncate(m.question, 30)}`, `view:${m.id}`);
  }

  // Pagination row
  if (totalPages > 1) {
    kb.row();
    if (page > 0) {
      kb.text('◀️ Prev', `${prefix}:page:${page - 1}`);
    }
    kb.text(`${page + 1}/${totalPages}`, 'noop');
    if (page < totalPages - 1) {
      kb.text('Next ▶️', `${prefix}:page:${page + 1}`);
    }
  }

  // Footer: link to baozi.bet
  kb.row();
  kb.url('🎰 Trade on baozi.bet', 'https://baozi.bet');

  return kb;
}

/**
 * Build inline keyboard for the help command.
 */
export function helpKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Markets', 'cmd:markets')
    .text('🔥 Hot', 'cmd:hot')
    .row()
    .text('⏰ Closing Soon', 'cmd:closing')
    .text('ℹ️ Help', 'cmd:help')
    .row()
    .url('🎰 baozi.bet', 'https://baozi.bet');
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}
