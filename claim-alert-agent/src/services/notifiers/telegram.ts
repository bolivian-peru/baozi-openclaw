/**
 * Telegram notifier — sends alerts via Telegram Bot API
 */

import { BaseNotifier } from './base.js';
import { Alert, TelegramChannelConfig } from '../../types/index.js';

export class TelegramNotifier extends BaseNotifier {
  name = 'telegram';
  private botToken: string;
  private chatId: string;

  constructor(config: TelegramChannelConfig) {
    super();
    this.botToken = config.botToken;
    this.chatId = config.chatId;
  }

  async send(alert: Alert): Promise<boolean> {
    const text = this.formatMessage(alert);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        }
      );

      const result = await response.json() as { ok: boolean };
      return result.ok;
    } catch (err) {
      console.error(`[telegram] Failed to send alert: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Format alert as Telegram HTML message
   */
  formatMessage(alert: Alert): string {
    const emoji = this.getEmoji(alert.type);
    let text = `${emoji} <b>Baozi Alert</b>\n\n`;

    switch (alert.type) {
      case 'market_resolved':
        text += alert.won
          ? `🎉 <b>You won!</b>\n`
          : `📊 Market resolved\n`;
        text += `Market: ${escapeHtml(alert.marketQuestion)}\n`;
        text += `Result: ${escapeHtml(alert.winningOutcome)}\n`;
        text += `Your bet: ${escapeHtml(alert.userOutcome)}\n`;
        if (alert.claimAmount) {
          text += `\n💰 Claim ${alert.claimAmount} SOL at baozi.bet/my-bets`;
        }
        break;

      case 'unclaimed_winnings':
        text += `💰 <b>${alert.totalAmount.toFixed(2)} SOL</b> unclaimed!\n`;
        text += `Across ${alert.marketCount} market${alert.marketCount > 1 ? 's' : ''}\n\n`;
        for (const m of alert.markets.slice(0, 5)) {
          text += `• ${escapeHtml(m.question)}: ${m.amount.toFixed(2)} SOL\n`;
        }
        text += `\n👉 Claim at baozi.bet/my-bets`;
        break;

      case 'closing_soon':
        text += `⏰ Closing in <b>${alert.hoursRemaining}h</b>\n`;
        text += `Market: ${escapeHtml(alert.marketQuestion)}\n`;
        text += `Your position: ${alert.userStake} SOL on ${escapeHtml(alert.userOutcome)} (${Math.round(alert.currentProbability * 100)}%)`;
        break;

      case 'odds_shift':
        text += `📈 Odds shifted <b>${alert.shiftPercentage.toFixed(0)}pp</b>\n`;
        text += `Market: ${escapeHtml(alert.marketQuestion)}\n`;
        text += `${escapeHtml(alert.outcomeLabel)}: ${Math.round(alert.previousProbability * 100)}% → ${Math.round(alert.currentProbability * 100)}%\n`;
        text += `Your position: ${alert.userStake} SOL on ${escapeHtml(alert.userOutcome)}`;
        break;

      case 'new_market':
        text += `🆕 New market matching your interests\n`;
        text += `<b>${escapeHtml(alert.marketQuestion)}</b>\n`;
        text += `Keywords: ${alert.matchedKeywords.join(', ')}\n`;
        text += `Pool: ${alert.totalPool} SOL`;
        break;
    }

    return text;
  }

  private getEmoji(type: string): string {
    switch (type) {
      case 'market_resolved': return '🏁';
      case 'unclaimed_winnings': return '💰';
      case 'closing_soon': return '⏰';
      case 'odds_shift': return '📈';
      case 'new_market': return '🆕';
      default: return '🔔';
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
