/**
 * Webhook notifier — sends alerts as JSON POST to any URL
 */

import { BaseNotifier } from './base.js';
import { Alert, WebhookChannelConfig } from '../../types/index.js';

export class WebhookNotifier extends BaseNotifier {
  name = 'webhook';
  private url: string;
  private headers: Record<string, string>;

  constructor(config: WebhookChannelConfig) {
    super();
    this.url = config.url;
    this.headers = config.headers || {};
  }

  async send(alert: Alert): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          type: alert.type,
          message: alert.message,
          timestamp: alert.timestamp,
          wallet: alert.wallet,
          data: alert,
        }),
      });

      return response.ok;
    } catch (err) {
      console.error(`[webhook] Failed to send alert: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Override batch to send all alerts in one request
   */
  async sendBatch(alerts: Alert[]): Promise<{ sent: number; failed: number }> {
    if (alerts.length === 0) return { sent: 0, failed: 0 };

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          alerts: alerts.map(a => ({
            type: a.type,
            message: a.message,
            timestamp: a.timestamp,
            wallet: a.wallet,
            data: a,
          })),
          count: alerts.length,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        return { sent: alerts.length, failed: 0 };
      }
      return { sent: 0, failed: alerts.length };
    } catch {
      return { sent: 0, failed: alerts.length };
    }
  }
}
