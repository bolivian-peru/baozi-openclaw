const axios = require('axios');

class WebhookNotifier {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendAlert(alert) {
    try {
      await axios.post(this.webhookUrl, {
        type: alert.type,
        message: alert.message,
        wallet: alert.wallet,
        timestamp: new Date().toISOString()
      }, { timeout: 5000 });
      console.log('✅ Webhook sent:', alert.type);
      return true;
    } catch (error) {
      console.error('❌ Webhook failed:', error.message);
      return false;
    }
  }
}

module.exports = WebhookNotifier;
