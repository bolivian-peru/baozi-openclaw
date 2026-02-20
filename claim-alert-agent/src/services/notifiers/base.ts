/**
 * Base notifier interface
 */

import { Alert } from '../../types/index.js';

export interface Notifier {
  /** Channel name for logging */
  name: string;
  /** Send an alert notification */
  send(alert: Alert): Promise<boolean>;
  /** Send multiple alerts (batch) */
  sendBatch(alerts: Alert[]): Promise<{ sent: number; failed: number }>;
}

/**
 * Abstract base with default batch implementation
 */
export abstract class BaseNotifier implements Notifier {
  abstract name: string;
  abstract send(alert: Alert): Promise<boolean>;

  async sendBatch(alerts: Alert[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const alert of alerts) {
      try {
        const ok = await this.send(alert);
        if (ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }
}
