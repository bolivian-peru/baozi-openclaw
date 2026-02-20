/**
 * Baozi Claim & Alert Agent
 *
 * Portfolio notification agent for Baozi prediction markets on Solana.
 * Monitors wallets and sends alerts when action is needed:
 * - Market resolved → claim your winnings
 * - Unclaimed winnings sitting idle
 * - Market closing soon → check your position
 * - Significant odds shift → review your bet
 * - New market matching interests → place a bet
 */

export type { AgentConfig, AlertConfig } from './types/config.js';
export { DEFAULT_CONFIG } from './types/config.js';
export type { Market, Position, ClaimableWinning, ResolutionStatus } from './types/market.js';
export type { Alert, AlertType } from './types/alert.js';

export type { BaoziDataProvider } from './services/baozi-client.js';
export { BaoziClient } from './services/baozi-client.js';
export { AlertDetector } from './services/alert-detector.js';
export { StateStore } from './services/state-store.js';
export type { MonitorOptions, PollResult } from './services/monitor.js';
export { Monitor } from './services/monitor.js';

export type { Notifier } from './services/notifiers/index.js';
export {
  WebhookNotifier,
  TelegramNotifier,
  EmailNotifier,
  createNotifier,
  createNotifiers,
} from './services/notifiers/index.js';
