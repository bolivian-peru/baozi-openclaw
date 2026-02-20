import { CommandContext, Context } from 'grammy';
import { helpKeyboard } from './keyboards';

/**
 * /help — Show available commands.
 * /start — Welcome message (same as help).
 */
export function createHelpHandler() {
  return async (ctx: CommandContext<Context>) => {
    const message = `
🎰 <b>Baozi Market Feed Bot</b>

Browse prediction markets from <a href="https://baozi.bet">baozi.bet</a> right here in Telegram!

<b>Commands:</b>

📊 /markets — List top active markets
📊 /markets <i>[category]</i> — Filter by category
🎲 /odds <i>[marketId]</i> — Detailed odds for a market
🔥 /hot — Trending markets by volume
⏰ /closing — Markets closing within 24h

<b>Group Setup:</b>

⚙️ /setup — Configure daily roundup time
📬 /subscribe <i>[categories]</i> — Subscribe to daily roundup
🔕 /unsubscribe — Stop daily roundup
📋 /status — Show current group settings

ℹ️ /help — This message

<i>This bot is read-only — it shows market data and links to baozi.bet for trading. No wallet or funds required.</i>
`.trim();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: helpKeyboard(),
      link_preview_options: { is_disabled: true },
    });
  };
}
