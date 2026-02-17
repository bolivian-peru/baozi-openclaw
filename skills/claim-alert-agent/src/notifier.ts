import axios from 'axios';
import config from './config';

export interface Notification {
  message: string;
  type: 'info' | 'warning' | 'alert';
  timestamp: Date;
  marketId?: string;
  walletAddress?: string;
}

export class Notifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(notification: Notification): Promise<void> {
    if (!this.webhookUrl) {
      console.warn('No webhook URL configured. Notification skipped:', notification.message);
      return;
    }

    try {
      const payload = {
        content: `**[${notification.type.toUpperCase()}]** ${notification.message}`,
        embeds: [{
          title: notification.type === 'alert' ? '🚨 ALERT' : (notification.type === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO'),
          description: notification.message,
          color: notification.type === 'alert' ? 0xff0000 : (notification.type === 'warning' ? 0xffcc00 : 0x00ccff),
          timestamp: notification.timestamp.toISOString(),
          fields: [
            { name: 'Market ID', value: notification.marketId || 'N/A', inline: true },
            { name: 'Wallet', value: notification.walletAddress || 'N/A', inline: true },
          ]
        }]
      };

      await axios.post(this.webhookUrl, payload);
      console.log('Notification sent:', notification.message);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
