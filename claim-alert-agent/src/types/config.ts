/**
 * Configuration types for the Claim & Alert Agent
 */

export interface AlertConfig {
  /** Alert when winnings are claimable */
  claimable: boolean;
  /** Alert when a market you're in is closing soon */
  closingSoon: boolean;
  /** Hours before close to trigger alert */
  closingSoonHours: number;
  /** Alert on significant odds shifts */
  oddsShift: boolean;
  /** Minimum percentage point shift to trigger alert */
  oddsShiftThreshold: number;
  /** Alert on new markets matching interest keywords */
  newMarkets: boolean;
  /** Keywords to match for new market alerts */
  interestKeywords: string[];
}

export interface WebhookChannelConfig {
  type: 'webhook';
  url: string;
  /** Optional custom headers */
  headers?: Record<string, string>;
}

export interface TelegramChannelConfig {
  type: 'telegram';
  botToken: string;
  chatId: string;
}

export interface EmailChannelConfig {
  type: 'email';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  to: string;
}

export type NotificationChannelConfig =
  | WebhookChannelConfig
  | TelegramChannelConfig
  | EmailChannelConfig;

export interface AgentConfig {
  /** Wallet addresses to monitor */
  wallets: string[];
  /** Alert trigger settings */
  alerts: AlertConfig;
  /** Notification channels (supports multiple) */
  channels: NotificationChannelConfig[];
  /** Poll interval in minutes */
  pollIntervalMinutes: number;
  /** Solana RPC URL */
  solanaRpcUrl?: string;
}

export const DEFAULT_CONFIG: AgentConfig = {
  wallets: [],
  alerts: {
    claimable: true,
    closingSoon: true,
    closingSoonHours: 6,
    oddsShift: true,
    oddsShiftThreshold: 15,
    newMarkets: false,
    interestKeywords: [],
  },
  channels: [],
  pollIntervalMinutes: 15,
};
