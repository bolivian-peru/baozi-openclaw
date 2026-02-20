import { Context } from 'grammy';
import { BaoziClient } from '../services/baozi-client';
import { formatMarketCard } from '../utils/format';
import { marketKeyboard } from './keyboards';
import { getMarketUrl } from '../utils/format';

/**
 * Register callback query handlers for inline keyboard buttons.
 */
export function createCallbackHandlers(client: BaoziClient) {
  return async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    // Handle different callback types
    if (data.startsWith('refresh:')) {
      await handleRefresh(ctx, client, data.slice('refresh:'.length));
    } else if (data.startsWith('share:')) {
      await handleShare(ctx, data.slice('share:'.length));
    } else if (data.startsWith('view:')) {
      await handleView(ctx, client, data.slice('view:'.length));
    } else if (data.startsWith('cmd:')) {
      await handleCommand(ctx, data.slice('cmd:'.length));
    } else if (data === 'noop') {
      await ctx.answerCallbackQuery();
    } else {
      await ctx.answerCallbackQuery({ text: 'Unknown action' });
    }
  };
}

/**
 * Refresh market odds inline.
 */
async function handleRefresh(ctx: Context, client: BaoziClient, marketId: string) {
  try {
    const market = await client.getQuote(marketId);

    if (!market) {
      await ctx.answerCallbackQuery({ text: '❌ Market not found' });
      return;
    }

    const message = formatMarketCard(market);

    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(market),
      link_preview_options: { is_disabled: true },
    });

    await ctx.answerCallbackQuery({ text: '✅ Odds updated!' });
  } catch (error) {
    console.error('Refresh error:', error);
    await ctx.answerCallbackQuery({ text: '❌ Failed to refresh' });
  }
}

/**
 * Share market via inline message.
 */
async function handleShare(ctx: Context, marketId: string) {
  const url = getMarketUrl(marketId);
  await ctx.answerCallbackQuery({
    text: `Share this link: ${url}`,
    show_alert: true,
  });
}

/**
 * View a single market's details.
 */
async function handleView(ctx: Context, client: BaoziClient, marketId: string) {
  try {
    const market = await client.getQuote(marketId);

    if (!market) {
      await ctx.answerCallbackQuery({ text: '❌ Market not found' });
      return;
    }

    const message = formatMarketCard(market);

    // Send as a new message to not replace the list
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(market),
      link_preview_options: { is_disabled: true },
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error('View error:', error);
    await ctx.answerCallbackQuery({ text: '❌ Failed to load market' });
  }
}

/**
 * Handle quick-command buttons from help menu.
 */
async function handleCommand(ctx: Context, command: string) {
  await ctx.answerCallbackQuery({ text: `Use /${command} to run this command` });
}
