const TelegramBot = require('node-telegram-bot-api');

class TelegramNotifier {
  constructor(token, chatId) {
    this.bot = new TelegramBot(token, { polling: false });
    this.chatId = chatId;
  }

  async sendAlert(alert) {
    const emoji = { 'MARKET_RESOLVED': '🎉', 'UNCLAIMED_WINNINGS': '💰', 'CLOSING_SOON': '⏰', 'ODDS_SHIFT': '📊' }[alert.type] || '🔔';
    const message = `${emoji} *Baozi Alert*\n\n${alert.message}\n\n👛 Wallet: \`${alert.wallet}\``;
    try {
      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'Markdown' });
      console.log('✅ Telegram sent:', alert.type);
      return true;
    } catch (error) {
      console.error('❌ Telegram failed:', error.message);
      return false;
    }
  }
}

module.exports = TelegramNotifier;
