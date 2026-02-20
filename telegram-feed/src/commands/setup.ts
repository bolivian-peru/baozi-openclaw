import { CommandContext, Context } from 'grammy';
import { GroupStore } from '../services/group-store';
import { RoundupScheduler } from '../services/roundup';

/**
 * /setup [cron] — Configure daily roundup schedule.
 * Default: 9:00 AM UTC daily ("0 9 * * *")
 *
 * Examples:
 *   /setup          — Enable daily roundup at 9 AM UTC
 *   /setup 0 14 * * * — Daily at 2 PM UTC
 *   /setup 0 9 * * 1-5 — Weekdays at 9 AM UTC
 */
export function createSetupHandler(store: GroupStore, scheduler: RoundupScheduler) {
  return async (ctx: CommandContext<Context>) => {
    const chatId = ctx.chat.id;
    const cronExpr = ctx.match?.toString().trim() || undefined;

    const cfg = store.set(chatId, {
      roundupEnabled: true,
      ...(cronExpr ? { roundupCron: cronExpr } : {}),
    });

    scheduler.schedule(chatId);

    await ctx.reply(
      `✅ <b>Daily roundup enabled!</b>\n\n` +
      `⏰ Schedule: <code>${cfg.roundupCron}</code>\n` +
      `🌐 Timezone: ${cfg.timezone}\n` +
      `🏷️ Categories: ${cfg.categories.length > 0 ? cfg.categories.join(', ') : 'All'}\n\n` +
      `Use /subscribe to filter categories.\n` +
      `Use /unsubscribe to disable.`,
      { parse_mode: 'HTML' },
    );
  };
}

/**
 * /subscribe [category1,category2,...] — Filter roundup by categories.
 */
export function createSubscribeHandler(store: GroupStore, scheduler: RoundupScheduler) {
  return async (ctx: CommandContext<Context>) => {
    const chatId = ctx.chat.id;
    const input = ctx.match?.toString().trim();

    const categories = input
      ? input.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    const cfg = store.set(chatId, {
      roundupEnabled: true,
      categories,
    });

    scheduler.schedule(chatId);

    const catText = cfg.categories.length > 0
      ? cfg.categories.join(', ')
      : 'All categories';

    await ctx.reply(
      `📬 <b>Subscribed to daily roundup!</b>\n\n` +
      `🏷️ Categories: ${catText}\n` +
      `⏰ Schedule: <code>${cfg.roundupCron}</code>\n\n` +
      `Use /setup to change the schedule.`,
      { parse_mode: 'HTML' },
    );
  };
}

/**
 * /unsubscribe — Disable daily roundup.
 */
export function createUnsubscribeHandler(store: GroupStore, scheduler: RoundupScheduler) {
  return async (ctx: CommandContext<Context>) => {
    const chatId = ctx.chat.id;

    store.set(chatId, { roundupEnabled: false });
    scheduler.cancel(chatId);

    await ctx.reply('🔕 Daily roundup disabled. Use /subscribe to re-enable.');
  };
}

/**
 * /status — Show current group configuration.
 */
export function createStatusHandler(store: GroupStore) {
  return async (ctx: CommandContext<Context>) => {
    const chatId = ctx.chat.id;
    const cfg = store.get(chatId);

    const statusEmoji = cfg.roundupEnabled ? '🟢' : '🔴';
    const statusText = cfg.roundupEnabled ? 'Enabled' : 'Disabled';

    await ctx.reply(
      `📋 <b>Group Settings</b>\n\n` +
      `${statusEmoji} Roundup: ${statusText}\n` +
      `⏰ Schedule: <code>${cfg.roundupCron}</code>\n` +
      `🌐 Timezone: ${cfg.timezone}\n` +
      `🏷️ Categories: ${cfg.categories.length > 0 ? cfg.categories.join(', ') : 'All'}\n\n` +
      `Chat ID: <code>${chatId}</code>`,
      { parse_mode: 'HTML' },
    );
  };
}
