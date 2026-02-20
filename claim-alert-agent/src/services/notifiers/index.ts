/**
 * Notifier factory — creates notifiers from config
 */

export type { Notifier } from './base.js';
export { BaseNotifier } from './base.js';
export { WebhookNotifier } from './webhook.js';
export { TelegramNotifier } from './telegram.js';
export { EmailNotifier } from './email.js';

import type { NotificationChannelConfig } from '../../types/index.js';
import type { Notifier } from './base.js';
import { WebhookNotifier } from './webhook.js';
import { TelegramNotifier } from './telegram.js';
import { EmailNotifier } from './email.js';

/**
 * Create a notifier from channel configuration
 */
export function createNotifier(config: NotificationChannelConfig): Notifier {
  switch (config.type) {
    case 'webhook':
      return new WebhookNotifier(config);
    case 'telegram':
      return new TelegramNotifier(config);
    case 'email':
      return new EmailNotifier(config);
    default:
      throw new Error(`Unknown notification channel type: ${(config as any).type}`);
  }
}

/**
 * Create all notifiers from config array
 */
export function createNotifiers(configs: NotificationChannelConfig[]): Notifier[] {
  return configs.map(createNotifier);
}
