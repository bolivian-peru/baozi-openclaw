import dotenv from 'dotenv';
dotenv.config();

export const config = {
  /** Telegram Bot API token from @BotFather */
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',

  /** Solana RPC endpoint */
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',

  /** Baozi program ID (V4.7.6 mainnet) */
  baoziProgramId: process.env.BAOZI_PROGRAM_ID || 'FWyTPzm5cfJwRKzfkscxozatSxF6Qu78JQovQUwKPruJ',

  /** Baozi website base URL */
  baoziBaseUrl: process.env.BAOZI_BASE_URL || 'https://baozi.bet',

  /** Default daily roundup cron (9 AM UTC) */
  defaultRoundupCron: process.env.DEFAULT_ROUNDUP_CRON || '0 9 * * *',

  /** Default timezone */
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',

  /** Max markets to show in a list */
  maxMarketsPerPage: parseInt(process.env.MAX_MARKETS_PER_PAGE || '5', 10),

  /** Bot admin Telegram user IDs (comma-separated) */
  adminUserIds: (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .filter(Boolean)
    .map(Number),

  /** Path to store group configs */
  dataDir: process.env.DATA_DIR || './data',
} as const;

export function validateConfig(): void {
  if (!config.telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required. Get one from @BotFather on Telegram.');
  }
}
