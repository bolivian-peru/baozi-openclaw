const axios = require('axios');

class DiscordNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendAlert(alert) {
    const colors = { 'MARKET_RESOLVED': 0x00FF00, 'UNCLAIMED_WINNINGS': 0xFFD700, 'CLOSING_SOON': 0xFF6600, 'ODDS_SHIFT': 0x0099FF };
    
    const embed = {
      title: alert.type.replace(/_/g, ' '),
      description: alert.message,
      color: colors[alert.type] || 0x7289DA,
      timestamp: new Date().toISOString(),
      fields: [{ name: 'Wallet', value: alert.wallet, inline: true }]
    };

    try {
      await axios.post(this.webhookUrl, { embeds: [embed] }, { timeout: 5000 });
      console.log('✅ Discord sent:', alert.type);
      return true;
    } catch (error) {
      console.error('❌ Discord failed:', error.message);
      return false;
    }
  }
}

module.exports = DiscordNotifier;
