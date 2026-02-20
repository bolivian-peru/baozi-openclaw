import { CommandContext, Context } from 'grammy';
import { BaoziClient } from '../services/baozi-client';
import { formatMarketCard, formatMarketListHeader } from '../utils/format';
import { marketKeyboard, marketListKeyboard } from './keyboards';
import { config } from '../config';

/**
 * /markets [category] — List active markets, optionally filtered by category.
 */
export function createMarketsHandler(client: BaoziClient) {
  return async (ctx: CommandContext<Context>) => {
    const category = ctx.match?.toString().trim() || undefined;

    await ctx.replyWithChatAction('typing');

    const markets = await client.listMarkets({
      status: 'active',
      category,
      limit: config.maxMarketsPerPage,
      sortBy: 'pool',
    });

    if (markets.length === 0) {
      const msg = category
        ? `No active markets found in category "${category}". Try /markets to see all.`
        : 'No active markets found. Check back later!';
      await ctx.reply(msg);
      return;
    }

    const title = category
      ? `📊 Markets — ${category}`
      : '📊 Active Markets';

    let message = formatMarketListHeader(title, markets.length);

    for (const market of markets) {
      message += '\n' + formatMarketCard(market) + '\n';
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: marketListKeyboard(markets, 0, 1, 'markets'),
      link_preview_options: { is_disabled: true },
    });
  };
}

/**
 * /odds <marketId> — Show detailed odds for a specific market.
 */
export function createOddsHandler(client: BaoziClient) {
  return async (ctx: CommandContext<Context>) => {
    const marketId = ctx.match?.toString().trim();

    if (!marketId) {
      await ctx.reply(
        '❌ Please provide a market ID.\n\nUsage: <code>/odds &lt;marketId&gt;</code>',
        { parse_mode: 'HTML' },
      );
      return;
    }

    await ctx.replyWithChatAction('typing');

    const market = await client.getQuote(marketId);

    if (!market) {
      await ctx.reply(
        '❌ Market not found. Make sure the ID is correct.\n\nTip: Use /markets to browse active markets.',
      );
      return;
    }

    const message = formatMarketCard(market);

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(market),
      link_preview_options: { is_disabled: true },
    });
  };
}

/**
 * /hot — Markets with the most volume/pool.
 */
export function createHotHandler(client: BaoziClient) {
  return async (ctx: CommandContext<Context>) => {
    await ctx.replyWithChatAction('typing');

    const markets = await client.getHotMarkets(config.maxMarketsPerPage);

    if (markets.length === 0) {
      await ctx.reply('No hot markets right now. Check back later! 🔥');
      return;
    }

    let message = formatMarketListHeader('🔥 Hot Markets', markets.length);

    for (const market of markets) {
      message += '\n' + formatMarketCard(market) + '\n';
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: marketListKeyboard(markets, 0, 1, 'hot'),
      link_preview_options: { is_disabled: true },
    });
  };
}

/**
 * /closing — Markets closing within 24 hours.
 */
export function createClosingHandler(client: BaoziClient) {
  return async (ctx: CommandContext<Context>) => {
    await ctx.replyWithChatAction('typing');

    const markets = await client.getClosingMarkets(24);

    if (markets.length === 0) {
      await ctx.reply('No markets closing in the next 24 hours. ⏰');
      return;
    }

    let message = formatMarketListHeader('⏰ Closing Soon (24h)', markets.length);

    for (const market of markets.slice(0, config.maxMarketsPerPage)) {
      message += '\n' + formatMarketCard(market) + '\n';
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: marketListKeyboard(
        markets.slice(0, config.maxMarketsPerPage),
        0,
        Math.ceil(markets.length / config.maxMarketsPerPage),
        'closing',
      ),
      link_preview_options: { is_disabled: true },
    });
  };
}
